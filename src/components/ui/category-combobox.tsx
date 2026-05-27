import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
  parent_id?: string;
  transaction_type: string;
}

interface CategoryComboboxProps {
  categories: CategoryOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  categories,
  value,
  onChange,
  placeholder = 'Selecione uma categoria',
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);

  // Group: parents -> children
  const { parents, childrenByParent, orphans } = React.useMemo(() => {
    const parents = categories.filter(c => !c.parent_id);
    const parentIds = new Set(parents.map(p => p.id));
    const childrenByParent = new Map<string, CategoryOption[]>();
    const orphans: CategoryOption[] = [];
    categories.forEach(c => {
      if (!c.parent_id) return;
      if (parentIds.has(c.parent_id)) {
        const arr = childrenByParent.get(c.parent_id) || [];
        arr.push(c);
        childrenByParent.set(c.parent_id, arr);
      } else {
        orphans.push(c);
      }
    });
    return { parents, childrenByParent, orphans };
  }, [categories]);

  const selected = categories.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.icon} {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue contains "name|id"; match against the searchable text
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            {parents.map(parent => {
              const kids = childrenByParent.get(parent.id) || [];
              return (
                <CommandGroup key={parent.id} heading={`${parent.icon || ''} ${parent.name}`.trim()}>
                  <CommandItem
                    value={`${parent.name}|${parent.id}`}
                    onSelect={() => {
                      onChange(parent.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === parent.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {parent.icon} {parent.name}
                    <span className="ml-2 text-xs text-muted-foreground">(geral)</span>
                  </CommandItem>
                  {kids.map(child => (
                    <CommandItem
                      key={child.id}
                      value={`${parent.name} ${child.name}|${child.id}`}
                      onSelect={() => {
                        onChange(child.id);
                        setOpen(false);
                      }}
                      className="pl-8"
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', value === child.id ? 'opacity-100' : 'opacity-0')}
                      />
                      {child.icon} {child.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {orphans.length > 0 && (
              <CommandGroup heading="Outras">
                {orphans.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name}|${c.id}`}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {c.icon} {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
