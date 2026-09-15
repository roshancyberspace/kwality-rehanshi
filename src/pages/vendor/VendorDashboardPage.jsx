import { useEffect, useMemo, useRef, useState } from 'react'
import { useBodyScrollLock } from '../../utils/modalScrollLock'
import { buildVendorPublicPath, defaultMembership, IdentityCard, MembershipCertificate } from '../../components/vendor/MembershipAssets'
import { buildBackendUrl, buildDocumentUrl, buildFrontendUrl } from '../../config/urls'
import { vendorApi } from '../../services/vendorApi'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import { getBrandingDisplay, logoFallbackClass, logoImageClass } from '../../utils/branding'
import { askAppConfirmation, notify } from '../../utils/feedback'
import { resolvePartnerProfilePicturePath } from '../../utils/partnerProfile'
import { broadcastRealtimeRefresh } from '../../utils/realtime'
import { downloadInvoiceFile } from '../../components/profile/OrderHistorySection'



const statusStyles = {
  Accepted: 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/20',
  'New request': 'bg-amber-50 text-amber-700 ring-amber-100',
  'In progress': 'bg-blue-50 text-blue-700 ring-blue-100',
  Started: 'bg-blue-50 text-blue-700 ring-blue-100',
  'OTP verified': 'bg-blue-50 text-blue-700 ring-blue-100',
  Completed: 'bg-blue-50 text-blue-900 ring-neutral-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const vendorTopNavItems = [
  { icon: 'dashboard', key: 'dashboard', label: 'Dashboard' },
  { icon: 'shield', key: 'kyc', label: 'KYC' },
]

const vendorNavGroups = [
  {
    icon: 'requests',
    id: 'requests',
    label: 'Requests',
    items: [
      { key: 'requests-active', label: 'Active' },
      { key: 'requests-completed', label: 'Completed' },
    ],
  },
  {
    icon: 'payments',
    id: 'payments',
    label: 'Payments',
    items: [
      { key: 'wallet', label: 'Wallet' },
      { key: 'transactions', label: 'Transaction history' },
    ],
  },
  {
    icon: 'account',
    id: 'account',
    label: 'Account',
    items: [
      { key: 'profile', label: 'Profile update' },
      { key: 'bank-details', label: 'Bank details' },
      { key: 'customize', label: 'Customize' },
      { key: 'id-card', label: 'ID card' },
    ],
  },
]

const vendorFlatNavItems = [
  ...vendorTopNavItems,
  ...vendorNavGroups.flatMap((group) => group.items),
]

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
const formatPercent = (value) => `${Math.round(Number(value || 0))}%`

const getJobId = (job) => job.job_no || job.id
const getCustomerName = (job) => job.customer_name || job.customer
const getServiceName = (job) => job.service_name || job.service
const isCodPaymentJob = (job) => {
  const paymentText = String(job?.metadata?.payment || '').toLowerCase()
  return paymentText.includes('cash') || paymentText.includes('cod')
}
const isCodMarkedPaid = (job, markedPaidByJob = {}) => {
  const jobId = getJobId(job)
  return Boolean(markedPaidByJob[jobId] || job?.metadata?.payment_confirmation?.cod_marked_paid)
}
const isPaidJob = (job) => {
  const paymentText = String(job?.metadata?.payment || job?.metadata?.payment_status || job?.payment_status || '').toLowerCase()
  return ['paid', 'success', 'successful', 'completed'].some((item) => paymentText.includes(item))
    || Boolean(job?.metadata?.payment_confirmation?.cod_marked_paid)
    || (isCodPaymentJob(job) && job.status === 'Completed')
}
const jobToInvoiceOrder = (job) => ({
  ...job,
  amount: job.amount || 0,
  bookingNo: job.metadata?.booking_no || job.job_no || job.id,
  id: job.metadata?.booking_no || job.job_no || job.id,
  items: (job.metadata?.items || []).map((item) => item.name || item.service_name || item),
  metadata: job.metadata || {},
  payment: job.metadata?.payment || job.metadata?.payment_status || 'Paid',
  service: getServiceName(job),
})
const splitList = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

const readBrowserLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Location permission is not available in this browser.'))
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      accuracy: position.coords.accuracy,
      capturedAt: new Date().toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      source: 'vendor_browser',
    }),
    () => reject(new Error('Please allow location access so admin can see your exact job location.')),
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
  )
})

