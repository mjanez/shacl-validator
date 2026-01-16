import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Lightbulb, Search, BookOpen, Shapes, Database, Terminal, Globe, RotateCcw, Code2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui/button';
import appConfig from '../../config/mqa-config.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ReportLine {
    id: string;
    text: string;
    type: 'meta' | 'class' | 'error' | 'warning' | 'info' | 'focus' | 'path' | 'msg' | 'block-start' | 'block-end' | 'spacer';
    explainKey?: string;
}

type ToolLevel = 'cli' | 'web' | null;

const EducationalContent: React.FC = () => {
    const { t } = useTranslation();
    const resourceLinks = appConfig.resourceLinks || [];
    const [selectedLine, setSelectedLine] = useState<ReportLine | null>(null);
    const [glossaryFilter, setGlossaryFilter] = useState('');
    const [toolLevel, setToolLevel] = useState<ToolLevel>(null);

    const concepts = [
        { key: 'rdf', icon: Database, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
        { key: 'shacl', icon: Shapes, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
        { key: 'dcatap', icon: BookOpen, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }
    ];

    const steps = [
        { key: 'selectProfile', title: t('guide.steps.selectProfile') },
        {
            key: 'chooseInput',
            title: t('guide.steps.chooseInput'),
            detail: [
                { title: t('guide.steps.directInputTitle'), description: t('guide.steps.directInputDescription') },
                { title: t('guide.steps.fromUrlTitle'), description: t('guide.steps.fromUrlDescription') }
            ]
        },
        { key: 'validate', title: t('guide.steps.validate') },
        { key: 'review', title: t('guide.steps.review') },
        { key: 'export', title: t('guide.steps.export') },
        {
            key: 'reports',
            title: t('guide.steps.reports'),
            detail: [
                { title: t('guide.steps.reportsUploadTitle'), description: t('guide.steps.reportsUploadDescription') },
                { title: t('guide.steps.reportsVisualizeTitle'), description: t('guide.steps.reportsVisualizeDescription') }
            ]
        }
    ];

    const severityLevels = [
        { key: 'violation', title: t('guide.resultsLevels.violation.title'), description: t('guide.resultsLevels.violation.description'), icon: AlertTriangle, badgeVariant: 'destructive' as const },
        { key: 'warning', title: t('guide.resultsLevels.warning.title'), description: t('guide.resultsLevels.warning.description'), icon: Info, badgeVariant: 'warning' as const },
        { key: 'info', title: t('guide.resultsLevels.info.title'), description: t('guide.resultsLevels.info.description'), icon: CheckCircle2, badgeVariant: 'info' as const }
    ];

    const reportLines: ReportLine[] = [
        { id: 'l1', text: '@prefix sh:   <http://www.w3.org/ns/shacl#> .', type: 'meta' },
        { id: 'l2', text: '@prefix dcat: <http://www.w3.org/ns/dcat#> .', type: 'meta' },
        { id: 'l3', text: '', type: 'spacer' },
        { id: 'l4', text: '[', type: 'block-start' },
        { id: 'l5', text: '  a                 sh:ValidationReport ;', type: 'class', explainKey: 'validationReport' },
        { id: 'l6', text: '  sh:conforms       false ;', type: 'error', explainKey: 'conformsFalse' },
        { id: 'l7', text: '  sh:result         [', type: 'block-start' },
        { id: 'l8', text: '    a                              sh:ValidationResult ;', type: 'class', explainKey: 'validationResult' },
        { id: 'l9', text: '    sh:resultSeverity              sh:Violation ;', type: 'error', explainKey: 'severityViolation' },
        { id: 'l10', text: '    sh:sourceConstraintComponent   sh:MinCountConstraintComponent ;', type: 'info', explainKey: 'minCount' },
        { id: 'l11', text: '    sh:focusNode                   <http://example.org/catalog> ;', type: 'focus', explainKey: 'focusNode' },
        { id: 'l12', text: '    sh:resultPath                  dcat:dataset ;', type: 'path', explainKey: 'resultPath' },
        { id: 'l13', text: '    sh:value                       "invalid-value" ;', type: 'warning', explainKey: 'value' },
        { id: 'l14', text: '    sh:resultMessage               "Less than 1 values on dcat:dataset"@en', type: 'msg', explainKey: 'resultMessage' },
        { id: 'l15', text: '  ] ;', type: 'block-end' },
        { id: 'l16', text: '  sh:result         [', type: 'block-start' },
        { id: 'l17', text: '    a                              sh:ValidationResult ;', type: 'class', explainKey: 'validationResult' },
        { id: 'l18', text: '    sh:resultSeverity              sh:Warning ;', type: 'warning', explainKey: 'severityWarning' },
        { id: 'l19', text: '    sh:sourceConstraintComponent   sh:PatternConstraintComponent ;', type: 'info' },
        { id: 'l20', text: '    sh:focusNode                   <http://example.org/dataset/1> ;', type: 'focus' },
        { id: 'l21', text: '    sh:resultPath                  dcat:identifier ;', type: 'path' },
        { id: 'l22', text: '    sh:value                       "ABC-123" ;', type: 'warning' },
        { id: 'l23', text: '    sh:resultMessage               "Value does not match pattern ^[0-9]+$"@en', type: 'msg' },
        { id: 'l24', text: '  ]', type: 'block-end' },
        { id: 'l25', text: '] .', type: 'block-end' }
    ];

    const glossaryTerms = [
        { key: 'focusNode' },
        { key: 'shape' },
        { key: 'severity' },
        { key: 'target' },
        { key: 'conforms' },
        { key: 'constraintComponent' },
        { key: 'resultPath' },
        { key: 'resultMessage' },
        { key: 'value' },
        { key: 'dcatAp' },
        { key: 'dcatApEs' },
        { key: 'dcat' },
        { key: 'rdf' },
        { key: 'rdfTriple' },
        { key: 'propertyPath' },
        { key: 'w3c' },
        { key: 'nodeShape' },
        { key: 'propertyShape' },
        { key: 'targetClass' },
        { key: 'dataGraph' },
        { key: 'shapesGraph' }
    ];

    const filteredGlossary = useMemo(() => {
        if (!glossaryFilter.trim()) return glossaryTerms;
        const q = glossaryFilter.toLowerCase();
        return glossaryTerms.filter(term => 
            t(`guide.glossary.${term.key}.term`).toLowerCase().includes(q) ||
            t(`guide.glossary.${term.key}.definition`).toLowerCase().includes(q)
        );
    }, [glossaryFilter, t]);

    const getLineClasses = (line: ReportLine) => {
        const base = 'px-2 py-0.5 rounded cursor-pointer transition-colors font-mono text-sm whitespace-pre';
        const selected = selectedLine?.id === line.id ? 'bg-primary/20 border-l-2 border-primary' : '';
        const hover = line.explainKey ? 'hover:bg-muted' : '';
        
        let color = 'text-muted-foreground';
        if (line.type === 'error') color = 'text-red-500 dark:text-red-400 font-medium';
        if (line.type === 'warning') color = 'text-yellow-600 dark:text-yellow-400';
        if (line.type === 'focus') color = 'text-blue-500 dark:text-blue-400';
        if (line.type === 'path') color = 'text-green-600 dark:text-green-400';
        if (line.type === 'msg') color = 'text-foreground';
        
        return `${base} ${selected} ${hover} ${color}`;
    };

    return (
        <div className="space-y-8 py-6">
            {/* Header */}
            <Card className="border-dashed">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-2xl">{t('guide.title')}</CardTitle>
                        <CardDescription>{t('guide.description')}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs uppercase tracking-wide">
                        {t('guide.whatIsShacl')}
                    </Badge>
                </CardHeader>
            </Card>

            {/* Concepts Section */}
            <div className="grid gap-4 md:grid-cols-3">
                {concepts.map(({ key, icon: Icon, color }) => (
                    <Card key={key} className="group cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl">
                        <CardHeader className="pb-2">
                            <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${color}`}>
                                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <CardTitle className="text-lg transition-colors duration-300 group-hover:text-primary">{t(`guide.concepts.${key}.title`)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none text-sm text-muted-foreground dark:prose-invert">
                                <ReactMarkdown>{t(`guide.concepts.${key}.description`)}</ReactMarkdown>
                            </div>
                        </CardContent>
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Card>
                ))}
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="howto" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="howto">{t('guide.tabs.howto')}</TabsTrigger>
                    <TabsTrigger value="tools">{t('guide.tabs.tools')}</TabsTrigger>
                    <TabsTrigger value="decoder">{t('guide.tabs.decoder')}</TabsTrigger>
                    <TabsTrigger value="glossary">{t('guide.tabs.glossary')}</TabsTrigger>
                </TabsList>

                {/* How to Use Tab */}
                <TabsContent value="howto" className="space-y-6 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('guide.howToUse')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-4">
                                {steps.map((step, index) => (
                                    <li key={step.key} className="relative rounded-xl border border-border/60 bg-muted/30 p-4 pl-16">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div className="ml-1">
                                            <p className="font-medium text-foreground">{step.title}</p>
                                            {step.detail && (
                                                <div className="mt-3 grid gap-3 rounded-lg border border-dashed border-border/80 bg-background p-3">
                                                    {step.detail.map((child) => (
                                                        <div key={child.title}>
                                                            <p className="text-sm font-semibold text-foreground">{child.title}</p>
                                                            <p className="text-sm text-muted-foreground">{child.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('guide.understandingResults')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="multiple" className="divide-y divide-border rounded-lg border border-border/80">
                                    {severityLevels.map(({ key, title, description, icon: Icon, badgeVariant }) => (
                                        <AccordionItem key={key} value={key} className="border-0">
                                            <AccordionTrigger className="px-4 text-left">
                                                <div className="flex items-center gap-3">
                                                    <Icon className="h-4 w-4" />
                                                    <span className="font-medium">{title}</span>
                                                    <Badge variant={badgeVariant} className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                                                        {key === 'violation' ? t('severity.violation') : key === 'warning' ? t('severity.warning') : t('severity.info')}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
                                                {description}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('guide.resources.title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {resourceLinks.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm transition hover:border-primary/50 hover:bg-primary/5"
                                    >
                                        <span>{t(`guide.resources.links.${link.id}`)}</span>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                                    </a>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tools Wizard Tab */}
                <TabsContent value="tools" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('guide.tools.title')}</CardTitle>
                            <CardDescription>{t('guide.tools.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Level Selection */}
                            {!toolLevel && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <button
                                        onClick={() => setToolLevel('web')}
                                        className="group rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                            <Globe className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-semibold">{t('guide.tools.web.title')}</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">{t('guide.tools.web.description')}</p>
                                        <Badge variant="outline" className="mt-3">{t('guide.tools.web.badge')}</Badge>
                                    </button>
                                    <button
                                        onClick={() => setToolLevel('cli')}
                                        className="group rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                                            <Terminal className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-semibold">{t('guide.tools.cli.title')}</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">{t('guide.tools.cli.description')}</p>
                                        <Badge variant="outline" className="mt-3">{t('guide.tools.cli.badge')}</Badge>
                                    </button>
                                </div>
                            )}

                            {/* Tool Recommendations */}
                            {toolLevel && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={toolLevel === 'web' ? 'default' : 'outline'} className="text-sm">
                                            {toolLevel === 'web' ? t('guide.tools.web.title') : t('guide.tools.cli.title')}
                                        </Badge>
                                        <Button variant="ghost" size="sm" onClick={() => setToolLevel(null)}>
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {t('guide.tools.restart')}
                                        </Button>
                                    </div>

                                    {toolLevel === 'web' && (
                                        <div className="space-y-4">
                                            {/* This Validator */}
                                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                                        <Sparkles className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold">{t('guide.tools.items.thisApp.title')}</h4>
                                                            <Badge>{t('guide.tools.items.thisApp.badge')}</Badge>
                                                        </div>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.thisApp.description')}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ITB SHACL Validator */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <Globe className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.itb.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.itb.description')}</p>
                                                        <a href="https://www.itb.ec.europa.eu/shacl/any/upload" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openTool')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metadata Quality React */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <Database className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.metadataQuality.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.metadataQuality.description')}</p>
                                                        <a href="https://metadata-quality.mjanez.dev/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openTool')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SHACL Play! */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                        <Shapes className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.shaclPlay.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.shaclPlay.description')}</p>
                                                        <a href="https://shacl-play.sparna.fr/play/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openTool')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {toolLevel === 'cli' && (
                                        <div className="space-y-4">
                                            {/* Apache Jena */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                        <Code2 className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.jena.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.jena.description')}</p>
                                                        <div className="mt-3 overflow-hidden rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                                                            <span className="text-green-400">$</span> shacl validate --shapes shapes.ttl --data data.ttl
                                                        </div>
                                                        <a href="https://jena.apache.org/documentation/shacl/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openDocs')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* pySHACL */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <Terminal className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.pyshacl.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.pyshacl.description')}</p>
                                                        <div className="mt-3 overflow-hidden rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                                                            <span className="text-green-400">$</span> pyshacl -s shapes.ttl -f human data.ttl
                                                        </div>
                                                        <a href="https://github.com/RDFLib/pySHACL" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openDocs')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* easy-rdf-endpoint */}
                                            <div className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                                                        <Terminal className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{t('guide.tools.items.easyRdfEndpoint.title')}</h4>
                                                        <p className="mt-1 text-sm text-muted-foreground">{t('guide.tools.items.easyRdfEndpoint.description')}</p>
                                                        <div className="mt-3 overflow-hidden rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                                                            <span className="text-green-400">$</span> docker-compose up -d
                                                        </div>
                                                        <a href="https://github.com/mjanez/easy-rdf-endpoint" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                            {t('guide.tools.openDocs')} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Interactive Decoder Tab */}
                <TabsContent value="decoder" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('guide.decoder.title')}</CardTitle>
                            <CardDescription>{t('guide.decoder.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Code Block */}
                                <div className="overflow-hidden rounded-xl border border-border bg-slate-900 dark:bg-slate-950">
                                    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
                                        <span className="font-mono text-xs text-slate-400">validation_report.ttl</span>
                                        <div className="flex gap-1.5">
                                            <div className="h-3 w-3 rounded-full bg-red-500" />
                                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                            <div className="h-3 w-3 rounded-full bg-green-500" />
                                        </div>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto p-4 font-mono">
                                        {reportLines.map((line) => (
                                            <div
                                                key={line.id}
                                                className={getLineClasses(line)}
                                                onClick={() => line.explainKey && setSelectedLine(line)}
                                            >
                                                {line.text || '\u00A0'}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Explanation Panel */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex min-h-[300px] flex-col justify-center rounded-xl border border-border bg-card p-6">
                                        {selectedLine?.explainKey ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    {selectedLine.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                                                    {selectedLine.type === 'warning' && <Info className="h-5 w-5 text-yellow-500" />}
                                                    {selectedLine.type === 'focus' && <Search className="h-5 w-5 text-blue-500" />}
                                                    {!['error', 'warning', 'focus'].includes(selectedLine.type) && <Info className="h-5 w-5 text-primary" />}
                                                    <h4 className="font-semibold">{t('guide.decoder.analysisTitle')}</h4>
                                                </div>
                                                <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs">
                                                    {selectedLine.text}
                                                </div>
                                                <ReactMarkdown className="text-sm text-muted-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:font-semibold prose-strong:text-foreground">
                                                    {t(`guide.decoder.explanations.${selectedLine.explainKey}`)}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <Search className="mx-auto mb-3 h-8 w-8 opacity-50" />
                                                <p>{t('guide.decoder.placeholder')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pro Tip */}
                                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/50">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
                                            <div>
                                                <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">{t('guide.decoder.tipTitle')}</h4>
                                                <ReactMarkdown className="mt-1 text-sm text-green-700 dark:text-green-400 prose-code:text-green-800 dark:prose-code:text-green-300 prose-code:bg-green-100 dark:prose-code:bg-green-900/50 prose-code:px-1 prose-code:rounded">
                                                    {t('guide.decoder.tipContent')}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Glossary Tab */}
                <TabsContent value="glossary" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('guide.glossary.title')}</CardTitle>
                            <CardDescription>{t('guide.glossary.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={t('guide.glossary.searchPlaceholder')}
                                    value={glossaryFilter}
                                    onChange={(e) => setGlossaryFilter(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="max-h-[600px] divide-y divide-border overflow-y-auto rounded-lg border">
                                {filteredGlossary.length > 0 ? (
                                    filteredGlossary.map(({ key }) => (
                                        <div key={key} className="p-4 transition-colors hover:bg-muted/50">
                                            <dt className="font-semibold text-foreground">{t(`guide.glossary.${key}.term`)}</dt>
                                            <dd className="prose prose-sm mt-2 max-w-none text-sm text-muted-foreground dark:prose-invert">
                                                <ReactMarkdown>{t(`guide.glossary.${key}.definition`)}</ReactMarkdown>
                                            </dd>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        {t('guide.glossary.noResults')}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EducationalContent;
