'use client'

import * as React from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  type RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDown,
  ArrowUp,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/shared/GlassCard'
import { ListSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ------------------------------------------------------------------ */
/* Module augmentation — rich column meta                              */
/* ------------------------------------------------------------------ */

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human label used for the column-visibility menu and CSV headers. */
    label?: string
    /** Marks the trailing actions column (excluded from CSV export). */
    isActions?: boolean
    /** Custom CSV cell value (defaults to the accessor value). */
    csv?: (row: TData) => string | number
    /** Horizontal alignment hint applied to th/td. */
    align?: 'left' | 'center' | 'right'
  }
}

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type DataTableFacet = {
  columnId: string
  label: string
  options: { value: string; label: string }[]
}

export type DataTableEmptyState = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  loadingRows?: number
  emptyState?: DataTableEmptyState
  searchPlaceholder?: string
  /** Select-based single-value filters mapped onto column filters. */
  facets?: DataTableFacet[]
  /** Adds a selection checkbox column + bulk-action bar. */
  enableSelection?: boolean
  /** Rendered in the bulk bar when rows are selected. */
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode
  /** Extra toolbar content on the right (e.g. a "New course" button). */
  toolbarExtra?: React.ReactNode
  onRefresh?: () => void
  /** Enables the CSV export button (filtered + sorted rows, visible columns). */
  enableExport?: boolean
  exportFileName?: string
  initialSorting?: SortingState
  getRowId?: (row: TData) => string
  /** Scrollable body height class. */
  bodyClassName?: string
  /** Column ids hidden when the table first renders. */
  hiddenByDefault?: string[]
  pageSize?: number
}

