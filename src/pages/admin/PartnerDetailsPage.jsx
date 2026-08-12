import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { ActionButton, Panel, StatusBadge } from '../../components/admin/AdminUI'
import { buildVendorPublicPath, defaultMembership, IdentityCard } from '../../components/vendor/MembershipAssets'
import { buildDocumentUrl } from '../../config/urls'
import { resolvePartnerProfilePictureUrl } from '../../utils/partnerProfile'
import { adminApi } from '../../services/adminApi'
import { notify } from '../../utils/feedback'
import AdminLayout from './components/AdminLayout'
import { askConfirmation, askTextInput, showSuccessAlert } from './utils/confirmations'
import { formatValue } from './utils/formatters'
import { canAccessModule } from './utils/permissions'

const sections = [
  {
    title: 'Basic Details',
    fields: [
      ['name', 'Partner name'],
      ['business_name', 'Business name'],
      ['phone', 'Phone'],
      ['email', 'Email'],
    ],
  },
  {
    title: 'Service Area',
    fields: [
      ['services', 'Services'],
      ['skill', 'Skill'],
      ['area', 'Area'],
      ['city', 'City'],
      ['pincode', 'Pincode'],
    ],
  },
  {
    title: 'KYC Timeline',
    fields: [
      ['kyc_status', 'KYC status'],
      ['kyc_submitted_at', 'Submitted at'],
      ['kyc_verified_at', 'Verified at'],
      ['kyc_rejected_reason', 'Rejection reason'],
      ['aadhaar_document', 'Aadhaar document'],
      ['pan_document', 'PAN document'],
    ],
  },
  {
    title: 'Performance',
    fields: [
      ['availability', 'Availability'],
      ['rating', 'Rating'],
      ['earnings', 'Earnings'],
      ['status', 'Status'],
    ],
  },
]

const badgeFields = new Set(['availability', 'kyc_status', 'status'])
const sectionFieldKeys = new Set(sections.flatMap((section) => section.fields.map(([field]) => field)))
const hiddenFieldKeys = new Set(['documents'])
const editableFields = [
  ['name', 'Partner name', 'text'],
  ['business_name', 'Business name', 'text'],
  ['phone', 'Phone', 'tel'],
  ['email', 'Email', 'email'],
  ['skill', 'Skill / services', 'text'],
  ['area', 'Area', 'text'],
  ['city', 'City', 'text'],
  ['pincode', 'Pincode', 'text'],
  ['address_line', 'Business address', 'textarea'],
  ['service_experience_years', 'Experience years', 'number'],
  ['gst_number', 'GST number', 'text'],
  ['business_about', 'About business', 'textarea'],
  ['working_hours', 'Working hours', 'text'],
  ['service_radius', 'Service radius', 'text'],
  ['languages', 'Languages', 'text'],
  ['availability', 'Availability', 'select', ['Available', 'Busy', 'Unavailable', 'On job']],
  ['status', 'Account status', 'select', ['Active', 'Inactive', 'Pending', 'Approved', 'Blocked']],
]

const metadataEditableFields = new Set(['gst_number', 'business_about', 'working_hours', 'service_radius', 'languages'])
const editFieldGroups = [
  {
    title: 'Identity',
    fields: ['business_name', 'name', 'skill', 'service_experience_years', 'gst_number'],
  },
  {
    title: 'Contact & Location',
    fields: ['phone', 'email', 'area', 'city', 'pincode', 'address_line'],
  },
  {
    title: 'About & Operations',
    fields: ['business_about', 'working_hours', 'service_radius', 'languages'],
  },
  {
    title: 'Account',
    fields: ['availability', 'status'],
  },
]
const editableFieldConfig = Object.fromEntries(editableFields.map(([field, label, type, options]) => [field, { label, options, type }]))

function getEditFieldValue(partner, field) {
  if (metadataEditableFields.has(field)) return partner.metadata?.[field] || ''
  if (field === 'service_experience_years') return partner[field] ?? ''
  return partner[field] || ''
}

function getBusinessInfo(partner, servicesLabel) {
  const metadata = partner?.metadata || {}

  return {
    about: metadata.business_about || '',
    address: partner?.address_line || '',
    experience: partner?.service_experience_years ? `${partner.service_experience_years}+ Years` : '',
    gstNumber: metadata.gst_number || '',
    languages: metadata.languages || '',
    serviceArea: [partner?.area, partner?.city].filter(Boolean).join(', '),
    serviceRadius: metadata.service_radius || '',
    workingHours: metadata.working_hours || '',
    category: servicesLabel || '',
  }
}

