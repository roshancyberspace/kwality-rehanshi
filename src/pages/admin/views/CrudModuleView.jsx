import { useEffect, useState } from 'react'
import { ActionButton, DataTable, Panel } from '../../../components/admin/AdminUI'
import { applyTableFilters, getFilterFields } from '../utils/tableFilters'
import { recordMatchesSearch } from '../utils/formatters'

const SEARCH_DEBOUNCE_MS = 700

function CrudModuleView({
  activeTab,
  config,
  globalSearch,
  makeColumns,
  onAdd,
  onClearFilters,
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
  const filterFields = getFilterFields(config)

  useEffect(() => {
    setSearchDraft(tableSearch || '')
  }, [tableSearch, activeTab])

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

  const handleClearFilters = () => {
    setSearchDraft('')
    onClearFilters()
  }

  const visibleRows = serverPaginated
    ? rows
    : applyTableFilters(
      rows.filter((row) => recordMatchesSearch(row, globalSearch)),
      tableSearch,
      tableFilters,
    )

  const toolbar = (
    <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <input
        className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#67B529] lg:max-w-xs"
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
      <div className="flex flex-wrap gap-2">
        {filterFields.map((field) => (
          <select
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#67B529]"
            key={field.name}
            onChange={(event) => onFilterChange(field.name, event.target.value)}
            value={tableFilters[field.name] || ''}
          >
            <option value="">All {field.label}</option>
            {field.options.map((option) => {
              const value = option?.value ?? option
              const label = option?.label ?? option
              return (
                <option key={String(value)} value={String(value)}>{label}</option>
              )
            })}
          </select>
        ))}
        {(searchDraft || tableSearch || Object.values(tableFilters).some(Boolean)) && (
          <ActionButton onClick={handleClearFilters}>Clear</ActionButton>
        )}
        <ActionButton onClick={onAdd} tone="primary">Add New</ActionButton>
      </div>
    </div>
  )

  return (
    <Panel>
      <DataTable
        columns={makeColumns(config)}
        dense
        fitToWidth={['Customers', 'Partners', 'Bookings', 'Service Packages', 'Services', 'Sub-Services', 'Categories', 'Brands'].includes(activeTab)}
        key={activeTab}
        onPageChange={onPageChange}
        paginated
        pagination={pagination}
        rows={visibleRows}
        toolbar={toolbar}
      />
    </Panel>
  )
}

export default CrudModuleView
