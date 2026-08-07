import { ActionButton, DataTable, Panel } from '../../../components/admin/AdminUI'
import { applyTableFilters, getFilterFields } from '../utils/tableFilters'
import { recordMatchesSearch } from '../utils/formatters'

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
  const filterFields = getFilterFields(config)
  const visibleRows = serverPaginated
    ? rows
    : applyTableFilters(
      rows.filter((row) => recordMatchesSearch(row, globalSearch)),
      tableSearch,
      tableFilters,
    )
  const toolbar = (
    <div className="flex flex-col gap-2 border-b border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
      <input
        className="h-9 w-full rounded-lg border border-slate-400 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#67B529] lg:max-w-xs"
        onChange={(event) => onTableSearchChange(event.target.value)}
        placeholder={`Search ${config.title}`}
        value={tableSearch}
      />
      <div className="flex flex-wrap gap-2">
        {filterFields.map((field) => (
          <select
            className="h-9 rounded-lg border border-slate-400 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#67B529]"
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
        {(tableSearch || Object.values(tableFilters).some(Boolean)) && (
          <ActionButton onClick={onClearFilters}>Clear</ActionButton>
        )}
      </div>
    </div>
  )

  return (
    <Panel
      action={
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onAdd} tone="primary">Add New</ActionButton>
        </div>
      }
      subtitle={config.subtitle}
      title={config.title || activeTab}
    >
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
