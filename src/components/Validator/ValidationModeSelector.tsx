import React from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationMode } from '../../types';
import { Label } from '../ui/label';
import { Sparkles, Database } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ValidationModeSelectorProps {
  mode: ValidationMode;
  onChange: (mode: ValidationMode) => void;
  disabled?: boolean;
}

const ValidationModeSelector: React.FC<ValidationModeSelectorProps> = ({ mode, onChange, disabled = false }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('validator.validationMode')}</Label>
      <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1">
        <button
          onClick={() => onChange('predefined')}
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            mode === 'predefined'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Database className="h-4 w-4" />
          {t('validator.mode.predefined')}
        </button>
        <button
          onClick={() => onChange('custom')}
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            mode === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t('validator.mode.custom')}
        </button>
      </div>
    </div>
  );
};

export default ValidationModeSelector;
