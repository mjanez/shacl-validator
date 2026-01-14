import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLayout } from './Layout';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { isSidebarOpen, toggleSidebar, navItems } = useLayout();
  const { t } = useTranslation();

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur transition-transform duration-300 lg:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('nav.quickAccess')}</p>
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-full border border-border/60 p-1 text-muted-foreground transition hover:text-foreground"
            aria-label={t('nav.toggleSidebar')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-primary/40'
                    : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                )
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card/90 text-foreground shadow-inner">
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <span>{t(`nav.${item.key}`)}</span>
                <span className="text-xs text-muted-foreground">{t(item.descriptionKey)}</span>
              </div>
            </NavLink>
          ))}
        </nav>
      </aside>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={toggleSidebar} />
      )}
    </>
  );
};

export default Sidebar;
