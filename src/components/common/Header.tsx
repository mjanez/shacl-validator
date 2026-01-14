import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Menu, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import appConfig from '../../config/mqa-config.json';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Switch } from '../ui/switch';
import { useLayout } from '../layout/Layout';
import { cn } from '../../lib/utils';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toggleSidebar, setCommandPaletteOpen, theme, setTheme, navItems } = useLayout();

  const languageOptions = React.useMemo(
    () => [
      { code: 'es', label: t('nav.languageNames.es') },
      { code: 'en', label: t('nav.languageNames.en') }
    ],
    [t]
  );

  const languageFlagMap: Record<string, string> = {
    es: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ea-1f1f8.svg',
    en: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ec-1f1e7.svg'
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const normalizedLanguage = (i18n.language || 'es').split('-')[0];
  const activeLanguage =
    languageOptions.find((option) => option.code === normalizedLanguage) || languageOptions[0];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label={t('nav.toggleSidebar')}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="font-display text-lg font-semibold">
              {t('app.title', { defaultValue: appConfig.app_info.name })}
            </p>
            <p className="hidden text-xs text-muted-foreground md:block">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-2 rounded-full border border-border/60 bg-card/60 px-2 py-1 sm:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              aria-label={t(`nav.${item.key}`)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full">
                {languageFlagMap[activeLanguage.code] ? (
                  <img
                    src={languageFlagMap[activeLanguage.code]}
                    alt={activeLanguage.label}
                    className="h-6 w-6"
                  />
                ) : (
                  <span role="img" aria-label={activeLanguage.label}>
                    🌐
                  </span>
                )}
                <span className="sr-only">{activeLanguage.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  onSelect={() => changeLanguage(option.code)}
                  className={option.code === activeLanguage.code ? 'font-semibold text-foreground' : ''}
                >
                  {languageFlagMap[option.code] ? (
                    <img src={languageFlagMap[option.code]} alt="" className="mr-2 h-4 w-4" />
                  ) : (
                    <span className="mr-2" role="img" aria-label={option.label}>
                      🌐
                    </span>
                  )}
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)}>
                  ⌘K
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('command.open')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <a href={appConfig.app_info.repository} target="_blank" rel="noreferrer" aria-label={t('header.githubAria')}>
                    <Github className="h-5 w-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('header.github')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
            <span className="text-muted-foreground" aria-hidden="true">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              aria-label={t('settings.theme')}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;