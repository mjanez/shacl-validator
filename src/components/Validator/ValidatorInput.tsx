import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ValidationProfile, ProfileSelection, CustomSHACLFile, ValidationMode } from '../../types';
import ProfileSelector from './ProfileSelector';
import SHACLManager from './SHACLManager';
import ValidationModeSelector from './ValidationModeSelector';
import mqaConfig from '../../config/mqa-config.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import { AlertTriangle, CloudUpload, Link2, Type, Loader2, FileText, X, Info } from 'lucide-react';
import RDFService from '../../services/RDFService';
import { Store } from 'n3';
import MonacoWorkspace from './MonacoWorkspace';
import { useLayout } from '../layout/Layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ValidatorInputProps {
  onValidate: (content: string, profile: ProfileSelection) => void;
  isLoading: boolean;
}

type WorkspaceMode = 'paste' | 'url' | 'upload';

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

// Thresholds for large file warning
const LARGE_FILE_THRESHOLD_KB = 2 * 1024; // 2 MB - show warning
const ESTIMATED_TIME_PER_MB = 0.4; // ~0.4 minutes per MB based on 12.5MB = 5min

const chunkSize = 256 * 1024; // 256KB
const defaultRdfCounts = { datasets: 0, dataServices: 0, distributions: 0, hasData: false };

