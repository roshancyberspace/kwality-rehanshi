import { useState } from 'react'
import { ActionIconButton, RowActionsMenu, StatusBadge } from '../../../components/admin/AdminUI'
import { downloadInvoiceFile } from '../../../components/profile/OrderHistorySection'
import { buildBackendUrl } from '../../../config/urls'
import { resolvePartnerProfilePicturePath } from '../../../utils/partnerProfile'
import { formatDate, formatValue } from './formatters'

const activeBookingStatuses = [
  'Pending',
  'Pending Approval',
  'Accepted',
  'Professional Assigned',
  'Vendor Accepted',
  'On The Way',
  'On the way',
  'Reached - OTP Verified',
  'OTP verified',
  'Started',
  'In progress',
]

const formatDocuments = (documents) => {
  if (!Array.isArray(documents)) return ''
  const submitted = documents.filter((document) => document.path).length
  return `${submitted}/${documents.length} uploaded`
}

const getBookingLocation = (row) => row.metadata?.service_location || row.metadata?.customer_location || row.metadata?.service_address?.location
const getVendorLocation = (row) => row.metadata?.vendor_location
const getMapUrl = (location) => location?.latitude && location?.longitude
  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
  : ''
const formatWorkPhotos = (row) => {
  const work = row.metadata?.work || {}
  const before = Array.isArray(work.before_photos) ? work.before_photos.length : 0
  const after = Array.isArray(work.after_photos) ? work.after_photos.length : 0
  const beforeVideos = Array.isArray(work.before_videos) ? work.before_videos.length : 0
  const afterVideos = Array.isArray(work.after_videos) ? work.after_videos.length : 0
  return `Before ${before}P/${beforeVideos}V / After ${after}P/${afterVideos}V`
}
const formatBookingSchedule = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatValue(value)

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
const canCancelBooking = (row) => activeBookingStatuses.includes(row.status)

const getPartnerMenuItems = (row, { canChangeUserPasswords, onApproveKyc, onChangeUserPassword, onPartnerAvailabilityChange, onPartnerStatusChange, onRejectKyc, onView }, config) => [
  { label: 'View details', onClick: () => onView(row) },
  canChangeUserPasswords && { label: 'Change password', onClick: () => onChangeUserPassword(config, row) },
  row.kyc_status !== 'Approved' && { label: 'Approve KYC', onClick: () => onApproveKyc(row), tone: 'success' },
  row.kyc_status !== 'Rejected' && { label: 'Reject KYC', onClick: () => onRejectKyc(row), tone: 'danger' },
  row.availability !== 'Available' && { label: 'Set Available', onClick: () => onPartnerAvailabilityChange(row, 'Available'), tone: 'success' },
  row.availability !== 'Busy' && { label: 'Set Busy', onClick: () => onPartnerAvailabilityChange(row, 'Busy') },
  row.availability !== 'Unavailable' && { label: 'Set Unavailable', onClick: () => onPartnerAvailabilityChange(row, 'Unavailable'), tone: 'danger' },
  row.status !== 'Active' && { label: 'Activate Partner', onClick: () => onPartnerStatusChange(row, 'Active'), tone: 'success' },
  row.status !== 'Inactive' && { label: 'Deactivate Partner', onClick: () => onPartnerStatusChange(row, 'Inactive'), tone: 'danger' },
].filter(Boolean)

const canShowPasswordAction = (endpoint) => ['/customers', '/partners'].includes(endpoint)
const isPaidRecord = (row) => ['paid', 'cash', 'success', 'successful', 'completed'].includes(String(row.payment_status || row.status || row.metadata?.payment_status || '').toLowerCase())
const recordToInvoiceOrder = (row) => ({
  ...row,
  amount: row.amount || row.gross || 0,
  bookingNo: row.booking_no || row.metadata?.booking_no || row.job_no,
  id: row.booking_no || row.metadata?.booking_no || row.job_no || row.id,
  items: (row.metadata?.items || []).map((item) => item.name || item.service_name || item),
  metadata: row.metadata || {},
  payment: row.payment_method || row.payment_status || row.metadata?.payment || row.status,
  service: row.service_name || row.service,
})

const itemWithImageEndpoints = ['/categories', '/services', '/sub-services', '/service-packages', '/brands', '/rate-items']

function TableThumbnail({ isPerson, name, src }) {
  const [hasError, setHasError] = useState(false)
  const url = buildBackendUrl(src || '')

  if (!url || hasError) {
    if (isPerson) {
      const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : (parts[0]?.[0] || 'U').toUpperCase()
      return (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#003F86] to-[#67B529] text-xs font-black text-white shadow-xs ring-2 ring-white">
          {initials}
        </div>
      )
    }
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 5h16v14H4Z" />
          <path d="m7 16 4-4 3 3 2-2 3 3M8 9h.01" />
        </svg>
      </div>
    )
  }

  return (
    <img
      alt={name || 'Thumbnail'}
      className={`h-10 w-10 shrink-0 object-cover shadow-xs ring-1 ring-slate-200/80 transition duration-200 hover:scale-105 ${isPerson ? 'rounded-full' : 'rounded-lg bg-slate-50'}`}
      onError={() => setHasError(true)}
      src={url}
    />
  )
}

