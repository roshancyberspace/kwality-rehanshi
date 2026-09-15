import { ActionButton, StatusBadge } from '../../../components/admin/AdminUI'

export const createActions = (...items) => (
  <div className="flex flex-nowrap gap-2">
    {items.map(([label, tone, onClick]) => (
      <ActionButton key={label} onClick={onClick} tone={tone}>{label}</ActionButton>
    ))}
  </div>
)

export const customerColumns = [
  { key: 'name', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'lastBooking', label: 'Last Booking' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  { key: 'actions', label: 'Actions', render: (row, handlers) => createActions(['View', undefined, () => handlers.onCustomerDetails?.(row)], ['Edit', undefined, () => handlers.onEdit?.(row)], ['Block', 'danger', () => handlers.onBlock?.(row)]) },
]

export const partnerColumns = [
  { key: 'name', label: 'Partner' },
  { key: 'phone', label: 'Phone' },
  { key: 'skill', label: 'Skill' },
  { key: 'area', label: 'Service Area' },
  { key: 'kyc', label: 'KYC', render: (row) => <StatusBadge>{row.kyc}</StatusBadge> },
  { key: 'availability', label: 'Availability', render: (row) => <StatusBadge>{row.availability}</StatusBadge> },
  { key: 'rating', label: 'Rating' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'actions', label: 'Actions', render: (row, handlers) => createActions(['Approve', 'success', () => handlers.onApproveKyc?.(row)], ['Reject', 'danger', () => handlers.onRejectKyc?.(row)], ['View', undefined, () => handlers.onView?.(row)]) },
]

export const categoryColumns = [
  { key: 'name', label: 'Category', render: (row) => <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF9E8] font-black text-[#67B529]">{row.name.slice(0, 2)}</span><span>{row.name}</span></div> },
  { key: 'subcategories', label: 'Sub-Categories' },
  { key: 'order', label: 'Display Order' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  { key: 'actions', label: 'Actions', render: (row, handlers) => createActions(['Edit', undefined, () => handlers.onEdit?.(row)], ['Delete', 'danger', () => handlers.onDelete?.(row)]) },
]

export const serviceColumns = [
  { key: 'name', label: 'Service', render: (row) => <div className="flex items-center gap-3"><span className="h-12 w-14 rounded-xl bg-slate-100" /><div><p className="font-black">{row.name}</p><p className="text-xs text-slate-500">{row.description}</p></div></div> },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'discount', label: 'Discount' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  { key: 'actions', label: 'Actions', render: (row, handlers) => createActions(['Edit', undefined, () => handlers.onEdit?.(row)], ['Delete', 'danger', () => handlers.onDelete?.(row)]) },
]

export const bookingColumns = [
  { key: 'id', label: 'Booking ID' },
  { key: 'customer', label: 'Customer', render: (row) => <div><p className="font-black text-slate-800">{row.customer}</p><p className="mt-1 text-xs font-bold text-slate-400">{row.address}</p></div> },
  { key: 'service', label: 'Service' },
  { key: 'date', label: 'Date & Time', render: (row) => <div><p className="font-black text-slate-800">{row.date.split(', ')[0]}</p><p className="mt-1 text-xs font-bold text-[#67B529]">{row.date.split(', ').slice(1).join(' ')}</p></div> },
  { key: 'professional', label: 'Professional' },
  { key: 'status', label: 'Booking Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  { key: 'payment', label: 'Payment', render: (row) => <StatusBadge>{row.payment}</StatusBadge> },
  { key: 'amount', label: 'Amount' },
  { key: 'actions', label: 'Actions', render: (row, handlers) => createActions(['View', undefined, () => handlers.onBookingDetails?.(row)], ['Invoice', 'success', () => handlers.onInvoice?.(row)]) },
]

export const paymentColumns = [
  { key: 'id', label: 'Payment ID' },
  { key: 'booking', label: 'Booking ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
  { key: 'refund', label: 'Refund' },
  { key: 'date', label: 'Date' },
  { key: 'actions', label: 'Invoice', render: (row, handlers) => <ActionButton onClick={() => handlers.onInvoice?.(row)}>View invoice</ActionButton> },
]

export const simpleColumns = (keys, actionLabel = 'View') => [
  ...keys.map(([key, label]) => ({ key, label })),
  { key: 'actions', label: 'Actions', render: () => createActions([actionLabel], ['Edit']) },
]

