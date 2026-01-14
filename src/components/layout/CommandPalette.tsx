import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command';
import { useLayout } from './Layout';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, navItems } = useLayout();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const commands = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        label: t(`nav.${item.key}`),
        description: t(item.descriptionKey)
      })),
    [navItems, t]
  );

  return (
    <CommandDialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder={t('command.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('command.empty')}</CommandEmpty>
        <CommandGroup heading={t('command.navigation')}>
          {commands.map((item) => (
            <CommandItem
              key={item.key}
              onSelect={() => {
                navigate(item.path);
                setCommandPaletteOpen(false);
              }}
              className="flex items-center gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