const getCustomerLocation = (job) => job?.metadata?.customer_location || job?.metadata?.service_address?.location || null
const getVendorLocation = (job) => job?.metadata?.vendor_location || null
const locationQuery = (location) => location?.latitude && location?.longitude ? `${location.latitude},${location.longitude}` : ''
const mapUrl = (location) => locationQuery(location) ? `https://www.google.com/maps?q=${locationQuery(location)}` : ''
const directionsUrl = (location) => locationQuery(location) ? `https://www.google.com/maps/dir/?api=1&destination=${locationQuery(location)}` : ''
const addressMapUrl = (job) => {
  const location = getCustomerLocation(job)
  const query = locationQuery(location) || job?.address
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}` : ''
}
const formatLocation = (location) => {
  if (!location?.latitude || !location?.longitude) return 'GPS pending'
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
}

const formatDateTime = (value) => {
  if (!value) return 'Not updated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const getWorkStartedAt = (job) => job?.metadata?.work?.started_at || job?.metadata?.status_times?.started || ''
const getWorkElapsedSeconds = (job, now = Date.now()) => {
  const startedAt = getWorkStartedAt(job)
  if (!startedAt) return 0
  const startedTime = new Date(startedAt).getTime()
  if (Number.isNaN(startedTime)) return 0
  const completedAt = job?.metadata?.work?.completed_at || job?.metadata?.status_times?.completed || ''
  const endTime = completedAt ? new Date(completedAt).getTime() : now
  return Number.isNaN(endTime) ? 0 : (endTime - startedTime) / 1000
}

const countPhaseMedia = (job, phase) => {
  const work = job?.metadata?.work || {}
  return (work[`${phase}_photos`] || []).length + (work[`${phase}_videos`] || []).length
}

const jobFlowSteps = [
  { key: 'New request', label: 'Assigned', timeKey: 'assigned' },
  { key: 'Accepted', label: 'Accepted', timeKey: 'accepted' },
  { key: 'Started', label: 'Work started', timeKey: 'started' },
  { key: 'OTP verified', label: 'OTP verified', timeKey: 'otp_verified' },
  { key: 'Completed', label: 'Completed', timeKey: 'completed' },
]

const statusStepIndex = (status) => {
  if (status === 'On the way') return 1
  if (status === 'In progress') return 2
  const index = jobFlowSteps.findIndex((step) => step.key === status)
  return index >= 0 ? index : 0
}

const nextStepLabel = (job) => {
  if (job.status === 'New request') return 'Accept or reject'
  if (job.status === 'Accepted') return 'Upload start proof'
  if (['Started', 'In progress'].includes(job.status)) return 'Verify completion OTP'
  if (job.status === 'OTP verified') return 'Upload final proof'
  if (job.status === 'Completed') return 'Booking completed'
  if (job.status === 'Rejected') return 'Rejected'
  return job.next_action || job.nextAction || 'Manage request'
}

function JobProgressTimeline({ job, compact = false }) {
  const currentIndex = statusStepIndex(job.status)
  const getStepTime = (step, index) => {
    if (index > currentIndex) return ''
    const work = job.metadata?.work || {}
    const statusTimes = job.metadata?.status_times || {}
    const fallbackTimes = {
      assigned: job.created_at,
      accepted: job.metadata?.accepted_at,
      otp_verified: work.otp_verified_at,
      started: work.started_at,
      completed: work.completed_at,
    }
    return formatDateTime(statusTimes[step.timeKey] || fallbackTimes[step.timeKey] || (index === currentIndex ? job.updated_at : ''))
  }

  return (
    <div className={compact ? 'mt-4' : ''}>
      <div className="flex items-center justify-between gap-2">
        {jobFlowSteps.map((step, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isActive = isDone || isCurrent

          return (
            <div className="flex min-w-0 flex-1 items-center" key={step.key}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ring-1 ${isActive ? 'bg-[#67B529] text-white ring-[#67B529]' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>
                {isDone ? '✓' : index + 1}
              </span>
              {index < jobFlowSteps.length - 1 && (
                <span className={`mx-1 h-1 min-w-0 flex-1 rounded-full ${index < currentIndex ? 'bg-[#67B529]' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] font-black uppercase text-slate-400">
          {jobFlowSteps.map((step, index) => {
            const stepTime = getStepTime(step, index)
            return (
              <span className={index === currentIndex ? 'text-[#67B529]' : ''} key={step.key}>
                {step.label}
                {stepTime ? <span className="mt-1 block text-[10px] normal-case text-slate-500">{stepTime}</span> : null}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function JobDetailsModal({ job, onClose }) {
  useBodyScrollLock(Boolean(job))
  if (!job) return null

  const customerLocation = getCustomerLocation(job)
  const vendorLocation = getVendorLocation(job)
  const customerMapUrl = mapUrl(customerLocation)
  const customerDirectionsUrl = directionsUrl(customerLocation)
  const vendorMapUrl = mapUrl(vendorLocation)
  const photos = [
    ['Before photos', job.metadata?.work?.before_photos || []],
    ['After photos', job.metadata?.work?.after_photos || []],
    ['Before videos', job.metadata?.work?.before_videos || []],
    ['After videos', job.metadata?.work?.after_videos || []],
  ]
  const detailRows = [
    ['Customer', getCustomerName(job) || 'Not added', 'M12 12a4 4 0 1 0-8 0 8 8 0 0 0-4 7m16-7a4 4 0 1 1-8 0 8 8 0 0 1 4 7'],
    ['Phone', job.metadata?.customer_phone || job.metadata?.phone || 'Visible after acceptance', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.91.32 1.8.59 2.65a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6.27 6.27l1.25-1.25a2 2 0 0 1 2.11-.45c.85.27 1.74.47 2.65.59A2 2 0 0 1 22 16.92Z'],
    ['Payment', job.metadata?.payment || 'Payment details pending', 'M3 6h18v12H3z M3 10h18'],
    ['Slot', job.slot || 'Slot pending', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2'],
    ['Amount', formatMoney(job.amount), 'M6 3h12 M6 8h12 M6 13l8 8 M6 13h3a5 5 0 0 0 0-10'],
    ['Job ID', getJobId(job), 'M4 7V5a2 2 0 0 1 2-2h2 M16 3h2a2 2 0 0 1 2 2v2 M20 17v2a2 2 0 0 1-2 2h-2 M8 21H6a2 2 0 0 1-2-2v-2 M8 12h8'],
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-slate-400">{getJobId(job)}</p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-slate-950">{getServiceName(job)}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Current status: <span className="text-[#67B529]">{job.status}</span></p>
          </div>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-5">
          <JobProgressTimeline job={job} />
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-400">Service address</p>
              <p className="mt-2 break-words text-lg font-semibold leading-7 text-slate-950">{job.address || 'Address not added'}</p>
              <div className="mt-4 grid gap-2 rounded-md bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs font-black text-[#67B529]">Customer GPS: {formatLocation(customerLocation)}</p>
                <p className="text-xs font-black text-sky-700">Vendor GPS: {formatLocation(vendorLocation)}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {customerMapUrl && <a className="rounded-md bg-[#67B529] px-3 py-2.5 text-center text-xs font-black text-white hover:bg-[#67B529]" href={customerMapUrl} rel="noreferrer" target="_blank">Customer map</a>}
                {customerDirectionsUrl && <a className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-black text-slate-700 hover:bg-slate-50" href={customerDirectionsUrl} rel="noreferrer" target="_blank">Directions</a>}
                {vendorMapUrl && <a className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-black text-slate-700 hover:bg-slate-50" href={vendorMapUrl} rel="noreferrer" target="_blank">Vendor map</a>}
              </div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Request details</p>
                  <p className="mt-1 text-base font-black text-slate-900">{nextStepLabel(job)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[job.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{job.status}</span>
              </div>
              <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {detailRows.map(([label, value, iconPath]) => (
                  <div className="flex min-w-0 gap-3" key={label}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600" aria-hidden="true">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                        {iconPath.split(' M').map((path, index) => (
                          <path d={index === 0 ? path : `M${path}`} key={path} />
                        ))}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                      <p className="mt-0.5 break-words text-sm font-semibold text-slate-950">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {photos.map(([label, items]) => (
              <div className="rounded-lg border border-slate-200 p-4" key={label}>
                <p className="text-sm font-black text-slate-500">{label}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {items.map((photo, index) => (
                    photo.kind === 'video' || String(photo.type || '').startsWith('video/')
                      ? <video className="aspect-square rounded-md object-cover" controls key={`${photo.preview || photo.url || photo.path || photo.name}-${index}`} src={photo.preview || publicAssetUrl(photo.url || photo.path)} />
                      : <img alt={photo.name || `${label} ${index + 1}`} className="aspect-square rounded-md object-cover" key={`${photo.preview || photo.url || photo.path || photo.name}-${index}`} src={photo.preview || publicAssetUrl(photo.url || photo.path)} />
                  ))}
                  {!items.length && <p className="col-span-3 text-xs font-semibold text-slate-400">No photos uploaded.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function AddExtraItemsModal({ job, onClose, onConfirm }) {
  useBodyScrollLock(Boolean(job))
  const [rateItems, setRateItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const serviceId = Number(job.service_id || job.metadata?.service_id) || undefined
    vendorApi.rateItems({
      ...(serviceId ? { service_id: serviceId } : {}),
      status: 'Active',
    })
      .then((res) => {
        const items = res.data || []
        const serviceName = getServiceName(job)
        const relevantItems = serviceId
          ? items
          : items.filter((item) => item.service?.name === serviceName && item.status === 'Active')
        setRateItems(relevantItems.filter((item) => item.status === 'Active' || !item.status))
      })
      .catch((err) => setError('Failed to load rate items: ' + err.message))
      .finally(() => setIsLoading(false))
  }, [job])

  const addItem = (item) => {
    setSelectedItems((current) => {
      const existing = current.find((i) => i.id === item.id)
      if (existing) {
        return current.map((i) => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i)
      }
      return [...current, { ...item, quantity: 1, added_at: new Date().toISOString(), cart_id: Math.random().toString(36).slice(2) }]
    })
  }

  const decreaseQuantity = (cartId) => {
    setSelectedItems((current) => {
      const item = current.find((i) => i.cart_id === cartId)
      if (item && (item.quantity || 1) > 1) {
        return current.map((i) => i.cart_id === cartId ? { ...i, quantity: (item.quantity || 1) - 1 } : i)
      }
      return current.filter((i) => i.cart_id !== cartId)
    })
  }

  const increaseQuantity = (cartId) => {
    setSelectedItems((current) => current.map((item) => item.cart_id === cartId ? { ...item, quantity: (item.quantity || 1) + 1 } : item))
  }

  const currentAmount = Number(job.amount || 0)
  const extraAmount = selectedItems.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0)

  const handleConfirm = async () => {
    if (!selectedItems.length) return onClose()
    setIsSaving(true)
    setError('')
    try {
      const existingPending = Array.isArray(job.metadata?.pending_vendor_extra_items) ? job.metadata.pending_vendor_extra_items : []
      const newItems = selectedItems.map((item) => ({
        id: `extra-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: item.name,
        price: Number(item.price || 0),
        quantity: item.quantity || 1,
        rate_item_id: item.id,
        image: item.image || null,
        added_at: new Date().toISOString(),
        source: 'rate_list',
        status: 'pending',
      }))
      
      const payload = {
        metadata: {
          ...job.metadata,
          pending_vendor_extra_items: [...existingPending, ...newItems],
        },
      }
      
      await onConfirm(payload)
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Add Extra Items</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{job.metadata?.booking_no || getJobId(job)}</span>
              <span className="rounded-full bg-[#EEF9E8] px-2 py-0.5 text-xs font-bold text-[#67B529]">{job.status}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">Service: {getServiceName(job)}</p>
          </div>
          <button className="rounded-md bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
          <div className="flex-1 overflow-y-auto border-r border-slate-200 p-5">
            <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">Available Spares & Items</h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#67B529]"></span>
              </div>
            ) : error ? (
              <p className="text-sm font-semibold text-rose-500">{error}</p>
            ) : rateItems.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">No extra items available for this service.</p>
            ) : (
              <div className="grid gap-3">
                {rateItems.map((item) => {
                  const selected = selectedItems.find((i) => i.id === item.id)
                  return (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 shadow-sm hover:border-[#67B529]/50" key={item.id}>
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={publicAssetUrl(item.image)} alt={item.name} className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-50 ring-1 ring-slate-200">
                            <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16v14H4z M7 16l4-4 3 3 2-2 3 3" /></svg>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs font-black text-[#67B529]">{formatMoney(item.price)}</p>
                        </div>
                      </div>
                      {selected ? (
                        <div className="flex items-center gap-2 rounded bg-[#EEF9E8] px-2 py-1 text-[#67B529]">
                          <button className="grid h-6 w-6 place-items-center rounded bg-white font-black shadow-sm hover:bg-[#67B529] hover:text-white" onClick={() => decreaseQuantity(selected.cart_id)} type="button">-</button>
                          <span className="w-4 text-center text-xs font-black">{selected.quantity || 1}</span>
                          <button className="grid h-6 w-6 place-items-center rounded bg-white font-black shadow-sm hover:bg-[#67B529] hover:text-white" onClick={() => increaseQuantity(selected.cart_id)} type="button">+</button>
                        </div>
                      ) : (
                        <button className="rounded bg-[#EEF9E8] px-3 py-1.5 text-xs font-black text-[#67B529] hover:bg-[#67B529] hover:text-white" onClick={() => addItem(item)} type="button">
                          Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="flex w-full flex-col bg-slate-50 sm:w-64">
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">Selected Items</h3>
              {selectedItems.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">Cart is empty</p>
              ) : (
                <div className="grid gap-2">
                  {selectedItems.map((item) => (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm" key={item.cart_id}>
                      {item.image ? (
                        <img src={publicAssetUrl(item.image)} alt={item.name} className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-50 ring-1 ring-slate-200">
                          <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16v14H4z M7 16l4-4 3 3 2-2 3 3" /></svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800">{item.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          <span className="font-semibold text-slate-500">{formatMoney(item.price)}</span>
                          <span className="font-bold text-slate-400">×</span>
                          <span className="font-bold text-slate-700">{item.quantity || 1}</span>
                          <span className="font-bold text-slate-400">=</span>
                          <span className="font-black text-[#67B529]">{formatMoney(Number(item.price || 0) * (item.quantity || 1))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Current Booking</span>
                <span>{formatMoney(currentAmount)}</span>
              </div>
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Pending approval</span>
                <span className="text-amber-600">+{formatMoney(extraAmount)}</span>
              </div>
              <p className="mb-4 text-[11px] font-semibold leading-5 text-slate-500">
                Customer will review these items on their booking page. Amount updates only after approval.
              </p>
              <button 
                className="w-full rounded-md bg-[#67B529] py-2.5 text-sm font-black text-white hover:bg-[#569822] disabled:opacity-50" 
                disabled={isSaving || selectedItems.length === 0} 
                onClick={handleConfirm}
                type="button"
              >
                {isSaving ? 'Sending...' : 'Send for Customer Approval'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function BrandMark({ appSettings = {}, size = 'md', tone = 'dark' }) {
  const { logoUrl } = getBrandingDisplay(appSettings)
  return <img className="h-9 sm:h-10 w-auto max-w-[160px] object-contain" src={logoUrl || '/logo2.png'} alt="logo" />
}

function VendorAvatar({ name, src }) {
  if (src) {
    return <img alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200" src={src} />
  }

  return <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EEF9E8] text-sm font-black text-[#67B529] ring-1 ring-[#67B529]/20">{name?.slice(0, 2)?.toUpperCase() || 'VD'}</span>
}

function HeaderIcon({ children }) {
  return (
    <span className="grid h-5 w-5 place-items-center" aria-hidden="true">
      {children}
    </span>
  )
}

function VendorNavIcon({ name }) {
  const paths = {
    account: ['M20 21a8 8 0 0 0-16 0', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
    dashboard: ['M3 13h8V3H3v10Z', 'M13 21h8V11h-8v10Z', 'M13 3v6h8V3h-8Z', 'M3 21h8v-6H3v6Z'],
    payments: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h3'],
    requests: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'm9 12 2 2 4-5'],
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      {(paths[name] || paths.dashboard).map((path) => <path d={path} key={path} />)}
    </svg>
  )
}

function WorkUploadIndicator({ text }) {
  if (!text) return null

  return (
    <div className="flex items-center gap-3 rounded-md border border-[#67B529]/35 bg-[#EEF9E8] px-3 py-2 text-sm font-semibold text-[#2F6412]">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#67B529]/35 border-t-[#67B529]" />
      <span>{text}</span>
    </div>
  )
}

const publicAssetUrl = (path) => {
  return buildDocumentUrl(path)
}

const WORK_VIDEO_CHUNK_SIZE = 8 * 1024 * 1024
const MAX_WORK_VIDEO_SIZE = 2 * 1024 * 1024 * 1024
const knownIndianBanks = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'IDFC FIRST Bank',
  'Federal Bank',
  'Yes Bank',
  'Indian Bank',
  'Central Bank of India',
  'Bank of India',
]

const emptyBankForm = {
  account_holder: '',
  account_number: '',
  account_type: 'Savings',
  bank_name: '',
  branch_name: '',
  ifsc: '',
  make_active: true,
}

const playVendorAlert = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.14)
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.34)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.36)
  } catch {
    // Sound is best-effort because browsers may block autoplay.
  }
}

function VendorDashboardPage({ appSettings = {}, authenticatedVendor, embedded = false, onBackHome, onLogout, onOpenBecomeProvider }) {
  const [credentials, setCredentials] = useState({ login: '', password: '' })
  const [partner, setPartner] = useState(authenticatedVendor || null)
  const [wallet, setWallet] = useState(null)
  const [walletTransactions, setWalletTransactions] = useState([])
  const [jobs, setJobs] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState(() => !['Unavailable', 'Busy'].includes(authenticatedVendor?.availability || 'Available'))
  const [activeVendorPage, setActiveVendorPage] = useState('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [openJobMenuId, setOpenJobMenuId] = useState('')
  const [detailsJob, setDetailsJob] = useState(null)
  const [addExtraItemsJob, setAddExtraItemsJob] = useState(null)
  const [pendingJobAction, setPendingJobAction] = useState('')
  const [workUploadState, setWorkUploadState] = useState({ jobId: '', phase: '', text: '' })
  const [transactionVisibleCount, setTransactionVisibleCount] = useState(20)
  const [completionOtpInput, setCompletionOtpInput] = useState('')
  const [completionOtpJobId, setCompletionOtpJobId] = useState('')
  const [timerNow, setTimerNow] = useState(Date.now())
  const [vendorReview, setVendorReview] = useState({ rating: '5', text: '' })
  const [codPaidByJob, setCodPaidByJob] = useState({})
  const [bankForm, setBankForm] = useState(emptyBankForm)
  const [bankSearch, setBankSearch] = useState('')
  const [bankFormOpen, setBankFormOpen] = useState(false)
  const [editingBankId, setEditingBankId] = useState('')
  const [profileForm, setProfileForm] = useState({
    alternate_phone: '',
    area: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_account_type: '',
    bank_branch_name: '',
    bank_ifsc: '',
    bank_name: '',
    business_name: '',
    city: '',
    email: '',
    name: '',
    phone: '',
    pincode: '',
    service_experience_years: '',
  })
  const [documentUpload, setDocumentUpload] = useState({ file: null, index: '', label: '' })
  const seenNewRequestIdsRef = useRef(new Set())
  const profilePictureInputRef = useRef(null)

  const assignedJobs = jobs
  const selectedJob = assignedJobs.find((job) => String(getJobId(job)) === String(selectedJobId)) || assignedJobs[0] || { metadata: {}, status: 'No request' }

  const loadPartnerWorkspace = async (activePartner, options = {}) => {
    const poll = options.poll === true
    const jobsOnly = options.jobsOnly === true || poll

    if (jobsOnly) {
      const jobsResponse = await vendorApi.jobs({
        partner_id: activePartner.id,
        skip_sync: poll,
      })
      const liveJobs = jobsResponse.data || []
      const partnerJobs = liveJobs.filter((job) => {
        const samePartnerId = job.partner_id && activePartner.id && Number(job.partner_id) === Number(activePartner.id)
        const text = [job.partner_name, job.metadata?.partner_name, job.metadata?.vendor_name].filter(Boolean).join(' ').toLowerCase()
        return samePartnerId || text.includes(String(activePartner.name || '').toLowerCase())
      })

      const newRequestIds = partnerJobs.filter((job) => job.status === 'New request').map((job) => String(getJobId(job)))
      const unseenRequestIds = newRequestIds.filter((jobId) => !seenNewRequestIdsRef.current.has(jobId))

      setJobs(partnerJobs)
      setSelectedJobId((currentSelectedJobId) => {
        const selectedJobStillExists = partnerJobs.some((job) => String(getJobId(job)) === String(currentSelectedJobId))
        if (selectedJobStillExists) return currentSelectedJobId
        return partnerJobs[0]?.job_no || partnerJobs[0]?.id || ''
      })
      if (unseenRequestIds.length) {
        playVendorAlert()
        setMessage('New booking assigned. Please accept or reject it.')
      }
      seenNewRequestIdsRef.current = new Set(newRequestIds)
      return
    }

    const [walletResponse, jobsResponse, transactionsResponse, partnerResponse] = await Promise.all([
      vendorApi.wallet(activePartner.name, activePartner.id),
      vendorApi.jobs({ partner_id: activePartner.id }),
      activePartner.id ? vendorApi.walletTransactions(activePartner.id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      activePartner.id ? vendorApi.partner(activePartner.id).catch(() => null) : Promise.resolve(null),
    ])

    const latestPartner = partnerResponse?.data || partnerResponse || activePartner
    setPartner(latestPartner)
    setIsAvailable(!['Unavailable', 'Busy'].includes(latestPartner.availability || 'Available'))
    const partnerWallet = walletResponse.data?.[0] || null
    const liveJobs = jobsResponse.data || []
    const partnerJobs = liveJobs.filter((job) => {
      const samePartnerId = job.partner_id && latestPartner.id && Number(job.partner_id) === Number(latestPartner.id)
      const text = [job.partner_name, job.metadata?.partner_name, job.metadata?.vendor_name].filter(Boolean).join(' ').toLowerCase()
      return samePartnerId || text.includes(String(latestPartner.name || '').toLowerCase())
    })

    const newRequestIds = partnerJobs.filter((job) => job.status === 'New request').map((job) => String(getJobId(job)))
    const unseenRequestIds = newRequestIds.filter((jobId) => !seenNewRequestIdsRef.current.has(jobId))

    setWallet(partnerWallet)
    setWalletTransactions(transactionsResponse.data || [])
    setJobs(partnerJobs)
    setSelectedJobId((currentSelectedJobId) => {
      const selectedJobStillExists = partnerJobs.some((job) => String(getJobId(job)) === String(currentSelectedJobId))
      if (selectedJobStillExists) return currentSelectedJobId

      return partnerJobs[0]?.job_no || partnerJobs[0]?.id || ''
    })
    if (unseenRequestIds.length) {
      playVendorAlert()
      setMessage('New booking assigned. Please accept or reject it.')
    }
    seenNewRequestIdsRef.current = new Set(newRequestIds)
  }

  useEffect(() => {
    if (!authenticatedVendor) return

    setPartner(authenticatedVendor)
    loadPartnerWorkspace(authenticatedVendor).catch((error) => setMessage(error.message))
  }, [authenticatedVendor])

  useRealtimeRefresh({
    enabled: Boolean(partner?.id),
    intervalMs: 15000,
    onRefresh: ({ source } = {}) => {
      if (!partner) return Promise.resolve()
      if (source === 'poll') {
        return loadPartnerWorkspace(partner, { poll: true })
      }
      return loadPartnerWorkspace(partner)
    },
    target: 'vendor',
  })

  useEffect(() => {
    if (!message) return

    notify(message, {
      tone: /failed|invalid|error|upload|write/i.test(message) ? 'error' : 'info',
    })
  }, [message])

  useEffect(() => {
    if (!partner) return

    setProfileForm({
      alternate_phone: partner.alternate_phone || '',
      area: partner.area || '',
      bank_account_holder: partner.bank_account_holder || '',
      bank_account_number: partner.bank_account_number || '',
      bank_account_type: partner.bank_account_type || '',
      bank_branch_name: partner.bank_branch_name || '',
      bank_ifsc: partner.bank_ifsc || '',
      bank_name: partner.bank_name || '',
      business_name: partner.business_name || '',
      city: partner.city || '',
      email: partner.email || '',
      name: partner.name || '',
      phone: partner.phone || '',
      pincode: partner.pincode || '',
      service_experience_years: partner.service_experience_years ?? '',
    })
  }, [partner])

  const toggleAvailability = async () => {
    if (!partner?.id) {
      setIsAvailable((current) => !current)
      return
    }

    const nextAvailability = isAvailable ? 'Unavailable' : 'Available'
    setIsLoading(true)
    setMessage('')
    try {
      const response = await vendorApi.updateAvailability(partner.id, nextAvailability)
      setPartner(response.partner || { ...partner, availability: nextAvailability })
      setMessage(`Availability updated to ${nextAvailability}.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const stats = useMemo(() => {
    const completedJobs = assignedJobs.filter((job) => job.status === 'Completed').length
    const activeJobs = assignedJobs.filter((job) => !['Completed', 'Cancelled'].includes(job.status)).length
    const newRequests = assignedJobs.filter((job) => job.status === 'New request').length
    const todayEarnings = assignedJobs.reduce((sum, job) => sum + Number(job.amount || 0), 0)

    return { activeJobs, completedJobs, newRequests, todayEarnings }
  }, [assignedJobs])
  const services = splitList(partner?.services).length ? splitList(partner?.services) : splitList(partner?.skill)
  const documents = Array.isArray(partner?.documents) ? partner.documents : []
  const submittedDocuments = documents.filter((document) => document.path || ['Submitted', 'Verified'].includes(document.status)).length
  const membership = defaultMembership(partner)
  const publicPath = buildVendorPublicPath(partner?.id)
  const publicUrl = partner?.id ? buildFrontendUrl(publicPath) : ''
  const profilePicturePath = resolvePartnerProfilePicturePath(partner)
  const profilePicture = publicAssetUrl(profilePicturePath)
  const vendorMessages = Array.isArray(partner?.metadata?.vendor_messages) ? partner.metadata.vendor_messages : []
  const bankAccounts = (Array.isArray(partner?.metadata?.bank_accounts) && partner.metadata.bank_accounts.length)
    ? partner.metadata.bank_accounts
    : (partner?.bank_account_number ? [{
      account_holder: partner.bank_account_holder,
      account_number: partner.bank_account_number,
      account_type: partner.bank_account_type || 'Savings',
      bank_name: partner.bank_name,
      branch_name: partner.bank_branch_name,
      id: `bank_legacy_${partner.id}`,
      ifsc: partner.bank_ifsc,
      is_active: true,
    }] : [])
  const activeBankAccount = bankAccounts.find((account) => account.is_active) || bankAccounts[0] || null
  const walletSummary = {
    cashCollected: Number(wallet?.cash_collected || 0),
    commission: Number(wallet?.company_commission || 0),
    companyDue: Number(wallet?.company_due || 0),
    lifetimeEarning: Number(wallet?.metadata?.lifetime_earning || 0),
    onlineEarning: wallet ? Number(wallet.online_earning || 0) : Number(stats.todayEarnings || 0),
    payable: wallet ? Number(wallet.vendor_payable || 0) : Number(stats.todayEarnings || 0),
    settlement: wallet?.settlement || 'Pending',
  }
  const getJobMoneySummary = (job) => {
    const gross = Number(job?.amount || 0)
    const commissionPercentage = Number(job?.metadata?.commission_percentage ?? partner?.commission_percentage ?? 0)
    const commission = Math.round(gross * commissionPercentage) / 100
    const tax = Number(job?.metadata?.tax_amount || job?.metadata?.tax || 0)
    return {
      commission,
      commissionPercentage,
      gross,
      tax,
      vendorAmount: Math.max(0, gross - commission - tax),
    }
  }
  const recentWalletJobs = assignedJobs.slice(0, 6).map((job) => ({
    amount: Number(job.amount || 0),
    id: getJobId(job),
    service: getServiceName(job),
    status: job.status,
  }))
  const transactionRows = useMemo(() => {
    return (partner && walletTransactions.length)
      ? walletTransactions.map((transaction) => ({
      amount: Number(transaction.amount || 0),
      date: transaction.created_at || transaction.updated_at,
      direction: transaction.direction,
      id: transaction.id || transaction.transaction_no,
      jobId: transaction.booking_no || transaction.transaction_no,
      method: transaction.wallet_type,
      service: transaction.description || transaction.type,
      status: transaction.status || 'Posted',
      type: transaction.type,
    }))
    : assignedJobs
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .flatMap((job) => {
        const amount = Number(job.amount || 0)
        const commission = Math.round((amount * Number(partner?.commission_percentage || 0)) / 100)
        const vendorCredit = Math.max(0, amount - commission)
        const isPaid = ['Completed'].includes(job.status)
        const method = String(job.metadata?.payment || '').toLowerCase().includes('cash') ? 'Cash' : 'Online'
        return [
          {
            amount: vendorCredit,
            date: job.updated_at || job.created_at,
            direction: 'Credit',
            id: `${getJobId(job)}-credit`,
            jobId: getJobId(job),
            method,
            service: getServiceName(job),
            status: isPaid ? 'Paid' : 'Unpaid',
            type: 'Vendor earning',
          },
          ...(commission ? [{
            amount: commission,
            date: job.updated_at || job.created_at,
            direction: 'Debit',
            id: `${getJobId(job)}-commission`,
            jobId: getJobId(job),
            method: 'Commission',
            service: getServiceName(job),
            status: isPaid ? 'Success' : 'Pending',
            type: 'Company commission',
          }] : []),
        ]
      })
  }, [partner, walletTransactions, assignedJobs])

  const transactionTotals = useMemo(() => {
    return transactionRows.reduce((summary, row) => ({
      credit: summary.credit + (row.direction === 'Credit' ? row.amount : 0),
      debit: summary.debit + (row.direction === 'Debit' ? row.amount : 0),
      paid: summary.paid + (row.status === 'Paid' || row.status === 'Success' ? row.amount : 0),
      unpaid: summary.unpaid + (row.status === 'Unpaid' || row.status === 'Pending' ? row.amount : 0),
    }), { credit: 0, debit: 0, paid: 0, unpaid: 0 })
  }, [transactionRows])
  const visibleTransactionRows = transactionRows.slice(0, transactionVisibleCount)
  const pageHeaderCopy = activeVendorPage === 'transactions'
    ? {
      title: 'Transaction history',
      subtitle: 'Credits, debits, paid and unpaid entries for assigned jobs.',
    }
    : {
      title: 'Vendor Dashboard',
      subtitle: 'Service updates',
    }
  const loadMoreTransactions = (event) => {
    const element = event.currentTarget
    if (element.scrollTop + element.clientHeight < element.scrollHeight - 90) return
    setTransactionVisibleCount((current) => Math.min(transactionRows.length, current + 20))
  }
  useEffect(() => {
    setTransactionVisibleCount(20)
  }, [activeVendorPage, transactionRows.length])

  useEffect(() => {
    const hasRunningJob = assignedJobs.some((job) => ['Started', 'In progress'].includes(job.status))
    if (!hasRunningJob) return undefined

    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [assignedJobs])

  const requestWithdrawal = async () => {
    if (!partner?.id || walletSummary.payable <= 0) {
      setMessage('No payable wallet balance is available for withdrawal.')
      return
    }

    setIsLoading(true)
    try {
      await vendorApi.requestPayout({
        earnings: walletSummary.payable,
        jobs: stats.completedJobs,
        metadata: {
          bank_account_id: activeBankAccount?.id,
          requested_by: 'vendor',
        },
        paid: 0,
        partner_id: partner.id,
        partner_name: partner.name,
        pending: walletSummary.payable,
        status: 'Pending',
      })
      setMessage('Withdrawal request sent to admin.')
      await loadPartnerWorkspace(partner)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }
  const verifiedDocuments = documents.filter((document) => document.status === 'Verified').length
  const rejectedDocuments = documents.filter((document) => document.status === 'Rejected').length
  const pendingDocuments = Math.max(0, documents.length - verifiedDocuments - rejectedDocuments)
  const bankReady = Boolean(partner?.bank_account_holder && partner?.bank_account_number && partner?.bank_ifsc && partner?.bank_name)
  const activeRequestJobs = assignedJobs.filter((job) => !['Completed', 'Cancelled', 'Rejected'].includes(job.status))
  const completedRequestJobs = assignedJobs.filter((job) => job.status === 'Completed')
  const profileChecks = [
    Boolean(partner?.name),
    Boolean(partner?.phone),
    Boolean(partner?.email),
    Boolean(partner?.area || partner?.city),
    Boolean(services.length),
    bankReady,
    Boolean(submittedDocuments),
  ]
  const profileCompletion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100)
  const nextJob = assignedJobs.find((job) => ['New request', 'Accepted', 'OTP verified', 'Started', 'In progress'].includes(job.status)) || assignedJobs[0] || null
  const latestLocationEvent = assignedJobs
    .flatMap((job) => (job.metadata?.location_events || []).map((event) => ({ ...event, job })))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]
  const jobStatusSummary = [
    ['New', assignedJobs.filter((job) => job.status === 'New request').length, 'Needs accept/reject'],
    ['Accepted', assignedJobs.filter((job) => job.status === 'Accepted').length, 'Upload start proof'],
    ['Started', assignedJobs.filter((job) => ['Started', 'In progress', 'OTP verified'].includes(job.status)).length, 'Timer and final proof'],
    ['Done', stats.completedJobs, 'Completed jobs'],
  ]
  const readinessItems = [
    ['ID card', membership.id_card_no ? membership.id_card_no : 'Generate after approval', membership.published ? 'Published' : 'Private view'],
    ['Profile', `${formatPercent(profileCompletion)} complete`, profileCompletion >= 85 ? 'Ready' : 'Needs update'],
    ['KYC', partner.kyc_status || 'Pending', `${verifiedDocuments} verified, ${pendingDocuments} pending`],
    ['Bank', bankReady ? 'Ready for payout' : 'Missing details', walletSummary.settlement],
    ['Availability', partner.availability || (isAvailable ? 'Available' : 'Unavailable'), isAvailable ? 'Taking jobs' : 'Paused'],
  ]
  const notificationItems = [
    ...assignedJobs
      .filter((job) => ['New request', 'Accepted', 'OTP verified', 'Started', 'In progress'].includes(job.status))
      .slice(0, 5)
      .map((job) => ({
        action: () => {
          setSelectedJobId(getJobId(job))
          setActiveVendorPage('requests-active')
        },
        helper: job.slot || job.next_action || job.nextAction || 'Open request details',
        key: `job-${getJobId(job)}`,
        tone: job.status === 'New request' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700',
        title: `${job.status}: ${getServiceName(job) || getJobId(job)}`,
      })),
    ...vendorMessages.slice(0, 3).map((vendorMessage, index) => ({
      action: () => setActiveVendorPage('dashboard'),
      helper: vendorMessage.message || vendorMessage.channel || 'Admin message',
      key: `message-${index}`,
      tone: 'bg-[#EEF9E8] text-[#67B529]',
      title: vendorMessage.title || 'Admin message',
    })),
    ...(!bankReady ? [{
      action: () => setActiveVendorPage('kyc'),
      helper: 'Add bank account, IFSC and holder details',
      key: 'bank-missing',
      tone: 'bg-rose-50 text-rose-700',
      title: 'Bank details pending',
    }] : []),
    ...(profileCompletion < 85 ? [{
      action: () => setActiveVendorPage('profile'),
      helper: `${formatPercent(profileCompletion)} complete`,
      key: 'profile-incomplete',
      tone: 'bg-slate-100 text-slate-700',
      title: 'Profile needs update',
    }] : []),
  ]
  const notificationUnreadCount = notificationItems.length
  const isRequestsPage = ['requests-active', 'requests-completed'].includes(activeVendorPage)
  const isCompletedRequestsPage = activeVendorPage === 'requests-completed'
  const requestVisibleJobs = activeVendorPage === 'requests-completed' ? completedRequestJobs : activeRequestJobs
  const requestSelectedJob = requestVisibleJobs.find((job) => String(getJobId(job)) === String(selectedJobId)) || requestVisibleJobs[0] || selectedJob

  useEffect(() => {
    if (!isRequestsPage || !requestVisibleJobs.length) return
    const selectedJobIsVisible = requestVisibleJobs.some((job) => String(getJobId(job)) === String(selectedJobId))
    if (!selectedJobIsVisible) {
      setSelectedJobId(getJobId(requestVisibleJobs[0]))
    }
  }, [isRequestsPage, requestVisibleJobs, selectedJobId])

  const submitLogin = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      const response = await vendorApi.login(credentials)
      setPartner(response.partner)
      setMessage(response.message)
      await loadPartnerWorkspace(response.partner)
    } catch (error) {
      setMessage(error.message)
      setPartner(null)
    } finally {
      setIsLoading(false)
    }
  }

  const buildJobPayload = (job, overrides = {}) => ({
    address: job.address || '',
    amount: Number(job.amount || 0),
    customer_name: getCustomerName(job),
    job_no: job.job_no || job.id,
    metadata: job.metadata || {},
    next_action: job.next_action || job.nextAction || '',
    partner_id: job.partner_id || partner?.id || null,
    service_name: getServiceName(job),
    slot: job.slot || '',
    status: job.status || 'New request',
    ...overrides,
  })

  const updateJobRecord = async (jobRecord, overrides) => {
    if (!jobRecord?.id) return
    const updated = { ...jobRecord, ...overrides }
    if (!Number.isFinite(Number(jobRecord.id))) {
      setJobs((current) => current.map((job) => (getJobId(job) === getJobId(jobRecord) ? updated : job)))
      setMessage('Demo job updated. Live assigned bookings will sync with admin automatically.')
      return updated
    }
    setJobs((current) => current.map((job) => (job.id === jobRecord.id ? updated : job)))
    setSelectedJobId(updated.job_no || updated.id)
    setIsLoading(true)
    setMessage('')
    try {
      const saved = await vendorApi.updateJob(jobRecord.id, buildJobPayload(jobRecord, overrides), partner?.id)
      setJobs((current) => current.map((job) => (job.id === saved.id ? saved : job)))
      setSelectedJobId(saved.job_no || saved.id)
      setMessage('Job updated successfully.')
      broadcastRealtimeRefresh({
        bookingId: saved.metadata?.booking_id,
        jobId: saved.id,
        source: 'vendor-job-update',
        status: saved.status,
        targets: ['admin', 'customer', 'vendor'],
      })
      return saved
    } catch (error) {
      setJobs((current) => current.map((job) => (job.id === jobRecord.id ? jobRecord : job)))
      setSelectedJobId(jobRecord.job_no || jobRecord.id)
      setMessage(error.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const changeJobStatusFor = (jobRecord, status, nextAction, metadataPatch = {}) => {
    const statusTimeKeys = {
      Accepted: 'accepted',
      'OTP verified': 'otp_verified',
      Started: 'started',
      'In progress': 'started',
      Completed: 'completed',
      Rejected: 'rejected',
    }
    const statusTimeKey = statusTimeKeys[status]
    const metadata = {
      ...(jobRecord.metadata || {}),
      ...metadataPatch,
      status_times: {
        ...(jobRecord.metadata?.status_times || {}),
        ...(metadataPatch.status_times || {}),
        ...(statusTimeKey ? { [statusTimeKey]: new Date().toISOString() } : {}),
        ...(status === 'Accepted' ? { vendor_accepted: new Date().toISOString() } : {}),
      },
      work: {
        ...(jobRecord.metadata?.work || {}),
        ...(metadataPatch.work || {}),
      },
    }
    return updateJobRecord(jobRecord, { metadata, next_action: nextAction, status })
  }

  const changeJobStatus = (status, nextAction, metadataPatch = {}) => changeJobStatusFor(selectedJob, status, nextAction, metadataPatch)

  const acceptJob = async (jobRecord = selectedJob) => {
    const actionKey = `${getJobId(jobRecord)}:accept`
    setPendingJobAction(actionKey)
    const acceptedAt = new Date().toISOString()
    const acceptedJob = await changeJobStatusFor(jobRecord, 'Accepted', 'Reach customer and upload start proof', {
      accepted_at: acceptedAt,
    })

    readBrowserLocation()
      .then((vendorLocation) => {
        if (!acceptedJob) return
        changeJobStatusFor(acceptedJob, 'Accepted', 'Reach customer and upload start proof', {
          accepted_at: acceptedAt,
          location_events: [
            ...(acceptedJob.metadata?.location_events || []),
            { event: 'accepted', location: vendorLocation, timestamp: new Date().toISOString() },
          ],
          vendor_location: vendorLocation,
        })
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setPendingJobAction((current) => current === actionKey ? '' : current))
  }

  const rejectJob = async (jobRecord = selectedJob) => {
    const actionKey = `${getJobId(jobRecord)}:reject`
    setPendingJobAction(actionKey)
    await changeJobStatusFor(jobRecord, 'Rejected', 'Rejected by vendor', {
      rejected_at: new Date().toISOString(),
    })
    setPendingJobAction((current) => current === actionKey ? '' : current)
  }

  const confirmExtraItems = async (payload) => {
    if (!addExtraItemsJob) return
    const updated = await updateJobRecord(addExtraItemsJob, payload)
    if (updated) {
      setAddExtraItemsJob(null)
      setMessage('Extra items sent to customer for approval.')
    }
  }

  const verifyCompletionOtp = () => {
    const expectedOtp = String(selectedJob.metadata?.otp || '')
    if (!expectedOtp || completionOtpInput.trim() !== expectedOtp) {
      setMessage('Invalid OTP. Ask customer for the completion OTP shown in their booking.')
      return
    }
    setCompletionOtpInput('')
    setCompletionOtpJobId('')
    changeJobStatus('OTP verified', 'Upload final work proof', {
      work: { otp_verified_at: new Date().toISOString() },
    })
  }

  const readPhotoFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({
      kind: file.type?.startsWith('video/') ? 'video' : 'photo',
      name: file.name,
      preview: reader.result,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const saveUploadedJob = (savedJob) => {
    setJobs((current) => current.map((job) => (job.id === savedJob.id ? savedJob : job)))
    setSelectedJobId(savedJob.job_no || savedJob.id)
    setDetailsJob((current) => current?.id === savedJob.id ? savedJob : current)
  }

  const uploadVideoInChunks = async (phase, file) => {
    if (file.size > MAX_WORK_VIDEO_SIZE) {
      throw new Error('Video file must be 2 GB or smaller.')
    }

    const totalChunks = Math.ceil(file.size / WORK_VIDEO_CHUNK_SIZE)
    const uploadId = `${selectedJob.id}-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    let latestJob = null

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * WORK_VIDEO_CHUNK_SIZE
      const chunk = file.slice(start, Math.min(start + WORK_VIDEO_CHUNK_SIZE, file.size))
      const body = new FormData()
      body.append('phase', phase)
      body.append('upload_id', uploadId)
      body.append('chunk_index', String(index))
      body.append('total_chunks', String(totalChunks))
      body.append('original_name', file.name)
      body.append('total_size', String(file.size))
      body.append('mime_type', file.type || 'video/mp4')
      body.append('chunk', chunk, `${file.name}.part${index}`)

      const progressText = `Uploading video ${Math.round(((index + 1) / totalChunks) * 100)}%...`
      setMessage(progressText)
      setWorkUploadState({ jobId: getJobId(selectedJob), phase, text: progressText })
      const response = await vendorApi.uploadJobMediaChunk(selectedJob.id, body, partner?.id)
      if (response.complete && response.job) {
        latestJob = response.job
      }
    }

    return latestJob
  }

  const uploadWorkMedia = async (phase, files) => {
    const selectedFiles = Array.from(files || []).filter((file) => file?.type?.startsWith('image/') || file?.type?.startsWith('video/'))
    const photoFiles = selectedFiles.filter((file) => file.type?.startsWith('image/'))
    const videoFiles = selectedFiles.filter((file) => file.type?.startsWith('video/'))

    if (!selectedFiles.length) {
      setMessage('Please select a photo or video.')
      return
    }

    const photoKey = phase === 'before' ? 'before_photos' : 'after_photos'
    const videoKey = phase === 'before' ? 'before_videos' : 'after_videos'
    const nextAction = phase === 'before' ? 'Start service work' : 'Complete booking'
    const uploadingLabel = phase === 'before' ? 'Uploading start proof...' : 'Uploading final proof...'

    if (!Number.isFinite(Number(selectedJob.id))) {
      try {
        setWorkUploadState({ jobId: getJobId(selectedJob), phase, text: 'Processing selected media...' })
        const photoRecords = await Promise.all(photoFiles.map(readPhotoFile))
        const videoRecords = await Promise.all(videoFiles.map(readPhotoFile))
        const currentPhotos = selectedJob.metadata?.work?.[photoKey] || []
        const currentVideos = selectedJob.metadata?.work?.[videoKey] || []
        changeJobStatus(selectedJob.status, nextAction, {
          work: {
            [photoKey]: [...currentPhotos, ...photoRecords],
            [videoKey]: [...currentVideos, ...videoRecords],
            [`${phase}_uploaded_at`]: new Date().toISOString(),
          },
        })
      } catch (error) {
        setMessage(error.message)
      } finally {
        setWorkUploadState({ jobId: '', phase: '', text: '' })
      }
      return
    }

    setIsLoading(true)
    setMessage('')
    setWorkUploadState({ jobId: getJobId(selectedJob), phase, text: uploadingLabel })
    try {
      if (photoFiles.length) {
        setWorkUploadState({ jobId: getJobId(selectedJob), phase, text: `Uploading ${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''}...` })
        const body = new FormData()
        body.append('phase', phase)
        photoFiles.forEach((file) => body.append('photos[]', file))
        const response = await vendorApi.uploadJobPhotos(selectedJob.id, body, partner?.id)
        saveUploadedJob(response.job || response)
      }

      let latestVideoJob = null
      for (const file of videoFiles) {
        latestVideoJob = await uploadVideoInChunks(phase, file)
      }
      if (latestVideoJob) {
        saveUploadedJob(latestVideoJob)
      }

      const photoText = photoFiles.length ? `${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''}` : ''
      const videoText = videoFiles.length ? `${videoFiles.length} video${videoFiles.length > 1 ? 's' : ''}` : ''
      setMessage(`${[photoText, videoText].filter(Boolean).join(' and ')} uploaded.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setWorkUploadState({ jobId: '', phase: '', text: '' })
      setIsLoading(false)
    }
  }

  const startWork = async () => {
    if (!countPhaseMedia(selectedJob, 'before')) {
      setMessage('Upload a start photo, image or video before starting the service.')
      return
    }

    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Start work',
      text: 'Admin will see that service work has started with the uploaded start proof.',
      title: 'Start service work?',
    })
    if (!confirmed) return

    changeJobStatus('Started', 'Work timer running', {
      work: { started_at: new Date().toISOString() },
    })
  }

  const completeJobWithReview = async () => {
    if (!countPhaseMedia(selectedJob, 'after')) {
      setMessage('Upload final photos, images or videos before completing the booking.')
      return
    }
    if (!vendorReview.text.trim()) {
      setMessage('Write a short customer review before completing the booking.')
      return
    }
    if (isCodPaymentJob(selectedJob) && !isCodMarkedPaid(selectedJob, codPaidByJob)) {
      setMessage('Mark COD payment as paid before completing the booking.')
      return
    }

    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Submit review & complete',
      text: 'This will submit your customer review, complete the booking, and update wallet commission/payment totals.',
      title: 'Complete booking?',
    })
    if (!confirmed) return

    await submitVendorReview({ completeAfterSubmit: true })
  }

  const getStoredReviewRating = (review) => {
    if (!review) return ''
    if (typeof review === 'object') return review.rating || ''
    return ''
  }

  const formatStarRating = (rating) => {
    const value = Number(rating || 0)
    const fullStars = value ? Math.max(1, Math.min(5, Math.round(value))) : 5
    return {
      label: value ? `${value} star` : '5 star',
      stars: `${'★'.repeat(fullStars)}${'☆'.repeat(5 - fullStars)}`,
    }
  }

  const submitVendorReview = async ({ completeAfterSubmit = false } = {}) => {
    if (selectedJob.metadata?.reviews?.vendor_to_customer) {
      setMessage('Review is already submitted for this order.')
      return
    }
    if (!vendorReview.text.trim()) {
      setMessage('Write a short customer review before submitting.')
      return
    }
    setIsLoading(true)
    setMessage('')
    try {
      const savedReview = await vendorApi.saveReview({
        customer_name: getCustomerName(selectedJob),
        partner_name: partner.name,
        rating: vendorReview.rating,
        reviewed_at: new Date().toISOString().slice(0, 10),
        service_name: getServiceName(selectedJob),
        status: 'Pending',
        text: vendorReview.text,
        metadata: {
          booking_id: selectedJob.metadata?.booking_id,
          booking_no: selectedJob.metadata?.booking_no || selectedJob.job_no,
          direction: 'vendor_to_customer',
          vendor_id: partner.id,
        },
      })
      const reviewPatch = {
        reviews: {
          ...(selectedJob.metadata?.reviews || {}),
          vendor_to_customer: {
            id: savedReview.id,
            rating: Number(vendorReview.rating),
            reviewed_at: new Date().toISOString().slice(0, 10),
            status: savedReview.status,
            text: vendorReview.text,
          },
        },
      }
      const savedJob = completeAfterSubmit
        ? await changeJobStatus('Completed', 'Booking completed', {
          ...reviewPatch,
          ...(isCodPaymentJob(selectedJob) ? {
            payment_confirmation: {
              ...(selectedJob.metadata?.payment_confirmation || {}),
              cod_marked_paid: true,
              cod_marked_paid_at: new Date().toISOString(),
              cod_marked_paid_by_partner_id: partner.id,
            },
          } : {}),
          work: { completed_at: new Date().toISOString() },
        })
        : await changeJobStatus(selectedJob.status, 'Review submitted', reviewPatch)

      if (completeAfterSubmit && savedJob && partner?.id) {
        await loadPartnerWorkspace(partner)
      }
      setVendorReview({ rating: '5', text: '' })
      setMessage(completeAfterSubmit ? 'Booking completed. Wallet, commission and payout totals updated.' : 'Review submitted for admin view.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!partner?.id) return

    setIsLoading(true)
    setMessage('')
    try {
      const payload = {
        ...profileForm,
        service_experience_years: profileForm.service_experience_years === '' ? null : Number(profileForm.service_experience_years),
      }
      const updatedPartner = await vendorApi.updatePartner(partner.id, payload)
      setPartner(updatedPartner)
      setMessage('Vendor profile updated successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const chooseProfilePicture = () => {
    profilePictureInputRef.current?.click()
  }

  const uploadProfilePicture = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !partner?.id) return

    setIsLoading(true)
    setMessage('')
    try {
      const body = new FormData()
      body.append('profile_picture', file)
      const response = await vendorApi.uploadProfilePicture(partner.id, body)
      const updatedPartner = response.partner || response.data || response
      setPartner(updatedPartner)
      setMessage('Profile picture updated successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const validateBankForm = () => {
    const ifsc = bankForm.ifsc.trim().toUpperCase()
    const accountNumber = bankForm.account_number.trim()
    if (!bankForm.account_holder.trim()) return 'Account holder name is required.'
    if (!/^\d{6,30}$/.test(accountNumber)) return 'Account number must be 6 to 30 digits.'
    if (!bankForm.bank_name.trim()) return 'Bank name is required.'
    if (!ifsc) return 'IFSC code is required.'
    return ''
  }

  const refreshPartner = async () => {
    if (!partner?.id) return null
    const response = await vendorApi.partner(partner.id)
    const latestPartner = response.data || response
    setPartner(latestPartner)
    return latestPartner
  }

  const lookupBankByIfsc = async () => {
    const ifsc = bankForm.ifsc.trim().toUpperCase()
    if (!ifsc || ifsc.length < 4) return
    try {
      const details = await vendorApi.lookupIfsc(ifsc)
      setBankForm((current) => ({
        ...current,
        bank_name: details.BANK || current.bank_name,
        branch_name: details.BRANCH || current.branch_name,
        ifsc,
      }))
      setBankSearch(details.BANK || bankSearch)
    } catch {
      // IFSC lookup is optional; manual entry remains available.
    }
  }

  const saveBankAccount = async (event) => {
    event.preventDefault()
    const validationMessage = validateBankForm()
    if (validationMessage) {
      setMessage(validationMessage)
      return
    }

    setIsLoading(true)
    setMessage('')
    try {
      const payload = {
        ...bankForm,
        account_holder: bankForm.account_holder.trim(),
        account_number: bankForm.account_number.trim(),
        bank_name: bankForm.bank_name.trim(),
        branch_name: bankForm.branch_name.trim(),
        ifsc: bankForm.ifsc.trim().toUpperCase(),
      }
      const response = editingBankId
        ? await vendorApi.updateBankAccount(partner.id, editingBankId, payload)
        : await vendorApi.addBankAccount(partner.id, payload)
      setPartner(response.partner)
      await refreshPartner()
      setBankForm(emptyBankForm)
      setBankSearch('')
      setBankFormOpen(false)
      setEditingBankId('')
      setMessage(response.message || (editingBankId ? 'Bank account updated successfully.' : 'Bank account added successfully.'))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const setActiveBankAccount = async (accountId) => {
    if (!partner?.id || !accountId) return
    setIsLoading(true)
    setMessage('')
    try {
      const response = await vendorApi.activateBankAccount(partner.id, accountId)
      setPartner(response.partner)
      await refreshPartner()
      setMessage(response.message || 'Active bank account updated.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const editBankAccount = (account) => {
    setEditingBankId(account.id)
    setBankForm({
      account_holder: account.account_holder || '',
      account_number: account.account_number || '',
      account_type: account.account_type || 'Savings',
      bank_name: account.bank_name || '',
      branch_name: account.branch_name || '',
      ifsc: account.ifsc || '',
      make_active: Boolean(account.is_active),
    })
    setBankSearch(account.bank_name || '')
    setBankFormOpen(true)
  }

  const closeBankForm = () => {
    setBankForm(emptyBankForm)
    setBankSearch('')
    setEditingBankId('')
    setBankFormOpen(false)
  }

  const uploadVendorDocument = async (event) => {
    event.preventDefault()
    if (!partner?.id || !documentUpload.file) {
      setMessage('Choose a document before uploading.')
      return
    }

    const formData = new FormData()
    formData.append('document', documentUpload.file)
    if (documentUpload.index !== '') {
      formData.append('index', documentUpload.index)
    } else {
      formData.append('label', documentUpload.label || 'Additional document')
    }

    setIsLoading(true)
    setMessage('')
    try {
      const response = await vendorApi.uploadPartnerDocument(partner.id, formData)
      setPartner(response.partner)
      setDocumentUpload({ file: null, index: '', label: '' })
      setMessage(response.message || 'Document uploaded successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const selectVendorPage = (key) => {
    setActiveVendorPage(key)
    if (key === 'requests-active' && activeRequestJobs[0]) setSelectedJobId(getJobId(activeRequestJobs[0]))
    if (key === 'requests-completed' && completedRequestJobs[0]) setSelectedJobId(getJobId(completedRequestJobs[0]))
  }

  const renderVendorNavigation = ({ closeOnSelect = false } = {}) => (
    <div className="grid gap-1">
      {vendorTopNavItems.map(({ icon, key, label }) => (
        <button
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${activeVendorPage === key ? 'bg-[#67B529] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          key={key}
          onClick={() => {
            selectVendorPage(key)
            if (closeOnSelect) setMobileSidebarOpen(false)
          }}
          type="button"
        >
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${activeVendorPage === key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <VendorNavIcon name={icon} />
          </span>
          <span>{label}</span>
        </button>
      ))}
      {vendorNavGroups.map((group) => {
        const isActiveGroup = group.items.some((item) => item.key === activeVendorPage)
        const isOpen = isActiveGroup

        return (
          <div key={group.id}>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => {
                const firstItem = group.items[0]
                if (firstItem) {
                  selectVendorPage(firstItem.key)
                  if (closeOnSelect) setMobileSidebarOpen(false)
                }
              }}
              type="button"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                <VendorNavIcon name={group.icon} />
              </span>
              <span className="min-w-0 flex-1">{group.label}</span>
              <svg aria-hidden="true" className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <div className="ml-11 mt-1 grid gap-1 border-l border-slate-200 pl-2">
                {group.items.map(({ key, label }) => (
                  <button
                    className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${activeVendorPage === key ? 'bg-[#67B529] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                    key={key}
                    onClick={() => {
                      selectVendorPage(key)
                      if (closeOnSelect) setMobileSidebarOpen(false)
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
        <header className="border-b border-blue-100 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <button className="flex items-center gap-3 text-left" onClick={onBackHome} type="button">
              <BrandMark appSettings={appSettings} tone="dark" />
              <span>
                <span className="block text-lg font-black">Vendor Login</span>
                <span className="text-sm font-semibold text-blue-700">KYC approved vendors only</span>
              </span>
            </button>
            <button className="w-fit rounded-md border border-blue-200 px-4 py-2 text-sm font-bold hover:bg-blue-50" onClick={onOpenBecomeProvider} type="button">
              Become Service Provider
            </button>
          </div>
        </header>

        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <aside className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-[#67B529]">Approval required</p>
            <h1 className="mt-2 text-3xl font-black">Vendor panel opens after super admin KYC approval.</h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-blue-800">
              If your KYC is pending or rejected, login will stay locked. Submit accurate details and service documents from the provider form.
            </p>
            <div className="mt-6 grid gap-3 text-sm font-bold text-blue-900">
              <span className="rounded-md bg-[#EEF9E8] px-3 py-2 text-[#2F6412]">Track assigned orders</span>
              <span className="rounded-md bg-sky-50 px-3 py-2 text-sky-800">See wallet and settlement</span>
              <span className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">Update arrival, OTP and completion</span>
            </div>
          </aside>

          <form className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm" onSubmit={submitLogin}>
            <label className="block">
              <span className="text-sm font-bold">Phone or email</span>
              <input className="mt-2 w-full rounded-md border border-blue-200 px-4 py-3 outline-none focus:border-[#003F86]" placeholder="9001122334 or vendor@email.com" required value={credentials.login} onChange={(event) => setCredentials((current) => ({ ...current, login: event.target.value }))} />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Password</span>
              <input className="mt-2 w-full rounded-md border border-blue-200 px-4 py-3 outline-none focus:border-[#003F86]" required type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
            </label>
            <button className="mt-5 w-full rounded-md bg-[#003F86] px-4 py-3 text-sm font-black text-white hover:bg-[#0054A6] disabled:opacity-60" disabled={isLoading} type="submit">
              {isLoading ? 'Checking KYC...' : 'Login to vendor panel'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className={`${embedded ? 'min-h-0 rounded-lg border border-slate-200 bg-slate-50 pb-6' : 'min-h-screen bg-slate-50 pb-10 xl:pl-64'} text-slate-800`}>
      {!embedded && <header className="sticky top-0 z-20 border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-800 hover:bg-slate-50 xl:hidden" onClick={() => setMobileSidebarOpen(true)} type="button" aria-label="Open vendor menu">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <button className="min-w-0 text-left" onClick={onBackHome} type="button">
              <span className="block truncate max-w-[160px] sm:max-w-none text-base sm:text-lg font-black">{pageHeaderCopy.title}</span>
              <span className="hidden sm:block truncate text-xs sm:text-sm font-semibold text-blue-700">{pageHeaderCopy.subtitle}</span>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                className="relative grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                onClick={() => setNotificationOpen((current) => !current)}
                type="button"
                aria-label="Vendor notifications"
              >
                <HeaderIcon>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </HeaderIcon>
                {notificationUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-12 z-30 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Notifications</p>
                      <p className="text-xs font-semibold text-slate-500">{notificationUnreadCount} active updates</p>
                    </div>
                    <button className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50" onClick={() => setNotificationOpen(false)} type="button">
                      Close
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-3">
                    {notificationItems.map((item) => (
                      <button
                        className="mb-2 block w-full rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50 last:mb-0"
                        key={item.key}
                        onClick={() => {
                          item.action()
                          setNotificationOpen(false)
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-1 text-sm font-black text-slate-900">{item.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${item.tone}`}>Live</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.helper}</p>
                      </button>
                    ))}
                    {!notificationItems.length && (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-sm font-semibold text-slate-500">
                        No pending vendor alerts.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              className="rounded-full outline-none ring-[#67B529]/30 transition hover:ring-4 focus:ring-4"
              onClick={() => setActiveVendorPage('profile')}
              type="button"
              aria-label="Open vendor profile"
              title="Open profile"
            >
              <VendorAvatar name={partner.name} src={profilePicture} />
            </button>
            <button className="grid h-10 w-10 place-items-center text-red-700 transition hover:text-red-800" onClick={onLogout || (() => setPartner(null))} type="button" aria-label="Logout">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 3v9" />
                <path d="M7.05 7.05a7 7 0 1 0 9.9 0" />
              </svg>
            </button>
          </div>
        </div>
      </header>}

      {!embedded && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white xl:block">
          <div className="flex h-full flex-col">
            <div className="flex min-h-[73px] items-center gap-3 border-b border-slate-200 px-4 py-4">
              <button
                className="shrink-0 rounded-full outline-none ring-[#67B529]/30 transition hover:ring-4 focus:ring-4"
                onClick={() => setActiveVendorPage('profile')}
                type="button"
                aria-label="Open vendor profile"
              >
                <VendorAvatar name={partner.name} src={profilePicture} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{partner.business_name || partner.name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{partner.kyc_status || 'KYC pending'}</p>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {renderVendorNavigation()}
            </nav>
            <div className="border-t border-slate-200 p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-xs font-black text-white hover:bg-red-800" onClick={onLogout || (() => setPartner(null))} type="button">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 3v9" />
                  <path d="M7.05 7.05a7 7 0 1 0 9.9 0" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </aside>
      )}

      {!embedded && mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileSidebarOpen(false)} type="button" aria-label="Close vendor menu" />
          <aside className="relative flex h-full w-72 max-w-[82vw] flex-col border-r border-slate-200 bg-white shadow-2xl">
            
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              
              <button
                className="rounded-full outline-none ring-[#67B529]/30 transition hover:ring-4 focus:ring-4"
                onClick={() => {
                  setActiveVendorPage('profile')
                  setMobileSidebarOpen(false)
                }}
                type="button"
                aria-label="Open vendor profile"
              >
                <VendorAvatar name={partner.name} src={profilePicture} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{partner.business_name || partner.name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{partner.kyc_status || 'KYC pending'}</p>
              </div>
               <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setMobileSidebarOpen(false)} type="button" aria-label="Close vendor menu">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {renderVendorNavigation({ closeOnSelect: true })}
            </nav>
            <div className="border-t border-slate-200 p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-xs font-black text-white hover:bg-red-800" onClick={onLogout || (() => setPartner(null))} type="button">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 3v9" />
                  <path d="M7.05 7.05a7 7 0 1 0 9.9 0" />
                </svg>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {embedded && (
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3">
          {vendorFlatNavItems.map(({ key, label }) => (
            <button className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${activeVendorPage === key ? 'border-[#67B529]/35 bg-[#EEF9E8] text-[#67B529]' : 'border-slate-200 text-slate-600'}`} key={key} onClick={() => setActiveVendorPage(key)} type="button">
              {label}
            </button>
          ))}
        </nav>
      )}

      {activeVendorPage === 'dashboard' && <section id="vendor-dashboard" className="mx-auto max-w-7xl px-4 py-6 lg:px-2">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_220px] md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#67B529]">Today overview</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{partner.business_name || partner.name}</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  {partner.skill || 'Service professional'} dashboard for accepting bookings, tracking customer visits and checking settlement.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {services.slice(0, 4).map((service) => (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600" key={service}>{service}</span>
                  ))}
                </div>
              </div>
              <button
                className={`rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${isAvailable ? 'bg-[#67B529] hover:bg-[#67B529]' : 'bg-slate-700 hover:bg-slate-800'}`}
                disabled={isLoading}
                onClick={toggleAvailability}
                type="button"
              >
                {isAvailable ? 'Available for jobs' : 'Go available'}
              </button>
            </div>

            <div className="grid border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Active jobs', stats.activeJobs, 'Open and assigned'],
                ['New requests', stats.newRequests, 'Waiting response'],
                ['Completed', stats.completedJobs, 'Closed jobs'],
                ['Today earning', formatMoney(stats.todayEarnings), 'Gross job value'],
              ].map(([label, value, helper]) => (
                <div className="border-b border-slate-200 p-5 sm:border-r lg:border-b-0" key={label}>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 border-t border-slate-200 p-5 lg:grid-cols-3">
              {[
                ['Next payout', formatMoney(walletSummary.payable), walletSummary.settlement],
                ['Cash to settle', formatMoney(walletSummary.companyDue), 'Company due from cash jobs'],
                ['KYC health', partner.kyc_status || 'Pending', `${submittedDocuments}/${documents.length || 0} documents submitted`],
              ].map(([label, value, helper]) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4" key={label}>
                  <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="grid h-fit gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-[#67B529]">Live alerts</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{notificationUnreadCount} updates</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${stats.newRequests ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/20'}`}>
                  {stats.newRequests ? `${stats.newRequests} new` : 'Clear'}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {notificationItems.slice(0, 4).map((item) => (
                  <button
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-left hover:bg-white"
                    key={item.key}
                    onClick={() => item.action()}
                    type="button"
                  >
                    <p className="line-clamp-1 text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.helper}</p>
                  </button>
                ))}
                {!notificationItems.length && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm font-semibold text-slate-500">No urgent update. Keep availability on for new bookings.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase text-sky-700">Vendor profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{partner.business_name || partner.name}</h2>
              <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600">
                {[
                  ['Area', [partner.area, partner.city, partner.pincode].filter(Boolean).join(', ') || 'Not added'],
                  ['Services', services.length ? services.slice(0, 3).join(', ') : 'Not added'],
                  ['Experience', partner.service_experience_years ? `${partner.service_experience_years} years` : 'Not added'],
                  ['Rating', partner.rating || 'New partner'],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0" key={label}>
                    <span className="text-slate-400">{label}</span>
                    <span className="text-right text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-5 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800" onClick={() => setActiveVendorPage('profile')} type="button">
                Complete profile
              </button>
            </section>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase text-sky-700">Work pipeline</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Latest assigned requests</h2>
              </div>
              <button className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => setActiveVendorPage('requests-active')} type="button">
                Manage
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {assignedJobs.slice(0, 4).map((job) => (
                <button className="grid gap-2 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center" key={getJobId(job)} onClick={() => { setSelectedJobId(getJobId(job)); setActiveVendorPage('requests-active') }} type="button">
                  <span>
                    <span className="block text-sm font-black text-slate-900">{getServiceName(job)}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">{getCustomerName(job)} - {job.slot || 'Slot pending'}</span>
                  </span>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[job.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{job.status}</span>
                </button>
              ))}
              {!assignedJobs.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">No active requests right now.</p>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-amber-700">Professional checklist</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Daily readiness</h2>
            <div className="mt-4 grid gap-3">
              {[
                ['Profile', partner.business_name || partner.name ? 'Ready' : 'Update required'],
                ['Bank details', partner.bank_account_number && partner.bank_ifsc ? 'Ready for payout' : 'Add bank details'],
                ['Documents', submittedDocuments ? `${submittedDocuments} uploaded` : 'Upload pending'],
                ['Availability', isAvailable ? 'Taking new work' : 'Paused'],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2.5" key={label}>
                  <span className="text-sm font-semibold text-slate-500">{label}</span>
                  <span className="text-sm font-black text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-[#67B529]">Next important action</p>
            {nextJob ? (
              <div className="mt-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{getServiceName(nextJob)}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{getCustomerName(nextJob)} - {nextJob.slot || 'Slot pending'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[nextJob.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{nextJob.status}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{nextJob.next_action || nextJob.nextAction || 'Open assigned requests to continue this job.'}</p>
                <button className="mt-4 rounded-md bg-[#67B529] px-4 py-2.5 text-sm font-black text-white hover:bg-[#67B529]" onClick={() => { setSelectedJobId(getJobId(nextJob)); setActiveVendorPage('requests-active') }} type="button">
                  Continue job
                </button>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">No job is pending right now.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-500">Operational snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {jobStatusSummary.map(([label, value, helper]) => (
                <div className="rounded-md bg-slate-50 px-3 py-3" key={label}>
                  <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-400">Last location update</p>
                <p className="mt-1 text-sm font-black text-slate-800">{latestLocationEvent ? getJobId(latestLocationEvent.job) : 'No GPS event yet'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{latestLocationEvent ? formatDateTime(latestLocationEvent.timestamp) : 'Accept a job to capture vendor location.'}</p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-400">Profile readiness</p>
                <p className="mt-1 text-sm font-black text-slate-800">{formatPercent(profileCompletion)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{bankReady ? 'Bank details ready' : 'Bank details need update'}</p>
              </div>
            </div>
          </section>
        </div>
      </section>}

      {activeVendorPage === 'kyc' && <section id="vendor-kyc" className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ['KYC status', partner.kyc_status || 'Pending', partner.kyc_rejected_reason || 'Super admin verification status.'],
            ['Documents', documents.length ? `${submittedDocuments}/${documents.length} submitted` : 'No documents uploaded', 'Upload new files or replace rejected files.'],
          ].map(([title, value, helper]) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={title}>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-400">{helper}</p>
            </article>
          ))}
        </div>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-[#67B529]">KYC documents</p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Uploaded files and verification</h2>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-[#67B529]/30 bg-[#EEF9E8] px-2.5 py-0.5 text-xs font-bold text-[#4F9A1E] transition hover:bg-[#67B529] hover:text-white"
                  onClick={() => {
                    setDocumentUpload({ file: null, index: '', label: '' })
                    const selectEl = document.getElementById('vendor-doc-select')
                    if (selectEl) {
                      selectEl.focus()
                      selectEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  title="Add more documents"
                  type="button"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="12" x2="12" y1="5" x2="19" />
                    <line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                  <span>Add More</span>
                </button>
              </div>
            </div>
            <span className="rounded-full bg-[#EEF9E8] px-3 py-1 text-xs font-bold text-[#4F9A1E] ring-1 ring-[#67B529]/30">{submittedDocuments} submitted</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document, index) => (
              <div className="rounded-lg border border-slate-200 p-3" key={`${document.label || 'Document'}-${index}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{document.label || `Document ${index + 1}`}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{document.status || 'Pending'}</p>
                  </div>
                  {document.path && (
                    <a className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" href={publicAssetUrl(document.path)} rel="noreferrer" target="_blank">
                      View
                    </a>
                  )}
                </div>
                {document.rejection_reason && <p className="mt-2 text-xs font-semibold text-rose-600">{document.rejection_reason}</p>}
              </div>
            ))}
            {!documents.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 md:col-span-2 xl:col-span-3">No documents uploaded yet.</p>}
          </div>

          <form className="mt-5 grid gap-3 border-t border-slate-200 pt-4 md:max-w-xl" id="vendor-doc-upload-form" onSubmit={uploadVendorDocument}>
            <select className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700" id="vendor-doc-select" onChange={(event) => setDocumentUpload((current) => ({ ...current, index: event.target.value }))} value={documentUpload.index}>
              <option value="">Add new document</option>
              {documents.map((document, index) => (
                <option key={`${document.label || 'Document'}-${index}`} value={index}>Replace {document.label || `Document ${index + 1}`}</option>
              ))}
            </select>
            {documentUpload.index === '' && (
              <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-800" onChange={(event) => setDocumentUpload((current) => ({ ...current, label: event.target.value }))} placeholder="Document label, e.g. Aadhaar, PAN, GST" value={documentUpload.label} />
            )}
            <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold" onChange={(event) => setDocumentUpload((current) => ({ ...current, file: event.target.files?.[0] || null }))} type="file" />
            <button className="rounded-md bg-[#67B529] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#5ca827] disabled:opacity-60" disabled={isLoading} type="submit">
              Upload document
            </button>
          </form>
        </section>
      </section>}

      {activeVendorPage === 'bank-details' && <section id="vendor-bank-details" className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-[#67B529]">Bank details</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Settlement accounts</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Add multiple bank accounts. Only one account can stay active for payouts.</p>
          </div>
          <button className="rounded-md bg-[#67B529] px-4 py-2.5 text-sm font-black text-white hover:bg-[#5CA827]" onClick={() => (bankFormOpen ? closeBankForm() : setBankFormOpen(true))} type="button">
            {bankFormOpen ? 'Close form' : 'Add bank account'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {bankAccounts.map((account) => (
            <article className={`rounded-lg border bg-white p-4 shadow-sm ${account.is_active ? 'border-[#67B529] ring-2 ring-[#67B529]/20' : 'border-slate-200'}`} key={account.id || account.account_number}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#EEF9E8] text-lg font-black text-[#67B529] ring-1 ring-[#67B529]/20">
                    {(account.bank_name || 'B').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-900">{account.bank_name || 'Bank account'}</h3>
                    <p className="text-xs font-semibold text-slate-500">{account.branch_name || 'Branch not added'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {account.is_active && <span className="rounded-full bg-[#EEF9E8] px-2.5 py-1 text-[11px] font-black text-[#67B529] ring-1 ring-[#67B529]/20">Active</span>}
                  <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => editBankAccount(account)} type="button" aria-label="Edit bank account">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                <p><span className="text-slate-400">Holder:</span> {account.account_holder || 'Not added'}</p>
                <p><span className="text-slate-400">Account:</span> ****{String(account.account_number || '').slice(-4)}</p>
                <p><span className="text-slate-400">IFSC:</span> {account.ifsc || 'Not added'}</p>
                <p><span className="text-slate-400">Type:</span> {account.account_type || 'Savings'}</p>
              </div>
              {!account.is_active && (
                <button className="mt-4 w-full rounded-md border border-[#67B529]/35 px-3 py-2 text-sm font-black text-[#67B529] hover:bg-[#EEF9E8] disabled:opacity-60" disabled={isLoading} onClick={() => setActiveBankAccount(account.id)} type="button">
                  Set active
                </button>
              )}
            </article>
          ))}
          {!bankAccounts.length && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 lg:col-span-3">
              No bank account added yet. Add your first settlement account.
            </div>
          )}
        </div>

        {bankFormOpen && (
          <form className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveBankAccount}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase text-slate-500">{editingBankId ? 'Edit account' : 'Add account'}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Bank account details</h3>
              </div>
              <button className="rounded-md bg-[#67B529] px-4 py-2.5 text-sm font-black text-white hover:bg-[#5CA827] disabled:opacity-60" disabled={isLoading} type="submit">
                {editingBankId ? 'Update account' : 'Save account'}
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>IFSC code</span>
                <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-emerald-700" maxLength={11} onBlur={lookupBankByIfsc} onChange={(event) => setBankForm((current) => ({ ...current, ifsc: event.target.value.toUpperCase() }))} placeholder="HDFC0001234" required value={bankForm.ifsc} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>Bank name</span>
                <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-700" list="vendor-bank-options" onChange={(event) => { setBankSearch(event.target.value); setBankForm((current) => ({ ...current, bank_name: event.target.value })) }} placeholder="Search bank" required value={bankForm.bank_name || bankSearch} />
                <datalist id="vendor-bank-options">
                  {knownIndianBanks.map((bankName) => <option key={bankName} value={bankName} />)}
                </datalist>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>Branch</span>
                <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-700" onChange={(event) => setBankForm((current) => ({ ...current, branch_name: event.target.value }))} placeholder="Auto-filled from IFSC where possible" value={bankForm.branch_name} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>Account type</span>
                <select className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-700" onChange={(event) => setBankForm((current) => ({ ...current, account_type: event.target.value }))} value={bankForm.account_type}>
                  {['Savings', 'Current', 'Salary', 'Other'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>Account holder</span>
                <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-700" onChange={(event) => setBankForm((current) => ({ ...current, account_holder: event.target.value }))} required value={bankForm.account_holder} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                <span>Account number</span>
                <input className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-700" inputMode="numeric" onChange={(event) => setBankForm((current) => ({ ...current, account_number: event.target.value.replace(/\D/g, '') }))} required value={bankForm.account_number} />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
                <input checked={bankForm.make_active} onChange={(event) => setBankForm((current) => ({ ...current, make_active: event.target.checked }))} type="checkbox" />
                Make this account active for payouts
              </label>
            </div>
          </form>
        )}
      </section>}

      {activeVendorPage === 'profile' && <section id="vendor-profile" className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <input accept="image/*" className="hidden" onChange={uploadProfilePicture} ref={profilePictureInputRef} type="file" />
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveProfile}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-[#67B529]">Profile management</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Your vendor details</h2>
            </div>
            <button className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60" disabled={isLoading} type="submit">
              Save profile
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['name', 'Name'],
              ['business_name', 'Business name'],
              ['phone', 'Phone'],
              ['alternate_phone', 'Alternate phone'],
              ['email', 'Email'],
              ['area', 'Area'],
              ['city', 'City'],
              ['pincode', 'Pincode'],
              ['service_experience_years', 'Experience years'],
            ].map(([name, label]) => (
              <label className="grid gap-2 text-sm font-bold text-slate-600" key={name}>
                <span>{label}</span>
                <input
                  className="rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-slate-800"
                  name={name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, [name]: event.target.value }))}
                  type={name === 'email' ? 'email' : name === 'service_experience_years' ? 'number' : 'text'}
                  value={profileForm[name]}
                />
              </label>
            ))}
          </div>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-[#67B529]">Service profile</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Coverage and skills</h2>
          <div className="mt-5 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <button
              aria-label="Update profile picture"
              className="group relative shrink-0 rounded-full outline-none ring-[#67B529]/30 transition hover:ring-4 focus:ring-4 disabled:opacity-70"
              disabled={isLoading}
              onClick={chooseProfilePicture}
              title="Update profile picture"
              type="button"
            >
              <span className="block scale-150">
                <VendorAvatar name={partner.name} src={profilePicture} />
              </span>
              <span className="absolute -bottom-3 -right-3 grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white ring-2 ring-white">
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">{partner.business_name || partner.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{isLoading ? 'Uploading...' : 'Profile photo shown in header, panel, and admin.'}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600">
            {[
              ['Business', partner.business_name || partner.name || 'Not added'],
              ['Services', services.length ? services.join(', ') : 'Not added'],
              ['Area', [partner.area, partner.city, partner.pincode].filter(Boolean).join(', ') || 'Not added'],
              ['Availability', partner.availability || (isAvailable ? 'Available' : 'Unavailable')],
              ['Rating', partner.rating || 'New partner'],
            ].map(([label, value]) => (
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0" key={label}>
                <span className="text-slate-400">{label}</span>
                <span className="text-right text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>}

      {activeVendorPage === 'id-card' && <section id="vendor-id-card" className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[420px_1fr] lg:px-8">
        <div className="grid h-fit gap-4">
          <IdentityCard membership={membership} partner={partner} profilePicture={profilePicture} />
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-[#67B529]">ID card details</p>
            <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600">
              {[
                ['ID card no', membership.id_card_no || 'Not set'],
                ['Vendor ID', `VEN-${String(partner.id || '').padStart(5, '0')}`],
                ['Designation', membership.designation || partner.skill || 'Service Professional'],
                ['Valid until', membership.valid_until || 'Not set'],
                ['Public status', membership.published ? 'Published' : 'Not published'],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0" key={label}>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-right text-slate-700">{value}</span>
                </div>
              ))}
            </div>
            {membership.published ? (
              <a className="mt-5 block rounded-md bg-slate-900 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-slate-800" href={publicPath} target="_blank" rel="noreferrer">
                Open public certificate
              </a>
            ) : (
              <p className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                Public certificate is not published yet. Admin can publish membership after verification.
              </p>
            )}
          </section>
        </div>

        <div className="grid gap-5">
          <MembershipCertificate membership={membership} partner={partner} publicUrl={membership.published ? publicUrl : ''} />
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-500">Readiness linked to ID</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {readinessItems.map(([label, value, helper]) => (
                <div className="rounded-md bg-slate-50 px-3 py-3" key={label}>
                  <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>}

      {activeVendorPage === 'customize' && <section id="vendor-customize" className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-[#67B529]">Customize profile</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Public vendor presence</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Update the business details that customers and admin use to identify your service profile.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['Business name', partner.business_name || partner.name || 'Not added'],
              ['Services', services.join(', ') || 'Not added'],
              ['Area', partner.area || 'Not added'],
              ['Working hours', partner.metadata?.working_hours || 'Not added'],
              ['Service radius', partner.metadata?.service_radius || 'Not added'],
              ['Languages', Array.isArray(partner.metadata?.languages) ? partner.metadata.languages.join(', ') : partner.metadata?.languages || 'Not added'],
            ].map(([label, value]) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={label}>
                <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <button className="mt-5 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800" onClick={() => setActiveVendorPage('profile')} type="button">
            Edit profile details
          </button>
        </section>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-sky-700">Preview</p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <VendorAvatar name={partner.name} src={profilePicture} />
            <h3 className="mt-4 text-xl font-black text-slate-900">{partner.business_name || partner.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{partner.skill || services[0] || 'Service professional'}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{partner.metadata?.business_about || 'Business profile details can be customized from profile edit.'}</p>
          </div>
        </aside>
      </section>}

      {activeVendorPage === 'dashboard' && vendorMessages.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-5 lg:px-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-amber-700">Admin messages</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{vendorMessages[0].title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{vendorMessages[0].message}</p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                {vendorMessages[0].channel === 'both' ? 'Email + panel' : vendorMessages[0].channel}
              </span>
            </div>
          </div>
        </section>
      )}

      {isRequestsPage && <section id="vendor-requests" className="mx-auto max-w-[96rem] px-4 py-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#67B529]">Assigned requests</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activeVendorPage === 'requests-completed' ? 'Completed requests' : 'Active work queue'}</h2>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {requestVisibleJobs.length} {activeVendorPage === 'requests-completed' ? 'completed' : 'active'} in panel
          </span>
        </div>

        <div className={requestVisibleJobs.length > 0 && !isCompletedRequestsPage ? 'grid gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start' : ''}>
          <div className={requestVisibleJobs.length > 0 && !isCompletedRequestsPage ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'} id="vendor-jobs-list-container">
            {requestVisibleJobs.map((job) => {
              const isSelected = String(getJobId(job)) === String(getJobId(requestSelectedJob))
              const beforeCount = countPhaseMedia(job, 'before')
              const afterCount = countPhaseMedia(job, 'after')
              const jobRating = formatStarRating(getStoredReviewRating(job.metadata?.reviews?.vendor_to_customer))

              return (
                <article className={`relative rounded-lg border bg-white p-3 shadow-sm transition ${isSelected ? 'border-[#67B529] ring-2 ring-[#67B529]/20' : 'border-slate-200 hover:border-slate-300'}`} key={getJobId(job)}>
                  <button
                    className="block w-full text-left"
                    onClick={(event) => {
                      if (event.target.closest('[data-open-job-details]')) {
                        setSelectedJobId(getJobId(job))
                        setDetailsJob(job)
                        return
                      }
                      setSelectedJobId(getJobId(job))
                      if (window.innerWidth < 1024) {
                        setTimeout(() => {
                          document.getElementById('vendor-selected-job-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 50)
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase text-slate-500 underline-offset-2 hover:text-blue-700 hover:underline" data-open-job-details>
                          {job.metadata?.booking_no || getJobId(job)}
                        </span>
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-slate-900">{getServiceName(job)}</h3>
                      </div>
                      <span className={`mr-8 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusStyles[job.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{job.status}</span>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-600">
                      <p className="line-clamp-1"><span className="text-slate-400">Customer:</span> {getCustomerName(job) || 'Not added'}</p>
                      <p><span className="text-slate-400">Slot:</span> {job.slot || 'Slot pending'}</p>
                      <p><span className="text-slate-400">Next:</span> {nextStepLabel(job)}</p>
                    </div>
                    {isCompletedRequestsPage && (
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                        <span className="text-xs font-black uppercase text-slate-500">Rating</span>
                        <span className="flex items-center gap-2">
                          <span className="text-2xl font-black leading-none text-amber-500">{jobRating.stars}</span>
                          <span className="text-xs font-black text-[#67B529]">{jobRating.label}</span>
                        </span>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] font-black">
                      <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-600">{formatMoney(job.amount)}</span>
                      <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-600">Start {beforeCount}</span>
                      <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-600">Final {afterCount}</span>
                    </div>
                    {['Started', 'In progress'].includes(job.status) && (
                      <div className="mt-3 flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                        <span>Work timer</span>
                        <span>{formatDuration(getWorkElapsedSeconds(job, timerNow))}</span>
                      </div>
                    )}
                  </button>
                  <button
                    aria-label="Job actions"
                    className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-lg font-black leading-none text-slate-500 hover:bg-slate-50"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenJobMenuId((current) => current === getJobId(job) ? '' : getJobId(job))
                    }}
                    type="button"
                  >
                    ...
                  </button>
                  {openJobMenuId === getJobId(job) && (
                    <div className="absolute right-3 top-12 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                      <button
                        className="w-full px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedJobId(getJobId(job))
                          setDetailsJob(job)
                          setOpenJobMenuId('')
                        }}
                        type="button"
                      >
                        View details
                      </button>
                      {!isCompletedRequestsPage && (
                        <button
                          className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setSelectedJobId(getJobId(job))
                            setOpenJobMenuId('')
                          }}
                          type="button"
                        >
                          Manage work
                        </button>
                      )}
                      {isPaidJob(job) && (
                        <button
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            downloadInvoiceFile(job.id || job.booking_no || job.job_no)
                            setOpenJobMenuId('')
                          }}
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M5 21h14" />
                          </svg>
                          Download invoice
                        </button>
                      )}
                    </div>
                  )}
                  {job.status === 'New request' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-md bg-[#67B529] px-3 py-2 text-sm font-semibold text-white hover:bg-[#67B529] disabled:opacity-60" disabled={pendingJobAction === `${getJobId(job)}:accept`} onClick={() => acceptJob(job)} type="button">
                        {pendingJobAction === `${getJobId(job)}:accept` ? 'Accepting...' : 'Accept'}
                      </button>
                      <button className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={pendingJobAction === `${getJobId(job)}:reject`} onClick={() => rejectJob(job)} type="button">
                        {pendingJobAction === `${getJobId(job)}:reject` ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  )}
                  
                </article>
              )
            })}
            {!requestVisibleJobs.length && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 md:col-span-2 xl:col-span-3">
                {activeVendorPage === 'requests-completed' ? 'No completed request is available for your vendor account right now.' : 'No active assigned or auto-routed request is available for your vendor account right now.'}
              </div>
            )}
          </div>

          {requestVisibleJobs.length > 0 && !isCompletedRequestsPage && <section className="rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-5 scroll-mt-20" id="vendor-selected-job-pane">
            {(() => {
              const managedJob = requestSelectedJob
              const moneySummary = getJobMoneySummary(requestSelectedJob)
              const selectedJobIsCod = isCodPaymentJob(managedJob)
              const selectedJobCodPaid = isCodMarkedPaid(managedJob, codPaidByJob)
              const activeUploadText = workUploadState.jobId === getJobId(managedJob) ? workUploadState.text : ''
              const isUploadingBefore = workUploadState.jobId === getJobId(managedJob) && workUploadState.phase === 'before'
              const isUploadingAfter = workUploadState.jobId === getJobId(managedJob) && workUploadState.phase === 'after'

              return (
                <>
                  <div className="border-b border-slate-200 p-4">
                    <button
                      className="mb-3 flex items-center gap-1.5 rounded-lg border border-[#67B529]/30 bg-[#EEF9E8] px-3 py-1.5 text-xs font-black text-[#67B529] hover:bg-[#E3F5DC] lg:hidden"
                      onClick={() => {
                        document.getElementById('vendor-jobs-list-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="m5 15 7-7 7 7" />
                      </svg>
                      Back to Job Queue
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{getJobId(requestSelectedJob)}</p>
                        <h2 className="text-2xl font-semibold text-slate-900">{getServiceName(requestSelectedJob)}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Current status: <span className="text-[#67B529]">{requestSelectedJob.status}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        {['Started', 'In progress'].includes(requestSelectedJob.status) && (
                          <button
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            onClick={() => setAddExtraItemsJob(requestSelectedJob)}
                            type="button"
                          >
                            Add Extra Items
                          </button>
                        )}
                        {addressMapUrl(requestSelectedJob) && (
                          <a
                            aria-label="Open address in Google Maps"
                            className="grid h-11 w-11 place-items-center  text-[#67B529] hover:bg-emerald-100"
                            href={addressMapUrl(requestSelectedJob)}
                            rel="noreferrer"
                            target="_blank"
                            title="Open map"
                          >
                            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                              <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
                              <circle cx="12" cy="9" r="2.5" />
                            </svg>
                          </a>
                        )}
                        <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => setDetailsJob(requestSelectedJob)} type="button">
                          View details
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_330px]">
                    <div className="grid gap-4">
                      <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-[220px]">
                            <p className="text-xs font-black uppercase text-slate-400">Customer</p>
                            <h3 className="mt-1 text-2xl font-semibold leading-8 text-slate-950">{getCustomerName(requestSelectedJob) || 'Not added'}</h3>
                            <p className="mt-1 text-base font-semibold text-slate-600">{requestSelectedJob.metadata?.customer_phone || requestSelectedJob.metadata?.phone || 'Phone visible after acceptance'}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusStyles[requestSelectedJob.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{requestSelectedJob.status}</span>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <div className="rounded-md bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400">Slot</p>
                            <p className="text-base text-slate-900">
                              {requestSelectedJob.slot
                                ? new Date(requestSelectedJob.slot).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                                : 'Pending'}
                            </p>
                          </div>
                          <div className="rounded-md bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400">Amount</p>
                            <p className="text-base  text-slate-900">{formatMoney(requestSelectedJob.amount)}</p>
                          </div>
                          <div className="rounded-md bg-white px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400">Payment</p>
                            <p className="break-words text-base  leading-6 text-slate-900">{requestSelectedJob.metadata?.payment || 'Payment pending'}</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-xs font-black uppercase text-slate-400">Service address</p>
                        <p className="mt-2 break-words text-xl font-semibold leading-8 text-slate-950">{requestSelectedJob.address || 'Address not added'}</p>
                        <div className="mt-4">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              formatLocation(getCustomerLocation(requestSelectedJob))
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#67B529] hover:text-[#67B529] hover:underline"
                          >
                            📍 View Customer Location on Google Maps
                          </a>
                        </div>
                      </section>

                      {requestSelectedJob.metadata?.items && requestSelectedJob.metadata.items.length > 0 && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase text-slate-400">Booked Services</p>
                          <div className="mt-3 grid gap-2">
                            {requestSelectedJob.metadata.items.map((item, idx) => (
                              <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200" key={item.id || item.cart_id || idx}>
                                <span className="text-sm font-semibold text-slate-900">{typeof item === 'object' ? item.name || item.service_name : item}</span>
                                {typeof item === 'object' && (
                                  <span className="text-sm font-black text-[#67B529]">
                                    {formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}
                                    {Number(item.quantity || 1) > 1 ? ` (${item.quantity}×)` : ''}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {requestSelectedJob.metadata?.vendor_extra_items?.length > 0 && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase text-slate-400">Approved Extra Items</p>
                          <div className="mt-3 grid gap-2">
                            {requestSelectedJob.metadata.vendor_extra_items.map((item, idx) => (
                              <div className="flex items-center justify-between rounded-md bg-[#EEF9E8] px-3 py-2 ring-1 ring-[#67B529]/20" key={item.id || idx}>
                                <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                                <span className="text-sm font-black text-[#67B529]">
                                  {formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}
                                  {Number(item.quantity || 1) > 1 ? ` (${item.quantity}×)` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {requestSelectedJob.metadata?.pending_vendor_extra_items?.length > 0 && (
                        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs font-black uppercase text-amber-700">Pending Customer Approval</p>
                          <div className="mt-3 grid gap-2">
                            {requestSelectedJob.metadata.pending_vendor_extra_items.map((item, idx) => (
                              <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 ring-1 ring-amber-200" key={item.id || idx}>
                                <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                                <span className="text-sm font-black text-amber-700">
                                  {formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}
                                  {Number(item.quantity || 1) > 1 ? ` (${item.quantity}×)` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {(!requestSelectedJob.metadata?.items?.length && !requestSelectedJob.metadata?.vendor_extra_items?.length && !requestSelectedJob.metadata?.pending_vendor_extra_items?.length) && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase text-slate-400">Extra Items</p>
                          <p className="mt-2 text-sm font-semibold text-slate-500">No extra items added yet.</p>
                        </section>
                      )}

                      <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">Amount split</p>
                            <h3 className=" text-lg font-semibold text-slate-950">Payment and commission</h3>
                          </div>
                          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                            {requestSelectedJob.status === 'Completed' ? 'Posted' : 'Estimated'}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          <div className="rounded-md bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400">Revenue</p>
                            <p className="mt-1 text-lg  text-slate-950">{formatMoney(moneySummary.gross)}</p>
                          </div>
                         
                          <div className="rounded-md bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase text-slate-400">Tax</p>
                            <p className="mt-1 text-lg  text-slate-950">{formatMoney(moneySummary.tax)}</p>
                          </div>
                          <div className="rounded-md bg-[#EEF9E8] px-4 py-3 ring-1 ring-[#67B529]/20">
                            <p className="text-xs font-black uppercase text-[#67B529]">Earning</p>
                            <p className="mt-1 text-lg   text-[#2F6412]">{formatMoney(moneySummary.vendorAmount)}</p>
                          </div>
                        </div>
                      </section>
                    </div>

                    <aside className="rounded-lg border border-slate-200 bg-white p-5 xl:sticky xl:top-24">
                      <p className="text-sm font-black uppercase text-slate-500">Action required</p>
                      <div className="mt-4 grid gap-3">
                         
                        {managedJob.status === 'Accepted' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <label className={`rounded-md px-4 py-3 text-center text-sm font-semibold text-white ${isUploadingBefore ? 'cursor-not-allowed bg-slate-500' : 'cursor-pointer bg-slate-900 hover:bg-slate-800'}`}>
                                {isUploadingBefore ? 'Uploading...' : 'Click photo'}
                                <input accept="image/*" capture="environment" className="hidden" disabled={isLoading} onChange={(event) => {
                                  uploadWorkMedia('before', event.target.files)
                                  event.target.value = ''
                                }} type="file" />
                              </label>
                              <label className={`rounded-md border border-slate-200 px-4 py-3 text-center text-sm font-semibold ${isUploadingBefore ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
                                {isUploadingBefore ? 'Uploading...' : 'Photos'}
                                <input accept="image/*" className="hidden" disabled={isLoading} multiple onChange={(event) => {
                                  uploadWorkMedia('before', event.target.files)
                                  event.target.value = ''
                                }} type="file" />
                              </label>
                            </div>
                            <label className={`rounded-md border border-slate-200 px-4 py-3 text-center text-sm font-semibold ${isUploadingBefore ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
                              {isUploadingBefore ? 'Uploading video...' : 'Upload start video'}
                              <input accept="video/*" className="hidden" disabled={isLoading} multiple onChange={(event) => {
                                uploadWorkMedia('before', event.target.files)
                                event.target.value = ''
                              }} type="file" />
                            </label>
                            <WorkUploadIndicator text={activeUploadText && isUploadingBefore ? activeUploadText : ''} />
                            <p className="text-xs font-black text-slate-500">Start proof: {(managedJob.metadata?.work?.before_photos || []).length} photos/images, {(managedJob.metadata?.work?.before_videos || []).length} videos uploaded. Minimum 1 file required.</p>
                            <button className="rounded-md bg-[#67B529] px-4 py-3 text-sm font-semibold text-white hover:bg-[#67B529] disabled:opacity-60" disabled={isLoading || !countPhaseMedia(managedJob, 'before')} onClick={startWork} type="button">
                              Start work timer
                            </button>
                          </>
                        )}
                        {['Started', 'In progress'].includes(managedJob.status) && (
                          <>
                            <div className="rounded-md bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                              <p className="text-xs font-black uppercase text-blue-500">Work timer running</p>
                              <p className="mt-1 text-3xl font-black text-blue-800">{formatDuration(getWorkElapsedSeconds(managedJob, timerNow))}</p>
                              <p className="mt-1 text-xs font-semibold text-blue-700">Customer OTP is required before final proof upload.</p>
                            </div>
                            {completionOtpJobId === getJobId(managedJob) ? (
                              <div className="grid gap-2">
                                <input className="rounded-md border border-slate-200 px-4 py-3 text-base font-black tracking-widest outline-none focus:border-[#67B529]" inputMode="numeric" maxLength={6} onChange={(event) => setCompletionOtpInput(event.target.value)} placeholder="Enter customer OTP" value={completionOtpInput} />
                                <button className="rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={isLoading || !completionOtpInput.trim()} onClick={verifyCompletionOtp} type="button">
                                  Verify OTP
                                </button>
                              </div>
                            ) : (
                              <button className="rounded-md bg-[#67B529] px-4 py-3 text-sm font-semibold text-white hover:bg-[#67B529] disabled:opacity-60" disabled={isLoading} onClick={() => {
                                setCompletionOtpJobId(getJobId(managedJob))
                                setCompletionOtpInput('')
                              }} type="button">
                                Work complete
                              </button>
                            )}
                          </>
                        )}
                        {managedJob.status === 'OTP verified' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <label className={`rounded-md px-4 py-3 text-center text-sm font-semibold text-white ${isUploadingAfter ? 'cursor-not-allowed bg-slate-500' : 'cursor-pointer bg-slate-900 hover:bg-slate-800'}`}>
                                {isUploadingAfter ? 'Uploading...' : 'Click photo'}
                                <input accept="image/*" capture="environment" className="hidden" disabled={isLoading} onChange={(event) => {
                                  uploadWorkMedia('after', event.target.files)
                                  event.target.value = ''
                                }} type="file" />
                              </label>
                              <label className={`rounded-md border border-slate-200 px-4 py-3 text-center text-sm font-semibold ${isUploadingAfter ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
                                {isUploadingAfter ? 'Uploading...' : 'Photos'}
                                <input accept="image/*" className="hidden" disabled={isLoading} multiple onChange={(event) => {
                                  uploadWorkMedia('after', event.target.files)
                                  event.target.value = ''
                                }} type="file" />
                              </label>
                            </div>
                            <label className={`rounded-md border border-slate-200 px-4 py-3 text-center text-sm font-semibold ${isUploadingAfter ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
                              {isUploadingAfter ? 'Uploading video...' : 'Upload final video'}
                              <input accept="video/*" className="hidden" disabled={isLoading} multiple onChange={(event) => {
                                uploadWorkMedia('after', event.target.files)
                                event.target.value = ''
                              }} type="file" />
                            </label>
                            <WorkUploadIndicator text={activeUploadText && isUploadingAfter ? activeUploadText : ''} />
                            <p className="text-xs font-black text-slate-500">Final proof: {(managedJob.metadata?.work?.after_photos || []).length} photos/images, {(managedJob.metadata?.work?.after_videos || []).length} videos uploaded. Minimum 1 file required.</p>
                            {countPhaseMedia(managedJob, 'after') > 0 && (
                              <div className="grid gap-2 rounded-md bg-slate-50 p-3 ring-1 ring-slate-200">
                                <p className="text-xs font-black uppercase text-slate-500">Customer rating & review</p>
                                <select className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" onChange={(event) => setVendorReview((current) => ({ ...current, rating: event.target.value }))} value={vendorReview.rating}>
                                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star</option>)}
                                </select>
                                <textarea className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-800" onChange={(event) => setVendorReview((current) => ({ ...current, text: event.target.value }))} placeholder="Customer behaviour, access, payment notes" value={vendorReview.text} />
                              </div>
                            )}
                            {selectedJobIsCod && (
                              <label className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${selectedJobCodPaid ? 'border-[#67B529]/35 bg-[#EEF9E8] text-[#2F6412]' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                <input
                                  checked={selectedJobCodPaid}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#67B529] focus:ring-emerald-500"
                                  onChange={(event) => setCodPaidByJob((current) => ({ ...current, [getJobId(managedJob)]: event.target.checked }))}
                                  type="checkbox"
                                />
                                <span>COD payment received from customer</span>
                              </label>
                            )}
                            <button className="rounded-md bg-[#67B529] px-4 py-3 text-sm font-semibold text-white hover:bg-[#67B529] disabled:opacity-60" disabled={isLoading || !countPhaseMedia(managedJob, 'after') || !vendorReview.text.trim() || (selectedJobIsCod && !selectedJobCodPaid)} onClick={completeJobWithReview} type="button">
                              Submit review & complete booking
                            </button>
                          </>
                        )}
                        {managedJob.status === 'Completed' && (
                          <span className="rounded-md bg-[#EEF9E8] px-4 py-3 text-center text-sm font-black text-[#67B529] ring-1 ring-[#67B529]/20">
                            Work completed
                          </span>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <button className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button">
                            Call
                          </button>
                          <button className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button">
                            Help
                          </button>
                        </div>


                        <div className="rounded-lg border border-[#67B529]/20 bg-[#EEF9E8] p-4">
                          <p className="text-xs font-black uppercase text-[#67B529]">Money summary</p>
                          <div className="mt-3 grid gap-2 text-sm font-black">
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-500">Revenue</span>
                              <span className="text-slate-950">{formatMoney(moneySummary.gross)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-500">Platform Charge</span>
                              <span className="text-rose-700">{formatMoney(moneySummary.commission)}</span>
                            </div>
                            <div className="flex justify-between gap-3 border-t border-[#67B529]/20 pt-2">
                              <span className="text-[#67B529]">My Earning</span>
                              <span className="text-[#2F6412]">{formatMoney(moneySummary.vendorAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                  {managedJob.status === 'Completed' && (
                    <div className="border-t border-slate-200 p-5">
                      {managedJob.metadata?.reviews?.vendor_to_customer ? (
                        <div className="flex items-center justify-between gap-3 rounded-md bg-[#EEF9E8] px-4 py-3 ring-1 ring-[#67B529]/20">
                          <span className="text-sm font-black text-[#67B529]">Vendor rating</span>
                          <span className="flex items-center gap-3">
                            <span className="text-4xl font-black leading-none text-amber-500">{formatStarRating(getStoredReviewRating(managedJob.metadata.reviews.vendor_to_customer)).stars}</span>
                            <span className="text-sm font-black text-[#67B529]">{formatStarRating(getStoredReviewRating(managedJob.metadata.reviews.vendor_to_customer)).label}</span>
                          </span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-500">Review customer</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
                            <select className="rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold" onChange={(event) => setVendorReview((current) => ({ ...current, rating: event.target.value }))} value={vendorReview.rating}>
                              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star</option>)}
                            </select>
                            <input className="rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-800" onChange={(event) => setVendorReview((current) => ({ ...current, text: event.target.value }))} placeholder="Customer behaviour, access, payment notes" value={vendorReview.text} />
                            <button className="rounded-md bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60" disabled={isLoading} onClick={submitVendorReview} type="button">
                              Submit review
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )
            })()}
          </section>}
        </div>
        <JobDetailsModal job={detailsJob} onClose={() => setDetailsJob(null)} />
      {addExtraItemsJob && (
        <AddExtraItemsModal 
          job={addExtraItemsJob} 
          onClose={() => setAddExtraItemsJob(null)} 
          onConfirm={confirmExtraItems}
        />
      )}
      </section>}

      {activeVendorPage === 'wallet' && <section id="vendor-wallet" className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-black uppercase text-sky-700">Wallet and settlement</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900">{formatMoney(walletSummary.payable)}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Vendor payable after commission and cash adjustment.</p>
                </div>
                <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">{walletSummary.settlement}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Lifetime earning', walletSummary.lifetimeEarning || (walletSummary.onlineEarning + walletSummary.cashCollected - walletSummary.commission), 'All completed services'],
                ['Online earning', walletSummary.onlineEarning, 'Paid online by customers'],
                ['Cash collected', walletSummary.cashCollected, 'Collected at service'],
                ['Commission', walletSummary.commission, 'Company share'],
                ['Company due', walletSummary.companyDue, 'To be settled'],
              ].map(([label, value, helper]) => (
                <div className="border-b border-slate-200 p-4 sm:border-r xl:border-b-0" key={label}>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(value)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
                </div>
              ))}
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-slate-500">Recent earning ledger</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">Job-wise amount summary</h3>
                </div>
                <button className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => setActiveVendorPage('requests-active')} type="button">
                  View jobs
                </button>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[1fr_85px_80px] sm:grid-cols-[1fr_110px_110px] bg-slate-50 px-3 sm:px-4 py-3 text-xs font-black uppercase text-slate-400">
                  <span>Service</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Status</span>
                </div>
                {recentWalletJobs.map((job) => (
                  <div className="grid grid-cols-[1fr_85px_80px] sm:grid-cols-[1fr_110px_110px] border-t border-slate-100 px-3 sm:px-4 py-3 text-sm font-semibold text-slate-700" key={job.id}>
                    <span className="min-w-0 truncate">{job.service}</span>
                    <span className="text-right">{formatMoney(job.amount)}</span>
                    <span className="text-right text-xs font-black text-slate-500">{job.status}</span>
                  </div>
                ))}
                {!recentWalletJobs.length && <p className="border-t border-slate-100 px-4 py-5 text-sm font-semibold text-slate-500">No wallet-linked jobs yet.</p>}
              </div>
            </div>
          </section>

          <aside className="grid h-fit gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase text-[#67B529]">Payout account</p>
              <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600">
                {[
                  ['Holder', partner.bank_account_holder || 'Not added'],
                  ['Bank', partner.bank_name || 'Not added'],
                  ['Account', partner.bank_account_number ? `****${String(partner.bank_account_number).slice(-4)}` : 'Not added'],
                  ['IFSC', partner.bank_ifsc || 'Not added'],
                  ['Branch', partner.bank_branch_name || 'Not added'],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0" key={label}>
                    <span className="text-slate-400">{label}</span>
                    <span className="text-right text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-5 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800" onClick={() => setActiveVendorPage('kyc')} type="button">
                Update bank details
              </button>
              <button className="mt-3 w-full rounded-md bg-[#67B529] px-4 py-2.5 text-sm font-black text-white hover:bg-[#67B529] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading || walletSummary.payable <= 0} onClick={requestWithdrawal} type="button">
                Request withdrawal
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase text-amber-700">Settlement rules</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
                <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">Online bookings add to vendor payable after company commission.</p>
                <p className="rounded-md bg-slate-50 px-3 py-2">Cash bookings increase company due until settlement is marked.</p>
                <p className="rounded-md bg-slate-50 px-3 py-2">Completed jobs are included in final payout review.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>}

      {activeVendorPage === 'transactions' && <section id="vendor-transactions" className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-[#67B529]/20 bg-gradient-to-r from-emerald-100 via-teal-50 to-cyan-100 p-5">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Total credit', transactionTotals.credit, 'text-[#67B529]'],
                ['Total debit', transactionTotals.debit, 'text-rose-600'],
                ['Paid / success', transactionTotals.paid, 'text-sky-600'],
                ['Unpaid / pending', transactionTotals.unpaid, 'text-amber-500'],
              ].map(([label, value, tone]) => (
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-[#67B529]/20" key={label}>
                  <p className="text-xs font-black uppercase text-slate-600">{label}</p>
                  <p className={`mt-1 text-2xl font-black ${tone}`}>{formatMoney(value)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto custom-thin-scrollbar" onScroll={loadMoreTransactions}>
            <div className="min-w-[980px]">
              <div className="sticky top-0 z-10 grid grid-cols-[130px_1.2fr_1fr_120px_120px_120px_140px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase text-slate-700 shadow-sm">
                <span>Date</span>
                <span>Description</span>
                <span>Reference</span>
                <span>Type</span>
                <span className="text-right">Debit</span>
                <span className="text-right">Credit</span>
                <span className="text-right">Status</span>
              </div>
              {visibleTransactionRows.map((row) => (
                <div className="grid grid-cols-[130px_1.2fr_1fr_120px_120px_120px_140px] items-center border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" key={row.id}>
                  <span className="text-xs font-bold text-slate-500">{formatDateTime(row.date)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{row.type}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{row.service}</p>
                  </div>
                  <span className="font-bold text-slate-600">{row.jobId}</span>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-black ${row.direction === 'Credit' ? 'bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/20' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'}`}>{row.direction}</span>
                  <span className="text-right font-black text-rose-700">{row.direction === 'Debit' ? formatMoney(row.amount) : '-'}</span>
                  <span className="text-right font-black text-[#67B529]">{row.direction === 'Credit' ? formatMoney(row.amount) : '-'}</span>
                  <span className="text-right">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${['Paid', 'Success'].includes(row.status)
                        ? 'bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/20'
                        : row.status === 'Unpaid'
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                      }`}>{row.status}</span>
                  </span>
                </div>
              ))}
              {visibleTransactionRows.length < transactionRows.length && (
                <div className="border-t border-slate-100 px-5 py-4 text-center text-xs font-black uppercase text-slate-500">
                  Scroll down to load more
                </div>
              )}
              {!transactionRows.length && <p className="border-t border-slate-100 px-5 py-6 text-sm font-semibold text-slate-500">No transaction history yet.</p>}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-col gap-2 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>Net payable after debit</span>
              <span className="text-xl font-black text-slate-950">{formatMoney(Math.max(0, transactionTotals.credit - transactionTotals.debit))}</span>
            </div>
          </div>
        </section>
      </section>}
    </main>
  )
}

export default VendorDashboardPage
