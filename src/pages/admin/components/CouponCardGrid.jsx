import { useMemo, useState } from 'react'
import { RowActionsMenu } from '../../../components/admin/AdminUI'
import { formatDate, formatValue } from '../utils/formatters'

const PAGE_SIZE = 12
const GREEN = '#1B5E3B'

const APPLIES_LABELS = {
  all: 'All',
  category: 'Category',
  service: 'Service',
  package: 'Package',
}

const FILTER_ICONS = {
  type: (
    <svg aria-hidden="true" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41 11 3.83 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  applies_to: (
    <svg aria-hidden="true" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  status: (
    <svg aria-hidden="true" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  ),
}

function discountLabel(row) {
  const raw = String(row.value ?? '').replace(/%/gi, '').replace(/^rs\.?\s*/i, '').trim()
  if (!raw) return '—'
  return String(row.type || '').toLowerCase() === 'percentage' ? `${raw}% OFF` : `Rs. ${raw} OFF`
}

function moneyLabel(value) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return formatValue(value)
  return `₹${amount.toFixed(2)}`
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="13" rx="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41 11 3.83 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function ScissorsIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

async function copyText(value) {
  const text = String(value || '').trim()
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function KebabMenu({ onDelete, onEdit, row }) {
  return (
    <div className="[&_button]:h-6 [&_button]:w-6 [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none [&_button]:text-slate-500 [&_button]:hover:translate-y-0 [&_button]:hover:bg-slate-100 [&_button]:hover:text-slate-800">
      <RowActionsMenu
        items={[
          { label: 'Edit', onClick: () => onEdit(row) },
          { label: 'Delete', onClick: () => onDelete(row), tone: 'danger' },
        ]}
      />
    </div>
  )
}

function CouponCard({ onDelete, onEdit, row }) {
  const [copied, setCopied] = useState(false)
  const appliesTo = APPLIES_LABELS[String(row.applies_to || 'all').toLowerCase()] || formatValue(row.applies_to || 'All')
  const status = formatValue(row.status) || 'Active'
  const isActive = String(status).toLowerCase() === 'active'
  const isPercentage = String(row.type || '').toLowerCase() === 'percentage'
  const code = row.code || '—'

  const handleCopy = async () => {
    const ok = await copyText(row.code)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <article className="relative flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex w-8 shrink-0 items-center justify-center" style={{ backgroundColor: GREEN }}>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] whitespace-nowrap text-[8px] font-black tracking-[0.18em] text-white">
          COUPON CODE
        </span>
        <span className="absolute -right-1.5 top-[52%] h-2.5 w-2.5 rounded-full bg-[#F8FAFC] ring-1 ring-slate-200" />
      </div>

      <div className="min-w-0 flex-1 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-lg font-black leading-none tracking-tight" style={{ color: GREEN }}>
            {discountLabel(row)}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <span className={`rounded-full px-1.5 py-px text-[9px] font-black ${
              isActive ? 'bg-[#E8F5E9] text-[#1B5E3B]' : 'bg-slate-100 text-slate-500'
            }`}>
              {status}
            </span>
            <KebabMenu onDelete={onDelete} onEdit={onEdit} row={row} />
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <button
            className="flex min-w-0 flex-1 items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-black tracking-wide text-slate-800"
            onClick={handleCopy}
            type="button"
          >
            <span className="truncate">{code}</span>
            <span className="ml-1 text-slate-400"><CopyIcon /></span>
          </button>
          <p className="shrink-0 text-[10px] font-semibold text-slate-500">{formatValue(row.scope_summary || 'All Services')}</p>
        </div>

        <div className="relative my-1.5">
          <span className="block border-t border-dashed border-slate-300" />
          <span className="absolute left-1/2 top-1/2 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#1B5E3B]">
            <ScissorsIcon />
          </span>
        </div>

        <div className="grid grid-cols-4 gap-x-2">
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Min</p>
            <p className="truncate text-[11px] font-black text-slate-800">{row.minimum_order ? moneyLabel(row.minimum_order) : '—'}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Expires</p>
            <p className="truncate text-[11px] font-black text-slate-800">{row.expires_at ? formatDate(row.expires_at) : '—'}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Limit</p>
            <p className="truncate text-[11px] font-black text-slate-800">{row.usage_limit ? formatValue(row.usage_limit) : '—'}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Applies</p>
            <p className="truncate text-[11px] font-black text-slate-800">{appliesTo}</p>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: GREEN }}>
            <TagIcon />
            {isPercentage ? 'Percentage' : 'Fixed'}
          </span>
          <button
            className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-black text-[#1B5E3B] hover:bg-[#E8F5E9]"
            onClick={handleCopy}
            type="button"
          >
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>
      </div>
    </article>
  )
}

function CouponToolbar({
  filterDraft,
  filterFields,
  hasActiveFilters,
  onAdd,
  onFilterChange,
  onReset,
  onSearchChange,
  onSearchCommit,
  optionsForFilter,
  searchPlaceholder = 'Search coupons',
  searchValue = '',
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[220px] sm:w-64">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
            <SearchIcon />
          </span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-[#1B5E3B]"
            onBlur={onSearchCommit}
            onChange={(event) => onSearchChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearchCommit?.()
              }
            }}
            placeholder={searchPlaceholder}
            type="search"
            value={searchValue}
          />
        </div>
        {filterFields.map((field) => (
          <div className="relative" key={field.name}>
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
              {FILTER_ICONS[field.name] || FILTER_ICONS.type}
            </span>
            <select
              className="h-10 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-[#1B5E3B]"
              onChange={(event) => onFilterChange(field.name, event.target.value)}
              value={filterDraft[field.name] || ''}
            >
              <option value="">All {field.filterLabel || field.label}</option>
              {(optionsForFilter?.(field) || field.options || []).map((option) => {
                const value = option?.value ?? option
                const label = option?.label ?? option
                return (
                  <option key={`${field.name}-${String(value)}`} value={String(value)}>{label}</option>
                )
              })}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <ChevronIcon />
            </span>
          </div>
        ))}
        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          disabled={!hasActiveFilters}
          onClick={onReset}
          type="button"
        >
          <ResetIcon />
          Reset
        </button>
      </div>
      <button
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-black text-white"
        onClick={onAdd}
        style={{ backgroundColor: GREEN }}
        type="button"
      >
        + Add New Coupon
      </button>
    </div>
  )
}

