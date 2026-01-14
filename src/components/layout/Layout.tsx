import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import Sidebar from './Sidebar';
import Header from '../common/Header';
import Footer from '../common/Footer';
import FloatingRdfStats from './FloatingRdfStats';
import { Home, FileBarChart2, BookOpenCheck, Settings, type LucideIcon } from 'lucide-react';

interface NavItem {
  key: string;
  path: string;
  icon: LucideIcon;
  descriptionKey: string;
}
const CUSTOM_TOKEN_KEY = 'shacl-custom-tokens';
const TRACKED_TOKENS = ['--background', '--foreground', '--primary', '--accent', '--border', '--radius'];

interface RdfStats {
  datasets: number;
  dataServices: number;
  distributions: number;
  profileId: string;
  profileVersion: string;
  profileBranch?: string;
  profileIcon?: string;
}

interface LayoutContextValue {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  navItems: NavItem[];
  tokenValues: Record<string, string>;
  updateCustomToken: (token: string, value: string) => void;
  resetCustomTokens: () => void;
  rdfStats: RdfStats | null;
  setRdfStats: React.Dispatch<React.SetStateAction<RdfStats | null>>;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

const NAV_ITEMS: NavItem[] = [
  { key: 'validator', path: '/', icon: Home, descriptionKey: 'nav.descriptions.validator' },
  { key: 'viewer', path: '/viewer', icon: FileBarChart2, descriptionKey: 'nav.descriptions.viewer' },
  { key: 'guide', path: '/guide', icon: BookOpenCheck, descriptionKey: 'nav.descriptions.guide' },
  { key: 'settings', path: '/settings', icon: Settings, descriptionKey: 'nav.descriptions.settings' }
];

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within Layout');
  return ctx;
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('shacl-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [customTokens, setCustomTokens] = useState<Record<string, string>>({});
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({});
  const [rdfStats, setRdfStats] = useState<RdfStats | null>(null);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('shacl-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(CUSTOM_TOKEN_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        const sanitized: Record<string, string> = {};
        Object.entries(parsed).forEach(([token, value]) => {
          if (typeof value === 'string') {
            sanitized[token] = value;
            document.documentElement.style.setProperty(token, value);
          }
        });
        setCustomTokens(sanitized);
      } catch (error) {
        console.warn('Failed to parse stored tokens', error);
      }
    }
    const computed = getComputedStyle(document.documentElement);
    const initialValues: Record<string, string> = {};
    TRACKED_TOKENS.forEach((token) => {
      initialValues[token] = computed.getPropertyValue(token).trim();
    });
    setTokenValues(initialValues);
  }, []);

  const updateCustomToken = (token: string, value: string) => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty(token, value);
    setCustomTokens((prev) => {
      const next = { ...prev, [token]: value };
      window.localStorage.setItem(CUSTOM_TOKEN_KEY, JSON.stringify(next));
      return next;
    });
    setTokenValues((prev) => ({ ...prev, [token]: value }));
  };

  const resetCustomTokens = () => {
    if (typeof window === 'undefined') return;
    Object.keys(customTokens).forEach((token) => {
      document.documentElement.style.removeProperty(token);
    });
    window.localStorage.removeItem(CUSTOM_TOKEN_KEY);
    setCustomTokens({});
    const computed = getComputedStyle(document.documentElement);
    const refreshed: Record<string, string> = {};
    TRACKED_TOKENS.forEach((token) => {
      refreshed[token] = computed.getPropertyValue(token).trim();
    });
    setTokenValues(refreshed);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsCommandPaletteOpen(false);
  }, [location.pathname]);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
      closeSidebar: () => setIsSidebarOpen(false),
      isCommandPaletteOpen,
      setCommandPaletteOpen: setIsCommandPaletteOpen,
      theme,
      setTheme,
      navItems: NAV_ITEMS,
      tokenValues,
      updateCustomToken,
      resetCustomTokens,
      rdfStats,
      setRdfStats
    }),
    [isSidebarOpen, isCommandPaletteOpen, theme, tokenValues, rdfStats]
  );

  return (
    <LayoutContext.Provider value={value}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="main-shell">
          <div className="relative flex w-full flex-col">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10">
              {children}
            </main>
            <Footer />
          </div>
        </div>
        <Sidebar />
        <FloatingRdfStats />
        <CommandPalette />
      </div>
    </LayoutContext.Provider>
  );
};

export default Layout;
