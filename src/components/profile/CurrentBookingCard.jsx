import { useState } from 'react'
import { getBookedLineItems, getExtraLineItems, getPendingExtraLineItems, getPendingExtraTotal } from '../../utils/bookingItems'

const trackingSteps = [
  { icon: 'check', key: 'placed', label: 'Booking Placed', statuses: ['Pending', 'Pending Approval'] },
  { icon: 'clock', key: 'pending_approval', label: 'Pending Approval', statuses: ['Pending', 'Pending Approval'] },
  { icon: 'shield', key: 'accepted', label: 'Admin Accepted', statuses: ['Accepted'] },
  { icon: 'user', key: 'professional_assigned', label: 'Vendor Assigned', statuses: ['Professional Assigned', 'Technician assigned', 'Vendor Accepted'] },
  { icon: 'vendor', key: 'started', label: 'Service Started', statuses: ['On The Way', 'On the way', 'Reached - OTP Verified', 'OTP verified', 'Started', 'In progress'] },
  { icon: 'check', key: 'completed', label: 'Completed', statuses: ['Completed'] },
]

const closedStatuses = {
  Cancelled: {
    message: 'This booking has been cancelled. No professional visit is scheduled for this request.',
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  Rejected: {
    message: 'This booking was not approved. Please place a new booking if you still need the service.',
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  Refunded: {
    message: 'This booking was closed and the refund status has been updated.',
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
  },
}

const getStepIndex = (status) => {
  const normalizedStatus = status || 'Pending'
  const foundIndex = trackingSteps.findIndex((step) => step.statuses.includes(normalizedStatus))
  return foundIndex >= 0 ? foundIndex : 1
}

const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN')

const formatKolkataTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

const getStepTime = (booking, step, index, currentStep) => {
  const statusTimes = booking?.metadata?.status_times || booking?.statusTimes || {}
  const work = booking?.metadata?.work || {}
  const fallbackTimes = {
    placed: booking?.createdAt || booking?.created_at,
    pending_approval: statusTimes.pending_approval,
    accepted: statusTimes.accepted || booking?.acceptedAt,
    professional_assigned: statusTimes.assigned || statusTimes.professional_assigned || statusTimes.vendor_accepted || booking?.assignedAt,
    started: statusTimes.started || statusTimes.otp_verified || statusTimes.on_the_way || statusTimes.vendor_accepted || work.started_at || work.otp_verified_at,
    completed: statusTimes.completed || work.completed_at,
  }
  return index <= currentStep ? formatKolkataTime(fallbackTimes[step.key] || (index === currentStep ? booking?.updatedAt || booking?.updated_at : '')) : ''
}

function Icon({ name }) {
  const paths = {
    check: <path d="m5 12 4 4 10-10" />,
    clock: (
      <>
        <path d="M12 7v5l3 2" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sos: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
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
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
      {paths[name] || paths.check}
    </svg>
  )
}

function InfoTile({ helper, icon, label, tone = 'neutral', value }) {
  const tones = {
    emerald: 'border-[#67B529]/35 bg-[#EEF9E8] text-[#2F6412]',
    neutral: 'border-blue-100 bg-white text-[#003F86]',
  }
  const iconTones = {
    emerald: 'bg-emerald-100 text-[#67B529]',
    neutral: 'bg-blue-50 text-blue-900',
  }

  return (
    <div className={`rounded-lg border px-3 py-2.5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconTones[tone]}`}>
          <span className="scale-90"><Icon name={icon} /></span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{label}</p>
          <p className={`truncate text-sm font-bold leading-snug ${tone === 'emerald' ? 'text-[#67B529]' : 'text-blue-900'}`}>
            {value || 'Not available'}
          </p>
          {helper ? <p className="mt-0.5 line-clamp-1 text-xs font-medium text-blue-700/80">{helper}</p> : null}
        </div>
      </div>
    </div>
  )
}

function CurrentBookingCard({ alreadyReviewed = false, booking, onApproveExtraItems, onCancelBooking, onRejectExtraItems, onSubmitReview }) {
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
  const [isExtraConsentLoading, setIsExtraConsentLoading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const status = booking?.status || 'Pending'
  const closedState = closedStatuses[status]
  const currentStep = getStepIndex(status)
  const progressWidth = `${Math.min(100, Math.max(0, (currentStep / (trackingSteps.length - 1)) * 100))}%`
  const statusReason = booking?.statusReason || closedState?.message
  const serviceOtp = booking?.otp || booking?.metadata?.service_otp || 'After approval'
  const canReview = status === 'Completed' && !alreadyReviewed && !booking?.metadata?.reviews?.customer_to_vendor
  const canSubmitReview = canReview && reviewForm.text.trim() && !isSubmittingReview
  const canCancel = Boolean(onCancelBooking) && !closedState && status !== 'Completed'

  const handleCancelBooking = async () => {
    if (!canCancel || isCancelling) return
    setIsCancelling(true)
    try {
      await onCancelBooking?.(booking)
    } finally {
      setIsCancelling(false)
    }
  }

  const submitReview = async () => {
    if (!canSubmitReview) return
    setIsSubmittingReview(true)
    try {
      await onSubmitReview?.({
        orderId: booking.id,
        rating: reviewForm.rating,
        text: reviewForm.text.trim(),
      })
      setReviewForm({ rating: 5, text: '' })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const bookedItems = getBookedLineItems(booking)
  const extraItems = getExtraLineItems(booking)
  const pendingExtraItems = getPendingExtraLineItems(booking)
  const extraTotal = extraItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  const pendingExtraTotal = getPendingExtraTotal(booking)
  const hasPendingExtras = pendingExtraItems.length > 0

  const handleApproveExtras = async () => {
    if (!hasPendingExtras || isExtraConsentLoading) return
    setIsExtraConsentLoading(true)
    try {
      await onApproveExtraItems?.(booking)
    } finally {
      setIsExtraConsentLoading(false)
    }
  }

  const handleRejectExtras = async () => {
    if (!hasPendingExtras || isExtraConsentLoading) return
    setIsExtraConsentLoading(true)
    try {
      await onRejectExtraItems?.(booking)
    } finally {
      setIsExtraConsentLoading(false)
    }
  }

  const bookedTotalPriced = bookedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  const subtotal = bookedTotalPriced + extraTotal
  const serviceFee = Number(booking?.metadata?.service_fee || 0)
  const discount = Number(booking?.metadata?.coupon?.discount || booking?.metadata?.discount || 0)
  const taxable = Math.max(0, subtotal + serviceFee - discount)
  
  const existingTax = Math.max(0, Number(booking?.amount || 0) - taxable)
  const total = taxable + existingTax
  const projectedTotal = total + pendingExtraTotal

  return (
    <section className="flex flex-col w-full bg-white lg:rounded-xl lg:border lg:border-blue-100 lg:shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between lg:px-4 lg:py-3 shrink-0">
        <div className="flex min-w-0 w-full gap-4">
          <div className="min-w-0 w-full">
            <div className="flex items-center justify-between gap-4">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${closedState ? closedState.tone : 'border-[#67B529]/35 bg-[#EEF9E8] text-[#67B529]'}`}>
                {status}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {!closedState && status !== 'Completed' ? (
                  <button aria-label="Contact technician" className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[#003F86] hover:bg-blue-100 transition-colors" type="button">
                    <span className="scale-[0.75]"><Icon name="phone" /></span>
                  </button>
                ) : null}
                <button className="flex h-7 items-center gap-1 rounded-full bg-rose-50 px-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-100 transition-colors" type="button">
                  <span className="scale-[0.8]"><Icon name="sos" /></span> SOS
                </button>
              </div>
            </div>
            <h2 className="mt-2 break-words text-xl font-bold text-[#003F86] leading-snug">{booking?.service}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {booking?.id} | {[booking?.date, booking?.time].filter(Boolean).join(' | ') || 'Schedule pending'}
            </p>
          </div>
        </div>
        <div className="grid justify-items-start gap-2 sm:max-w-xs sm:justify-items-end sm:text-right">
          {closedState && statusReason ? (
            <p className="text-xs font-semibold leading-5 text-rose-700">
              Reason: {statusReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 lg:p-4">
        {!closedState ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Service Timeline</p>
            <div className="rounded-xl border border-slate-100 bg-[#F6FBFF] px-2 py-3 shadow-sm lg:px-4 lg:py-3.5">
              
              {/* Desktop Horizontal Timeline */}
              <div className="relative mx-auto hidden max-w-5xl gap-4 md:grid md:grid-cols-6 md:gap-0">
                <div className="absolute left-[8.333%] right-[8.333%] top-3.5 h-0.5 -translate-y-1/2 bg-blue-100">
                  <div className="h-0.5 bg-[#67B529] transition-all duration-300" style={{ width: progressWidth }} />
                </div>
                {trackingSteps.map((step, index) => {
                  const isDone = index <= currentStep
                  const isCurrent = index === currentStep
                  const stepTime = getStepTime(booking, step, index, currentStep)

                  return (
                    <div className="relative z-10 flex gap-2.5 md:grid md:min-w-0 md:justify-items-center md:px-1.5 md:text-center" key={step.label}>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-neutral-50 text-xs font-semibold shadow-sm ${
                          isCurrent ? 'border-amber-400 bg-amber-500 text-white' : isDone ? 'border-[#67B529] bg-[#67B529] text-white' : 'border-blue-200 bg-white text-blue-700'
                        }`}
                      >
                        <span className="scale-75"><Icon name={step.icon} /></span>
                      </span>
                      <div className="min-w-0">
                        <p className={`mt-1 text-xs leading-tight ${isCurrent ? 'font-bold text-amber-700' : isDone ? 'font-bold text-[#67B529]' : 'font-semibold text-blue-700'}`}>
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-blue-700/80">{stepTime || (isCurrent ? 'In Progress' : 'Upcoming')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mobile Snake Timeline */}
              <div className="relative mx-auto mt-2 block max-w-sm px-2 md:hidden">
                {/* Background Track */}
                <div className="absolute left-[16.66%] right-[16.66%] top-4 h-[2px] bg-blue-100" />
                <div className="absolute left-[83.33%] top-4 h-[74px] w-[37px] rounded-r-full border-[2px] border-l-0 border-blue-100" />
                <div className="absolute left-[16.66%] right-[16.66%] top-[88px] h-[2px] bg-blue-100" />

                {/* Progress Track */}
                <div
                  className="absolute left-[16.66%] top-4 h-[2px] bg-[#67B529] transition-all duration-500"
                  style={{ width: currentStep >= 2 ? '66.66%' : currentStep === 1 ? '33.33%' : '0%' }}
                />
                {currentStep >= 2 && (
                  <div
                    className="absolute left-[83.33%] top-4 h-[74px] w-[37px] rounded-r-full border-[2px] border-l-0 border-[#67B529]"
                  />
                )}
                {currentStep >= 3 && (
                  <div
                    className="absolute right-[16.66%] top-[88px] h-[2px] bg-[#67B529] transition-all duration-500"
                    style={{ width: currentStep >= 5 ? '66.66%' : currentStep === 4 ? '33.33%' : '0%' }}
                  />
                )}

                {/* Nodes */}
                <div className="relative z-10 grid grid-cols-3 gap-y-10 pb-10">
                  {[0, 1, 2, 5, 4, 3].map((stepIndex) => {
                    const step = trackingSteps[stepIndex]
                    const isDone = stepIndex <= currentStep
                    const isCurrent = stepIndex === currentStep
                    const stepTime = getStepTime(booking, step, stepIndex, currentStep)

                    return (
                      <div className="relative flex flex-col items-center" key={step.label}>
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[2px] border-white text-xs font-semibold shadow-sm ${
                            isCurrent ? 'bg-amber-500 text-white shadow-amber-200' : isDone ? 'bg-[#67B529] text-white' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          <span className="scale-75"><Icon name={step.icon} /></span>
                        </span>
                        <div className="absolute top-8 w-24 text-center mt-2 pointer-events-none">
                          <p className={`text-[11px] leading-tight ${isCurrent ? 'font-black text-amber-600' : isDone ? 'font-bold text-[#67B529]' : 'font-semibold text-slate-400'}`}>
                            {step.label}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold text-slate-400">{stepTime || (isCurrent ? 'In Progress' : '')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <InfoTile helper="Share after professional reaches." icon="shield" label="Service OTP" tone="emerald" value={serviceOtp} />
          <InfoTile helper="Assigned person for this booking." icon="user" label="Professional" value={closedState ? 'Not assigned' : booking?.professional} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Included Work & Items</p>
          <div className="flex flex-col">
            {[...bookedItems, ...extraItems].map((item, index) => (
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0" key={`${item.name}-${index}`}>
                <div className="flex gap-3 items-center min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                     {item.image ? <img alt={item.name} src={item.image} className="w-full h-full object-cover" /> : (
                       <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                     )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-[#003F86] block leading-snug truncate">{item.name}</span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5 block">Rs. {formatAmount(item.price)} × {item.quantity}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#003F86] whitespace-nowrap pl-2">Rs. {formatAmount(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {hasPendingExtras ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">Extra items need your approval</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
                  Your professional added spare parts / extra work. Review and approve to add them to this booking.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                +Rs. {formatAmount(pendingExtraTotal)}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {pendingExtraItems.map((item, index) => (
                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-3" key={`${item.name}-${index}`}>
                  <div>
                    <p className="text-sm font-bold text-[#003F86]">{item.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">Rs. {formatAmount(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="text-sm font-black text-amber-700">Rs. {formatAmount(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                className="flex-1 rounded-lg bg-[#67B529] px-4 py-3 text-sm font-black text-white hover:bg-[#569822] disabled:opacity-60"
                disabled={isExtraConsentLoading}
                onClick={handleApproveExtras}
                type="button"
              >
                {isExtraConsentLoading ? 'Processing...' : 'Approve Extra Items'}
              </button>
              <button
                className="flex-1 rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                disabled={isExtraConsentLoading}
                onClick={handleRejectExtras}
                type="button"
              >
                Reject
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-amber-800">
              If approved, updated total will be Rs. {formatAmount(projectedTotal)}.
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Summary</p>
          <div className="grid gap-2 text-sm font-medium text-slate-600 bg-slate-50/70 rounded-lg px-4 py-3.5 border border-slate-100">
            <div className="flex justify-between items-center">
              <span>Item Total</span>
              <span className="text-slate-800 font-semibold">Rs. {formatAmount(subtotal)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between items-center">
                <span>Service Fee</span>
                <span className="text-slate-800 font-semibold">Rs. {formatAmount(serviceFee)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center text-[#67B529]">
                <span>Discount</span>
                <span className="font-semibold">- Rs. {formatAmount(discount)}</span>
              </div>
            )}
            {existingTax > 0 && (
              <div className="flex justify-between items-center">
                <span>Taxes & Fees</span>
                <span className="text-slate-800 font-semibold">Rs. {formatAmount(existingTax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 text-sm font-bold text-[#003F86]">
              <span>Net Payable</span>
              <span>Rs. {formatAmount(total)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Payment Status</span>
              {booking?.payment?.toLowerCase().includes('paid') || booking?.payment?.toLowerCase().includes('online') ? (
                <span className="uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md tracking-wider text-[11px]">PAID</span>
              ) : (
                <span className="uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md tracking-wider text-[11px]">{booking?.payment || 'PENDING'}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Service Address</p>
          <p className="text-sm font-medium leading-relaxed text-slate-700">{booking?.address}</p>
        </div>

        {canCancel ? (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-500">Need to cancel this booking? You can cancel with a reason.</p>
            <button
              className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0"
              disabled={isCancelling}
              onClick={handleCancelBooking}
              type="button"
            >
              {isCancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        ) : null}

        {canReview ? (
          <div className="rounded-xl border border-[#67B529]/20 bg-[#EEF9E8]/60 p-5 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="text-base font-black text-[#003F86]">Rate this service</p>
              <div className="ml-auto flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    aria-label={`${rating} star rating`}
                    className={`transition hover:scale-110 ${
                      rating <= Number(reviewForm.rating) ? 'text-amber-500' : 'text-blue-200'
                    }`}
                    key={rating}
                    onClick={() => setReviewForm((current) => ({ ...current, rating }))}
                    type="button"
                  >
                      <span className="text-2xl">★</span>
                  </button>
                ))}
                <span className="text-lg font-black text-[#67B529]">{reviewForm.rating} star</span>
              </div>
            </div>
            <textarea
              className="mt-4 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#67B529]"
              onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
              placeholder="Write your feedback..."
              value={reviewForm.text}
            />
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-lg bg-[#003F86] px-5 py-3 text-[14px] font-bold text-white hover:bg-[#0054A6] disabled:bg-blue-100 transition-colors"
                disabled={!canSubmitReview}
                onClick={submitReview}
                type="button"
              >
                {isSubmittingReview ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default CurrentBookingCard
