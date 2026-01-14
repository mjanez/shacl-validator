import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHACLReport, SHACLSeverity, SHACLMessage } from '../../types';
import SHACLValidationService from '../../services/SHACLValidationService';
import ReactMarkdown from 'react-markdown';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  CheckCircle2,
  CheckCheck,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  XCircle
} from 'lucide-react';
import * as Comlink from 'comlink';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '../../lib/utils';
import type { ReportWorkerApi, FlattenedRow } from '../../workers/reportWorker';

interface ValidationResultsProps {
  report: SHACLReport;
}

const HISTORY_KEY = 'shacl-history';

const severityChips: Array<{ key: 'all' | 'violation' | 'warning' | 'info'; labelKey: string }> = [
  { key: 'all', labelKey: 'filter.all' },
  { key: 'violation', labelKey: 'severity.violation' },
  { key: 'warning', labelKey: 'severity.warning' },
  { key: 'info', labelKey: 'severity.info' }
];

const iriPrefixes: Array<{ iri: string; prefix: string }> = [
  { iri: 'http://www.w3.org/ns/adms#', prefix: 'adms' },
  { iri: 'http://www.w3.org/2011/content#', prefix: 'cnt' },
  { iri: 'http://www.w3.org/ns/dcat#', prefix: 'dcat' },
  { iri: 'http://data.europa.eu/r5r/', prefix: 'dcatap' },
  { iri: 'http://purl.org/dc/terms/', prefix: 'dct' },
  { iri: 'http://data.europa.eu/eli/ontology#', prefix: 'eli' },
  { iri: 'http://xmlns.com/foaf/0.1/', prefix: 'foaf' },
  { iri: 'http://www.opengis.net/ont/geosparql#', prefix: 'geo' },
  { iri: 'http://www.w3.org/ns/locn#', prefix: 'locn' },
  { iri: 'http://www.w3.org/ns/odrl/2/', prefix: 'odrl' },
  { iri: 'http://www.w3.org/ns/prov#', prefix: 'prov' },
  { iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', prefix: 'rdf' },
  { iri: 'http://www.w3.org/2000/01/rdf-schema#', prefix: 'rdfs' },
  { iri: 'http://schema.org/', prefix: 'schema' },
  { iri: 'http://www.w3.org/2004/02/skos/core#', prefix: 'skos' },
  { iri: 'http://spdx.org/rdf/terms#', prefix: 'spdx' },
  { iri: 'http://www.w3.org/2006/time#', prefix: 'time' },
  { iri: 'http://www.w3.org/2006/vcard/ns#', prefix: 'vcard' },
  { iri: 'http://www.w3.org/2001/XMLSchema#', prefix: 'xsd' },
  { iri: 'http://www.w3.org/ns/dqv#', prefix: 'dqv' },
  { iri: 'http://www.w3.org/ns/shacl#', prefix: 'sh' },
  { iri: 'http://www.w3.org/2002/07/owl#', prefix: 'owl' }
];

const compactIri = (value?: string) => {
  if (!value) return '—';
  const match = iriPrefixes.find((entry) => value.startsWith(entry.iri));
  if (match) {
    return `${match.prefix}:${value.slice(match.iri.length)}`;
  }
  const hashIndex = value.lastIndexOf('#');
  if (hashIndex >= 0 && hashIndex < value.length - 1) {
    return value.slice(hashIndex + 1);
  }
  const slashIndex = value.lastIndexOf('/');
  if (slashIndex >= 0 && slashIndex < value.length - 1) {
    return value.slice(slashIndex + 1);
  }
  return value;
};

const isHttpUri = (value?: string) => !!value && /^https?:\/\//i.test(value);

const renderLinkedValue = (value?: string, label?: string) => {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  const display = label || value;
  if (!isHttpUri(value)) {
    return (
      <span className="line-clamp-2 break-all font-mono" title={value}>
        {display}
      </span>
    );
  }
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1 text-primary underline-offset-2 transition hover:underline"
      title={value}
    >
      <span className="line-clamp-2 break-all font-mono">{display}</span>
      <ExternalLink className="h-3 w-3 opacity-70 transition group-hover:opacity-100" />
    </a>
  );
};

const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 transition hover:underline"
    >
      {props.children}
      <ExternalLink className="h-3 w-3" />
    </a>
  ),
  p: ({ node, ...props }: any) => (
    <p className="text-sm leading-snug text-foreground" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="ml-6 list-disc text-sm leading-snug text-foreground" {...props} />
  )
};

/**
 * Converts pipe-separated text to bullet list and ensures URLs render as links.
 * Preserves markdown tables.
 */
const preprocessMarkdown = (text: string): string => {
  const isMarkdownTable = /^\s*\|?.+\|.+\n\s*\|?\s*[-:\s|]+\|/.test(text);
  if (isMarkdownTable) {
    return text;
  }

  const hasPipeSeparators = /\s*\|\s*/.test(text);
  if (!hasPipeSeparators) {
    return text;
  }

  let processed = text.replace(/\s*\|\s*/g, '\n- ');
  processed = processed.replace(
    /<?(https?:\/\/[^\s<>)]+)>?/gi,
    (match, url) => `[${url}](${url})`
  );

  return processed;
};

