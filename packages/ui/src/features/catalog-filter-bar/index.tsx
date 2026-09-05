'use client';

import { Search } from 'lucide-react';
import { Button, Input, Select } from '../../shared/ui';
import { cn } from '../../shared/utils';

export interface CatalogFilterOption {
  value: string;
  label: string;
}

export interface CatalogFilterSelect {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: CatalogFilterOption[];
  placeholder?: string;
  minWidth?: string;
}

export interface CatalogFilterBarProps {
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  selects: CatalogFilterSelect[];
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}

export function CatalogFilterBar({
  searchId,
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  selects,
  onClear,
  showClear = false,
  className,
}: CatalogFilterBarProps) {
  const hasActiveFilters =
    showClear || search.length > 0 || selects.some((select) => select.value.length > 0);

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row lg:items-center gap-3 rounded-2xl border border-cinema-border/70 bg-cinema-surface/40 p-3 md:p-4',
        className
      )}
    >
      <div className="w-full lg:flex-1 lg:min-w-0">
        <label htmlFor={searchId} className="sr-only">
          {searchLabel}
        </label>
        <Input
          id={searchId}
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          iconLeft={<Search className="w-[18px] h-[18px]" />}
          clearable
          onClear={() => onSearchChange('')}
        />
      </div>

      <div className="flex items-center gap-3 flex-nowrap shrink-0">
        {selects.map((select) => (
          <Select
            key={select.id}
            id={select.id}
            aria-label={select.label}
            value={select.value}
            onChange={(e) => select.onChange(e.target.value)}
            wrapperClassName={cn(
              'w-[calc(50%-6px)] sm:w-auto shrink-0',
              select.minWidth ?? 'sm:min-w-[160px]'
            )}
          >
            <option value="">{select.placeholder ?? select.label}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}

        {hasActiveFilters && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="shrink-0 whitespace-nowrap"
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
