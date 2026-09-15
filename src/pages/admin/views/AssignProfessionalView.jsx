import { useMemo, useState } from 'react'

const getMetadata = (booking) => booking?.metadata || {}
const getApprovalReason = (booking) => getMetadata(booking).approval?.reason
const getServiceOtp = (booking) => booking?.otp || getMetadata(booking).service_otp || null
const money = (value) => Number(value || 0).toLocaleString('en-IN')
const getCustomerLocation = (booking) => getMetadata(booking).service_location || getMetadata(booking).customer_location || getMetadata(booking).service_address?.location
const getVendorLocation = (booking) => getMetadata(booking).vendor_location
const locationQuery = (location) => (location?.latitude && location?.longitude ? `${location.latitude},${location.longitude}` : '')
const mapUrl = (location) => (locationQuery(location) ? `https://www.google.com/maps?q=${locationQuery(location)}` : '')
const directionsUrl = (location) => (locationQuery(location) ? `https://www.google.com/maps/dir/?api=1&destination=${locationQuery(location)}` : '')

const formatLocation = (location) => {
  if (!location?.latitude || !location?.longitude) return 'GPS pending'
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
}

const formatSchedule = (value, fallback = 'Pending') => {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const statusTone = (status) => {
  if (['Accepted', 'Professional Assigned'].includes(status)) return 'border-[#67B529]/40 bg-[#EEF9E8] text-[#4F9A1E]'
  if (status === 'Vendor Rejected') return 'border-rose-200 bg-rose-50 text-rose-600'
  if (status === 'Rejected') return 'border-rose-200 bg-rose-50 text-rose-600'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

const formatVendorCode = (id) => (id ? `VEN-${String(id).padStart(5, '0')}` : '')

// Icon Components
function CalendarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ClockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function HourglassIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  )
}

function UserIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="16" rx="2" width="20" x="2" y="4" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function BriefcaseIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="14" rx="2" ry="2" width="20" x="2" y="7" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function LocationPinIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function TargetIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function StoreIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  )
}

function AlertCircleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

function UserPlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}

function MapIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  )
}

function DirectionsIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="12 2 19 21 12 17 5 21 12 2" />
    </svg>
  )
}

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.275-.1-.475-.15-.675.15-.2.301-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.413-1.488-.893-.795-1.496-1.777-1.671-2.077-.175-.3-.019-.462.131-.611.135-.134.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.585-.493-.505-.675-.515-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375s-1.05 1.025-1.05 2.5 1.075 2.897 1.225 3.097c.15.2 2.116 3.231 5.127 4.532.716.31 1.275.495 1.71.633.72.228 1.375.196 1.893.118.577-.087 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.127-.275-.202-.575-.352zM12.04 2C6.495 2 2 6.495 2 12.04c0 1.77.462 3.498 1.34 5.02L2 22l5.09-1.335c1.474.805 3.14 1.23 4.95 1.23 5.545 0 10.04-4.495 10.04-10.04C22.08 6.495 17.585 2 12.04 2z" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

const getPartnerFromBooking = (booking, partnersList) => {
  if (!booking) return null
  const partnerId = booking.partner_id || booking.metadata?.partner_id
  const partnerName = booking.professional_name || booking.metadata?.partner_name

  if (partnerId) {
    const found = partnersList.find((p) => String(p.id) === String(partnerId))
    if (found) return found
  }
  if (partnerName) {
    const found = partnersList.find((p) => String(p.name).toLowerCase() === String(partnerName).toLowerCase())
    if (found) return found
  }
  return null
}

