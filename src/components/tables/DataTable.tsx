import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utilities';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileQuestion, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  /** Column identifier. Also used as the default sort/search field. */
  key?: string;
  header: string;
  /** Render function for the cell. */
  accessor?: (item: T, index: number) => React.ReactNode;
  /** Legacy alias of `accessor`. */
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Field used when the table's built-in search is active. */
  searchKey?: string;
  /** Field used for sorting when `sortable` is enabled. */
  sortKey?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  /** Alias of `emptyMessage`. */
  emptyDescription?: string;
  emptyTitle?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  mobileCardRender?: (item: T, index: number) => React.ReactNode;
  /** When set, the table renders its own search field and filters rows. */
  searchPlaceholder?: string;
  /** Caption rendered for assistive technology. */
  caption?: string;
}

function primitiveText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  return '';
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyMessage,
  emptyDescription,
  onRowClick,
  className,
  mobileCardRender,
  searchPlaceholder,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const emptyText = emptyMessage ?? emptyDescription ?? 'There are no items to display in this list.';

  const sortableColumns = useMemo(
    () => columns.filter((column) => column.sortable && resolveSortKey(column)),
    [columns],
  );

  const filteredData = useMemo(() => {
    if (!searchPlaceholder) return data;
    const term = query.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => {
      const record = item as Record<string, unknown>;

      for (const column of columns) {
        const field = column.searchKey ?? column.sortKey ?? column.key;
        if (!field) continue;
        if (primitiveText(record[field]).toLowerCase().includes(term)) return true;
      }

      return Object.values(record).some((value) =>
        primitiveText(value).toLowerCase().includes(term),
      );
    });
  }, [columns, data, query, searchPlaceholder]);

  const sortedData = useMemo(() => {
    if (!sort) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const left = primitiveText((a as Record<string, unknown>)[sort.key]);
      const right = primitiveText((b as Record<string, unknown>)[sort.key]);
      const result = left.localeCompare(right, undefined, { numeric: true });
      return sort.direction === 'asc' ? result : -result;
    });
    return sorted;
  }, [filteredData, sort]);

  const toggleSort = (column: Column<T>) => {
    const field = resolveSortKey(column);
    if (!field) return;
    setSort((current) => {
      if (current?.key !== field) return { key: field, direction: 'asc' };
      if (current.direction === 'asc') return { key: field, direction: 'desc' };
      return null;
    });
  };

  if (loading) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-border bg-surface shadow-xs', className)}>
        <div className="space-y-3 p-4">
          <div className="flex gap-4 border-b border-border pb-3">
            {columns.map((col, i) => (
              <Skeleton key={col.key ?? i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 border-b border-border/60 py-3 last:border-0">
              {columns.map((col, j) => (
                <Skeleton key={col.key ?? j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-xl border border-border bg-surface p-8 text-center shadow-xs', className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-3 text-text-muted">
          <FileQuestion className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
        </div>
        <h4 className="text-base font-semibold text-text-primary">{emptyTitle}</h4>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">{emptyText}</p>
      </div>
    );
  }

  const showEmptyFilteredState = sortedData.length === 0;

  return (
    <div className={cn('w-full', className)}>
      {searchPlaceholder && (
        <div className="mb-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      {showEmptyFilteredState ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-3 text-text-muted">
            <FileQuestion className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
          </div>
          <h4 className="text-base font-semibold text-text-primary">No matching records</h4>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">
            No rows match “{query.trim()}”. Try a different search term.
          </p>
        </div>
      ) : (
        <>
          {mobileCardRender && (
            <div className="space-y-3 md:hidden">
              {sortedData.map((item, index) => (
                <div
                  key={index}
                  onClick={() => onRowClick?.(item)}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(item);
                    }
                  }}
                  className={cn(
                    'rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors',
                    onRowClick && 'cursor-pointer hover:border-brand-soft-border active:bg-surface-2',
                  )}
                >
                  {mobileCardRender(item, index)}
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              'overflow-x-auto rounded-xl border border-border bg-surface shadow-xs',
              mobileCardRender && 'hidden md:block',
            )}
          >
            <table className="w-full border-collapse text-left">
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-surface-2">
                  {columns.map((col) => {
                    const field = resolveSortKey(col);
                    const isSortable = Boolean(col.sortable && field);
                    const isSorted = Boolean(sort && field && sort.key === field);

                    return (
                      <th
                        key={col.key ?? col.header}
                        scope="col"
                        aria-sort={
                          isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined
                        }
                        className={cn(
                          'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary',
                          col.headerClassName,
                        )}
                      >
                        {isSortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col)}
                            className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            {col.header}
                            {isSorted ? (
                              sort?.direction === 'asc' ? (
                                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="h-3 w-3" aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedData.map((item, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-surface-2 active:bg-surface-3',
                    )}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={col.key ?? col.header ?? colIndex}
                        className={cn('px-4 py-3 align-middle text-sm text-text-primary', col.className)}
                      >
                        {col.accessor
                          ? col.accessor(item, rowIndex)
                          : col.render
                            ? col.render(item, rowIndex)
                            : col.key
                              ? primitiveText((item as Record<string, unknown>)[col.key])
                              : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sortableColumns.length > 0 && (
        <p className="mt-2 text-xs text-text-muted">
          {sortedData.length} of {data.length} record{data.length === 1 ? '' : 's'} shown
        </p>
      )}
    </div>
  );
}

function resolveSortKey<T>(column: Column<T>): string | undefined {
  return column.sortKey ?? column.key ?? (column.sortable ? column.searchKey : undefined);
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-lg border border-border-strong bg-surface pl-10 pr-9 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted transition-colors hover:text-text-primary"
          aria-label="Clear search"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