function CouponCardGrid({
  emptyText = 'Try adjusting your filters or search term.',
  emptyTitle = 'No coupons found',
  filterDraft = {},
  filterFields = [],
  hasActiveFilters = false,
  onAdd,
  onDelete,
  onEdit,
  onFilterChange,
  onReset,
  onSearchChange,
  onSearchCommit,
  optionsForFilter,
  rows = [],
  searchPlaceholder = 'Search coupons',
  searchValue = '',
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)
  const visibleRows = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [activePage, rows])
  const firstItem = rows.length ? (activePage - 1) * PAGE_SIZE + 1 : 0
  const lastItem = Math.min(activePage * PAGE_SIZE, rows.length)

  const toolbar = (
    <CouponToolbar
      filterDraft={filterDraft}
      filterFields={filterFields}
      hasActiveFilters={hasActiveFilters}
      onAdd={onAdd}
      onFilterChange={onFilterChange}
      onReset={onReset}
      onSearchChange={onSearchChange}
      onSearchCommit={onSearchCommit}
      optionsForFilter={optionsForFilter}
      searchPlaceholder={searchPlaceholder}
      searchValue={searchValue}
    />
  )

  if (!rows.length) {
    return (
      <div className="overflow-hidden">
        {toolbar}
        <div className="grid min-h-[280px] place-items-center bg-[#F8FAFC] px-4 py-12 text-center">
          <div className="mx-auto max-w-sm">
            <p className="text-lg font-bold text-slate-800">{emptyTitle}</p>
            <p className="mt-1.5 text-sm font-medium text-slate-500">{emptyText}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-[#F8FAFC]">
      {toolbar}
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleRows.map((row, index) => (
          <CouponCard
            key={row.id || row.code || index}
            onDelete={onDelete}
            onEdit={onEdit}
            row={row}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-400">
          Showing {firstItem}-{lastItem} of {rows.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="h-9 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-500 disabled:opacity-40"
            disabled={activePage === 1}
            onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
            type="button"
          >
            Previous
          </button>
          <span className="grid h-9 w-9 place-items-center rounded-md text-xs font-black text-white" style={{ backgroundColor: GREEN }}>
            {activePage}
          </span>
          <button
            className="h-9 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-500 disabled:opacity-40"
            disabled={activePage === totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default CouponCardGrid
