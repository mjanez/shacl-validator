import React, { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/skeleton';
import { useLayout } from '../layout/Layout';
import { AlertTriangle, Copy, Check, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

interface MonacoWorkspaceProps {
  value: string;
  onChange: (value: string) => void;
  normalizedContent: string;
  jsonPreview: string;
}

const MonacoWorkspace: React.FC<MonacoWorkspaceProps> = ({ value, onChange, jsonPreview }) => {
  const { t } = useTranslation();
  const { theme } = useLayout();
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';
  const editorTheme = isDark ? 'vs-dark' : 'vs-light';

  const sectionHeaderClass = 'flex min-h-[57px] items-center justify-between border-b border-border px-4 py-2';

  const handleCopyJsonLd = async () => {
    if (!jsonPreview) return;
    try {
      await navigator.clipboard.writeText(jsonPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/70">
        <div className={`${sectionHeaderClass} text-xs text-muted-foreground`}>
          <span className="uppercase tracking-wide">{t('validator.pasteText')}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('validator.supportedFormats')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-[420px]">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <MonacoEditor
              height="100%"
              defaultLanguage="turtle"
              theme={editorTheme}
              value={value}
              onChange={(val) => onChange(val || '')}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                fontSize: 14,
                fontFamily: 'JetBrains Mono',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: 'none'
              }}
            />
          </Suspense>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70">
        <div className={sectionHeaderClass}>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('validator.previewLabel')}</span>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              {t('validator.jsonPreview')}
            </span>
          </div>
          {jsonPreview && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyJsonLd}
                      aria-label={t('validator.copyJsonLd')}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? t('validator.copied') : t('validator.copyJsonLd')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open('https://json-ld.org/', '_blank', 'noopener,noreferrer')}
                      aria-label={t('validator.jsonLdHelp')}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      {t('validator.jsonLdHelp')}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>
        <div className="h-[420px]">
          {jsonPreview ? (
            <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
              <MonacoEditor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={jsonPreview}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono',
                  automaticLayout: true,
                  renderLineHighlight: 'none'
                }}
              />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">{t('validator.previewEmpty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonacoWorkspace;