const normalizeLang = (lang?: string | null): string | undefined => {
  if (!lang) return undefined;
  return lang.toLowerCase().split('-')[0];
};

const fingerprintMessages = (messages: SHACLMessage[] = []): string => {
  if (!messages.length) return '__empty__';
  return messages
    .map((msg) => `${normalizeLang(msg.lang) || 'und'}::${msg.text}`)
    .join('||');
};

const selectMessageForLocale = (messages: SHACLMessage[], preferred?: string, fallback: string = 'es'): string | undefined => {
  if (!messages?.length) return undefined;
  const normalizedPreferred = normalizeLang(preferred) || fallback;
  const normalizedFallback = normalizeLang(fallback) || normalizedPreferred;

  const exactMatch = messages.find((msg) => normalizeLang(msg.lang) === normalizedPreferred);
  if (exactMatch) return exactMatch.text;

  const fallbackMatch = messages.find((msg) => normalizeLang(msg.lang) === normalizedFallback);
  if (fallbackMatch) return fallbackMatch.text;

  const noLang = messages.find((msg) => !msg.lang);
  return (noLang || messages[0]).text;
};

interface GroupedFinding {
  id: string;
  severity: SHACLSeverity;
  messages: SHACLMessage[];
  sourceShape?: string;
  sourceConstraintComponent?: string;
  foafPage?: string;
  occurrences: Array<{ id: string; focusNode?: string; path?: string; value?: string }>;
  total: number;
}

const severityRanking: Record<SHACLSeverity, number> = {
  Violation: 0,
  Warning: 1,
  Info: 2
};

const severityVisuals: Record<SHACLSeverity, { dot: string; pill: string }> = {
  Violation: {
    dot: 'bg-destructive',
    pill: 'bg-destructive/15 text-destructive'
  },
  Warning: {
    dot: 'bg-amber-500',
    pill: 'bg-amber-200/40 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100'
  },
  Info: {
    dot: 'bg-sky-500',
    pill: 'bg-sky-200/40 text-sky-700 dark:bg-sky-400/20 dark:text-sky-100'
  }
};

const MAX_VISIBLE_FINDINGS = 10;
const RESULT_CARD_ESTIMATED_HEIGHT = 210;

