import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { CustomSHACLFile } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { AlertTriangle, CloudUpload, Link2, Plus, Trash2, Type, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SHACLManagerProps {
  shaclFiles: CustomSHACLFile[];
  onChange: (files: CustomSHACLFile[]) => void;
}

type SHACLInputMode = 'paste' | 'url' | 'upload';

const SHACLManager: React.FC<SHACLManagerProps> = ({ shaclFiles, onChange }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SHACLInputMode>('paste');
  const [pasteContent, setPasteContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const generateId = () => `shacl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addSHACLFile = useCallback((file: CustomSHACLFile) => {
    onChange([...shaclFiles, file]);
  }, [shaclFiles, onChange]);

  const removeSHACLFile = useCallback((id: string) => {
    onChange(shaclFiles.filter(f => f.id !== id));
  }, [shaclFiles, onChange]);

  const handlePaste = () => {
    if (!pasteContent.trim()) return;
    
    const file: CustomSHACLFile = {
      id: generateId(),
      content: pasteContent,
      source: 'paste'
    };
    
    addSHACLFile(file);
    setPasteContent('');
  };

  const handleUrlLoad = async () => {
    if (!urlInput.trim()) return;
    
    setIsLoadingUrl(true);
    setUrlError(null);
    
    try {
      const response = await fetch(urlInput);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const content = await response.text();
      
      const file: CustomSHACLFile = {
        id: generateId(),
        content,
        source: 'url',
        url: urlInput
      };
      
      addSHACLFile(file);
      setUrlInput('');
    } catch (error) {
      setUrlError(t('validator.urlError'));
      console.error('Failed to load SHACL from URL:', error);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const content = await file.text();
        const shaclFile: CustomSHACLFile = {
          id: generateId(),
          content,
          source: 'upload'
        };
        addSHACLFile(shaclFile);
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
      }
    }
  }, [addSHACLFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/turtle': ['.ttl', '.shacl'],
      'application/rdf+xml': ['.rdf', '.xml'],
      'application/ld+json': ['.jsonld']
    },
    multiple: true
  });

  return (
    <Card className="border-dashed border-2 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('profiles.manager.title')}
            </CardTitle>
            <CardDescription>{t('profiles.manager.description')}</CardDescription>
          </div>
          {shaclFiles.length > 0 && (
            <Badge variant="outline">{shaclFiles.length} {t('profiles.manager.filesLoaded')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loaded SHACL Files List */}
        {shaclFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('profiles.manager.loadedFiles')}</h4>
            <div className="space-y-2">
              {shaclFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {t(`profiles.manager.file`)} #{index + 1}
                        {file.url && <span className="text-xs text-muted-foreground ml-2">({new URL(file.url).hostname})</span>}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {file.source === 'paste' && <Type className="h-3 w-3 mr-1" />}
                          {file.source === 'upload' && <CloudUpload className="h-3 w-3 mr-1" />}
                          {file.source === 'url' && <Link2 className="h-3 w-3 mr-1" />}
                          {t(`profiles.manager.source.${file.source}`)}
                        </Badge>
                        <span>{(file.content.length / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSHACLFile(file.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add SHACL Files */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as SHACLInputMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paste">
              <Type className="h-4 w-4 mr-2" />
              {t('profiles.manager.tabs.paste')}
            </TabsTrigger>
            <TabsTrigger value="upload">
              <CloudUpload className="h-4 w-4 mr-2" />
              {t('profiles.manager.tabs.upload')}
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2 className="h-4 w-4 mr-2" />
              {t('profiles.manager.tabs.url')}
            </TabsTrigger>
          </TabsList>

          {/* Paste Tab */}
          <TabsContent value="paste" className="space-y-3 mt-4">
            <Textarea
              placeholder={t('profiles.manager.pastePlaceholder')}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <Button
              onClick={handlePaste}
              disabled={!pasteContent.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('profiles.manager.addFile')}
            </Button>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              <CloudUpload className={cn(
                "h-12 w-12 mb-4",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium">
                {isDragActive
                  ? t('profiles.manager.dropActive')
                  : t('profiles.manager.dropInactive')}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('profiles.manager.dropHint')}
              </p>
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-3 mt-4">
            <Input
              placeholder={t('profiles.manager.urlPlaceholder')}
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
            />
            {urlError && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{urlError}</p>
              </div>
            )}
            <Button
              onClick={handleUrlLoad}
              disabled={!urlInput.trim() || isLoadingUrl}
              className="w-full"
            >
              {isLoadingUrl ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('profiles.manager.loadUrl')}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SHACLManager;
