import { useMemo, useState } from 'react'
import { ActionButton } from '../../../components/admin/AdminUI'

const getMetadata = (booking) => booking.metadata || {}
const getApprovalReason = (booking) => getMetadata(booking).approval?.reason
const money = (value) => Number(value || 0).toLocaleString('en-IN')
const getCustomerLocation = (booking) => getMetadata(booking).service_location || getMetadata(booking).customer_location || getMetadata(booking).service_address?.location
const getVendorLocation = (booking) => getMetadata(booking).vendor_location
const locationQuery = (location) => location?.latitude && location?.longitude ? `${location.latitude},${location.longitude}` : ''
const mapUrl = (location) => locationQuery(location) ? `https://www.google.com/maps?q=${locationQuery(location)}` : ''
const directionsUrl = (location) => locationQuery(location) ? `https://www.google.com/maps/dir/?api=1&destination=${locationQuery(location)}` : ''
const formatLocation = (location) => {
  if (!location?.latitude || !location?.longitude) return 'GPS pending'
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
}
const formatSchedule = (value) => {
  if (!value) return 'Schedule pending'

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
  if (['Accepted', 'Professional Assigned'].includes(status)) return 'border-[#67B529]/35 bg-[#EEF9E8] text-[#67B529]'
  if (status === 'Vendor Rejected') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (status === 'Rejected') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function AssignProfessionalView({ bookings, onAcceptBooking, onAssignPartner, onRejectBooking, partners }) {
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || '')
  const [selectedPartnerByBooking, setSelectedPartnerByBooking] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const vendorOptions = useMemo(() => partners.map((partner) => ({
    label: [partner.name, partner.skill, partner.area].filter(Boolean).join(' - '),
    partner,
    search: [partner.name, partner.skill, partner.area, partner.phone].filter(Boolean).join(' ').toLowerCase(),
  })), [partners])

  const findSelectedPartner = (bookingId) => {
    const partnerId = selectedPartnerByBooking[bookingId]
    if (!partnerId) return null

    return vendorOptions.find(({ partner }) => String(partner.id) === String(partnerId))?.partner || null
  }

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return bookings

    return bookings.filter((booking) => [
      booking.booking_no,
      booking.id,
      booking.service_name,
      booking.customer_name,
      booking.customer_phone,
      booking.address,
      booking.payment_method,
      booking.payment_status,
      formatLocation(getCustomerLocation(booking)),
    ].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [bookings, searchQuery])

  const selectedBooking = filteredBookings.find((booking) => String(booking.id) === String(selectedBookingId)) || filteredBookings[0] || null
  const selectedPartner = selectedBooking ? findSelectedPartner(selectedBooking.id) : null
  const canAssign = selectedBooking ? ['Accepted', 'Professional Assigned', 'Vendor Rejected'].includes(selectedBooking.status) : false
  const customerLocation = selectedBooking ? getCustomerLocation(selectedBooking) : null
  const vendorLocation = selectedBooking ? getVendorLocation(selectedBooking) : null
  const customerMapUrl = mapUrl(customerLocation)
  const customerDirectionsUrl = directionsUrl(customerLocation)
  const vendorMapUrl = mapUrl(vendorLocation)

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="relative">
          <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="m21 21-4.3-4.3" />
            <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#67B529] focus:bg-white focus:ring-4 focus:ring-[#EEF9E8]"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search booking ID, service, customer name, phone, location, address..."
            value={searchQuery}
          />
        </div>
      </div>

      <div className="grid min-h-[640px] gap-0 bg-slate-50 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white p-4 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#67B529]">Service queue</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{filteredBookings.length} bookings</h3>
            </div>
          </div>
          <div className="grid gap-3 pb-4">
            {filteredBookings.map((booking) => {
              const isSelected = String(selectedBooking?.id || '') === String(booking.id)

              return (
                <button
                  className={`grid rounded-lg border p-4 text-left transition hover:border-[#67B529]/30 hover:bg-[#EEF9E8]/50 ${
                    isSelected ? 'border-[#67B529] bg-[#EEF9E8] shadow-sm ring-2 ring-[#67B529]/20' : 'border-slate-200 bg-white'
                  }`}
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(booking.status)}`}>
                      {booking.status || 'Pending'}
                    </span>
                    <span className="shrink-0 text-sm font-black text-slate-950">Rs. {money(booking.amount)}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-black leading-5 text-slate-950">
                    {booking.booking_no || booking.id} - {booking.service_name}
                  </p>
                  <div className="mt-auto grid gap-1 pt-3 text-xs font-bold text-slate-500">
                    <p className="truncate">{booking.customer_name || 'Customer not added'}</p>
                    <p className="truncate">{formatSchedule(booking.scheduled_at)}</p>
                    <p className="line-clamp-1">{booking.address || 'No address added'}</p>
                  </div>
                </button>
              )
            })}
            {!filteredBookings.length && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No matching bookings found.</p>}
          </div>
        </aside>

        <section className="min-w-0 p-3 lg:p-4">
          {selectedBooking ? (
            <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusTone(selectedBooking.status)}`}>
                      {selectedBooking.status || 'Pending'}
                    </span>
                    <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">
                      {selectedBooking.booking_no || selectedBooking.id} - {selectedBooking.service_name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatSchedule(selectedBooking.scheduled_at)}</p>
                  </div>
                  <div className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 text-left xl:min-w-44 xl:text-right">
                    <p className="text-xl font-black text-slate-950">Rs. {money(selectedBooking.amount)}</p>
                    <p className="text-xs font-black uppercase text-slate-400">
                      {selectedBooking.payment_method || 'Payment'} / {selectedBooking.payment_status || 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Customer</p>
                      <p className="mt-1 font-black text-slate-900">{selectedBooking.customer_name || 'Customer not added'}</p>
                      <p className="text-sm font-bold text-slate-500">{selectedBooking.customer_phone || 'No phone'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Schedule</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatSchedule(selectedBooking.scheduled_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-black uppercase text-slate-400">Service address</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{selectedBooking.address || 'No address added'}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Exact customer location</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{formatLocation(customerLocation)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customerMapUrl && (
                          <a className="rounded-md bg-[#67B529] px-3 py-1.5 text-xs font-black text-white hover:bg-[#67B529]" href={customerMapUrl} rel="noreferrer" target="_blank">
                            View map
                          </a>
                        )}
                        {customerDirectionsUrl && (
                          <a className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" href={customerDirectionsUrl} rel="noreferrer" target="_blank">
                            Directions
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Vendor accepted location</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{formatLocation(vendorLocation)}</p>
                      {vendorMapUrl && (
                        <a className="mt-2 inline-flex rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" href={vendorMapUrl} rel="noreferrer" target="_blank">
                          View vendor map
                        </a>
                      )}
                    </div>
                  </div>

                  {getApprovalReason(selectedBooking) && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold leading-5 text-rose-700">
                      Reason: {getApprovalReason(selectedBooking)}
                    </p>
                  )}
                </div>

                <aside className="grid h-fit gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-black text-slate-950">Approval action</p>
                    <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">Accept the booking before assigning a professional.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!['Accepted', 'Professional Assigned', 'Vendor Rejected'].includes(selectedBooking.status) && (
                        <ActionButton onClick={() => onAcceptBooking(selectedBooking)} tone="success">Accept</ActionButton>
                      )}
                      {selectedBooking.status !== 'Rejected' && (
                        <ActionButton onClick={() => onRejectBooking(selectedBooking)} tone="danger">Reject with reason</ActionButton>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <label className="block text-sm font-black text-slate-950" htmlFor={`vendor-${selectedBooking.id}`}>
                      Assign professional
                    </label>
                    <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">
                      {canAssign ? 'Choose a professional from the service-provider list.' : 'Accept this booking to enable assignment.'}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <select
                        className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529] disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={!canAssign}
                        id={`vendor-${selectedBooking.id}`}
                        onChange={(event) => setSelectedPartnerByBooking((current) => ({ ...current, [selectedBooking.id]: event.target.value }))}
                        value={selectedPartnerByBooking[selectedBooking.id] || ''}
                      >
                        <option value="">{canAssign ? 'Select service provider' : 'Accept booking first'}</option>
                        {vendorOptions.map(({ label, partner }) => (
                          <option key={partner.id} value={partner.id}>{label || partner.name} ({partner.rating || '0'} rating)</option>
                        ))}
                      </select>
                      <ActionButton
                        disabled={!selectedPartner}
                        onClick={() => selectedPartner && onAssignPartner(selectedBooking, selectedPartner)}
                        tone="primary"
                      >
                        Assign
                      </ActionButton>
                    </div>
                    <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      {selectedPartner
                        ? `${selectedPartner.name} selected`
                        : 'Select professional from dropdown.'}
                    </p>
                  </div>
                </aside>
              </div>
            </article>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
              <div>
                <p className="text-lg font-black text-slate-800">No booking selected</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">Bookings will appear in the left queue.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AssignProfessionalView
