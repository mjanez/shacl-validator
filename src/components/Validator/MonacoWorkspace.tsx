import React, { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { useLayout } from '../layout/Layout';

const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

interface MonacoWorkspaceProps {
  value: string;
  onChange: (value: string) => void;
  normalizedContent: string;
  jsonPreview: string;
}

const MonacoWorkspace: React.FC<MonacoWorkspaceProps> = ({ value, onChange, normalizedContent, jsonPreview }) => {
  const [previewTab, setPreviewTab] = useState<'json' | 'turtle'>('json');
  const { t } = useTranslation();
  const { theme } = useLayout();
  const isDark = theme === 'dark';
  const editorTheme = isDark ? 'vs-dark' : 'vs-light';

  const sectionHeaderClass = 'flex min-h-[57px] items-center justify-between border-b border-border px-4 py-2';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/70">
        <div className={`${sectionHeaderClass} text-xs uppercase tracking-wide text-muted-foreground`}>
          {t('validator.pasteText')}
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
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('validator.previewLabel')}</span>
          <Tabs value={previewTab} onValueChange={(value) => setPreviewTab(value as 'json' | 'turtle')}>
            <TabsList className="bg-transparent p-0">
              <TabsTrigger value="json" className="rounded-full px-3 py-1 text-xs">{t('validator.jsonPreview')}</TabsTrigger>
              <TabsTrigger value="turtle" className="rounded-full px-3 py-1 text-xs">{t('validator.normalizedPreview')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[420px]">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <MonacoEditor
              height="100%"
              defaultLanguage={previewTab === 'json' ? 'json' : 'turtle'}
              theme={editorTheme}
              value={previewTab === 'json' ? jsonPreview : normalizedContent}
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
        </div>
      </div>
    </div>
  );
};

export default MonacoWorkspace;
