import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { History, SunMoon, Palette } from 'lucide-react';

const tokenPresets: Array<{
  id: string;
  labelKey: string;
  descriptionKey: string;
  gradient: string;
  tokens: Record<string, string>;
}> = [
  {
    id: 'zen',
    labelKey: 'settings.tokens.presets.zen.label',
    descriptionKey: 'settings.tokens.presets.zen.description',
    gradient: 'from-emerald-400/60 via-teal-400/60 to-cyan-400/60',
    tokens: {
      '--primary': '162 75% 34%',
      '--accent': '192 82% 36%'
    }
  },
  {
    id: 'midnight',
    labelKey: 'settings.tokens.presets.midnight.label',
    descriptionKey: 'settings.tokens.presets.midnight.description',
    gradient: 'from-slate-800 via-slate-900 to-indigo-900',
    tokens: {
      '--background': '222 47% 8%',
      '--foreground': '210 40% 98%',
      '--primary': '261 73% 66%'
    }
  },
  {
    id: 'citrus',
    labelKey: 'settings.tokens.presets.citrus.label',
    descriptionKey: 'settings.tokens.presets.citrus.description',
    gradient: 'from-amber-300/70 via-orange-400/70 to-rose-400/60',
    tokens: {
      '--primary': '24 94% 52%',
      '--accent': '346 77% 55%'
    }
  }
];

const SettingsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme, updateCustomToken, resetCustomTokens } = useLayout();
  const [workspaceFeedback, setWorkspaceFeedback] = React.useState<'history' | 'theme' | null>(null);

  React.useEffect(() => {
    if (!workspaceFeedback) return;
    const timer = setTimeout(() => setWorkspaceFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [workspaceFeedback]);

  const runWorkspaceAction = (action: 'history' | 'theme') => {
    if (typeof window === 'undefined') return;
    if (action === 'history') {
      window.localStorage.removeItem('shacl-history');
    }
    if (action === 'theme') {
      window.localStorage.removeItem('shacl-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    setWorkspaceFeedback(action);
  };

  const workspaceActions = [
    {
      key: 'history' as const,
      icon: History,
      title: t('settings.workspace.actions.history.title'),
      description: t('settings.workspace.actions.history.description')
    },
    {
      key: 'theme' as const,
      icon: SunMoon,
      title: t('settings.workspace.actions.theme.title'),
      description: t('settings.workspace.actions.theme.description')
    }
  ];

  const applyPreset = (preset: (typeof tokenPresets)[number]) => {
    Object.entries(preset.tokens).forEach(([token, value]) => updateCustomToken(token, value));
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
          <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium">{t('settings.theme')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.themeDescription')}</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </div>
          <p className="text-sm text-muted-foreground">{t('settings.themeNote')}</p>

          <div className="rounded-2xl border border-border/80 bg-card/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{t('settings.tokens.presets.title')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.designTokensDescription')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetCustomTokens}>
                {t('settings.tokens.reset')}
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {tokenPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group rounded-2xl border border-border/80 bg-card/50 p-4 text-left transition hover:border-primary/70"
                >
                  <div className={`mb-3 h-16 w-full rounded-xl bg-gradient-to-r ${preset.gradient}`} aria-hidden="true" />
                  <p className="flex items-center gap-2 font-semibold">
                    <Palette className="h-4 w-4 text-primary" />
                    {t(preset.labelKey)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(preset.descriptionKey)}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.workspace.title')}</CardTitle>
          <CardDescription>{t('settings.workspace.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaceActions.map((action) => (
            <div key={action.key} className="rounded-2xl border border-border/80 bg-card/50 p-4">
              <div className="flex items-center gap-3">
                <action.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => runWorkspaceAction(action.key)}>
                {t('settings.workspace.run')}
              </Button>
            </div>
          ))}
          {workspaceFeedback && (
            <p className="text-xs font-medium text-emerald-500">
              {t(`settings.workspace.feedback.${workspaceFeedback}`)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPanel;
