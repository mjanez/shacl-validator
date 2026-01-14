import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { SHACLReport } from '../../types';
import ValidationResults from '../Validator/ValidationResults';
import SHACLValidationService from '../../services/SHACLValidationService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { AlertTriangle, Upload, ClipboardList, X } from 'lucide-react';
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

const ReportViewer: React.FC = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<SHACLReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<InputMode>('upload');
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
    } catch (err: any) {
      console.error(err);
      setError(`${t('viewer.error')} ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileContent = useCallback((content: string, fileName: string) => {
    setInputText(content);
    setUploadedFileName(fileName);
    setMode('upload');
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

  const severityData = useMemo(() => {
    if (!report) return [];
    return [
      { name: t('severity.violation'), value: report.violations.length, color: severityPalette.violation },
      { name: t('severity.warning'), value: report.warnings.length, color: severityPalette.warning },
      { name: t('severity.info'), value: report.infos.length, color: severityPalette.info }
    ];
  }, [report, t]);

  const topShapeBreakdown = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { violation: number; warning: number; info: number }>();
    const track = (list: SHACLReport['violations'], type: 'violation' | 'warning' | 'info') => {
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
        name,
        ...counts,
        total: counts.violation + counts.warning + counts.info
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [report]);

  const renderShapesTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card/90 px-3 py-2 text-xs">
        <p className="font-semibold">{datum.name}</p>
        <p className="text-destructive">{t('severity.violation')}: {datum.violation}</p>
        <p className="text-amber-600">{t('severity.warning')}: {datum.warning}</p>
        <p className="text-sky-600">{t('severity.info')}: {datum.info}</p>
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/70 p-6">
        <h2 className="font-display text-2xl font-semibold">{t('viewer.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('viewer.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('viewer.import')}</CardTitle>
          <CardDescription>{t('viewer.importDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as InputMode)}>
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

      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('viewer.severityBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {severityData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                          {severityData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {severityData.map((entry) => (
                        <Badge key={entry.name} style={{ backgroundColor: entry.color }} className="text-white">
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
              <CardHeader>
                <CardTitle>{t('viewer.topShapes')}</CardTitle>
                <CardDescription>{t('viewer.topShapesHint')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {topShapeBreakdown.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topShapeBreakdown} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                      <RechartTooltip content={renderShapesTooltip} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                      <Bar dataKey="violation" stackId="issues" fill={severityPalette.violation} radius={[0, 6, 6, 0]} />
                      <Bar dataKey="warning" stackId="issues" fill={severityPalette.warning} radius={[0, 6, 6, 0]} />
                      <Bar dataKey="info" stackId="issues" fill={severityPalette.info} radius={[0, 6, 6, 0]} />
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

          <ValidationResults report={report} />
        </>
      )}
    </div>
  );
};

export default ReportViewer;