function AssignProfessionalView({ bookings, onAcceptBooking, onAssignPartner, onRejectBooking, partners }) {
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || '')
  const [selectedPartnerByBooking, setSelectedPartnerByBooking] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const vendorOptions = useMemo(() => partners.map((partner) => {
    const code = partner.vendor_id || formatVendorCode(partner.id)
    return {
      code,
      label: [code, partner.name, partner.skill, partner.area].filter(Boolean).join(' · '),
      partner,
      search: [code, partner.name, partner.skill, partner.area, partner.phone, partner.email].filter(Boolean).join(' ').toLowerCase(),
    }
  }), [partners])

  const findSelectedPartner = (bookingId) => {
    const partnerId = selectedPartnerByBooking[bookingId]
    if (!partnerId) return null

    return vendorOptions.find(({ partner }) => String(partner.id) === String(partnerId))?.partner || null
  }

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return bookings

    return bookings.filter((booking) => {
      const partner = getPartnerFromBooking(booking, partners)
      const partnerCode = partner?.vendor_id || formatVendorCode(partner?.id || booking.partner_id)
      return [
        booking.booking_no,
        booking.id,
        booking.service_name,
        booking.customer_name,
        booking.customer_phone,
        booking.professional_name,
        partner?.name,
        partnerCode,
        booking.address,
        booking.payment_method,
        booking.payment_status,
        formatLocation(getCustomerLocation(booking)),
      ].filter(Boolean).join(' ').toLowerCase().includes(query)
    })
  }, [bookings, partners, searchQuery])

  const selectedBooking = filteredBookings.find((booking) => String(booking.id) === String(selectedBookingId)) || filteredBookings[0] || null
  const assignedPartner = useMemo(() => getPartnerFromBooking(selectedBooking, partners), [selectedBooking, partners])
  const assignedPartnerName = assignedPartner?.name || selectedBooking?.professional_name || selectedBooking?.metadata?.partner_name || null
  const assignedPartnerId = assignedPartner?.id || selectedBooking?.partner_id || selectedBooking?.metadata?.partner_id || null
  const assignedPartnerCode = assignedPartner?.vendor_id || formatVendorCode(assignedPartnerId)

  const selectedPartner = selectedBooking ? findSelectedPartner(selectedBooking.id) : null
  const canAssign = selectedBooking ? ['Accepted', 'Professional Assigned', 'Vendor Rejected'].includes(selectedBooking.status) : false
  const customerLocation = selectedBooking ? getCustomerLocation(selectedBooking) : null
  const vendorLocation = selectedBooking ? getVendorLocation(selectedBooking) : null
  const customerMapUrl = mapUrl(customerLocation)
  const customerDirectionsUrl = directionsUrl(customerLocation)

  const duration = selectedBooking?.duration || selectedBooking?.metadata?.duration || selectedBooking?.metadata?.package?.duration || '60 mins'
  const customerName = selectedBooking?.customer_name || selectedBooking?.metadata?.customer_name || 'Roshan Kumar'
  const customerPhone = selectedBooking?.customer_phone || selectedBooking?.phone || selectedBooking?.metadata?.customer_phone || selectedBooking?.metadata?.phone || ''
  const customerEmail = selectedBooking?.customer_email || selectedBooking?.email || selectedBooking?.metadata?.customer_email || selectedBooking?.metadata?.email || 'roshan@gmail.com'

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="relative">
          <svg aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m21 21-4.3-4.3" />
            <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#67B529] focus:bg-white"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search booking ID, service, customer, vendor code, phone, address..."
            value={searchQuery}
          />
        </div>
      </div>

      <div className="grid min-h-[640px] bg-slate-50/70 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white p-3 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-slate-100">
          <div className="mb-3 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#67B529]">Service queue</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-800">{filteredBookings.length} bookings</h3>
          </div>

          <div className="grid gap-2 pb-2">
            {filteredBookings.map((booking) => {
              const isSelected = String(selectedBooking?.id || '') === String(booking.id)

              return (
                <button
                  className={`grid rounded-lg border p-3 text-left transition ${
                    isSelected ? 'border-[#67B529] bg-[#F4FBF0]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(booking.status)}`}>
                      {booking.status || 'Pending'}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-700">Rs. {money(booking.amount)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">
                    {booking.booking_no || booking.id} — {booking.service_name}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs font-medium text-slate-500">
                    <p className="truncate text-slate-700">{booking.customer_name || 'Customer not added'}</p>
                    <p className="truncate">{formatSchedule(booking.scheduled_at)}</p>
                    <p className="line-clamp-1">{booking.address || 'No address added'}</p>
                  </div>
                </button>
              )
            })}
            {!filteredBookings.length && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                No matching bookings found.
              </p>
            )}
          </div>
        </aside>

        <section className="min-w-0 p-3 lg:p-4">
          {selectedBooking ? (
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              {/* Top Booking Header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone(selectedBooking.status)}`}>
                      {selectedBooking.status || 'PROFESSIONAL ASSIGNED'}
                    </span>
                    <h3 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-800">
                      {selectedBooking.booking_no || selectedBooking.id} — {selectedBooking.service_name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <span>Booked: {formatSchedule(selectedBooking.created_at || selectedBooking.booked_at, 'Date pending')}</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="h-4 w-4 text-slate-500" />
                        <span>Service Schedule: {formatSchedule(selectedBooking.scheduled_at, 'Schedule pending')}</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <HourglassIcon className="h-4 w-4 text-slate-500" />
                        <span>Duration: {duration}</span>
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-5 py-3 text-left xl:min-w-44 xl:text-right">
                    <p className="text-xl font-bold text-slate-800">Rs. {money(selectedBooking.amount)}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {selectedBooking.payment_method || 'COD'} / {selectedBooking.payment_status || 'CASH'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid gap-3.5 bg-slate-50/40 p-3.5 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="grid gap-3.5">
                  {/* Row 1: Customer Details & Assigned Professional */}
                  <div className="grid gap-3.5 md:grid-cols-2">
                    {/* Customer Details Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-800">Customer Details</h4>
                        {getServiceOtp(selectedBooking) && (
                          <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            OTP: {getServiceOtp(selectedBooking)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-800">{customerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="font-semibold text-slate-800">{customerPhone || 'No phone'}</span>
                          </div>
                          {customerPhone && (
                            <a
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                              href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`}
                              rel="noreferrer"
                              target="_blank"
                              title="WhatsApp Customer"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MailIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-800">{customerEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Professional Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-800">Assigned Professional</h4>
                        {assignedPartnerCode && (
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            {assignedPartnerCode}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-800">{assignedPartnerName || 'Saumya Awasthi'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="font-semibold text-slate-800">{assignedPartner?.phone || '9793767197'}</span>
                          </div>
                          {(assignedPartner?.phone || '9793767197') && (
                            <a
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                              href={`https://wa.me/${String(assignedPartner?.phone || '9793767197').replace(/[^0-9]/g, '')}`}
                              rel="noreferrer"
                              target="_blank"
                              title="WhatsApp Professional"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <BriefcaseIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            {assignedPartner?.availability || 'Busy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Service Schedule & Service Address */}
                  <div className="grid gap-3.5 md:grid-cols-2">
                    {/* Service Schedule Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Service Schedule</h4>
                      </div>
                      <div className="mt-2.5 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-800">{formatSchedule(selectedBooking.scheduled_at, '14 Aug 2026, 11:30 pm')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-800">{duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Address Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                          <LocationPinIcon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Service Address</h4>
                      </div>
                      <div className="mt-2.5 flex items-start gap-2 text-sm">
                        <LocationPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-semibold leading-relaxed text-slate-800">{selectedBooking.address || '8956, Goel Heights, Tiwariganj, Lucknow, Lucknow'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Exact Customer Location & Vendor Accepted Location */}
                  <div className="grid gap-3.5 md:grid-cols-2">
                    {/* Exact Customer Location Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <TargetIcon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Exact Customer Location</h4>
                      </div>
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <LocationPinIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>{formatLocation(customerLocation)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {customerMapUrl ? (
                            <a
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#67B529] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#5aa324]"
                              href={customerMapUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <MapIcon className="h-3.5 w-3.5" /> View map
                            </a>
                          ) : (
                            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#67B529] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#5aa324]" type="button">
                              <MapIcon className="h-3.5 w-3.5" /> View map
                            </button>
                          )}
                          {customerDirectionsUrl ? (
                            <a
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-600 shadow-xs transition hover:bg-slate-50"
                              href={customerDirectionsUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <DirectionsIcon className="h-3.5 w-3.5" /> Directions
                            </a>
                          ) : (
                            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-600 shadow-xs transition hover:bg-slate-50" type="button">
                              <DirectionsIcon className="h-3.5 w-3.5" /> Directions
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vendor Accepted Location Card */}
                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                          <StoreIcon className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Vendor Accepted Location</h4>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <LocationPinIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{formatLocation(vendorLocation)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason if rejected */}
                  {getApprovalReason(selectedBooking) && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium leading-5 text-rose-600">
                      Reason: {getApprovalReason(selectedBooking)}
                    </p>
                  )}
                </div>

                {/* Right Action Sidebar */}
                <aside className="grid h-fit gap-3.5">
                  {/* Approval Action Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                    <div className="flex items-center gap-2 pb-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                        <AlertCircleIcon className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Approval action</h4>
                    </div>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">Accept the booking before assigning a professional.</p>
                    <div className="mt-3 flex flex-col gap-2">
                      {!['Accepted', 'Professional Assigned', 'Vendor Rejected'].includes(selectedBooking.status) && (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#67B529] py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#5ca827]"
                          onClick={() => onAcceptBooking(selectedBooking)}
                          type="button"
                        >
                          Accept
                        </button>
                      )}
                      {selectedBooking.status !== 'Rejected' && (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                          onClick={() => onRejectBooking(selectedBooking)}
                          type="button"
                        >
                          <span className="text-base font-black">✕</span> Reject with reason
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assign Professional Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                    <div className="flex items-center gap-2 pb-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <UserPlusIcon className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Assign professional</h4>
                    </div>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">Choose a professional from the service-provider list.</p>
                    <div className="mt-3 space-y-2.5">
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-[#67B529] disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={!canAssign}
                          id={`vendor-${selectedBooking.id}`}
                          onChange={(event) => setSelectedPartnerByBooking((current) => ({ ...current, [selectedBooking.id]: event.target.value }))}
                          value={selectedPartnerByBooking[selectedBooking.id] || ''}
                        >
                          <option value="">{canAssign ? 'Select service provider' : 'Accept booking first'}</option>
                          {vendorOptions.map(({ label, partner, code }) => (
                            <option key={partner.id} value={partner.id}>
                              {code ? `[${code}] ` : ''}{partner.name} {partner.skill ? `— ${partner.skill}` : ''} ({partner.rating || '0'} ★)
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      </div>
                      <button
                        className="w-full rounded-lg bg-[#67B529] py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#5ca827] disabled:cursor-not-allowed disabled:bg-[#8ec266]"
                        disabled={!selectedPartner}
                        onClick={() => selectedPartner && onAssignPartner(selectedBooking, selectedPartner)}
                        type="button"
                      >
                        {assignedPartnerName ? 'Reassign' : 'Assign'}
                      </button>
                    </div>
                    <p className="mt-2.5 text-center text-xs font-medium text-slate-500">
                      {selectedPartner
                        ? `Selected: ${selectedPartner.name} (${formatVendorCode(selectedPartner.id)})`
                        : assignedPartnerName
                        ? `Currently assigned: ${assignedPartnerName} (${assignedPartnerCode})`
                        : 'Select professional from dropdown.'}
                    </p>
                  </div>
                </aside>
              </div>
            </article>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <div>
                <p className="text-base font-semibold text-slate-700">No booking selected</p>
                <p className="mt-1.5 text-sm font-medium text-slate-500">Bookings will appear in the left queue.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AssignProfessionalView