const ValidatorInput: React.FC<ValidatorInputProps> = ({ onValidate, isLoading }) => {
  const { t } = useTranslation();
  const { setRdfStats } = useLayout();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<WorkspaceMode>('paste');
  const [textContent, setTextContent] = useState('');
  const [normalizedContent, setNormalizedContent] = useState('');
  const [jsonPreview, setJsonPreview] = useState('');
  const [url, setUrl] = useState('');
  const [urlMeta, setUrlMeta] = useState<{ size?: string; contentType?: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ progress: 0, isUploading: false, error: null });
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const [pendingValidation, setPendingValidation] = useState<{ payload: string; profile: ProfileSelection } | null>(null);
  const [validatingLargeFile, setValidatingLargeFile] = useState<{ size: number } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSelection>({
    profile: 'dcat_ap_es' as ValidationProfile,
    version: '1.0.0',
    branch: 'main',
    mode: 'predefined'
  });
  const [customShaclFiles, setCustomShaclFiles] = useState<CustomSHACLFile[]>([]);
  const uploadCancelledRef = useRef(false);
  const [rdfCounts, setRdfCounts] = useState(defaultRdfCounts);

  // Reset large file state when validation completes
  useEffect(() => {
    if (!isLoading) {
      setValidatingLargeFile(null);
    }
  }, [isLoading]);

  useEffect(() => {
    const sampleParam = searchParams.get('sample');
    if (sampleParam) {
      const profiles = mqaConfig.profiles as any;
      const profileConfig = profiles[selectedProfile.profile];
      const matchingVersion = profileConfig?.versions[selectedProfile.version];
      const sampleUrl = matchingVersion?.samples?.[sampleParam];
      if (sampleUrl) {
        setUrl(sampleUrl);
        setMode('url');
      }
    }
  }, [searchParams, selectedProfile]);

  useEffect(() => {
    if (!textContent.trim()) {
      setNormalizedContent('');
      setJsonPreview('');
      setRdfCounts({ ...defaultRdfCounts });
      return;
    }

    let isCancelled = false;

    const processContent = async () => {
      try {
        const format = RDFService.detectFormat(textContent);
        
        // JSON-LD preview is not supported, skip it (validation will handle conversion)
        if (format === 'application/ld+json' || format === 'application/json') {
          setNormalizedContent('');
          setJsonPreview('');
          setRdfCounts({ ...defaultRdfCounts });
          return;
        }
        
        const store = await RDFService.parseRDF(textContent, format);
        if (isCancelled) return;
        const normalized = await RDFService.normalizeToTurtle(textContent, { format });
        if (isCancelled) return;
        setNormalizedContent(normalized);
        setJsonPreview(JSON.stringify(storeToJsonLd(store), null, 2));
        const counts = computeRdfCounts(store);
        setRdfCounts({ ...counts, hasData: true });
      } catch (error) {
        console.error('Preview error', error);
        setRdfCounts({ ...defaultRdfCounts });
      }
    };

    processContent();
    return () => {
      isCancelled = true;
    };
  }, [textContent]);

  const storeToJsonLd = (store: Store) => {
    const graph: Record<string, Record<string, any>> = {};
    const quads = store.getQuads(null, null, null, null);
    for (const quad of quads) {
      const subject = quad.subject.value;
      if (!graph[subject]) {
        graph[subject] = { '@id': subject };
      }
      const predicate = quad.predicate.value;
      const value = quad.object.termType === 'Literal'
        ? { '@value': quad.object.value, '@type': quad.object.datatype?.value, '@language': quad.object.language || undefined }
        : { '@id': quad.object.value };
      if (graph[subject][predicate]) {
        graph[subject][predicate] = Array.isArray(graph[subject][predicate])
          ? [...graph[subject][predicate], value]
          : [graph[subject][predicate], value];
      } else {
        graph[subject][predicate] = value;
      }
    }
    return Object.values(graph);
  };

  const computeRdfCounts = (store: Store) => {
    const TYPE_IRI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const DATASET_IRI = 'http://www.w3.org/ns/dcat#Dataset';
    const DATASERVICE_IRI = 'http://www.w3.org/ns/dcat#DataService';
    const DISTRIBUTION_IRI = 'http://www.w3.org/ns/dcat#Distribution';
    const trackers = {
      datasets: new Set<string>(),
      dataServices: new Set<string>(),
      distributions: new Set<string>()
    };
    const quads = store.getQuads(null, null, null, null);
    for (const quad of quads) {
      if (quad.predicate.value !== TYPE_IRI) continue;
      const subject = quad.subject.value;
      switch (quad.object.value) {
        case DATASET_IRI:
          trackers.datasets.add(subject);
          break;
        case DATASERVICE_IRI:
          trackers.dataServices.add(subject);
          break;
        case DISTRIBUTION_IRI:
          trackers.distributions.add(subject);
          break;
        default:
          break;
      }
    }
    return {
      datasets: trackers.datasets.size,
      dataServices: trackers.dataServices.size,
      distributions: trackers.distributions.size
    };
  };

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper to estimate validation time in minutes
  const estimateValidationTime = (sizeInBytes: number): number => {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return Math.max(1, Math.ceil(sizeInMB * ESTIMATED_TIME_PER_MB));
  };

  // Proceed with validation after user confirmation
  const proceedWithValidation = () => {
    if (pendingValidation) {
      const payloadSize = new Blob([pendingValidation.payload]).size;
      setValidatingLargeFile({ size: payloadSize });
      onValidate(pendingValidation.payload, pendingValidation.profile);
      setPendingValidation(null);
      setShowLargeFileWarning(false);
    }
  };

  // Cancel large file validation
  const cancelLargeFileValidation = () => {
    setPendingValidation(null);
    setShowLargeFileWarning(false);
  };

  const handleValidate = async () => {
    let payload = textContent;
    let fetchedContentType: string | null = null;
    const formatHints = {
      url: mode === 'url' ? url : undefined,
      contentType: fetchedContentType || urlMeta?.contentType || null
    };
    if (mode === 'url') {
      if (!url.trim()) return;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        fetchedContentType = response.headers.get('content-type');
        formatHints.contentType = fetchedContentType || urlMeta?.contentType || null;
        payload = await response.text();
      } catch (error) {
        console.error(error);
        setUrlError(t('validator.urlError'));
        return;
      }
    }

    if (mode === 'upload' && !textContent.trim()) return;
    let detectedFormat: string | null = null;
    try {
      detectedFormat = RDFService.detectFormat(payload, formatHints.url, formatHints.contentType);
      if (detectedFormat !== 'text/turtle' && detectedFormat !== 'turtle') {
        const normalized = await RDFService.normalizeToTurtle(payload, {
          format: detectedFormat,
          url: mode === 'url' ? url : undefined,
          contentType: fetchedContentType || urlMeta?.contentType || null
        });
        payload = normalized;
        detectedFormat = 'text/turtle';
        if (mode !== 'url') {
          setTextContent(normalized);
        }
      }
    } catch (error) {
      console.error('Normalization error', error);
      detectedFormat = detectedFormat || 'text/turtle';
    }

    if (mode !== 'paste' || !rdfCounts.hasData) {
      try {
        const statsFormat = detectedFormat || RDFService.detectFormat(payload, formatHints.url, formatHints.contentType);
        // Skip parsing for stats if it's JSON-LD (will be normalized anyway)
        if (statsFormat !== 'application/ld+json') {
          const store = await RDFService.parseRDF(payload, statsFormat);
          const counts = computeRdfCounts(store);
          setRdfCounts({ ...counts, hasData: true });
        }
      } catch (error) {
        console.warn('Failed to derive RDF stats', error);
      }
    }

    const validationProfile: ProfileSelection = {
      ...selectedProfile,
      customShacl: selectedProfile.mode === 'custom' ? customShaclFiles : undefined
    };

    // Check if file is large and show warning
    const payloadSizeKB = new Blob([payload]).size / 1024;
    if (payloadSizeKB > LARGE_FILE_THRESHOLD_KB) {
      setPendingValidation({ payload, profile: validationProfile });
      setShowLargeFileWarning(true);
      return;
    }

    onValidate(payload, validationProfile);
  };

  const fetchMetadata = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setUrlMeta(null);
      return;
    }
    setUrlError(null);
    try {
      const headResponse = await fetch(targetUrl, { method: 'HEAD' });
      if (headResponse.ok) {
        setUrlMeta({
          size: headResponse.headers.get('content-length') || undefined,
          contentType: headResponse.headers.get('content-type') || undefined
        });
        return;
      }
    } catch (error) {
      console.warn('HEAD request failed, falling back to GET metadata');
    }

    try {
      const response = await fetch(targetUrl, { method: 'GET' });
      if (!response.ok) throw new Error('Failed metadata fetch');
      setUrlMeta({
        size: response.headers.get('content-length') || undefined,
        contentType: response.headers.get('content-type') || undefined
      });
    } catch (error) {
      console.error(error);
      setUrlMeta(null);
    }
  }, []);

  // Auto-fetch metadata when URL changes (debounced)
  useEffect(() => {
    if (!url.trim()) {
      setUrlMeta(null);
      return;
    }
    const timer = setTimeout(() => {
      fetchMetadata(url);
    }, 500);
    return () => clearTimeout(timer);
  }, [url, fetchMetadata]);

  const readFileInChunks = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        let offset = 0;
        let result = '';

        uploadCancelledRef.current = false;
        setUploadState({ progress: 0, isUploading: true, error: null });

        const readNextChunk = () => {
          if (uploadCancelledRef.current) {
            setUploadState({ progress: 0, isUploading: false, error: t('validator.uploadCancelled') });
            reject(new Error('Upload cancelled'));
            return;
          }
          const slice = file.slice(offset, offset + chunkSize);
          reader.readAsText(slice);
        };

        reader.onload = (event) => {
          result += event.target?.result as string;
          offset += chunkSize;
          const progress = Math.min(100, Math.round((offset / file.size) * 100));
          setUploadState((prev) => ({ ...prev, progress }));
          if (offset < file.size) {
            readNextChunk();
          } else {
            setUploadState({ progress: 100, isUploading: false, error: null });
            resolve(result);
          }
        };

        reader.onerror = () => {
          const message = reader.error?.message || 'Upload error';
          setUploadState({ progress: 0, isUploading: false, error: message });
          setUploadedFileName(null);
          reject(reader.error || new Error(message));
        };

        readNextChunk();
      }),
    [t]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const file = acceptedFiles[0];
      try {
        const content = await readFileInChunks(file);
        setTextContent(content);
        setMode('upload');
        setUploadedFileName(file.name);
      } catch (error) {
        console.error(error);
        setUploadedFileName(null);
      }
    },
    [readFileInChunks]
  );

  const onDropRejected = useCallback((fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const fileName = rejection.file.name;
      const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      setUploadState({
        progress: 0,
        isUploading: false,
        error: t('validator.unsupportedFormatError', { extension: fileExt })
      });
    }
  }, [t]);

  const clearFile = useCallback(() => {
    setTextContent('');
    setUploadedFileName(null);
    setUploadState({ progress: 0, isUploading: false, error: null });
  }, []);

  const cancelUpload = () => {
    uploadCancelledRef.current = true;
    setUploadedFileName(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/turtle': ['.ttl'],
      'text/n3': ['.n3'],
      'application/rdf+xml': ['.rdf', '.xml'],
      'application/ld+json': ['.jsonld', '.json']
    },
    multiple: false,
    onDropAccepted: onDrop,
    onDropRejected: onDropRejected
  });

  const loadSample = () => {
    const profiles = mqaConfig.profiles as any;
    const profileConfig = profiles[selectedProfile.profile];
    let sampleUrl = profileConfig?.versions[selectedProfile.version]?.sampleUrl;
    if (sampleUrl && selectedProfile.branch) {
      sampleUrl = sampleUrl.replace('{branch}', selectedProfile.branch);
    }
    if (sampleUrl) {
      setUrl(sampleUrl);
      setMode('url');
    }
  };

  useEffect(() => {
    const profiles = mqaConfig.profiles as Record<string, any>;
    if (!rdfCounts.hasData) {
      setRdfStats(null);
      return;
    }
    const versionIcon = profiles[selectedProfile.profile]?.versions?.[selectedProfile.version]?.icon;
    setRdfStats({
      datasets: rdfCounts.datasets,
      dataServices: rdfCounts.dataServices,
      distributions: rdfCounts.distributions,
      profileId: selectedProfile.profile,
      profileVersion: selectedProfile.version,
      profileBranch: selectedProfile.branch,
      profileIcon: versionIcon
    });
  }, [rdfCounts, selectedProfile, setRdfStats]);

  useEffect(() => () => setRdfStats(null), [setRdfStats]);

  const actionCards = useMemo(() => {
    const statusStyles = {
      success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
      info: 'bg-sky-500/15 text-sky-700 dark:text-sky-200',
      progress: 'bg-primary/15 text-primary'
    } as const;
    return [
      {
        key: 'paste' as WorkspaceMode,
        title: t('validator.actions.pasteTitle'),
        description: t('validator.actions.pasteDescription'),
        icon: Type,
        active: mode === 'paste',
        status: textContent
          ? { label: t('validator.actions.ready'), style: statusStyles.success }
          : undefined
      },
      {
        key: 'upload' as WorkspaceMode,
        title: t('validator.actions.uploadTitle'),
        description: t('validator.actions.uploadDescription'),
        icon: CloudUpload,
        active: mode === 'upload',
        status: uploadState.isUploading
          ? { label: `${uploadState.progress}%`, style: statusStyles.progress }
          : uploadedFileName
            ? { label: uploadedFileName, style: statusStyles.info }
            : undefined
      },
      {
        key: 'url' as WorkspaceMode,
        title: t('validator.actions.urlTitle'),
        description: t('validator.actions.urlDescription'),
        icon: Link2,
        active: mode === 'url',
        status: urlMeta?.contentType
          ? { label: urlMeta.contentType.split(';')[0], style: statusStyles.info }
          : undefined
      }
    ];
  }, [mode, textContent, urlMeta, uploadState, uploadedFileName, t]);

  const isValidateDisabled = useMemo(() => {
    if (isLoading) return true;
    if (selectedProfile.mode === 'custom' && customShaclFiles.length === 0) return true;
    if (mode === 'paste') return !textContent.trim();
    if (mode === 'url') return !url.trim();
    if (mode === 'upload') return !textContent.trim();
    return true;
  }, [mode, textContent, url, isLoading, selectedProfile.mode, customShaclFiles.length]);

  const handleModeChange = (newMode: ValidationMode) => {
    setSelectedProfile(prev => ({ ...prev, mode: newMode }));
  };

  return (
    <div className="space-y-6">
      <ValidationModeSelector 
        mode={selectedProfile.mode} 
        onChange={handleModeChange}
        disabled={isLoading}
      />

      {selectedProfile.mode === 'predefined' ? (
        <ProfileSelector selectedProfile={selectedProfile} onProfileChange={setSelectedProfile} disabled={isLoading} />
      ) : (
        <SHACLManager shaclFiles={customShaclFiles} onChange={setCustomShaclFiles} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('validator.workspaceTitle')}</CardTitle>
          <CardDescription>{t('validator.workspaceSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {actionCards.map((action) => (
              <button
                key={action.key}
                onClick={() => setMode(action.key)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all hover:border-primary hover:shadow-md',
                  action.active ? 'border-primary/50 bg-primary/5' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between">
                  <action.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  {action.status && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', action.status.style)}>
                      {action.status.label}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-semibold text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </button>
            ))}
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as WorkspaceMode)}>
            <TabsList className="w-full gap-2">
              <TabsTrigger value="paste">{t('validator.pasteText')}</TabsTrigger>
              <TabsTrigger value="upload">{t('validator.uploadTab')}</TabsTrigger>
              <TabsTrigger value="url">{t('validator.url')}</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="border-0 p-0">
              <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('validator.loadingEditor')}</div>}>
                <MonacoWorkspace
                  value={textContent}
                  onChange={setTextContent}
                  normalizedContent={normalizedContent}
                  jsonPreview={jsonPreview}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="url" className="border-0 p-0">
              <div className="space-y-4">
                <Input type="url" placeholder={t('validator.urlPlaceholder')} value={url} onChange={(e) => setUrl(e.target.value)} disabled={isLoading} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          <Info className="h-3.5 w-3.5" />
                          <span className="sr-only">{t('validator.supportedFormats')}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{t('validator.supportedFormats')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-muted-foreground/60">|</span>
                  <span>{t('validator.corsWarning')}</span>
                </div>
                {urlMeta && (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    <p><strong>{t('validator.metadata.type')}:</strong> {urlMeta.contentType || t('validator.metadata.unknown')}</p>
                    <p><strong>{t('validator.metadata.size')}:</strong> {urlMeta.size ? `${Math.round(Number(urlMeta.size) / 1024)} KB` : t('validator.metadata.unknown')}</p>
                  </div>
                )}
                {urlError && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {urlError}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="border-0 p-0 pt-4">
              {uploadedFileName && !uploadState.isUploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{uploadedFileName}</span>
                        <span className="text-xs text-muted-foreground">{t('validator.fileLoaded')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearFile}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={t('common.clear')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : uploadState.isUploading ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CloudUpload className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{uploadedFileName}</span>
                          <span className="text-xs text-muted-foreground">{t('validator.uploading')}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelUpload}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {t('validator.cancelUpload')}
                      </Button>
                    </div>
                    <Progress value={uploadState.progress} className="h-2" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{uploadState.progress}%</span>
                    </div>
                  </div>
                  {uploadState.error && (
                    <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {uploadState.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    {...getRootProps()}
                    className={cn(
                      'cursor-pointer rounded-2xl border-2 border-dashed transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border/70 hover:border-primary/50 hover:bg-muted/30'
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <CloudUpload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-foreground">
                          {isDragActive ? t('validator.dropActive') : t('validator.dropInactive')}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{t('validator.dropSubtitle')}</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground/80 hover:text-muted-foreground transition-colors">
                                <Info className="h-3.5 w-3.5" />
                                <span className="sr-only">{t('validator.supportedFormats')}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{t('validator.supportedFormats')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                  {uploadState.error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-destructive">{uploadState.error}</p>
                          <p className="text-xs text-destructive/80">
                            {t('validator.converterHint')}{' '}
                            <a
                              href="https://www.easyrdf.org/converter"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-destructive"
                            >
                              EasyRDF Converter
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Large file warning */}
          {showLargeFileWarning && pendingValidation && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {t('validator.largeFile.title')}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('validator.largeFile.message', { 
                        size: formatFileSize(new Blob([pendingValidation.payload]).size) 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2">
                    <Info className="h-4 w-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground">
                      {t('validator.largeFile.tip')}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('validator.largeFile.estimatedTime', {
                      minutes: estimateValidationTime(new Blob([pendingValidation.payload]).size)
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelLargeFileValidation}
                    >
                      {t('validator.largeFile.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={proceedWithValidation}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {t('validator.largeFile.proceed')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Large file validation in progress */}
          {isLoading && validatingLargeFile && (
            <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-sky-500" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                      {t('common.validating')} ({formatFileSize(validatingLargeFile.size)})
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('validator.largeFile.estimatedTime', {
                        minutes: estimateValidationTime(validatingLargeFile.size)
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 p-2">
                    <Info className="h-4 w-4 text-sky-500" />
                    <p className="text-xs text-muted-foreground">
                      {t('validator.largeFile.tip')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('validator.currentProfile')}</p>
              <p className="font-semibold text-foreground">
                {selectedProfile.mode === 'custom' 
                  ? `${t('validator.mode.custom')} (${customShaclFiles.length} ${customShaclFiles.length === 1 ? 'file' : 'files'})`
                  : `${t(`profiles.names.${selectedProfile.profile}.${selectedProfile.version}`, { defaultValue: selectedProfile.profile })} · ${selectedProfile.branch}`
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProfile.mode === 'predefined' && (
                <Button variant="ghost" onClick={loadSample} disabled={isLoading}>
                  {t('validator.loadSample')}
                </Button>
              )}
              <Button onClick={handleValidate} disabled={isValidateDisabled} className="min-w-[160px]">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.validating')}
                  </>
                ) : (
                  t('common.validate')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidatorInput;