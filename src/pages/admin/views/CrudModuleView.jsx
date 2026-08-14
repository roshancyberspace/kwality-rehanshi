import { useEffect, useMemo, useState } from 'react'
import { ActionButton, DataTable, Panel } from '../../../components/admin/AdminUI'
import CouponCardGrid from '../components/CouponCardGrid'
import { applyTableFilters, getFilterFields } from '../utils/tableFilters'
import { formatValue, recordMatchesSearch } from '../utils/formatters'

const SEARCH_DEBOUNCE_MS = 700

const SearchIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const ExportIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
)

const FilterIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
  </svg>
)

const ResetIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
)

const PlusIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

function exportVisibleRows(activeTab, columns, rows) {
  const headers = ['Serial No', ...columns.map(([, label]) => label)]
  const lines = [
    headers.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
    ...rows.map((row, index) => {
      const cells = [
        index + 1,
        ...columns.map(([key]) => formatValue(row?.[key] ?? row?.[`${key}_label`] ?? '')),
      ]
      return cells.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    }),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${String(activeTab || 'export').toLowerCase().replace(/\s+/g, '-')}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function CrudModuleView({
  activeTab,
  config,
  globalSearch,
  makeColumns,
  onAdd,
  onApplyFilters,
  onClearFilters,
  onDelete,
  onEdit,
  onFilterChange,
  onPageChange,
  onTableSearchChange,
  pagination,
  rows,
  serverPaginated = false,
  tableFilters,
  tableSearch,
}) {
  const [searchDraft, setSearchDraft] = useState(tableSearch || '')
  const [filterDraft, setFilterDraft] = useState(tableFilters || {})
  const filterFields = getFilterFields(config)
  const hasFilterPanel = Boolean(config.dateRangeFilter || filterFields.length)
  const filterFieldCount = (config.dateRangeFilter ? 2 : 0) + filterFields.length
  const filterActionRemaining = (4 - (filterFieldCount % 4)) % 4 || 4
  const filterActionSpanClass = {
    1: 'sm:col-span-1 lg:col-span-1',
    2: 'sm:col-span-2 lg:col-span-2',
    3: 'sm:col-span-2 lg:col-span-3',
    4: 'sm:col-span-2 lg:col-span-4',
  }[filterActionRemaining]

  useEffect(() => {
    setSearchDraft(tableSearch || '')
  }, [tableSearch, activeTab])

  useEffect(() => {
    setFilterDraft(tableFilters || {})
  }, [tableFilters, activeTab])

  useEffect(() => {
    if (searchDraft === (tableSearch || '')) return undefined

    const timer = window.setTimeout(() => {
      onTableSearchChange(searchDraft)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [onTableSearchChange, searchDraft, tableSearch])

  const commitSearchNow = () => {
    if (searchDraft !== (tableSearch || '')) {
      onTableSearchChange(searchDraft)
    }
  }

  const updateFilterDraft = (name, value) => {
    setFilterDraft((current) => {
      const next = { ...current, [name]: value }
      filterFields.forEach((field) => {
        if (field.filterBy?.field !== name || !current[field.name]) return
        const stillValid = (field.options || []).some((option) => (
          String(option?.value ?? option) === String(current[field.name])
          && String(option?.[field.filterBy.recordKey] ?? '') === String(value)
        ))
        if (!stillValid) next[field.name] = ''
      })
      return next
    })
  }

  const optionsForFilter = (field) => {
    let options = field.options || []
    const parentValue = field.filterBy ? filterDraft[field.filterBy.field] : ''
    if (field.filterBy && parentValue) {
      options = options.filter((option) => String(option?.[field.filterBy.recordKey] ?? '') === String(parentValue))
    }
    const seen = new Set()
    return options.filter((option) => {
      const value = String(option?.value ?? option)
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
  }

  const handleApplyFilters = () => {
    commitSearchNow()
    if (onApplyFilters) {
      onApplyFilters(filterDraft)
      return
    }
    Object.entries(filterDraft).forEach(([name, value]) => onFilterChange?.(name, value || ''))
  }

  const handleResetFilters = () => {
    setSearchDraft('')
    setFilterDraft({})
    onClearFilters()
  }

  const visibleRows = serverPaginated
    ? rows
    : applyTableFilters(
      rows.filter((row) => recordMatchesSearch(row, globalSearch)),
      tableSearch,
      tableFilters,
    )

  const hasActiveFilters = useMemo(
    () => Boolean(searchDraft || tableSearch || Object.values(tableFilters || {}).some(Boolean) || Object.values(filterDraft || {}).some(Boolean)),
    [filterDraft, searchDraft, tableFilters, tableSearch],
  )

  const toolbar = (
    <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
            <SearchIcon />
          </span>
          <input
            className="h-8 w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529]"
            onBlur={commitSearchNow}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitSearchNow()
              }
            }}
            placeholder={`Search ${activeTab}`}
            value={searchDraft}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionButton onClick={() => exportVisibleRows(activeTab, config.columns || [], visibleRows)} size="sm">
            <ExportIcon />
            Export
          </ActionButton>
          <ActionButton onClick={onAdd} size="sm" tone="primary">
            <PlusIcon />
            Add New
          </ActionButton>
        </div>
      </div>

      {hasFilterPanel ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {config.dateRangeFilter ? (
              <>
                <label className="grid gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">From Date</span>
                  <input
                    className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529]"
                    max={filterDraft.to_date || undefined}
                    onChange={(event) => updateFilterDraft('from_date', event.target.value)}
                    type="date"
                    value={filterDraft.from_date || ''}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">To Date</span>
                  <input
                    className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529]"
                    min={filterDraft.from_date || undefined}
                    onChange={(event) => updateFilterDraft('to_date', event.target.value)}
                    type="date"
                    value={filterDraft.to_date || ''}
                  />
                </label>
              </>
            ) : null}

            {filterFields.map((field) => (
              <label className="grid gap-1" key={field.name}>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{field.filterLabel || field.label}</span>
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529]"
                  onChange={(event) => updateFilterDraft(field.name, event.target.value)}
                  value={filterDraft[field.name] || ''}
                >
                  <option value="">All {field.filterLabel || field.label}</option>
                  {optionsForFilter(field).map((option) => {
                    const value = option?.value ?? option
                    const label = option?.label ?? option
                    return (
                      <option key={`${field.name}-${String(value)}`} value={String(value)}>{label}</option>
                    )
                  })}
                </select>
              </label>
            ))}

            <div className={`flex items-end gap-1.5 ${filterActionRemaining === 4 ? 'justify-end' : ''} ${filterActionSpanClass}`}>
              <ActionButton disabled={!hasActiveFilters} onClick={handleResetFilters} size="sm">
                <ResetIcon />
                Reset
              </ActionButton>
              <ActionButton onClick={handleApplyFilters} size="sm" tone="primary">
                <FilterIcon />
                Apply Filters
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )

  const emptyCopy = useMemo(() => {
    if (activeTab === 'Wallet Transactions') {
      return {
        emptyTitle: 'No transactions found',
        emptyText: 'Try adjusting your filters or search term.',
      }
    }
    if (activeTab === 'Payments') {
      return {
        emptyTitle: 'No payments found',
        emptyText: 'Try adjusting your filters or search term.',
      }
    }
    if (activeTab === 'Offers & Coupons') {
      return {
        emptyTitle: 'No coupons found',
        emptyText: 'Try adjusting your filters or search term.',
      }
    }
    return {
      emptyTitle: `No ${String(activeTab || 'records').toLowerCase()} found`,
      emptyText: 'Try adjusting your filters or search term.',
    }
  }, [activeTab])

  const table = config.layout === 'cards' ? (
    <CouponCardGrid
      emptyText={emptyCopy.emptyText}
      emptyTitle={emptyCopy.emptyTitle}
      filterDraft={filterDraft}
      filterFields={filterFields}
      hasActiveFilters={hasActiveFilters}
      onAdd={onAdd}
      onDelete={onDelete}
      onEdit={onEdit}
      onSearchChange={setSearchDraft}
      onSearchCommit={commitSearchNow}
      searchPlaceholder={`Search ${activeTab}`}
      searchValue={searchDraft}
      onFilterChange={(name, value) => {
        const next = { ...filterDraft, [name]: value }
        setFilterDraft(next)
        if (onApplyFilters) {
          onApplyFilters(next)
          return
        }
        onFilterChange?.(name, value || '')
      }}
      onReset={handleResetFilters}
      optionsForFilter={optionsForFilter}
      rows={visibleRows}
    />
  ) : (
    <DataTable
      columns={makeColumns(config)}
      compact={activeTab === 'Partners'}
      dense
      emptyText={emptyCopy.emptyText}
      emptyTitle={emptyCopy.emptyTitle}
      fitToWidth={[
        'Customers',
        'Partners',
        'Bookings',
        'Payments',
        'Payouts',
        'Vendor Wallet',
        'Customer Wallet',
        'Wallet Transactions',
        'Booking Ledger',
        'Service Packages',
        'Services',
        'Sub-Services',
        'Categories',
        'Brands',
      ].includes(activeTab)}
      key={activeTab}
      onPageChange={onPageChange}
      paginated
      pagination={pagination}
      rows={visibleRows}
      toolbar={toolbar}
    />
  )

  return (
    <Panel>
      {table}
    </Panel>
  )
}

export default CrudModuleView
