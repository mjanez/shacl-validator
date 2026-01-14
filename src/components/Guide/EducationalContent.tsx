import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ExternalLink, Info } from 'lucide-react';
import appConfig from '../../config/mqa-config.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Separator } from '../ui/separator';

const EducationalContent: React.FC = () => {
    const { t } = useTranslation();
    const resourceLinks = appConfig.resourceLinks || [];

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
        {
            key: 'violation',
            title: t('guide.resultsLevels.violation.title'),
            description: t('guide.resultsLevels.violation.description'),
            icon: AlertTriangle,
            badgeVariant: 'destructive' as const
        },
        {
            key: 'warning',
            title: t('guide.resultsLevels.warning.title'),
            description: t('guide.resultsLevels.warning.description'),
            icon: Info,
            badgeVariant: 'warning' as const
        },
        {
            key: 'info',
            title: t('guide.resultsLevels.info.title'),
            description: t('guide.resultsLevels.info.description'),
            icon: CheckCircle2,
            badgeVariant: 'info' as const
        }
    ];

    return (
        <div className="space-y-8 py-6">
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

            <Card>
                <CardHeader>
                    <CardTitle>{t('guide.howToUse')}</CardTitle>
                    <CardDescription>{t('guide.steps.chooseInput')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-6">
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
                        <CardDescription>{t('results.detailsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="divide-y divide-border rounded-lg border border-border/80">
                            {severityLevels.map(({ key, title, description, icon: Icon, badgeVariant }) => (
                                <AccordionItem key={key} value={key} className="border-0">
                                    <AccordionTrigger className="px-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-4 w-4" aria-hidden="true" />
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
                        <CardDescription>{t('home.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {resourceLinks.map((link) => (
                            <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm transition hover:border-primary/50 hover:bg-primary/5"
                            >
                                <span>{t(`guide.resources.links.${link.id}`)}</span>
                                <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
                            </a>
                        ))}
                        <Separator />
                        <p className="text-xs text-muted-foreground">{t('validator.corsWarning')}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EducationalContent;