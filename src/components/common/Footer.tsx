import React from 'react';
import { useTranslation } from 'react-i18next';
import appConfig from '../../config/mqa-config.json';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const footerLinks = appConfig.app_info.footerLinks || [];
  return (
    <footer className="border-t border-border bg-background/90">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <p>
          &copy; {new Date().getFullYear()} {t('app.title', { defaultValue: appConfig.app_info.name })}. {t('footer.openSource')}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {footerLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              {t(`footer.links.${link.id}`)}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;