export const SELECT_COLUMN_ID = 'select'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const csvEscape = (value: string | number): string => {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function makeSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
    size: 36,
    meta: { label: 'Select' },
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  }
}

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  loadingRows = 6,
  emptyState,
  searchPlaceholder = 'Search…',
  facets = [],
  enableSelection = false,
  bulkActions,
  toolbarExtra,
  onRefresh,
  enableExport = true,
  exportFileName = 'export',
  initialSorting = [],
  getRowId,
  bodyClassName,
  hiddenByDefault = [],
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    Object.fromEntries(hiddenByDefault.map((id) => [id, false])),
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize })
  const [dense, setDense] = React.useState(false)

  const allColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    const base = enableSelection ? [makeSelectionColumn<TData>(), ...columns] : columns
    // Default header text to the column's meta label (falls back to the id)
    return base.map((c) =>
      c.header != null
        ? c
        : {
            ...c,
            header: () => c.meta?.label ?? c.id,
          },
    )
  }, [enableSelection, columns])

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, columnFilters, columnVisibility, rowSelection, pagination },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    enableRowSelection: enableSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  /* Reset to first page whenever the data or filters change */
  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [globalFilter, columnFilters, data])

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = data.length
  const selectedCount = Object.keys(rowSelection).length
  const isFiltered = globalFilter.trim() !== '' || columnFilters.length > 0
  const isSearching = globalFilter.trim() !== ''

  const { pageIndex, pageSize: size } = table.getState().pagination
  const from = filteredCount === 0 ? 0 : pageIndex * size + 1
  const to = Math.min(filteredCount, (pageIndex + 1) * size)

  const facetValue = (columnId: string) =>
    (table.getColumn(columnId)?.getFilterValue() as string | undefined) ?? 'all'

  const setFacetValue = (columnId: string, value: string) => {
    table.getColumn(columnId)?.setFilterValue(value === 'all' ? undefined : value)
  }

  const resetAllFilters = () => {
    setGlobalFilter('')
    setColumnFilters([])
  }

  /* ---------------- CSV export ---------------- */

  const exportCsv = () => {
    const exportCols = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== SELECT_COLUMN_ID && !c.columnDef.meta?.isActions)

    const header = exportCols.map((c) => csvEscape(c.columnDef.meta?.label ?? c.id))
    const body = table.getSortedRowModel().rows.map((row) =>
      exportCols
        .map((c) => {
          const meta = c.columnDef.meta
          const raw = meta?.csv ? meta.csv(row.original) : row.getValue(c.id)
          return csvEscape(raw == null ? '' : (raw as string | number))
        })
        .join(','),
    )

    const csv = ['\uFEFF', header.join(','), ...body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------------- Render ---------------- */

  return (
    <GlassCard className="flex flex-col overflow-hidden p-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
            aria-label={searchPlaceholder}
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {facets.map((f) => (
          <Select
            key={f.columnId}
            value={facetValue(f.columnId)}
            onValueChange={(v) => setFacetValue(f.columnId, v)}
          >
            <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-36" aria-label={f.label}>
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.label}: all</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          {toolbarExtra}
          {isFiltered && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={resetAllFilters}>
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          )}

          {/* Density */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDense((d) => !d)}
            title={dense ? 'Comfortable rows' : 'Compact rows'}
            aria-label="Toggle row density"
          >
            <Rows3 className="h-4 w-4" />
          </Button>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Toggle columns">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide() && c.id !== SELECT_COLUMN_ID)
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {c.columnDef.meta?.label ?? c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CSV export */}
          {enableExport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={exportCsv}
              disabled={filteredCount === 0}
              title={`Export ${filteredCount} rows to CSV`}
              aria-label="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {enableSelection && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-y bg-primary-soft/50 px-3 py-2 sm:px-4">
          <Badge variant="secondary" className="shrink-0">
            {selectedCount} selected
          </Badge>
          {bulkActions?.(
            table.getSelectedRowModel().rows.map((r) => r.original),
            () => table.resetRowSelection(),
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs"
            onClick={() => table.resetRowSelection()}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="p-4">
          <ListSkeleton rows={loadingRows} />
        </div>
      ) : totalCount === 0 && emptyState ? (
        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {React.createElement(emptyState.icon, { className: 'h-6 w-6' })}
          </div>
          <div>
            <p className="font-semibold">{emptyState.title}</p>
            {emptyState.description ? (
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyState.description}</p>
            ) : null}
          </div>
          {emptyState.action}
        </div>
      ) : (
        <>
          <div
            className={cn(
              'relative w-full overflow-auto [&>[data-slot=table-container]]:overflow-visible',
              bodyClassName ?? 'max-h-[480px]',
            )}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort()
                      const sorted = header.column.getIsSorted()
                      const align = header.column.columnDef.meta?.align
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'bg-card text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                            align === 'center' && 'text-center',
                            align === 'right' && 'text-right',
                          )}
                          style={{ width: header.column.columnDef.size }}
                        >
                          {canSort ? (
                            <button
                              type="button"
                              className={cn(
                                'group inline-flex w-full items-center gap-1 uppercase hover:text-foreground',
                                align === 'center' && 'justify-center',
                                align === 'right' && 'justify-end',
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={`Sort by ${header.column.columnDef.meta?.label ?? header.id}`}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-primary" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      No results. {isFiltered ? 'Try adjusting or resetting the filters.' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                      {row.getVisibleCells().map((cell) => {
                        const align = cell.column.columnDef.meta?.align
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              dense ? 'py-1.5' : 'py-2.5',
                              align === 'center' && 'text-center',
                              align === 'right' && 'text-right',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          <div className="mt-auto flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-xs text-muted-foreground">
              {selectedCount > 0 && (
                <span className="font-medium text-foreground">{selectedCount} of </span>
              )}
              {filteredCount === 0 ? 'No rows' : `Showing ${from}–${to} of ${filteredCount}`}
              {filteredCount !== totalCount && filteredCount > 0
                ? ` (filtered from ${totalCount})`
                : ''}{' '}
              rows
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">Rows</span>
                <Select value={String(size)} onValueChange={(v) => table.setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[76px]" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="First page"
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  aria-label="Last page"
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  )
}
