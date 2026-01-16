import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SHACLValidationService from './services/SHACLValidationService';
import { ProfileSelection, SHACLReport } from './types';
import Layout from './components/layout/Layout';
import { Button } from './components/ui/button';
import { BookOpenCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';

const ValidatorInput = lazy(() => import('./components/Validator/ValidatorInput'));
const ValidationResults = lazy(() => import('./components/Validator/ValidationResults'));
const ReportViewer = lazy(() => import('./components/Viewer/ReportViewer'));
const EducationalContent = lazy(() => import('./components/Guide/EducationalContent'));
const SettingsPanel = lazy(() => import('./components/Settings/SettingsPanel'));

const AppRouter: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [report, setReport] = React.useState<SHACLReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleValidate = async (content: string, profile: ProfileSelection) => {
    setIsLoading(true);
    setReport(null);
    const normalizedLanguage = (i18n.language || 'es').split('-')[0];
    try {
      const result = await SHACLValidationService.validateRDF(
        content,
        profile.profile,
        'text/turtle',
        normalizedLanguage,
        profile.branch
      );
      setReport(result);
    } catch (error) {
      console.error('Validation error:', error);
      // Handle error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-display text-3xl font-semibold text-foreground">{t('home.title')}</p>
                    <p className="mt-2 max-w-2xl text-base text-muted-foreground">{t('home.subtitle')}</p>
                  </div>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-12 w-12 rounded-full border border-border/70 shadow-sm"
                          aria-label={t('home.docsCta') || 'Guide'}
                        >
                          <Link to="/guide">
                            <BookOpenCheck className="h-5 w-5" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-sm">{t('home.docsCta')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </section>

              <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div></div>}>
                <ValidatorInput onValidate={handleValidate} isLoading={isLoading} />
              </Suspense>

              {report && (
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div></div>}>
                  <ValidationResults report={report} />
                </Suspense>
              )}
            </div>
          }
        />
        <Route path="/viewer" element={<Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div></div>}><ReportViewer /></Suspense>} />
        <Route path="/guide" element={<Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div></div>}><EducationalContent /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div></div>}><SettingsPanel /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default AppRouter;