export const makeColumns = (config, { actionLoadingId, appSettings = {}, canChangeUserPasswords, onApproveKyc, onBookingCancel, onBookingDetails, onChangeUserPassword, onCustomerDetails, onDelete, onEdit, onPartnerAvailabilityChange, onPartnerStatusChange, onRejectKyc, onView, onViewMetadata, onViewPermissions }) => [
  ...config.columns.map(([key, label, className]) => ({
    key,
    label,
    className,
    render: (row) => key.includes('status') || key === 'availability' || key === 'kyc_status' || key === 'settlement'
      ? <StatusBadge>{formatValue(row[key])}</StatusBadge>
      : (config.endpoint === '/bookings' && key === 'booking_no') || (config.endpoint === '/vendor-jobs' && key === 'job_no')
        ? (
          <button className="grid gap-0 text-left font-black leading-tight text-slate-800 underline-offset-2 hover:text-[#67B529] hover:underline" onClick={() => onBookingDetails(row)} type="button">
            <span>{formatValue(row[key]) || `#${row.id}`}</span>
            {config.endpoint === '/bookings' && row.scheduled_at && (
              <span className="whitespace-nowrap text-[11px] font-bold text-slate-500">{formatBookingSchedule(row.scheduled_at)}</span>
            )}
          </button>
        )
      : config.endpoint === '/bookings' && key === 'payment_amount'
        ? (
          <div className="grid gap-0.5 leading-tight">
            <StatusBadge>{formatValue(row.payment_status)}</StatusBadge>
            <span className="text-xs font-black text-slate-800">Rs. {formatValue(row.amount)}</span>
            {Number(row.tip_amount || row.metadata?.tip_amount || 0) > 0 ? (
              <span className="w-fit rounded bg-[#F3EAFF] px-1.5 py-0.5 text-[10px] font-bold text-[#6338E0]">
                Tip: Rs. {formatValue(row.tip_amount || row.metadata?.tip_amount)}
              </span>
            ) : null}
          </div>
        )
      : config.endpoint === '/bookings' && key === 'scheduled_at'
        ? <span className="whitespace-nowrap">{formatBookingSchedule(row[key])}</span>
      : config.endpoint === '/bookings' && key === 'customer_name'
        ? (
          <button className="grid gap-0 text-left font-black leading-tight text-[#67B529] underline-offset-2 hover:underline disabled:cursor-default disabled:text-slate-800 disabled:hover:no-underline" disabled={!row.metadata?.customer_id} onClick={() => onCustomerDetails({ id: row.metadata.customer_id })} type="button">
            <span className="truncate">{formatValue(row[key]) || `Customer #${row.metadata?.customer_id || row.id}`}</span>
            {(row.customer_phone || row.metadata?.customer_phone || row.metadata?.phone) && (
              <span className="truncate text-[11px] font-bold text-slate-500">{row.customer_phone || row.metadata?.customer_phone || row.metadata?.phone}</span>
            )}
          </button>
        )
      : config.endpoint === '/bookings' && key === 'professional_name'
        ? (
          <span className={`truncate text-sm ${row.professional_name ? 'font-semibold text-slate-700' : 'font-medium text-slate-400'}`}>
            {formatValue(row.professional_name) || '—'}
          </span>
        )
      : config.endpoint === '/bookings' && key === 'service_name'
        ? (
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-slate-700">{formatValue(row.service_name)}</span>
        )
      : itemWithImageEndpoints.includes(config.endpoint) && key === 'name'
        ? (
          <div className="flex items-center gap-3">
            <TableThumbnail name={formatValue(row[key])} src={row.image || row.logo || row.icon || row.metadata?.image || row.metadata?.logo || ''} />
            <span className="font-bold text-slate-800">{formatValue(row[key]) || 'Untitled'}</span>
          </div>
        )
      : config.endpoint === '/rate-items' && key === 'service_name'
        ? (
          <span className="text-sm font-semibold text-slate-600">{row.service?.name || 'Unknown'}</span>
        )
      : config.endpoint === '/customers' && key === 'name'
        ? (
          <div className="flex items-center gap-3">
            <TableThumbnail isPerson name={formatValue(row[key])} src={row.profile_picture || row.metadata?.profile_picture || row.metadata?.avatar_url || row.avatar_url || row.image || ''} />
            <button className="text-left font-black text-[#67B529] underline-offset-2 hover:underline" onClick={() => onCustomerDetails(row)} type="button">
              {formatValue(row[key]) || `Customer #${row.id}`}
            </button>
          </div>
        )
      : config.endpoint === '/partners' && key === 'name'
        ? (
          <div className="flex items-center gap-3">
            <TableThumbnail isPerson name={formatValue(row[key]) || row.business_name} src={resolvePartnerProfilePicturePath(row)} />
            <button className="text-left font-black text-[#67B529] underline-offset-2 hover:underline" onClick={() => onView(row)} type="button">
              {formatValue(row[key]) || `Partner #${row.id}`}
            </button>
          </div>
        )
      : key === 'customer_name' && row.metadata?.customer_id
        ? (
          <button className="text-left font-black text-[#67B529] underline-offset-2 hover:underline" onClick={() => onCustomerDetails({ id: row.metadata.customer_id })} type="button">
            {formatValue(row[key]) || `Customer #${row.metadata.customer_id}`}
          </button>
        )
      : key === 'documents'
        ? formatDocuments(row[key])
      : key === 'booking_location'
        ? (
          getMapUrl(getBookingLocation(row))
            ? <a className="text-xs font-black text-[#67B529] underline" href={getMapUrl(getBookingLocation(row))} rel="noreferrer" target="_blank">Open map</a>
            : <span className="text-xs font-semibold text-slate-400">GPS pending</span>
        )
      : key === 'vendor_location'
        ? (
          getMapUrl(getVendorLocation(row))
            ? <a className="text-xs font-black text-sky-700 underline" href={getMapUrl(getVendorLocation(row))} rel="noreferrer" target="_blank">Track live</a>
            : <span className="text-xs font-semibold text-slate-400">GPS pending</span>
        )
      : key === 'work_photos'
        ? <span className="text-xs font-black text-slate-600">{formatWorkPhotos(row)}</span>
      : key === 'expires_at'
        ? <span className="whitespace-nowrap">{formatDate(row[key])}</span>
      : config.endpoint === '/coupons' && key === 'applies_to'
        ? (
          <StatusBadge>
            {{
              all: 'All',
              category: 'Category',
              service: 'Service',
              package: 'Package',
            }[String(row[key] || 'all').toLowerCase()] || formatValue(row[key] || 'All')}
          </StatusBadge>
        )
      : config.endpoint === '/coupons' && key === 'scope_summary'
        ? <span className="text-sm font-semibold text-slate-600">{formatValue(row.scope_summary || 'All services')}</span>
      : key === 'is_required'
        ? <StatusBadge>{row[key] === true || row[key] === 1 || row[key] === '1' || row[key] === 'Yes' ? 'Yes' : 'No'}</StatusBadge>
      : formatValue(row[key]),
  })),
  {
    key: 'actions',
    label: 'Actions',
    className: config.actionsWidth || (config.endpoint === '/service-packages' ? 'min-w-[160px] whitespace-nowrap' : 'min-w-[160px] whitespace-nowrap'),
    render: (row) => {
      const menuItems = config.endpoint === '/partners'
        ? getPartnerMenuItems(row, { canChangeUserPasswords, onApproveKyc, onChangeUserPassword, onPartnerAvailabilityChange, onPartnerStatusChange, onRejectKyc, onView }, config)
        : []

      return (
        <div className={`flex flex-nowrap items-center ${config.endpoint === '/bookings' ? 'gap-1' : 'min-w-28 gap-2'}`}>
          {config.endpoint === '/admin-users' && (
            <ActionIconButton isLoading={actionLoadingId === 'action'} label="View permissions" onClick={() => onViewPermissions(row)}>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </ActionIconButton>
          )}
          {config.endpoint === '/app-content' && (
            <ActionIconButton isLoading={actionLoadingId === 'action'} label="Edit metadata" onClick={() => onViewMetadata(row)}>
              <svg aria-hidden="true" className="h-4 w-4 text-[#67B529]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </ActionIconButton>
          )}
          {canChangeUserPasswords && canShowPasswordAction(config.endpoint) && config.endpoint !== '/partners' && (
            <ActionIconButton isLoading={actionLoadingId === 'action'} label="Change password" onClick={() => onChangeUserPassword(config, row)}>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M15 7a4 4 0 1 1-1.2-2.85L21 11.35V15h-3.65v3.65H13.7l-2.85-2.85" />
                <path d="M7.5 7.5h.01" />
              </svg>
            </ActionIconButton>
          )}
          {['/bookings', '/vendor-jobs'].includes(config.endpoint) && isPaidRecord(row) && (
            <ActionIconButton isLoading={actionLoadingId === 'action'} label="Download invoice" onClick={() => downloadInvoiceFile(row.id)}>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </ActionIconButton>
          )}
          {config.endpoint === '/bookings' && canCancelBooking(row) && (
            <ActionIconButton isLoading={actionLoadingId === 'action'} label="Cancel booking" onClick={() => onBookingCancel(row)} tone="danger">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </ActionIconButton>
          )}
          <ActionIconButton isLoading={actionLoadingId === 'action'} label="Edit" onClick={() => onEdit(row)}>
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </ActionIconButton>
          <ActionIconButton isLoading={actionLoadingId === 'action'} label="Delete" onClick={() => onDelete(row)} tone="danger">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6 18 20H6L5 6" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          </ActionIconButton>
          <RowActionsMenu items={menuItems} />
        </div>
      )
    },
  },
]
