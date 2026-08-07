import { useEffect, useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import { frontendApi } from '../../services/frontendApi'

const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPlacedAt = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return 'Just now'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  })
}

const formatSlot = (value) => {
  if (!value) return 'Slot not selected'

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{1,2}):(\d{2})/)
  if (!match) return value

  const [, year, month, day, hour, minute] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'long' })
  const dateLabel = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return `${dateLabel}, ${timeLabel} (${dayLabel})`
}

const formatStatusTime = (value, fallback = 'Pending') => {
  if (!value) return fallback
  return formatPlacedAt(value)
}

const normalizeStatusKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const statusStepKeys = {
  accepted: 'accepted',
  cancelled: 'completed',
  completed: 'completed',
  on_the_way: 'started',
  pending_approval: 'pending',
  professional_assigned: 'assigned',
  reached_otp_verified: 'started',
  rejected: 'completed',
  started: 'started',
  vendor_accepted: 'assigned',
}

const mergeBookingDetail = (booking, detail) => {
  if (!detail) return booking

  return {
    ...booking,
    backendId: detail.id || booking?.backendId,
    bookingNo: detail.booking_no || booking?.bookingNo,
    createdAt: detail.created_at || booking?.createdAt,
    id: detail.booking_no || booking?.id || (detail.id ? `HC-${detail.id}` : undefined),
    otp: detail.metadata?.service_otp || booking?.otp,
    status: detail.status || booking?.status,
    timeline: detail.timeline || booking?.timeline || [],
    updatedAt: detail.updated_at || booking?.updatedAt,
    metadata: {
      ...(booking?.metadata || {}),
      ...(detail.metadata || {}),
    },
  }
}

