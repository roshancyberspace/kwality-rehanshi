import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const badgeStyles = {
  Active: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
  Deleted: 'bg-rose-50 text-rose-700 ring-rose-200',
  deleted: 'bg-rose-50 text-rose-700 ring-rose-200',
  Pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  Completed: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  Refunded: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Paid: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
  Cash: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Approved: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Available: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Busy: 'bg-amber-50 text-amber-800 ring-amber-200',
  Open: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Resolved: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/30',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function StatusBadge({ children }) {
  const key = String(children || '').trim()
  const matchedStyle = badgeStyles[key] ||
    badgeStyles[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ||
    (key.toLowerCase().includes('delete') ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-100 text-slate-700 ring-slate-200')

  return (
    <span className={`inline-flex h-5 max-w-full items-center truncate rounded-full px-2 text-[11px] font-bold ring-1 ring-inset ${matchedStyle}`}>
      {children}
    </span>
  )
}

export function ActionButton({ children, tone = 'secondary', isLoading, size = 'md', className = '', ...props }) {
  const tones = {
    primary: 'border-[#2E7D32] bg-[#2E7D32] text-white hover:border-[#256628] hover:bg-[#256628] hover:text-white hover:shadow-[#2E7D32]/25',
    danger: 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-rose-200',
    success: 'border-[#67B529] bg-[#EEF9E8] text-[#67B529] hover:border-[#67B529] hover:bg-[#67B529] hover:text-white hover:shadow-emerald-200',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:border-slate-800 hover:bg-slate-900 hover:text-white hover:shadow-slate-200',
  }
  const sizes = {
    sm: 'gap-1.5 rounded-md px-2.5 py-1.5 text-[11px]',
    md: 'gap-2 rounded-lg px-3 py-2 text-xs',
  }

  return (
    <button 
      className={`relative inline-flex items-center justify-center whitespace-nowrap border font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${sizes[size] || sizes.md} ${tones[tone]} ${className}`} 
      disabled={isLoading || props.disabled}
      type="button" 
      {...props}
    >
      {isLoading && (
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
        </svg>
      )}
      {children}
    </button>
  )
}

export const ActionIconButton = forwardRef(function ActionIconButton({ children, label, tone = 'secondary', isLoading, ...props }, ref) {
  const tones = {
    danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-600 hover:bg-rose-600 hover:text-white',
    secondary: 'border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:bg-slate-900 hover:text-white',
  }

  return (
    <button
      aria-label={label}
      className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-md border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${tones[tone]}`}
      disabled={isLoading || props.disabled}
      ref={ref}
      title={label}
      type="button"
      {...props}
    >
      {isLoading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
        </svg>
      ) : (
        children
      )}
    </button>
  )
})

export function RowActionsMenu({ items = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const menuWidth = 144
    const menuHeight = Math.max(44, items.length * 36 + 8)
    const viewportPadding = 12
    const opensAbove = rect.bottom + menuHeight + viewportPadding > window.innerHeight
    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth),
    )
    const top = opensAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - 6)
      : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + 6)

    setMenuPosition({ left, top })
  }

  useLayoutEffect(() => {
    if (isOpen) updateMenuPosition()
  }, [isOpen, items.length])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }
    const handleReposition = () => updateMenuPosition()

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [isOpen])

  if (!items.length) return null

  return (
    <div className="relative">
      <ActionIconButton label="More actions" onClick={() => setIsOpen((open) => !open)} ref={buttonRef}>
        <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </ActionIconButton>
      {isOpen && (
        <div
          className="fixed z-50 min-w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
          ref={menuRef}
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          {items.map(({ label, onClick, tone = 'secondary', type }) => {
            if (type === 'section') {
              return (
                <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase text-slate-400" key={label}>
                  {label}
                </p>
              )
            }

            return (
              <button
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-bold transition hover:bg-slate-50 ${
                  tone === 'danger' ? 'text-rose-700' : tone === 'success' ? 'text-[#67B529]' : 'text-slate-700'
                }`}
                key={label}
                onClick={() => {
                  setIsOpen(false)
                  onClick()
                }}
                type="button"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function StatsCard({ accent = 'from-[#003F86] to-[#67B529]', label, value, helper }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#67B529]/20 bg-white shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-3.5 sm:p-4">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500" title={label}>{label}</p>
        <p className="mt-1.5 sm:mt-2 truncate text-xl sm:text-2xl font-black tracking-tight text-slate-800" title={value}>{value}</p>
        <p className="mt-1 sm:mt-2 truncate text-xs font-semibold text-slate-500" title={helper}>{helper}</p>
      </div>
    </article>
  )
}

export function DataTable({
  columns,
  compact = false,
  dense = false,
  emptyText = 'Try adjusting your filters or search term.',
  emptyTitle = 'No records found',
  fitToWidth = false,
  getRowClassName,
  onPageChange,
  pageSize = 10,
  pagination,
  paginated = false,
  rows = [],
  toolbar,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const tableColumns = useMemo(() => {
    if (!columns || columns.some((col) => ['s_no', 'sno', 'serial_no', 'serial_number'].includes(String(col.key).toLowerCase()))) {
      return columns || []
    }
    const sNoClass = compact
      ? 'w-[5%] min-w-0 text-center'
      : fitToWidth
      ? `${(columns?.length || 0) >= 8 ? 'w-[5%] min-w-0' : 'w-[7%] min-w-0'} text-center`
      : 'w-14 whitespace-nowrap text-center'
    return [{
      className: sNoClass,
      key: 's_no',
      label: compact ? 'No.' : 'Serial No',
    }, ...columns]
  }, [columns, compact, fitToWidth])
  const getColumnClass = (column) => {
    if (column.className) return column.className
    if (column.key === 's_no') {
      if (compact) return 'w-[5%] min-w-0 text-center'
      return fitToWidth ? 'w-[5%] min-w-0 text-center' : 'w-12 whitespace-nowrap text-center'
    }
    const columnMinimums = fitToWidth
      ? {
          actions: 'w-[8%] text-center',
          amount: 'w-[8%]',
          booking_no: 'w-[11%]',
          cash_collected: 'w-[10%]',
          commission: 'w-[9%]',
          company_commission: 'w-[11%]',
          company_due: 'w-[9%]',
          customer_name: 'w-[15%]',
          gross: 'w-[8%]',
          ledger_no: 'w-[13%]',
          method: 'w-[8%]',
          online_earning: 'w-[10%]',
          paid_at: 'w-[16%]',
          partner_name: 'w-[11%]',
          payment_amount: 'w-[12%]',
          payment_no: 'w-[18%]',
          professional_name: 'w-[14%]',
          service_name: 'w-[16%]',
          settlement: 'w-[11%]',
          status: 'w-[8%]',
          vendor_amount: 'w-[11%]',
          vendor_payable: 'w-[10%]',
        }
      : {
          actions: 'min-w-[160px] whitespace-nowrap text-center',
          address: 'min-w-[230px]',
          area: 'min-w-[150px]',
          availability: 'min-w-[130px] whitespace-nowrap',
          booking_no: 'min-w-[170px] whitespace-nowrap',
          bookings: 'min-w-[110px] text-center',
          bookings_count: 'min-w-[110px] text-center',
          commission_percentage: 'min-w-[120px]',
          customer: 'min-w-[230px]',
          customer_name: 'min-w-[230px]',
          documents: 'min-w-[140px]',
          email: 'min-w-[220px]',
          earnings: 'min-w-[130px]',
          kyc: 'min-w-[130px]',
          kyc_status: 'min-w-[130px]',
          name: 'min-w-[240px]',
          payment: 'min-w-[140px]',
          payment_amount: 'min-w-[150px]',
          phone: 'min-w-[140px] whitespace-nowrap',
          mobile: 'min-w-[140px] whitespace-nowrap',
          professional: 'min-w-[220px]',
          professional_name: 'min-w-[220px]',
          partner_name: 'min-w-[220px]',
          rating: 'min-w-[120px]',
          scheduled_at: 'min-w-[160px] whitespace-nowrap',
          service: 'min-w-[220px]',
          service_name: 'min-w-[220px]',
          services: 'min-w-[250px]',
          skill: 'min-w-[180px]',
          status: 'min-w-[130px]',
          title: 'min-w-[200px]',
          subject: 'min-w-[200px]',
        }
    return columnMinimums[column.key] || (fitToWidth ? 'min-w-0' : 'min-w-[140px]')
  }
  const denseCellPadding = compact ? 'px-2 py-2' : 'px-2.5 py-2'
  const denseHeadPadding = compact ? 'px-2 py-3' : 'px-2.5 py-3.5'
  const headCellClass = dense
    ? `overflow-hidden border-b border-[#67B529]/20 bg-[#EEF9E8] ${denseHeadPadding} text-[11px] font-black uppercase leading-tight ${compact ? 'tracking-normal' : 'tracking-wide'} text-[#2F6412]`
    : 'overflow-hidden border-b border-[#67B529]/20 bg-[#EEF9E8] px-4 py-3.5 text-xs font-black uppercase leading-tight tracking-wide text-[#2F6412]'
  const bodyCellClass = dense
    ? `min-w-0 overflow-hidden break-words border-b border-slate-200 ${denseCellPadding} align-middle text-sm font-semibold text-slate-700`
    : 'min-w-0 break-words border-b border-slate-300 px-4 py-3 align-top font-semibold text-slate-700'
  const isServerPaginated = Boolean(pagination)
  const totalPages = isServerPaginated
    ? Math.max(1, Number(pagination.last_page || 1))
    : paginated ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const activePage = isServerPaginated ? Number(pagination.current_page || 1) : Math.min(currentPage, totalPages)
  const visibleRows = useMemo(() => {
    if (isServerPaginated) return rows
    if (!paginated) return rows
    const start = (activePage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [activePage, isServerPaginated, pageSize, paginated, rows])
  const totalRows = isServerPaginated ? Number(pagination.total || rows.length) : rows.length
  const firstItem = isServerPaginated
    ? Number(pagination.from || (rows.length ? 1 : 0))
    : rows.length ? (activePage - 1) * pageSize + 1 : 0
  const lastItem = isServerPaginated ? Number(pagination.to || rows.length) : Math.min(activePage * pageSize, rows.length)
  const goToPage = (page) => {
    if (isServerPaginated) {
      onPageChange?.(page)
      return
    }
    setCurrentPage(page)
  }

  if (!rows.length) {
    return (
      <div className="overflow-hidden">
        {toolbar}
        <div className={fitToWidth ? 'overflow-x-hidden' : 'overflow-x-auto custom-thin-scrollbar'}>
          <table className={`w-full border-separate border-spacing-0 text-left text-sm ${fitToWidth ? 'table-fixed' : 'table-auto min-w-[920px]'}`}>
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th className={`${headCellClass} ${getColumnClass(column)}`} key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="grid min-h-[280px] place-items-center bg-[#FBFCFD] px-4 py-12 text-center">
          <div className="mx-auto max-w-sm">
            <div className="relative mx-auto mb-5 grid h-28 w-28 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[#EEF9E8]" />
              <span className="absolute left-3 top-5 text-sm font-bold text-[#B7E08F]">+</span>
              <span className="absolute right-4 top-8 h-1.5 w-1.5 rounded-full bg-[#B7E08F]" />
              <span className="absolute bottom-6 left-5 h-1.5 w-1.5 rounded-full bg-[#B7E08F]" />
              <span className="absolute bottom-8 right-6 text-sm font-bold text-[#B7E08F]">+</span>
              <svg aria-hidden="true" className="relative h-14 w-14 text-[#8FD45A]" fill="none" viewBox="0 0 64 64">
                <rect height="36" rx="10" stroke="currentColor" strokeWidth="3.5" width="46" x="9" y="16" />
                <path d="M9 26h46" stroke="currentColor" strokeWidth="3.5" />
                <circle cx="42" cy="38" fill="currentColor" r="3.5" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-800">{emptyTitle}</p>
            <p className="mt-1.5 text-sm font-medium text-slate-500">{emptyText}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      {toolbar}
      <div className={fitToWidth ? 'overflow-x-hidden' : 'overflow-x-auto custom-thin-scrollbar'}>
      <table className={`w-full border-separate border-spacing-0 text-left text-sm ${fitToWidth ? 'table-fixed' : 'table-auto min-w-[920px]'}`}>
        <thead>
          <tr>
            {tableColumns.map((column) => (
              <th className={`${headCellClass} ${getColumnClass(column)}`} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => {
            const isDeleted = String(row?.status || '').toLowerCase() === 'deleted' ||
                              String(row?.account_status || '').toLowerCase() === 'deleted' ||
                              Boolean(row?.deleted_at && !['0000-00-00', 'null', ''].includes(String(row?.deleted_at).toLowerCase()))
            const defaultRowClass = isDeleted
              ? 'bg-rose-50/70 hover:bg-rose-100/70'
              : 'group hover:bg-slate-50'
            const rowClass = getRowClassName ? `${defaultRowClass} ${getRowClassName(row, index)}` : defaultRowClass

            return (
              <tr className={rowClass} key={row.id || row.code || row.name || index}>
                {tableColumns.map((column) => (
                  <td className={`${bodyCellClass} ${getColumnClass(column)}`} key={column.key}>
                    {column.key === 's_no' ? (
                      <span className="font-extrabold text-slate-500">{(firstItem || 1) + index}</span>
                    ) : column.render ? (
                      column.render(row)
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      {paginated && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-500">
            Showing {firstItem}-{lastItem} of {totalRows}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700"
              disabled={activePage === 1}
              onClick={() => goToPage(Math.max(1, activePage - 1))}
              type="button"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-black text-slate-600">
              {activePage} / {totalPages}
            </span>
            <button
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700"
              disabled={activePage === totalPages}
              onClick={() => goToPage(Math.min(totalPages, activePage + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Panel({ action, bare = false, children, subtitle, title }) {
  const showHeader = Boolean(title || subtitle || action)

  return (
    <section className={`overflow-hidden bg-white ${bare ? '' : 'rounded-lg border border-[#67B529]/20 shadow-sm'}`}>
      {showHeader && (
        <div className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between ${
          title || subtitle
            ? 'border-b border-[#67B529]/20 bg-[#F6FBFF] px-3.5 py-3 sm:px-5 sm:py-4'
            : 'border-b border-slate-100 px-3.5 py-2.5 sm:px-4'
        }`}
        >
          {(title || subtitle) ? (
            <div className="min-w-0">
              {title ? <h2 className="truncate text-base sm:text-lg font-black text-slate-800">{title}</h2> : null}
              {subtitle ? <p className="mt-0.5 sm:mt-1 truncate text-xs sm:text-sm font-semibold text-slate-500">{subtitle}</p> : null}
            </div>
          ) : <div className="min-w-0" />}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div>{children}</div>
    </section>
  )
}

export function FormInput({ label, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-4 focus:ring-[#EEF9E8]" placeholder={placeholder} type={type} />
    </label>
  )
}

export function Modal({ children, onClose, title, noPadding = false, maxWidth = 'max-w-xl' }) {
  const [isClosing, setIsClosing] = useState(false)
  const closeSmoothly = () => {
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto no-scrollbar bg-slate-950/50 backdrop-blur-md p-3 sm:p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade'}`}>
      <div className={`w-full ${maxWidth} my-auto flex max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide'}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-white">
          <h2 className="text-base sm:text-lg font-black text-slate-800 truncate pr-2">{title}</h2>
          <button className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition duration-200 hover:bg-rose-50 hover:text-rose-700" onClick={closeSmoothly} title="Close" type="button">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto no-scrollbar ${noPadding ? 'overflow-hidden' : 'p-4 sm:p-5'}`}>{children}</div>
      </div>
    </div>
  )
}

export function useDemoModal() {
  const [modal, setModal] = useState(null)
  const openModal = (title) => setModal(title)
  const closeModal = () => setModal(null)
  return { closeModal, modal, openModal }
}