function DetailValue({ field, value }) {
  const formattedValue = formatValue(value)

  if (badgeFields.has(field) && formattedValue) {
    return <StatusBadge>{formattedValue}</StatusBadge>
  }

  if (['aadhaar_document', 'pan_document'].includes(field) && value) {
    const href = getDocumentUrl(value)
    return (
      <a className="font-semibold text-[#003F86] underline-offset-2 hover:underline" href={href} rel="noreferrer" target="_blank">
        View file
      </a>
    )
  }

  return <span>{formattedValue || '-'}</span>
}

function formatDocumentLabel(document, index) {
  return document.label || document.name || document.type || `Document ${index + 1}`
}

function getDocumentUrl(path) {
  return buildDocumentUrl(path)
}

function InfoCard({ fields, title }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
        {fields.map(([label, value, field]) => (
          <div className="min-w-0 bg-white p-4" key={label}>
            <dt className="text-[11px] font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="mt-1 break-words text-sm font-normal text-slate-800">
              <DetailValue field={field} value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MetricTile({ helper, icon = 'wallet', label, tone = 'indigo', value }) {
  const tones = {
    blue: 'bg-[#EEF9E8] text-[#67B529]',
    emerald: 'bg-[#EEF9E8] text-[#67B529]',
    indigo: 'bg-[#EEF9E8] text-[#67B529]',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-[#EEF9E8] text-[#67B529]',
  }
  const icons = {
    briefcase: (
      <>
        <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
        <path d="M4 7h16v12H4Z" />
        <path d="M8 12h8" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M4 9h16" />
        <path d="M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1Z" />
      </>
    ),
    check: (
      <>
        <path d="M9 11 12 14 20 6" />
        <path d="M5 3h9l5 5v13H5Z" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6Z" />
        <path d="M9 12h6M10 15h4" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7h16v12H4Z" />
        <path d="M4 7l3-3h10l3 3M16 13h4" />
      </>
    ),
    x: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="m15 9-6 6M9 9l6 6" />
      </>
    ),
  }

  return (
    <article className="flex min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.indigo}`}>
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
          {icons[icon] || icons.wallet}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-tight text-slate-800">{value}</p>
        <p className="mt-1 text-xs font-semibold leading-snug text-slate-600">{label}</p>
        <p className="mt-1 text-[10px] font-normal uppercase text-slate-400">{helper}</p>
      </div>
    </article>
  )
}

function BusinessField({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 break-words text-sm font-normal leading-relaxed text-slate-800">{value || '-'}</p>
    </div>
  )
}

function EditField({ editForm, field, onChange }) {
  const config = editableFieldConfig[field]
  if (!config) return null
  const { label, options, type } = config
  const inputClass = 'rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#67B529] focus:ring-4 focus:ring-[#EEF9E8]'

  return (
    <label className={`grid gap-1.5 ${type === 'textarea' ? 'md:col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {type === 'select' ? (
        <select
          className={`h-10 ${inputClass}`}
          onChange={(event) => onChange(field, event.target.value)}
          value={editForm[field] || ''}
        >
          <option value="">Select {label}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className={`min-h-20 py-2.5 ${inputClass}`}
          onChange={(event) => onChange(field, event.target.value)}
          value={editForm[field] || ''}
        />
      ) : (
        <input
          className={`h-10 ${inputClass}`}
          onChange={(event) => onChange(field, event.target.value)}
          type={type}
          value={editForm[field] || ''}
        />
      )}
    </label>
  )
}

function StatusSummaryItem({ label, status, tone = 'emerald' }) {
  const tones = {
    emerald: {
      card: 'border-[#67B529]/35 bg-[#EEF9E8]/70',
      icon: 'bg-emerald-100 text-[#67B529] ring-[#67B529]/30',
      status: 'text-[#67B529]',
    },
    indigo: {
      card: 'border-[#67B529]/30 bg-[#EEF9E8]/70',
      icon: 'bg-[#D9F3C8] text-[#67B529] ring-[#67B529]/30',
      status: 'text-[#67B529]',
    },
    amber: {
      card: 'border-amber-200 bg-amber-50/80',
      icon: 'bg-amber-100 text-amber-700 ring-amber-200',
      status: 'text-amber-700',
    },
    rose: {
      card: 'border-rose-200 bg-rose-50/70',
      icon: 'bg-rose-100 text-rose-700 ring-rose-200',
      status: 'text-rose-700',
    },
    slate: {
      card: 'border-slate-300 bg-slate-100/80',
      icon: 'bg-slate-200 text-slate-700 ring-slate-300',
      status: 'text-slate-700',
    },
  }
  const toneClasses = tones[tone] || tones.emerald

  return (
    <div className={`flex min-w-0 items-center gap-4 rounded-lg border px-4 py-4 shadow-sm ${toneClasses.card}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ${toneClasses.icon}`}>
        <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
          {tone === 'rose' ? <path d="M12 8v5m0 4h.01M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" /> : <path d="m5 12 4 4L19 6" />}
        </svg>
      </span>
      <div className="min-w-0 overflow-hidden">
        <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
        <p className={`mt-1 truncate text-sm font-normal ${toneClasses.status}`}>{status}</p>
      </div>
    </div>
  )
}

function SideAction({ children, tone = 'default', ...props }) {
  const tones = {
    default: 'text-slate-600 hover:border-[#67B529]/30 hover:bg-[#EEF9E8] hover:text-[#67B529]',
    primary: 'border-[#67B529] text-[#67B529] hover:bg-[#EEF9E8]',
    danger: 'text-rose-600 hover:border-rose-200 hover:bg-rose-50',
  }

  return (
    <button className={`flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black shadow-sm transition ${tones[tone]}`} type="button" {...props}>
      {children}
    </button>
  )
}

function DetailPill({ children }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-normal text-slate-600">{children}</span>
}

function SkillPill({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF9E8] px-3 py-1 text-[11px] font-normal text-[#67B529] ring-1 ring-[#67B529]/20">
      <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" viewBox="0 0 24 24">
        <path d="m20 6-11 11-5-5" />
      </svg>
      {children}
    </span>
  )
}

function DocumentVerificationPanel({
  documentCards,
  documentCompletion,
  documents,
  formatDocumentLabel,
  onRejectDocument,
  onReplaceDocument,
  onVerifyDocument,
  saving,
  verifiedDocuments,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-800">Document Verification</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">Review, approve, reject, or replace uploaded KYC files.</p>
        </div>
        <span className="inline-flex h-7 w-fit items-center rounded-full bg-[#EEF9E8] px-3 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20">
          {verifiedDocuments} of {documents.length} Verified
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#67B529]" style={{ width: `${documentCompletion}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-black text-[#67B529]">{documentCompletion}%</span>
      </div>
      <div className="mt-5 grid gap-3 min-[900px]:grid-cols-2 min-[1180px]:grid-cols-3 min-[1600px]:grid-cols-1">
        {documentCards.map((document, index) => {
          const status = document.status || 'Pending'
          const isVerified = status === 'Verified' || status === 'Approved'
          const isRejected = status === 'Rejected'
          const statusClass = isRejected
            ? 'bg-rose-50 text-rose-700 ring-rose-100'
            : isVerified
              ? 'bg-[#EEF9E8] text-[#67B529] ring-[#67B529]/20'
              : 'bg-amber-50 text-amber-700 ring-amber-100'

          return (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={document.label}>
              <div className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/20">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 24 24">
                    <path d="M6 3h9l4 4v14H6Z" />
                    <path d="M14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {document.label}
                        {document.required ? <span className="text-rose-600"> *</span> : null}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">{document.file || document.name || document.original_name || 'Document file'}</p>
                    </div>
                    <span className={`inline-flex h-6 w-fit shrink-0 items-center rounded-full px-2.5 text-[11px] font-black ring-1 ring-inset ${statusClass}`}>
                      {isVerified ? 'Approved' : status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold leading-relaxed text-slate-500">
                    {isRejected ? `Rejected: ${document.rejection_reason || 'Reason saved'}` : `${isVerified ? 'Approved' : 'Uploaded'} on ${document.date || formatValue(document.verified_at || document.uploaded_at) || 'pending review'}`}
                  </p>
                  <div className="-ml-14 mt-4 flex w-[calc(100%+3.5rem)] items-center gap-1.5">
                    {document.path ? (
                      <a
                        className="inline-flex h-8 min-w-14 items-center justify-center rounded-md border border-slate-200 px-2 text-xs font-black text-slate-600 transition hover:bg-[#EEF9E8] hover:text-[#67B529]"
                        href={getDocumentUrl(document.path)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View
                      </a>
                    ) : (
                      <button className="h-8 min-w-14 rounded-md border border-slate-200 px-2 text-xs font-black text-slate-400" disabled type="button">
                        View
                      </button>
                    )}
                    <button className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#67B529]/35 text-[#67B529] transition hover:bg-[#EEF9E8] disabled:opacity-50" disabled={saving || isVerified} onClick={() => onVerifyDocument(index)} title="Approve document" type="button">
                      <span className="sr-only">Approve document</span>
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    </button>
                    <button className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50" disabled={saving || isRejected} onClick={() => onRejectDocument(index, document)} title="Reject document" type="button">
                      <span className="sr-only">Reject document</span>
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <label className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border border-slate-200 text-[#67B529] transition hover:bg-[#EEF9E8]" title="Replace document">
                      <span className="sr-only">Replace document</span>
                      <input className="hidden" disabled={saving} onChange={(event) => onReplaceDocument({ file: event.target.files?.[0], index, label: formatDocumentLabel(document, index) })} type="file" />
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" viewBox="0 0 24 24">
                        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
                        <path d="M3 3v5h5M3 12a9 9 0 0 0 15 6.7l3-2.7" />
                        <path d="M21 21v-5h-5" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BusinessInformationSection({ partner, servicesLabel }) {
  const businessInfo = getBusinessInfo(partner, servicesLabel)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold leading-tight text-slate-800">Business Information</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Business profile, contact details, and service operations.</p>
        </div>
        <StatusBadge>{partner.status || 'Active'}</StatusBadge>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">Identity</h4>
          <div className="mt-4 grid gap-3.5">
            <BusinessField label="Business Name" value={partner.business_name || partner.name} />
            <BusinessField label="Owner Name" value={partner.name || 'Amit Kumar'} />
            <BusinessField label="Category" value={businessInfo.category} />
            <BusinessField label="Experience" value={businessInfo.experience} />
            <BusinessField label="GST Number" value={businessInfo.gstNumber} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">Contact & Location</h4>
          <div className="mt-4 grid gap-3.5">
            <BusinessField label="Phone" value={partner.phone} />
            <BusinessField label="Email" value={partner.email || 'styleathome@gmail.com'} />
            <BusinessField label="Service Area" value={businessInfo.serviceArea} />
            <BusinessField label="Pincode" value={partner.pincode || '226016'} />
            <BusinessField label="Address" value={businessInfo.address} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">About Business</h4>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{businessInfo.about}</p>
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-600">
            <div className="flex justify-between gap-4"><span>Working Hours</span><span className="text-right text-slate-800">{businessInfo.workingHours}</span></div>
            <div className="flex justify-between gap-4"><span>Service Radius</span><span className="text-right text-slate-800">{businessInfo.serviceRadius}</span></div>
            <div className="flex justify-between gap-4"><span>Languages</span><span className="text-right text-slate-800">{businessInfo.languages}</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerDetailsPage({ adminProfile, onBackHome, onTabChange, partnerId }) {
  const [partner, setPartner] = useState(null)
  const [overview, setOverview] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [membershipForm, setMembershipForm] = useState(defaultMembership())
  const [error, setError] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newDocumentLabel, setNewDocumentLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [isIdCardOpen, setIsIdCardOpen] = useState(false)

  const loadPartner = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.partnerOverview(partnerId)
      const nextPartner = response.partner || response.data?.partner || response.data || response
      setPartner(nextPartner)
      setOverview(response)
      setEditForm(
        editableFields.reduce((values, [field]) => {
          values[field] = getEditFieldValue(nextPartner, field)
          return values
        }, {}),
      )
      setMembershipForm(defaultMembership(nextPartner))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPartner()
  }, [partnerId])

  useEffect(() => {
    if (!error) return

    notify(error, { tone: 'error' })
  }, [error])

  const savePartnerDetails = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const metadataUpdates = [...metadataEditableFields].reduce((values, field) => {
        values[field] = editForm[field] || ''
        return values
      }, {})
      const editablePayload = Object.fromEntries(
        Object.entries(editForm).filter(([field]) => !metadataEditableFields.has(field)),
      )
      const payload = {
        ...partner,
        ...editablePayload,
        service_experience_years: editForm.service_experience_years ? Number(editForm.service_experience_years) : null,
        services: partner.services || [],
        documents: partner.documents || [],
        metadata: {
          ...(partner.metadata || {}),
          ...metadataUpdates,
        },
      }
      const response = await adminApi.update('/partners', partner.id, payload)
      setPartner(response.data || response)
      setIsEditing(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadDocument = async ({ file, index = null, label = '' }) => {
    if (!file || !partner?.id) return

    setSaving(true)
    setError('')
    try {
      const body = new FormData()
      body.append('document', file)
      if (index !== null) body.append('index', index)
      if (label) body.append('label', label)
      const response = await adminApi.uploadPartnerDocument(partner.id, body)
      setPartner(response.partner || response.data || response)
      setNewDocumentLabel('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const verifyDocument = async (index) => {
    setSaving(true)
    setError('')
    try {
      const response = await adminApi.verifyPartnerDocument(partner.id, index)
      setPartner(response.partner || response.data || response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const rejectDocument = async (index, document) => {
    const rejectionReason = await askTextInput({
      confirmButtonText: 'Reject document',
      inputLabel: 'Rejection reason',
      inputPlaceholder: 'Example: Document image is unclear, please upload a readable copy.',
      requiredMessage: 'Please enter a rejection reason.',
      text: `${formatDocumentLabel(document, index)} will be marked rejected.`,
      title: 'Reject document?',
      tone: 'danger',
    })

    if (!rejectionReason) return

    setSaving(true)
    setError('')
    try {
      const response = await adminApi.rejectPartnerDocument(partner.id, index, rejectionReason)
      setPartner(response.partner || response.data || response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadProfilePicture = async (file) => {
    if (!file || !partner?.id) return

    setSaving(true)
    setError('')
    try {
      const body = new FormData()
      body.append('profile_picture', file)
      const response = await adminApi.uploadPartnerProfilePicture(partner.id, body)
      setPartner(response.partner || response.data || response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const suspendVendor = async () => {
    const reason = await askTextInput({
      confirmButtonText: 'Suspend vendor',
      inputLabel: 'Suspension reason',
      inputPlaceholder: 'Example: Policy violation, pending verification, customer complaint.',
      requiredMessage: 'Please enter a suspension reason.',
      text: `${partner.name} will not be able to work until reactivated.`,
      title: 'Suspend vendor?',
      tone: 'danger',
    })
    if (!reason) return

    setSaving(true)
    setError('')
    try {
      const response = await adminApi.suspendPartner(partner.id, reason)
      setPartner(response.partner || response.data || response)
      showSuccessAlert('Vendor suspended')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const activateVendor = async () => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Activate vendor',
      text: `${partner.name} will be able to receive work again.`,
      title: 'Activate vendor?',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await adminApi.updatePartnerStatus(partner.id, 'Active')
      const response = await adminApi.updatePartnerAvailability(partner.id, 'Available')
      setPartner(response.partner || response.data || response)
      showSuccessAlert('Vendor activated')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const sendVendorMessage = async () => {
    const result = await Swal.fire({
      cancelButtonColor: '#64748b',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0054A6',
      confirmButtonText: 'Send message',
      customClass: {
        actions: 'admin-swal-actions',
        cancelButton: 'admin-swal-button admin-swal-cancel',
        confirmButton: 'admin-swal-button',
        htmlContainer: 'admin-swal-text',
        popup: 'admin-swal-popup',
        title: 'admin-swal-title',
      },
      focusConfirm: false,
      html: `
        <div class="grid gap-3 text-left">
          <label class="grid gap-1 text-xs font-bold text-slate-600">Send via
            <select id="vendor-message-channel" class="h-10 rounded-lg border border-slate-300 px-3 text-sm">
              <option value="email">Email</option>
              <option value="push">Push / vendor panel</option>
              <option value="both">Email + push</option>
            </select>
          </label>
          <label class="grid gap-1 text-xs font-bold text-slate-600">Subject
            <input id="vendor-message-title" class="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Message subject" />
          </label>
          <label class="grid gap-1 text-xs font-bold text-slate-600">Message
            <textarea id="vendor-message-body" class="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Write message for vendor"></textarea>
          </label>
        </div>
      `,
      icon: 'question',
      preConfirm: () => {
        const channel = document.getElementById('vendor-message-channel')?.value
        const title = document.getElementById('vendor-message-title')?.value?.trim()
        const message = document.getElementById('vendor-message-body')?.value?.trim()
        if (!title || !message) {
          Swal.showValidationMessage('Subject and message are required.')
          return false
        }
        return { channel, title, message }
      },
      reverseButtons: true,
      showCancelButton: true,
      title: 'Send vendor message',
    })
    if (!result.isConfirmed) return

    setSaving(true)
    setError('')
    try {
      const response = await adminApi.sendPartnerMessage(partner.id, result.value)
      setPartner(response.partner || response.data || response)
      showSuccessAlert(response.message || 'Message sent')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const loginAsVendor = async () => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Login as vendor',
      text: `${partner.name} vendor dashboard will open in this browser.`,
      title: 'Login as vendor?',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      const response = await adminApi.impersonatePartner(partner.id)
      window.localStorage.setItem('vendor_jwt', response.token)
      window.location.href = '/vendor'
    } catch (requestError) {
      setError(requestError.message)
      setSaving(false)
    }
  }

  const documents = partner?.documents || []
  const documentCards = documents.map((document, index) => ({
    label: formatDocumentLabel(document, index),
    ...document,
  }))
  const verifiedDocuments = documents.filter((document) => document.status === 'Verified').length
  const uploadedDocuments = documents.filter((document) => document.path).length
  const documentCompletion = documents.length ? Math.round((verifiedDocuments / documents.length) * 100) : 0
  const servicesLabel = Array.isArray(partner?.service_names) && partner.service_names.length
    ? partner.service_names.join(', ')
    : (Array.isArray(partner?.services) && partner.services.length ? partner.services.join(', ') : partner?.skill)
  const serviceChips = [...new Set((
    Array.isArray(partner?.service_names) && partner.service_names.length
      ? partner.service_names
      : (Array.isArray(partner?.services) && partner.services.length ? partner.services : String(partner?.skill || '').split(','))
  ).map((item) => String(item).trim()).filter(Boolean))]
  const subServiceChips = [...new Set((Array.isArray(partner?.sub_service_names) ? partner.sub_service_names : []).map((item) => String(item).trim()).filter(Boolean))]
  const skillChips = [...new Set([
    ...(Array.isArray(partner?.metadata?.skills) ? partner.metadata.skills : []),
    ...(String(partner?.metadata?.expertise || '').split(',')),
  ].map((item) => String(item).trim()).filter(Boolean))]
  const stats = overview?.stats || {}
  const recentBookings = overview?.bookings || []
  const averageRating = Number(stats.average_rating || 0)
  const reviewCount = Number(stats.customer_reviews || 0)
  const totalBookings = Number(stats.total_bookings || 0)
  const completedJobs = Number(stats.completed_jobs || 0)
  const cancelledJobs = Number(stats.cancelled_bookings || 0)
  const assignedJobs = Number(stats.jobs || 0)
  const activeBookings = Number(stats.active_bookings || 0)
  const trustScore = Number(stats.trust_score || 0)
  const completionRate = Number(stats.completion_rate || 0)
  const reviewCoverage = Number(stats.review_coverage || 0)
  const trustLabel = trustScore >= 85 ? 'Excellent' : trustScore >= 70 ? 'Good' : trustScore >= 50 ? 'Average' : totalBookings ? 'Needs attention' : 'No booking data'
  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return formatValue(value)
    return date.toLocaleString('en-IN', { day: '2-digit', hour: '2-digit', hour12: true, minute: '2-digit', month: 'short', year: 'numeric' })
  }
  const hasProfileBasics = Boolean(partner?.name && partner?.phone && partner?.email)
  const paymentIsDue = Number(stats.pending_settlement || 0) > 0
  const subscriptionStatus = partner?.metadata?.subscription_status || partner?.metadata?.subscription || 'Not configured'
  const isFeatured = Boolean(partner?.metadata?.featured || partner?.metadata?.is_featured)
  const bookingAmount = (booking) => formatMoney(booking.amount || booking.total_amount || booking.final_amount || 0)
  const profilePicture = resolvePartnerProfilePictureUrl(partner)
  const publicPath = buildVendorPublicPath(partner?.id || partnerId)
  const canEditPartner = canAccessModule(adminProfile, 'Partners', 'edit')
  const canViewPartner = canAccessModule(adminProfile, 'Partners', 'view')
  const membershipEditForm = {
    ...membershipForm,
    authorized_services_text: membershipForm.authorized_services_text ?? (membershipForm.authorized_services || []).join(', '),
  }
  const previewMembership = {
    ...membershipEditForm,
    authorized_services: String(membershipEditForm.authorized_services_text || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  }

  return (
    <AdminLayout
      activeTab="Partners"
      globalSearch={globalSearch}
      notificationState={typeof Notification === 'undefined' ? 'unsupported' : Notification.permission}
      onBackHome={onBackHome}
      onGlobalSearchChange={setGlobalSearch}
      onNotificationClick={() => {}}
      onSelectSearchRecord={(cat, rec) => onTabChange?.(cat === 'Service Packages' ? 'Service Packages' : cat === 'Bookings' ? 'Bookings' : cat === 'Customers' ? 'Customers' : cat === 'Partners' ? 'Partners' : 'Services')}
      onTabChange={onTabChange}
    >
      <div className="mx-auto grid w-full max-w-none gap-4">
        {loading && (
          <Panel title="Loading partner">
            <div className="p-5 text-sm font-bold text-slate-500">Fetching partner details...</div>
          </Panel>
        )}

        {partner && (
          <>
            <div className="grid items-start gap-5 min-[1180px]:grid-cols-[300px_minmax(0,1fr)] min-[1600px]:grid-cols-[300px_minmax(0,1fr)_380px]">
              <aside className="grid min-w-0 content-start gap-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border border-slate-200 bg-[#EEF9E8] ring-4 ring-slate-50">
                    {profilePicture ? (
                      <img alt={partner.name || 'Partner'} className="h-full w-full object-cover" src={profilePicture} />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-3xl font-black text-[#67B529]">
                        {partner.name?.slice(0, 2)?.toUpperCase() || 'PR'}
                      </span>
                    )}
                  </div>
                  <div className="-mt-3 flex justify-center">
                    <StatusBadge>{partner.availability || 'Available'}</StatusBadge>
                  </div>
                  <h2 className="mt-5 break-words text-2xl font-semibold leading-tight text-slate-800">{partner.business_name || partner.name || 'Partner'}</h2>
                  <p className="mt-2 text-sm font-normal text-slate-500">{servicesLabel || 'Service category not set'}</p>
                  <p className="mt-4 text-sm font-normal text-amber-500">★ <span className="text-slate-800">{averageRating.toFixed(2)}</span><span className="text-slate-500"> ({reviewCount} Reviews)</span></p>
                  <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm font-normal text-slate-600">
                    <div className="flex justify-between gap-3"><span>Vendor ID</span><span className="font-normal text-slate-800">VEN-{String(partner.id || partnerId).padStart(5, '0')}</span></div>
                    <div className="flex justify-between gap-3"><span>Joined on</span><span className="font-normal text-slate-800">{formatDateTime(partner.created_at)}</span></div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {canEditPartner && (
                      <>
                        <SideAction disabled={saving} tone="primary" onClick={() => setIsEditing((current) => !current)}>{isEditing ? 'Close Edit' : 'Edit Profile'}</SideAction>
                        {partner.status === 'Inactive' ? (
                          <SideAction disabled={saving} onClick={activateVendor} tone="primary">Activate Vendor</SideAction>
                        ) : (
                          <SideAction disabled={saving} onClick={suspendVendor} tone="danger">Suspend Vendor</SideAction>
                        )}
                        <SideAction disabled={saving} onClick={sendVendorMessage}>Send Message</SideAction>
                        <SideAction disabled={saving} onClick={loginAsVendor}>Login as Vendor</SideAction>
                      </>
                    )}
                    {canViewPartner && (
                      <>
                        <SideAction onClick={() => setIsIdCardOpen(true)}>View ID Card</SideAction>
                        <SideAction onClick={() => window.open(publicPath, '_blank')}>View Certificate</SideAction>
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-800">Vendor Performance</h3>
                  {[
                    ['Average Rating', `${averageRating.toFixed(2)}/5`],
                    ['Total Bookings', totalBookings],
                    ['Completion Rate', `${completionRate}%`],
                    ['Customer Reviews', reviewCount],
                  ].map(([label, value]) => (
                    <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-normal last:border-b-0 last:pb-0" key={label}>
                      <span className="text-slate-500">{label}</span>
                      <span className="font-normal text-slate-800">{value}</span>
                    </div>
                  ))}
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-800">Dues / Settlement</h3>
                  <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-xs font-normal">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-400">Total Due</p>
                      <p className="text-base font-normal text-rose-600">{formatMoney(stats.pending_settlement)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-400">Commission</p>
                      <p className="text-base font-normal text-[#67B529]">{formatMoney(stats.platform_commission)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-400">Settlement</p>
                      <p className="text-base font-normal text-slate-700">{stats.settlement_status || 'Pending'}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-800">Trust Score</h3>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-lg bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/20">
                      <svg aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M12 3 4.5 6v5.5c0 4.8 3.2 8.8 7.5 9.5 4.3-.7 7.5-4.7 7.5-9.5V6L12 3Z" />
                        <path d="m8.8 12 2.1 2.1 4.4-4.6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[#67B529]">{trustScore}/100</p>
                      <p className="text-xs font-semibold text-[#67B529]">{trustLabel}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-normal text-slate-500">Based on rating, completion rate, and customer review coverage.</p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#67B529]" style={{ width: `${trustScore}%` }} />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-800">Services & Skills</h3>
                  <div className="mt-5 grid gap-6">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">Main Services</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {serviceChips.length ? serviceChips.map((item) => (
                          <DetailPill key={item}>{item}</DetailPill>
                        )) : <span className="text-sm font-normal text-slate-500">No services added.</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">Sub-services</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {subServiceChips.length ? subServiceChips.map((item) => (
                          <DetailPill key={item}>{item}</DetailPill>
                        )) : <span className="text-sm font-normal text-slate-500">No sub-services added.</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">Skills / Expertise</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {skillChips.length ? skillChips.map((item) => (
                          <SkillPill key={item}>{item}</SkillPill>
                        )) : <span className="text-sm font-normal text-slate-500">No skills added.</span>}
                      </div>
                    </div>
                  </div>
                </section>
              </aside>

              <div className="grid min-w-0 max-w-full content-start gap-5">
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-white px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">Vendor Status Overview</h2>
                  </div>
                  <div className="bg-slate-50/50 p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1800px]:grid-cols-6">
                      <StatusSummaryItem label="Profile" status={hasProfileBasics ? 'Complete' : 'Incomplete'} tone={hasProfileBasics ? 'emerald' : 'amber'} />
                      <StatusSummaryItem label="Account" status={partner.status || 'Pending'} tone={String(partner.status || '').toLowerCase() === 'active' ? 'emerald' : 'indigo'} />
                      <StatusSummaryItem label="Documents" status={`${verifiedDocuments}/${documents.length} Verified`} tone={documents.length && verifiedDocuments === documents.length ? 'emerald' : 'amber'} />
                      <StatusSummaryItem label="Payment" status={paymentIsDue ? 'Payment Due' : 'Clear'} tone={paymentIsDue ? 'rose' : 'emerald'} />
                      <StatusSummaryItem label="Subscription" status={subscriptionStatus} tone={subscriptionStatus === 'Not configured' ? 'slate' : 'amber'} />
                      <StatusSummaryItem label="Featured" status={isFeatured ? 'Featured' : 'Not Featured'} tone={isFeatured ? 'emerald' : 'slate'} />
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1800px]:grid-cols-7">
                  <MetricTile helper="All Time" icon="wallet" label="Total Earnings" tone="blue" value={formatMoney(stats.total_earnings)} />
                  <MetricTile helper="All Time" icon="clock" label="Platform Commission" tone="indigo" value={formatMoney(stats.platform_commission)} />
                  <MetricTile helper="Due Amount" icon="shield" label="Pending Settlement" tone={paymentIsDue ? 'rose' : 'emerald'} value={formatMoney(stats.pending_settlement)} />
                  <MetricTile helper="All Time" icon="calendar" label="Total Bookings" tone="blue" value={totalBookings} />
                  <MetricTile helper="All Time" icon="briefcase" label="Assigned Jobs" tone="indigo" value={assignedJobs} />
                  <MetricTile helper={`${activeBookings} Active`} icon="check" label="Completed Jobs" tone="emerald" value={completedJobs} />
                  <MetricTile helper="All Time" icon="x" label="Cancelled Jobs" tone="rose" value={cancelledJobs} />
                </div>
                <div className="min-[1600px]:hidden">
                  <DocumentVerificationPanel
                    documentCards={documentCards}
                    documentCompletion={documentCompletion}
                    documents={documents}
                    formatDocumentLabel={formatDocumentLabel}
                    onRejectDocument={rejectDocument}
                    onReplaceDocument={uploadDocument}
                    onVerifyDocument={verifyDocument}
                    saving={saving}
                    verifiedDocuments={verifiedDocuments}
                  />
                </div>
              <div className="grid min-w-0 max-w-full gap-5">
                {isEditing && (
                  <Panel title="Edit Partner Profile" subtitle="Update profile, contact, business information, and account status.">
                    <form className="grid gap-4 p-4" onSubmit={savePartnerDetails}>
                      <div className="grid gap-4 xl:grid-cols-2">
                        {editFieldGroups.map((group) => (
                          <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4" key={group.title}>
                            <h3 className="text-sm font-black text-slate-800">{group.title}</h3>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {group.fields.map((field) => (
                                <EditField
                                  editForm={editForm}
                                  field={field}
                                  key={field}
                                  onChange={(nextField, value) => setEditForm((current) => ({ ...current, [nextField]: value }))}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <ActionButton onClick={() => setIsEditing(false)} type="button">Cancel</ActionButton>
                        <ActionButton disabled={saving} tone="primary" type="submit">{saving ? 'Saving...' : 'Save changes'}</ActionButton>
                      </div>
                    </form>
                  </Panel>
                )}

                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Bookings</h3>
                    <span className="text-xs font-normal text-slate-400">{recentBookings.length} shown</span>
                  </div>
                  {recentBookings.length ? (
                    <div className="max-w-full overflow-x-auto rounded-md">
                      <table className="w-full min-w-[640px] text-left text-sm lg:min-w-full">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-400">
                          <tr>
                            {['S.No.', 'Booking ID', 'Customer', 'Service', 'Date', 'Amount', 'Status'].map((heading) => <th className="px-4 py-3 first:rounded-l-md last:rounded-r-md" key={heading}>{heading}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-600">
                          {recentBookings.map((booking, index) => (
                            <tr className="hover:bg-slate-50" key={booking.id || booking.booking_no}>
                              <td className="px-4 py-3.5 font-extrabold text-slate-500">{index + 1}</td>
                              <td className="px-4 py-3.5">{booking.booking_no || `#${booking.id}`}</td>
                              <td className="px-4 py-3.5">{booking.customer_name || '-'}</td>
                              <td className="px-4 py-3.5">{booking.service_name || '-'}</td>
                              <td className="px-4 py-3.5">{formatDateTime(booking.scheduled_at)}</td>
                              <td className="px-4 py-3.5">{bookingAmount(booking)}</td>
                              <td className="px-4 py-3.5"><StatusBadge>{booking.status || 'Pending'}</StatusBadge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-normal text-slate-500">
                      No bookings found for this vendor.
                    </div>
                  )}
                </section>

                <BusinessInformationSection partner={partner} servicesLabel={servicesLabel} />

              </div>
              </div>

              <aside className="hidden min-w-0 max-w-full content-start gap-5 min-[1600px]:grid">
                <DocumentVerificationPanel
                  documentCards={documentCards}
                  documentCompletion={documentCompletion}
                  documents={documents}
                  formatDocumentLabel={formatDocumentLabel}
                  onRejectDocument={rejectDocument}
                  onReplaceDocument={uploadDocument}
                  onVerifyDocument={verifyDocument}
                  saving={saving}
                  verifiedDocuments={verifiedDocuments}
                />

              </aside>
            </div>
          </>
        )}
      </div>
      {isIdCardOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-black text-slate-800">Vendor ID Card</h3>
              <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" onClick={() => setIsIdCardOpen(false)} title="Close" type="button">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <IdentityCard membership={previewMembership} partner={partner} profilePicture={profilePicture} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default PartnerDetailsPage