function Icon({ name }) {
  const paths = {
    calendar: (
      <>
        <path d="M7 3v3M17 3v3M4 9h16" />
        <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="m9 14 2 2 4-5" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    clock: (
      <>
        <path d="M12 7v5l3 2" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h1M4 12h1M4 18h1" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" />
        <path d="M12 9.5h.01" />
      </>
    ),
    payment: (
      <>
        <path d="M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
        <path d="M3 11h18M16 15h2" />
      </>
    ),
    scissors: (
      <>
        <path d="m14 10 6-6M4 20l6-6M20 20 4 4" />
        <path d="M7.5 7.5A2.5 2.5 0 1 1 4 4a2.5 2.5 0 0 1 3.5 3.5ZM7.5 16.5A2.5 2.5 0 1 1 4 20a2.5 2.5 0 0 1 3.5-3.5Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    timeline: (
      <>
        <path d="M5 5h14M5 12h14M5 19h14" />
        <path d="M8 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM12 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
      </>
    ),
    user: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    vendor: (
      <>
        <path d="M4 20h16M6 20V8l6-4 6 4v12" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
      {paths[name] || paths.list}
    </svg>
  )
}

function SectionTitle({ icon, iconTone = 'emerald', subtitle, title }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-[#EEF9E8] text-[#67B529]',
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[iconTone]}`}>
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="text-lg font-black leading-tight text-[#003F86]">{title}</h2>
        {subtitle && <p className="text-[11px] font-semibold text-blue-600">{subtitle}</p>}
      </div>
    </div>
  )
}

function DetailRow({ helper, icon, label, value }) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF9E8] text-[#67B529] shadow-sm border border-[#67B529]/10 mt-0.5">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 break-words text-[14px] sm:text-[15px] font-bold leading-snug text-slate-900">{value || 'Not available'}</p>
        {helper && <p className="mt-1 text-[12px] sm:text-[13px] font-semibold leading-relaxed text-blue-600">{helper}</p>}
      </div>
    </div>
  )
}

function StatusPanel({ helper, label, tone = 'neutral', value }) {
  const toneStyles = {
    emerald: 'border-[#67B529]/20 bg-[#F5FCF2]',
    amber: 'border-amber-200/60 bg-[#FFFBF5]',
    neutral: 'border-blue-100 bg-[#F6FBFF]',
    sky: 'border-sky-200 bg-[#F5FAFF]',
  }
  const iconStyles = {
    amber: 'bg-[#FFF3E0] text-amber-500 shadow-sm border border-amber-100',
    emerald: 'bg-[#E8F5E9] text-[#67B529] shadow-sm border border-green-100',
    neutral: 'bg-blue-50 text-blue-900 shadow-sm border border-blue-100',
    sky: 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100',
  }
  const textTone = {
    amber: 'text-amber-600',
    emerald: 'text-[#2F6412]',
    neutral: 'text-blue-700',
    sky: 'text-sky-700',
  }
  const borderTone = {
    amber: 'border-amber-300',
    emerald: 'border-[#67B529]/40',
    neutral: 'border-blue-200',
    sky: 'border-sky-300',
  }

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${toneStyles[tone]}`}>
      <div className="flex items-center gap-4 sm:gap-6">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl font-black ${iconStyles[tone]}`}>
          <Icon name={tone === 'emerald' ? 'shield' : 'clock'} />
        </span>
        <div className={`min-w-0 flex-1 border-l-2 pl-4 sm:pl-5 ${borderTone[tone]}`}>
          <p className={`text-[11px] font-black uppercase tracking-wider ${textTone[tone]}`}>{label}</p>
          <p className="mt-1 break-words text-[17px] font-black leading-snug text-slate-900">{value || 'Not available'}</p>
          {helper && <p className="mt-1 text-[13px] font-semibold leading-relaxed text-slate-600">{helper}</p>}
        </div>
      </div>
    </div>
  )
}

function BookingTimeline({ booking }) {
  const timeline = Array.isArray(booking?.timeline) ? booking.timeline : []
  const statusKey = normalizeStatusKey(booking?.status || 'Pending Approval')
  const activeKey = statusStepKeys[statusKey] || 'pending'
  const activeIndex = Math.max(1, ['placed', 'pending', 'accepted', 'assigned', 'started', 'completed'].indexOf(activeKey))
  const statusTimes = booking?.metadata?.status_times || {}
  const steps = [
    { icon: 'check', key: 'placed', label: 'Booking Placed', meta: formatPlacedAt(booking?.createdAt || booking?.placedAt), state: 'done' },
    { icon: 'clock', key: 'pending', label: 'Pending Approval', meta: formatStatusTime(statusTimes.pending_approval, activeIndex === 1 ? 'In Progress' : 'Done') },
    { icon: 'shield', key: 'accepted', label: 'Admin Accepted', meta: formatStatusTime(statusTimes.accepted, activeIndex === 2 ? 'In Progress' : 'Upcoming') },
    { icon: 'user', key: 'assigned', label: 'Vendor Assigned', meta: formatStatusTime(statusTimes.assigned || statusTimes.vendor_accepted, activeIndex === 3 ? 'In Progress' : 'Upcoming') },
    { icon: 'vendor', key: 'started', label: 'Service Started', meta: formatStatusTime(statusTimes.started || statusTimes.on_the_way || statusTimes.reached_otp_verified, activeIndex === 4 ? 'In Progress' : 'Upcoming') },
    { icon: 'check', key: 'completed', label: statusKey === 'rejected' ? 'Rejected' : 'Completed', meta: formatStatusTime(statusTimes.completed || statusTimes.rejected, activeIndex === 5 ? 'Done' : 'Upcoming') },
  ].map((step, index) => ({
    ...step,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming',
  }))
  const progressWidth = `${Math.min(84, Math.max(0, (activeIndex / (steps.length - 1)) * 84))}%`
  const stepStyles = {
    current: 'border-amber-400 bg-amber-500 text-white',
    done: 'border-[#67B529] bg-[#67B529] text-white',
    upcoming: 'border-blue-200 bg-white text-blue-700',
  }
  const textStyles = {
    current: 'text-amber-700',
    done: 'text-[#67B529]',
    upcoming: 'text-[#003F86]',
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm mb-4">
      <SectionTitle icon="timeline" iconTone="blue" title="Booking Timeline" subtitle="Track your booking progress" />
      <div className="min-w-0 mt-5 relative">
        <div className="absolute left-[8%] right-[8%] top-3.5 h-[2px] bg-blue-100" />
        <div className="absolute left-[8%] top-3.5 h-[2px] bg-[#67B529]" style={{ width: progressWidth }} />
        <div className="grid w-full grid-cols-6 gap-1">
          {steps.map((step) => (
            <div className="relative z-10 grid justify-items-center text-center" key={step.label}>
              <span className={`grid h-7 w-7 place-items-center rounded-full border-[1.5px] shadow-sm ${stepStyles[step.state]}`}>
                <Icon name={step.icon} />
              </span>
              <p className={`mt-2 max-w-[64px] text-[9px] font-black leading-tight sm:max-w-[72px] sm:text-[10px] ${textStyles[step.state]}`}>
                {step.label}
              </p>
              <p className="mt-0.5 max-w-[64px] text-[8px] font-semibold leading-tight text-blue-600 sm:max-w-[72px] sm:text-[9px]">
                {step.meta}
              </p>
            </div>
          ))}
        </div>
      </div>
      {timeline.length > 0 && (
        <div className="mt-5 border-t border-blue-50 pt-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#003F86]">Live updates</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {timeline.map((entry) => (
              <span className="rounded-full border border-blue-100 bg-[#F6FBFF] px-2.5 py-1 text-[10px] font-bold text-blue-800" key={entry}>
                {entry}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlaceBookingPage({
  appSettings,
  booking,
  cartCount,
  isLoggedIn,
  locationLabel,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onBookingUpdated,
  onSearchSuggestionSelect,
  onShowServices,
  searchSuggestions,
  user,
}) {
  const [liveBooking, setLiveBooking] = useState(booking)
  const activeBooking = liveBooking || booking
  const backendBookingId = activeBooking?.backendId

  useEffect(() => {
    setLiveBooking(booking)
  }, [booking])

  useEffect(() => {
    if (!backendBookingId) return undefined

    let ignore = false
    frontendApi.bookingDetail(backendBookingId)
      .then((detail) => {
        if (ignore) return
        const nextBooking = mergeBookingDetail(activeBooking, detail)
        setLiveBooking(nextBooking)
        onBookingUpdated?.(nextBooking)
      })
      .catch(() => undefined)

    return () => {
      ignore = true
    }
  }, [backendBookingId])

  useRealtimeRefresh({
    enabled: Boolean(backendBookingId),
    intervalMs: 7000,
    target: 'customer',
    onRefresh: async (payload = {}) => {
      if (payload.bookingId && String(payload.bookingId) !== String(backendBookingId)) return

      const detail = await frontendApi.bookingDetail(backendBookingId)
      const nextBooking = mergeBookingDetail(activeBooking, detail)
      setLiveBooking(nextBooking)
      onBookingUpdated?.(nextBooking)
    },
  })

  const serviceAddress = activeBooking
    ? [activeBooking.address?.flat, activeBooking.address?.street, activeBooking.address?.city].filter(Boolean).join(', ')
    : 'No booking address found'
  const paymentLabel = activeBooking?.paymentModeLabel || (activeBooking?.paymentMode === 'online' ? 'Pay online' : 'Pay after service')
  const serviceItems = [
    ...(activeBooking?.items || []),
    ...(Number(activeBooking?.tipAmount || 0) > 0 ? [{ name: 'Professional Tip', quantity: 1, lineTotal: Number(activeBooking.tipAmount) }] : [])
  ]
  const statusLabel = activeBooking?.status || 'Pending Approval'
  const otpLabel = activeBooking?.otp || 'After approval'

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        cartCount={cartCount}
        appSettings={appSettings}
        isLoggedIn={isLoggedIn}
        locationLabel={locationLabel}
        onBackHome={onBackHome}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={user}
      />

      <section className="mx-auto max-w-4xl px-3 py-4 lg:px-6 lg:py-6 grid gap-4">
        
        {/* CONFIRMATION CARD */}
        <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#67B529] text-base font-black text-white mt-1">
              <Icon name="check" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-[#2F6412]">
                  Booking placed
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black leading-tight text-slate-950">Booking Confirmed!</h1>
              <p className="mt-1.5 text-xs sm:text-sm font-semibold leading-relaxed text-slate-600">
                Your request has been created. Super admin approval and vendor assignment will happen from the admin panel.
              </p>
            </div>
          </div>
          
          <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#003F86]">Booking ID</p>
                <p className="mt-1 break-words text-lg sm:text-xl font-black text-slate-950">{activeBooking?.id || 'Pending'}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#003F86]">Total</p>
                <p className="mt-1 text-lg sm:text-xl font-black text-[#67B529]">Rs. {formatAmount(activeBooking?.amount)}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-blue-50 pt-3 text-[11px] sm:text-xs font-semibold text-blue-600">
              Keep this ID handy for support and tracking.
            </p>
          </div>
        </div>

        {/* TIMELINE */}
        <BookingTimeline booking={activeBooking} />

        {/* TWO COLUMN GRID FOR TABLET/DESKTOP */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 content-start">
            
            {/* VISIT DETAILS */}
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <SectionTitle icon="calendar" title="Visit Details" subtitle="Address, contact and appointment information." />
              <div className="mt-5 mb-5 border-t border-slate-100 pt-1">
                <DetailRow icon="location" label="Service Address" value={serviceAddress} />
                <DetailRow
                  icon="user"
                  label="Contact Person"
                  value={activeBooking?.address?.contactName || 'Not added'}
                  helper={activeBooking?.address?.mobile || 'No mobile number'}
                />
                <DetailRow icon="clock" label="Selected Slot" value={formatSlot(activeBooking?.slot)} />
                <DetailRow icon="payment" label="Payment Method" value={paymentLabel} helper={`Payable amount: Rs. ${formatAmount(activeBooking?.amount)}`} />
              </div>
              <div className="grid gap-4">
                <StatusPanel label="Booking status" tone="amber" value={statusLabel} helper="Admin approval is required before vendor assignment." />
                <StatusPanel
                  label="In-app service OTP"
                  tone="emerald"
                  value={otpLabel}
                />
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F5F8FF] p-4 border border-[#E5EFFF]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-xs font-black text-white shrink-0">i</span>
                <p className="text-[13px] text-slate-700">
                  <span className="font-bold text-blue-900">Note:</span> Your booking is confirmed once approved.
                </p>
              </div>
            </section>

            {/* SERVICES BOOKED */}
            <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
              <SectionTitle icon="scissors" iconTone="blue" title="Services Booked" subtitle={`${serviceItems.length} selected service item${serviceItems.length === 1 ? '' : 's'}.`} />
              <div className="mt-4 rounded-lg border border-blue-100 bg-white">
                {serviceItems.map((item) => (
                  <article className="grid gap-2 border-b border-blue-50 p-3 sm:p-4 last:border-b-0" key={item.name}>
                    <div className="flex items-start justify-between gap-3 min-w-0 border-l-[3px] border-[#67B529] pl-3">
                      <div className="min-w-0">
                        <p className="break-words font-black text-[#003F86] text-sm leading-snug">{item.name}</p>
                        <p className="mt-1 text-[11px] sm:text-xs font-semibold text-blue-600">
                          Qty {item.quantity} <span className="text-blue-200">|</span> {item.duration || 'Duration not added'}
                        </p>
                      </div>
                      <p className="rounded bg-[#EEF9E8] px-2 py-1 text-right text-xs font-black text-[#67B529] shrink-0 self-center">
                        Rs. {formatAmount(item.lineTotal)}
                      </p>
                    </div>
                  </article>
                ))}
                {!serviceItems.length && (
                  <div className="bg-[#F6FBFF] p-4 text-[11px] font-semibold text-blue-600">
                    No service items available for this confirmation.
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* SIDEBAR */}
          <div className="grid gap-4 content-start">
            <aside className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
              <SectionTitle icon="list" iconTone="blue" title="Next Steps" subtitle="Here's what happens next." />
              <div className="mt-4 border-l border-blue-100 ml-4 py-1">
                {[
                  'Super admin will accept the booking',
                  'Available vendor will be assigned',
                  'Share OTP only after vendor reaches',
                  'Review can be added after service completion',
                ].map((step, index) => (
                  <div className="relative flex items-center gap-3 mb-4 last:mb-0" key={step}>
                    <span className="absolute -left-3.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#003F86] text-[10px] font-black text-white outline outline-4 outline-white">
                      {index + 1}
                    </span>
                    <p className="text-[11px] sm:text-xs font-semibold leading-snug text-slate-700 pl-4">{step}</p>
                  </div>
                ))}
              </div>
            </aside>

            <aside className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm mb-10">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[13px] font-black text-[#003F86]">Total Amount</span>
                <span className="text-lg font-black text-[#67B529]">Rs. {formatAmount(activeBooking?.amount)}</span>
              </div>
              <p className="mt-2 text-[10px] sm:text-[11px] font-semibold leading-relaxed text-blue-600">
                Browser location is only for convenience. Vendor will visit the selected service address.
              </p>
              <button className="mt-4 w-full rounded-md bg-[#67B529] px-4 py-2.5 text-[13px] font-black text-white hover:bg-[#5CA827] active:scale-95 transition-transform" onClick={onOpenProfile} type="button">
                Track in profile
              </button>
              <button className="mt-2.5 w-full rounded-md border border-blue-200 px-4 py-2.5 text-[13px] font-black text-[#003F86] hover:bg-blue-50 active:scale-95 transition-transform" onClick={onShowServices} type="button">
                Book another service
              </button>
            </aside>
          </div>
        </div>

      </section>

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default PlaceBookingPage
