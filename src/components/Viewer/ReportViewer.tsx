import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { SHACLReport, SHACLViolation } from '../../types';
import ValidationResults from '../Validator/ValidationResults';
import SHACLValidationService from '../../services/SHACLValidationService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  AlertTriangle,
  Upload,
  ClipboardList,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BarChart3,
  FileText,
  Hash,
  Layers,
  GitBranch
} from 'lucide-react';
import * as Comlink from 'comlink';
import type { ReportWorkerApi } from '../../workers/reportWorker';
import {
  ResponsiveContainer,
  Pie,
  PieChart,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip
} from 'recharts';

type InputMode = 'upload' | 'paste';
type ViewMode = 'import' | 'results';
type ResultTab = 'results' | 'dashboard';

const ReportViewer: React.FC = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<SHACLReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [viewMode, setViewMode] = useState<ViewMode>('import');
  const [resultTab, setResultTab] = useState<ResultTab>('results');
  const workerRef = useRef<Comlink.Remote<ReportWorkerApi> | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/reportWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = Comlink.wrap<ReportWorkerApi>(worker);
    return () => worker.terminate();
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim() || !workerRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await workerRef.current.parseShaclReport(inputText);
      setReport(parsed);
      setViewMode('results');
    } catch (err: any) {
      console.error(err);
      setError(`${t('viewer.error')} ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setInputText('');
    setUploadedFileName(null);
    setError(null);
    setViewMode('import');
    setResultTab('results');
  };

  const handleFileContent = useCallback((content: string, fileName: string) => {
    setInputText(content);
    setUploadedFileName(fileName);
    setInputMode('upload');
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleFileContent(event.target.result as string, file.name);
      }
    };
    reader.readAsText(file);
  }, [handleFileContent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/turtle': ['.ttl'],
      'application/rdf+xml': ['.rdf', '.xml'],
      'application/ld+json': ['.jsonld']
    },
    multiple: false
  });

  const clearFile = useCallback(() => {
    setInputText('');
    setUploadedFileName(null);
    setError(null);
  }, []);

  const severityPalette = {
    violation: 'hsl(0 72% 50%)',
    warning: 'hsl(45 93% 47%)',
    info: 'hsl(210 80% 60%)'
  } as const;

  // Severity distribution data
  const severityData = useMemo(() => {
    if (!report) return [];
    return [
      { name: t('severity.violation'), value: report.violations.length, color: severityPalette.violation },
      { name: t('severity.warning'), value: report.warnings.length, color: severityPalette.warning },
      { name: t('severity.info'), value: report.infos.length, color: severityPalette.info }
    ];
  }, [report, t]);

  // Top shapes breakdown
  const topShapeBreakdown = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { violation: number; warning: number; info: number }>();
    const track = (list: SHACLViolation[], type: 'violation' | 'warning' | 'info') => {
      list.forEach((entry) => {
        const key = entry.sourceShape || entry.focusNode || 'n/a';
        const current = map.get(key) || { violation: 0, warning: 0, info: 0 };
        current[type] += 1;
        map.set(key, current);
      });
    };
    track(report.violations, 'violation');
    track(report.warnings, 'warning');
    track(report.infos, 'info');
    return Array.from(map.entries())
      .map(([name, counts]) => ({
        name: name.split(/[#/]/).pop() || name,
        fullName: name,
        ...counts,
        total: counts.violation + counts.warning + counts.info
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [report]);

  // Property path distribution
  const propertyBreakdown = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { violation: number; warning: number; info: number }>();
    const track = (list: SHACLViolation[], type: 'violation' | 'warning' | 'info') => {
      list.forEach((entry) => {
        if (!entry.path) return;
        const key = entry.path;
        const current = map.get(key) || { violation: 0, warning: 0, info: 0 };
        current[type] += 1;
        map.set(key, current);
      });
    };
    track(report.violations, 'violation');
    track(report.warnings, 'warning');
    track(report.infos, 'info');
    return Array.from(map.entries())
      .map(([name, counts]) => ({
        name: name.split(/[#/]/).pop() || name,
        fullName: name,
        ...counts,
        total: counts.violation + counts.warning + counts.info
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [report]);

  // Focus node distribution (by type prefix)
  const focusNodeBreakdown = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { violation: number; warning: number; info: number }>();
    const track = (list: SHACLViolation[], type: 'violation' | 'warning' | 'info') => {
      list.forEach((entry) => {
        if (!entry.focusNode) return;
        const match = entry.focusNode.match(/\/(dataset|distribution|catalog|dataservice|agent|organization|contactpoint|periodOfTime)/i);
        const key = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() : 'Other';
        const current = map.get(key) || { violation: 0, warning: 0, info: 0 };
        current[type] += 1;
        map.set(key, current);
      });
    };
    track(report.violations, 'violation');
    track(report.warnings, 'warning');
    track(report.infos, 'info');
    return Array.from(map.entries())
      .map(([name, counts]) => ({
        name,
        ...counts,
        total: counts.violation + counts.warning + counts.info
      }))
      .sort((a, b) => b.total - a.total);
  }, [report]);

  // Constraint component breakdown
  const constraintBreakdown = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, number>();
    const allResults = [...report.violations, ...report.warnings, ...report.infos];
    allResults.forEach((entry) => {
      if (!entry.sourceConstraintComponent) return;
      const name = entry.sourceConstraintComponent.split(/[#/]/).pop() || entry.sourceConstraintComponent;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [report]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!report) return null;
    const allResults = [...report.violations, ...report.warnings, ...report.infos];
    const uniqueFocusNodes = new Set(allResults.map(r => r.focusNode).filter(Boolean)).size;
    const uniqueShapes = new Set(allResults.map(r => r.sourceShape).filter(Boolean)).size;
    const uniqueProperties = new Set(allResults.map(r => r.path).filter(Boolean)).size;
    return {
      totalResults: allResults.length,
      conforms: report.conforms,
      uniqueFocusNodes,
      uniqueShapes,
      uniqueProperties
    };
  }, [report]);

  const renderShapesTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card/90 px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold truncate max-w-xs" title={datum.fullName}>{datum.name}</p>
        <p className="text-destructive">{t('severity.violation')}: {datum.violation}</p>
        <p className="text-amber-600">{t('severity.warning')}: {datum.warning}</p>
        <p className="text-sky-600">{t('severity.info')}: {datum.info}</p>
      </div>
    );
  };

  const renderConstraintTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card/90 px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold">{datum.name}</p>
        <p>{t('table.count')}: {datum.value}</p>
      </div>
    );
  };

  const exportSegment = async (severity: 'Violation' | 'Warning' | 'Info', format: 'ttl' | 'csv') => {
    if (!report) return;
    const subset: SHACLReport = {
      ...report,
      violations: severity === 'Violation' ? report.violations : [],
      warnings: severity === 'Warning' ? report.warnings : [],
      infos: severity === 'Info' ? report.infos : [],
      totalViolations: severity === 'Violation' ? report.violations.length : 0
    };
    const payload =
      format === 'ttl'
        ? await SHACLValidationService.exportReportAsTurtle(subset)
        : await SHACLValidationService.exportReportAsCSV(subset);
    const blob = new Blob([payload], { type: format === 'ttl' ? 'text/turtle' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shacl-${severity.toLowerCase()}-${new Date().toISOString()}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderImportView = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('viewer.import')}</CardTitle>
        <CardDescription>{t('viewer.importDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              {t('viewer.upload')}
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex-1">
              <ClipboardList className="mr-2 h-4 w-4" />
              {t('viewer.paste')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="border-0 p-0 pt-4">
            {uploadedFileName ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{uploadedFileName}</span>
                      <span className="text-xs text-muted-foreground">{t('viewer.fileLoaded')}</span>
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
            ) : (
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
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {isDragActive ? t('viewer.dropActive') : t('viewer.dropInactive')}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('viewer.uploadHint')}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="paste" className="border-0 p-0 pt-4">
            <Textarea 
              rows={10} 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              className="font-mono text-xs"
              placeholder={t('viewer.pasteHint')}
            />
          </TabsContent>
        </Tabs>
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
        <Button onClick={handleProcess} disabled={!inputText.trim() || isLoading} className="w-full sm:w-auto">
          {isLoading ? t('common.validating') : t('viewer.visualize')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSummaryCard = () => {
    if (!summaryStats) return null;
    return (
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('viewer.summary.title')}</CardTitle>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('viewer.reset')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                summaryStats.conforms ? "bg-green-500/10" : "bg-destructive/10"
              )}>
                {summaryStats.conforms ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('viewer.summary.conformance')}</p>
                <p className={cn("text-sm font-semibold", summaryStats.conforms ? "text-green-500" : "text-destructive")}>
                  {summaryStats.conforms ? t('viewer.summary.conforms') : t('viewer.summary.notConforms')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('viewer.summary.totalResults')}</p>
                <p className="text-sm font-semibold">{summaryStats.totalResults}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('viewer.summary.uniqueFocusNodes')}</p>
                <p className="text-sm font-semibold">{summaryStats.uniqueFocusNodes}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                <Layers className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('viewer.summary.uniqueShapes')}</p>
                <p className="text-sm font-semibold">{summaryStats.uniqueShapes}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <GitBranch className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('viewer.summary.uniqueProperties')}</p>
                <p className="text-sm font-semibold">{summaryStats.uniqueProperties}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBasicCharts = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('viewer.severityBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {severityData.length ? (
            <>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {severityData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2">
                {severityData.map((entry) => (
                  <Badge key={entry.name} style={{ backgroundColor: entry.color }} className="text-white text-xs">
                    {entry.name}: {entry.value}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('viewer.emptyStats')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('viewer.topShapes')}</CardTitle>
          <CardDescription className="text-xs">{t('viewer.topShapesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {topShapeBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topShapeBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                <RechartTooltip content={renderShapesTooltip} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                <Bar dataKey="violation" stackId="issues" fill={severityPalette.violation} radius={[0, 4, 4, 0]} />
                <Bar dataKey="warning" stackId="issues" fill={severityPalette.warning} radius={[0, 4, 4, 0]} />
                <Bar dataKey="info" stackId="issues" fill={severityPalette.info} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <p>{t('viewer.emptyShapes')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderFullDashboard = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('viewer.propertyBreakdown')}</CardTitle>
            <CardDescription className="text-xs">{t('viewer.propertyBreakdownHint')}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {propertyBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <RechartTooltip content={renderShapesTooltip} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="violation" stackId="issues" fill={severityPalette.violation} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="warning" stackId="issues" fill={severityPalette.warning} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="info" stackId="issues" fill={severityPalette.info} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                {t('viewer.emptyStats')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('viewer.focusNodeBreakdown')}</CardTitle>
            <CardDescription className="text-xs">{t('viewer.focusNodeBreakdownHint')}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {focusNodeBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={focusNodeBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <RechartTooltip content={renderShapesTooltip} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                  <Bar dataKey="violation" stackId="issues" fill={severityPalette.violation} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="warning" stackId="issues" fill={severityPalette.warning} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="info" stackId="issues" fill={severityPalette.info} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                {t('viewer.emptyStats')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('viewer.constraintBreakdown')}</CardTitle>
          <CardDescription className="text-xs">{t('viewer.constraintBreakdownHint')}</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {constraintBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={constraintBreakdown} margin={{ left: 0, right: 16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis hide />
                <RechartTooltip content={renderConstraintTooltip} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              {t('viewer.emptyStats')}
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["segments"]}>
        <AccordionItem value="segments">
          <AccordionTrigger>{t('viewer.exportSegments')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-3">
              {['Violation', 'Warning', 'Info'].map((severity) => (
                <div key={severity} className="rounded-2xl border border-border p-4">
                  <p className="text-sm font-semibold">{t(`severity.${severity.toLowerCase() as 'violation' | 'warning' | 'info'}`)}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportSegment(severity as 'Violation' | 'Warning' | 'Info', 'ttl')}>
                      TTL
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportSegment(severity as 'Violation' | 'Warning' | 'Info', 'csv')}>
                      CSV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const renderResultsView = () => (
    <>
      {renderSummaryCard()}
      
      <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as ResultTab)} className="mt-4">
        <TabsList>
          <TabsTrigger value="results" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('viewer.tabs.results')}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('viewer.tabs.dashboard')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="mt-4 space-y-4">
          {renderBasicCharts()}
          {report && <ValidationResults report={report} />}
        </TabsContent>
        
        <TabsContent value="dashboard" className="mt-4">
          {renderFullDashboard()}
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-display text-2xl font-semibold">{t('viewer.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('viewer.subtitle')}</p>
      </div>

      {viewMode === 'import' ? renderImportView() : renderResultsView()}
    </div>
  );
};

export default ReportViewer;
