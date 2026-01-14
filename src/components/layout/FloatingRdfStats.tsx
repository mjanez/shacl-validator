import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cog, Database, Layers, Minimize2, PanelRightOpen, Server } from 'lucide-react';
import { Button } from '../ui/button';
import { useLayout } from './Layout';

const COLLAPSE_STORAGE_KEY = 'rdf-summary-collapsed';

const metricIconMap = {
  datasets: Database,
  dataServices: Cog,
  distributions: Layers
} as const;

type MetricKey = keyof typeof metricIconMap;

const FloatingRdfStats: React.FC = () => {
  const { rdfStats } = useLayout();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? '1' : '0');
  }, [isCollapsed]);

  const statMetrics = React.useMemo(() => {
    if (!rdfStats) return [];
    return [
      { key: 'datasets' as MetricKey, value: rdfStats.datasets },
      { key: 'dataServices' as MetricKey, value: rdfStats.dataServices },
      { key: 'distributions' as MetricKey, value: rdfStats.distributions }
    ];
  }, [rdfStats]);

  const profileLabel = React.useMemo(() => {
    if (!rdfStats) return '';
    return t(`profiles.names.${rdfStats.profileId}.${rdfStats.profileVersion}`, {
      defaultValue: rdfStats.profileId
    });
  }, [rdfStats, t]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 max-w-[min(380px,calc(100vw-2rem))] sm:bottom-8 sm:right-8">
      {isCollapsed ? (
        <Button
          type="button"
          variant="secondary"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-background/90 px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur"
          onClick={() => setIsCollapsed(false)}
          aria-label={t('nav.stats.expand')}
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
          {t('nav.stats.expand')}
        </Button>
      ) : (
        <div className="pointer-events-auto rounded-3xl border border-border/60 bg-background/95 p-5 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('nav.stats.title')}</p>
              <p className="text-sm font-semibold text-foreground">{t('nav.stats.subtitle')}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsCollapsed(true)}
              aria-label={t('nav.stats.collapse')}
            >
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {rdfStats ? (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-3">
                {rdfStats.profileIcon ? (
                  <img
                    src={rdfStats.profileIcon}
                    alt=""
                    className="h-10 w-14 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-14 items-center justify-center rounded-xl border border-border bg-secondary text-sm font-semibold uppercase text-muted-foreground">
                    {rdfStats.profileId.slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{profileLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('nav.stats.profileContext', {
                      version: rdfStats.profileVersion,
                      branch: rdfStats.profileBranch || 'main'
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {statMetrics.map((metric) => {
                  const Icon = metricIconMap[metric.key];
                  const label = t(`nav.stats.${metric.key}`);
                  return (
                    <div
                      key={metric.key}
                      className="rounded-2xl border border-border/60 bg-card/90 p-3 text-center shadow-sm"
                      title={label}
                    >
                      <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                      <Icon className="mx-auto mt-1 h-4 w-4 text-muted-foreground" aria-label={label} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">{t('nav.stats.empty')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingRdfStats;
