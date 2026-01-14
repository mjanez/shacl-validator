import * as React from 'react';
import { Dialog, DialogContent } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '../../lib/utils';

const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, React.ComponentPropsWithoutRef<typeof CommandPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive
      ref={ref}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-xl',
        className
      )}
      {...props}
    />
  )
);
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ open, onOpenChange, children }: React.ComponentProps<typeof Dialog>) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="overflow-hidden border border-border/70 bg-popover/95 p-0 text-popover-foreground shadow-2xl backdrop-blur-2xl supports-[backdrop-filter]:bg-popover/80 sm:max-w-lg">
      <Command className="command-k">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center border-b px-3" aria-hidden="true">
      <svg className="mr-2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <CommandPrimitive.Input
        ref={ref}
        className={cn('flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground', className)}
        {...props}
      />
    </div>
  )
);
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<React.ElementRef<typeof CommandPrimitive.List>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.List ref={ref} className={cn('max-h-[400px] overflow-y-auto', className)} {...props} />
  )
);
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Empty>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>(
  (props, ref) => (
    <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm text-muted-foreground" {...props} />
  )
);
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Group>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group ref={ref} className={cn('px-2 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground', className)} {...props} />
  )
);
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn('flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm transition-colors focus:bg-muted focus:text-foreground', className)}
      {...props}
    />
  )
);
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandSeparator = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  )
);
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
};