const ValidationResults: React.FC<ValidationResultsProps> = ({ report }) => {
  const { t, i18n } = useTranslation();
  const activeLanguage = normalizeLang(i18n.language) || 'es';
  const [rows, setRows] = useState<FlattenedRow[]>([]);
  const [summary, setSummary] = useState({ violation: 0, warning: 0, info: 0, total: 0 });
  const [history, setHistory] = useState<Array<{ timestamp: string; total: number }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [severityFilter, setSeverityFilter] = useState<'all' | 'violation' | 'warning' | 'info'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const workerRef = useRef<Comlink.Remote<ReportWorkerApi> | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/reportWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = Comlink.wrap<ReportWorkerApi>(worker);
    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!workerRef.current) return;
      const { rows: flattened, summary: stats } = await workerRef.current.flattenReport(report);
      if (cancelled) return;
      setRows(flattened);
      setSummary(stats);
      const nextHistory = [{ timestamp: report.timestamp || new Date().toISOString(), total: stats.total }, ...history].slice(0, 10);
      setHistory(nextHistory);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  const filteredRows = useMemo(() => {
    if (severityFilter === 'all') return rows;
    return rows.filter((row) => row.severity.toLowerCase().includes(severityFilter));
  }, [rows, severityFilter]);

  const groupedFindings = useMemo<GroupedFinding[]>(() => {
    const map = new Map<string, GroupedFinding>();
    filteredRows.forEach((row, index) => {
      const messageFingerprint = fingerprintMessages(row.message);
      const key = `${row.severity}-${row.sourceShape}-${row.sourceConstraintComponent}-${messageFingerprint}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          severity: row.severity,
          messages: row.message || [],
          sourceShape: row.sourceShape,
          sourceConstraintComponent: row.sourceConstraintComponent,
          foafPage: row.foafPage,
          occurrences: [],
          total: 0
        });
      }
      const group = map.get(key)!;
      const existingFingerprint = fingerprintMessages(group.messages);
      if (existingFingerprint !== messageFingerprint) {
        group.messages = row.message || [];
      }
      group.occurrences.push({
        id: `${key}-${group.occurrences.length}-${index}`,
        focusNode: row.focusNode,
        path: row.path,
        value: row.value
      });
      group.total += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      if (severityRanking[a.severity] !== severityRanking[b.severity]) {
        return severityRanking[a.severity] - severityRanking[b.severity];
      }
      return b.total - a.total;
    });
  }, [filteredRows]);

  useEffect(() => {
    setExpandedGroups({});
  }, [severityFilter, report]);

  const scrollNeeded = groupedFindings.length > MAX_VISIBLE_FINDINGS;
  const scrollContainerStyle = scrollNeeded
    ? { maxHeight: `${MAX_VISIBLE_FINDINGS * RESULT_CARD_ESTIMATED_HEIGHT}px` }
    : undefined;

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const downloadTTL = async () => {
    const ttl = await SHACLValidationService.exportReportAsTurtle(report);
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shacl-report-${new Date().toISOString()}.ttl`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = async () => {
    const csv = await SHACLValidationService.exportReportAsCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `shacl-report-${new Date().toISOString()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              {report.conforms ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {report.conforms ? t('results.conforms') : t('results.notConforms')}
            </CardTitle>
            <CardDescription>{t('results.summary', { violations: summary.violation, warnings: summary.warning, infos: summary.info })}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTTL}>
              <Download className="h-4 w-4" />
              {t('results.downloadTTL')}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadCSV}>
              <FileSpreadsheet className="h-4 w-4" />
              {t('results.downloadCSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: t('severity.violation'), value: summary.violation, accent: 'text-destructive' },
              { label: t('severity.warning'), value: summary.warning, accent: 'text-yellow-500' },
              { label: t('severity.info'), value: summary.info, accent: 'text-blue-500' },
              { label: t('results.totalShapes'), value: summary.total, accent: 'text-foreground' }
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
                <p className={cn('mt-2 text-3xl font-semibold', card.accent)}>{card.value}</p>
                {card.label === t('results.totalShapes') && history.length > 0 && (
                  <div className="mt-3 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history.slice(0, 7).reverse()}>
                        <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('results.details')}</CardTitle>
            <CardDescription>{t('results.detailsDescription')}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {severityChips.map((chip) => (
              <Button
                key={chip.key}
                size="sm"
                variant={chip.key === severityFilter ? 'default' : 'ghost'}
                onClick={() => setSeverityFilter(chip.key)}
                className="gap-2"
              >
                {chip.key !== 'all' && <Filter className="h-3 w-3" />}
                {t(chip.labelKey)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {groupedFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <CheckCheck className="h-10 w-10 text-green-500" />
              <p>{t('results.noIssues')}</p>
            </div>
          ) : (
            <div className="relative">
              <div
                className={cn(
                  'space-y-4 transition-all duration-300',
                  scrollNeeded &&
                    'overflow-y-auto pr-2 [scrollbar-color:hsl(var(--primary)_/_0.5)_transparent] [scrollbar-width:thin]'
                )}
                style={scrollContainerStyle}
              >
                {groupedFindings.map((group) => {
                  const severityKey = group.severity.toLowerCase() as 'violation' | 'warning' | 'info';
                  const visuals = severityVisuals[group.severity];
                  const affectedLabel = group.total === 1 ? t('results.affectedSingle') : t('results.affectedPlural', { count: group.total });
                  const isOpen = expandedGroups[group.id] ?? false;
                  const localizedMessage = group.messages.length ? selectMessageForLocale(group.messages, activeLanguage) : undefined;
                  const messageToRender = localizedMessage || t('table.message');

                  return (
                    <div key={group.id} className="rounded-2xl border border-border/80 bg-card/60 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={cn('h-2 w-2 rounded-full', visuals.dot)} aria-hidden="true" />
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', visuals.pill)}>
                              {t(`severity.${severityKey}`)}
                            </span>
                            {group.foafPage && (
                              <a
                                href={group.foafPage}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {t('results.documentationLink')}
                              </a>
                            )}
                          </div>
                          <div className="space-y-2">
                            <ReactMarkdown className="space-y-1 text-sm leading-snug text-foreground" components={markdownComponents}>
                              {preprocessMarkdown(messageToRender)}
                            </ReactMarkdown>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {group.sourceShape && (
                              <span className="font-mono" title={group.sourceShape}>
                                {compactIri(group.sourceShape)}
                              </span>
                            )}
                            {group.sourceConstraintComponent && (
                              <Badge variant="outline" className="rounded-md px-2 py-0 text-[11px] uppercase tracking-tight" title={group.sourceConstraintComponent}>
                                {compactIri(group.sourceConstraintComponent)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-sm font-medium">
                            {affectedLabel}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-xs uppercase tracking-wide"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
                            {isOpen ? t('results.hideOccurrences') : t('results.showOccurrences')}
                          </Button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
                          <div className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.4fr)] gap-4 border-b border-border/60 bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>{t('table.focusNode')}</span>
                            <span>{t('table.path')}</span>
                            <span>{t('table.value')}</span>
                          </div>
                          {group.occurrences.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.4fr)] gap-4 px-4 py-3 text-xs text-foreground odd:bg-card/40"
                            >
                              <div className="min-w-0">{renderLinkedValue(item.focusNode)}</div>
                              <div className="min-w-0">{renderLinkedValue(item.path, compactIri(item.path))}</div>
                              <div className="min-w-0">{renderLinkedValue(item.value)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {scrollNeeded && (
                <div className="pointer-events-none absolute inset-x-1 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background)/0.7)] to-transparent" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationResults;
