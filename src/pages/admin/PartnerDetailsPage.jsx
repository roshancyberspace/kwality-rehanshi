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
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
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
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
      <span className={`mb-3 grid h-8 w-8 place-items-center rounded-lg ${tones[tone] || tones.indigo}`}>
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
          {icons[icon] || icons.wallet}
        </svg>
      </span>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold leading-6 text-slate-800">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{helper}</p>
    </article>
  )
}

function BusinessField({ label, value, extra }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold leading-relaxed text-slate-800">
        {value || '—'} {extra && <span className="mx-1 text-[10px] font-normal text-slate-500">{extra}</span>}
      </div>
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
    emerald: 'text-[#2F6412]',
    indigo: 'text-[#003F86]',
    amber: 'text-amber-800',
    rose: 'text-rose-700',
    slate: 'text-slate-600',
  }

  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${tones[tone] || tones.emerald}`}>{status}</p>
    </div>
  )
}

function SideAction({ children, tone = 'default', ...props }) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    primary: 'border-[#67B529] bg-[#67B529] text-white hover:bg-[#5aa324]',
    danger: 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
  }

  return (
    <button className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${tones[tone]}`} type="button" {...props}>
      {children}
    </button>
  )
}

function DetailPill({ children }) {
  return <span className="rounded-full bg-[#EEF4FB] px-3 py-1 text-[11px] font-semibold text-[#003F86]">{children}</span>
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

function DocumentTypeIcon({ label }) {
  const key = String(label || '').toLowerCase()
  let paths = (
    <>
      <path d="M6 3h9l4 4v14H6Z" />
      <path d="M14 3v5h5" />
    </>
  )

  if (key.includes('profile') || key.includes('photo') || key.includes('avatar')) {
    paths = (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </>
    )
  } else if (key.includes('aadhaar') || key.includes('pan') || key.includes('id')) {
    paths = (
      <>
        <rect height="14" rx="2" width="18" x="3" y="5" />
        <circle cx="9" cy="12" r="2" />
        <path d="M14 10h4M14 14h4" />
      </>
    )
  } else if (key.includes('address') || key.includes('pincode') || key.includes('location')) {
    paths = (
      <>
        <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    )
  } else if (key.includes('license') || key.includes('electrical')) {
    paths = (
      <>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </>
    )
  } else if (key.includes('certificate') || key.includes('technical')) {
    paths = (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="m9 12 3 9 3-9" />
      </>
    )
  } else if (key.includes('experience') || key.includes('work')) {
    paths = (
      <>
        <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
        <path d="M4 7h16v12H4Z" />
      </>
    )
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      {paths}
    </svg>
  )
}

function DocumentVerificationPanel({ documentCards }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
      <h3 className="text-lg font-bold text-slate-800">Documents</h3>
      {documentCards.length ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {documentCards.map((document) => {
            const isVerified = document.status === 'Verified' || document.status === 'Approved'
            return (
              <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_3.5rem]" key={document.label}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EEF4FB] text-[#003F86]">
                  <DocumentTypeIcon label={document.label} />
                </span>
                <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{document.label}</p>
                <div className="justify-self-start sm:justify-self-center">
                  <StatusBadge>{isVerified ? 'Verified' : 'Not Verified'}</StatusBadge>
                </div>
                {document.path ? (
                  <a className="justify-self-end text-sm font-semibold text-[#003F86] hover:underline" href={getDocumentUrl(document.path)} rel="noreferrer" target="_blank">
                    View
                  </a>
                ) : (
                  <span className="justify-self-end text-sm text-slate-400">—</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>
      )}
    </section>
  )
}

function BusinessInformationSection({ partner, servicesLabel, formatDateTime }) {
  const businessInfo = getBusinessInfo(partner, servicesLabel)
  const kycReason = partner.kyc_rejected_reason || partner.metadata?.kyc_rejected_reason
  const kycStatus = partner.kyc_status || (partner.kyc_verified_at ? 'Approved' : '')

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
      <h3 className="text-lg font-bold text-slate-800">Business Information</h3>
      {businessInfo.about ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{businessInfo.about}</p>
      ) : null}
      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <BusinessField label="Business Name" value={partner.business_name || partner.name} />
        <BusinessField label="Category" value={businessInfo.category} />
        <BusinessField label="Owner Name" value={partner.name} />
        <BusinessField label="Phone" value={partner.phone} />
        <BusinessField label="Email" value={partner.email} />
        <BusinessField label="Pincode" value={partner.pincode} />
        <BusinessField label="Service Radius" value={businessInfo.serviceRadius} />
        <BusinessField label="KYC Submitted" value={partner.kyc_submitted_at ? formatDateTime(partner.kyc_submitted_at) : ''} />
        <BusinessField label="Service Area" value={businessInfo.serviceArea} />
        <BusinessField label="City" value={partner.city} />
        <BusinessField label="Address" value={businessInfo.address} />
        <BusinessField label="Working Hours" value={businessInfo.workingHours} />
        <BusinessField label="Languages" value={businessInfo.languages} />
        <BusinessField label="KYC Status" extra={partner.kyc_verified_at ? formatDateTime(partner.kyc_verified_at) : ''} value={kycStatus ? <StatusBadge>{kycStatus === 'Verified' ? 'Approved' : kycStatus} </StatusBadge> : ''} />
       
        {kycReason ? <BusinessField label="KYC Rejection Reason" value={kycReason} /> : null}
      </div>
    </section>
  )
}

function PartnerDetailsPage({ adminProfile, onBackHome, onOpenPartnerEdit, onTabChange, partnerId }) {
  const [partner, setPartner] = useState(null)
  const [overview, setOverview] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [membershipForm, setMembershipForm] = useState(defaultMembership())
  const [error, setError] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
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
        popup: 'admin-swal-popup admin-swal-popup-form',
        title: 'admin-swal-title',
      },
      focusConfirm: false,
      html: `
        <p class="mb-4 text-left text-sm font-medium text-slate-500">Send a message to ${partner.name || 'this vendor'}.</p>
        <div class="grid gap-4 text-left">
          <label class="block">
            <span class="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Send via</span>
            <select id="vendor-message-channel" class="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
              <option value="email">Email</option>
              <option value="push">Push / vendor panel</option>
              <option value="both">Email + push</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Subject</span>
            <input id="vendor-message-title" class="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800" placeholder="Message subject" type="text" />
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Message</span>
            <textarea id="vendor-message-body" class="min-h-28 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800" placeholder="Write message for vendor"></textarea>
          </label>
        </div>
      `,
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
  const trustLabel = trustScore >= 85 ? 'Excellent' : trustScore >= 70 ? 'Good' : trustScore >= 50 ? 'Average' : totalBookings ? 'Needs attention' : 'No booking data'
  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return formatValue(value)
    return date.toLocaleString('en-IN', { day: '2-digit', hour: '2-digit', hour12: true, minute: '2-digit', month: 'short', year: 'numeric' })
  }
  const hasProfileBasics = Boolean(partner?.name && partner?.phone && partner?.email)
  const isProfileVerified = Boolean(
    partner?.kyc_verified_at
    || ['verified', 'approved'].includes(String(partner?.kyc_status || '').toLowerCase())
    || (documents.length > 0 && verifiedDocuments === documents.length),
  )
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
      <div className="mx-auto grid w-full max-w-none gap-5">
        {loading && (
          <Panel title="Loading partner">
            <div className="p-5 text-sm font-bold text-slate-500">Fetching partner details...</div>
          </Panel>
        )}

        {partner && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-[#EEF9E8]">
                    {profilePicture ? (
                      <img alt={partner.name || 'Partner'} className="h-full w-full object-cover" src={profilePicture} />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-lg font-black text-[#67B529]">
                        {partner.name?.slice(0, 2)?.toUpperCase() || 'PR'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold leading-snug text-slate-900">
                      <span>{partner.business_name || partner.name || 'Partner'}</span>
                      {isProfileVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF9E8] px-2 py-0.5 text-[11px] font-bold text-[#67B529] ring-1 ring-[#67B529]/25">
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 11.94 7.28 10.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z" fillRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      ) : null}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      {partner.name && partner.business_name && partner.name !== partner.business_name ? `${partner.name} • ` : ''}
                      {servicesLabel || 'Service category not set'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge>{partner.availability || 'Available'}</StatusBadge>
                      <StatusBadge>{partner.status || 'Pending'}</StatusBadge>
                      <span className="text-sm font-semibold text-slate-700">★ {averageRating.toFixed(2)}</span>
                      <span className="text-sm text-slate-400">VEN-{String(partner.id || partnerId).padStart(5, '0')}</span>
                      <span className="text-sm text-slate-400">Joined {formatDateTime(partner.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  {canEditPartner && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <SideAction
                        disabled={saving}
                        tone="primary"
                        onClick={() => {
                          if (onOpenPartnerEdit) {
                            onOpenPartnerEdit(partner.id)
                            return
                          }
                          setIsEditing((current) => !current)
                        }}
                      >
                        {onOpenPartnerEdit ? 'Edit Partner' : (isEditing ? 'Close Edit' : 'Edit Profile')}
                      </SideAction>
                      {partner.status === 'Inactive' ? (
                        <SideAction disabled={saving} onClick={activateVendor} tone="primary">Activate Vendor</SideAction>
                      ) : (
                        <SideAction disabled={saving} onClick={suspendVendor} tone="danger">Suspend Vendor</SideAction>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {canEditPartner && (
                      <>
                        <SideAction disabled={saving} onClick={loginAsVendor}>Log in as Vendor</SideAction>
                        <SideAction disabled={saving} onClick={sendVendorMessage}>Send Message</SideAction>
                      </>
                    )}
                    {canViewPartner && (
                      <>
                        <SideAction onClick={() => setIsIdCardOpen(true)}>View ID Card</SideAction>
                        <SideAction onClick={() => window.open(publicPath, '_blank')}>View Certificate</SideAction>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)] sm:grid-cols-3 xl:grid-cols-6">
              <StatusSummaryItem label="Profile" status={hasProfileBasics ? 'Complete' : 'Incomplete'} tone={hasProfileBasics ? 'emerald' : 'amber'} />
              <StatusSummaryItem label="Account" status={partner.status || 'Pending'} tone={String(partner.status || '').toLowerCase() === 'active' ? 'emerald' : 'indigo'} />
              <StatusSummaryItem label="Documents" status={`${verifiedDocuments}/${documents.length} Verified`} tone={documents.length && verifiedDocuments === documents.length ? 'emerald' : 'amber'} />
              <StatusSummaryItem label="Payment" status={paymentIsDue ? 'Payment Due' : 'Clear'} tone={paymentIsDue ? 'rose' : 'emerald'} />
              <StatusSummaryItem label="Subscription" status={subscriptionStatus} tone={subscriptionStatus === 'Not configured' ? 'slate' : 'amber'} />
              <StatusSummaryItem label="Featured" status={isFeatured ? 'Featured' : 'Not Featured'} tone={isFeatured ? 'emerald' : 'slate'} />
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
              <MetricTile helper="All Time" icon="wallet" label="Total Earnings" tone="blue" value={formatMoney(stats.total_earnings)} />
              <MetricTile helper="All Time" icon="clock" label="Platform Commission" tone="indigo" value={formatMoney(stats.platform_commission)} />
              <MetricTile helper="Due Amount" icon="shield" label="Pending Settlement" tone={paymentIsDue ? 'rose' : 'emerald'} value={formatMoney(stats.pending_settlement)} />
              <MetricTile helper="All Time" icon="calendar" label="Total Bookings" tone="blue" value={totalBookings} />
              <MetricTile helper="All Time" icon="briefcase" label="Assigned Jobs" tone="indigo" value={assignedJobs} />
              <MetricTile helper={`${activeBookings} Active`} icon="check" label="Completed Jobs" tone="emerald" value={completedJobs} />
              <MetricTile helper="All Time" icon="x" label="Cancelled Jobs" tone="rose" value={cancelledJobs} />
            </div>

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

            <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
              <aside className="grid min-w-0 content-start gap-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
                  <h3 className="text-base font-bold text-slate-800">Trust & Performance</h3>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/20">
                      <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M12 3 4.5 6v5.5c0 4.8 3.2 8.8 7.5 9.5 4.3-.7 7.5-4.7 7.5-9.5V6L12 3Z" />
                        <path d="m8.8 12 2.1 2.1 4.4-4.6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#67B529]">{trustScore}/100</p>
                      <p className="text-xs font-semibold text-[#67B529]">{trustLabel}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#67B529]" style={{ width: `${trustScore}%` }} />
                  </div>
                  <div className="mt-4 grid gap-2.5 border-t border-slate-100 pt-4 text-sm">
                    {[
                      ['Average Rating', `${averageRating.toFixed(2)}/5`],
                      ['Completion Rate', `${completionRate}%`],
                      ['Customer Reviews', reviewCount],
                      ['Total Bookings', totalBookings],
                    ].map(([label, value]) => (
                      <div className="flex items-center justify-between gap-3" key={label}>
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
                  <h3 className="text-base font-bold text-slate-800">Due / Settlement</h3>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-500">Total Due</p>
                      <p className="font-bold text-rose-600">{formatMoney(stats.pending_settlement)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-500">Commission</p>
                      <p className="font-bold text-[#67B529]">{formatMoney(stats.platform_commission)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-slate-500">Settlement</p>
                      <p className="font-semibold text-slate-800">{stats.settlement_status || 'Pending'}</p>
                    </div>
                  </div>
                </section>
              </aside>

              <BusinessInformationSection formatDateTime={formatDateTime} partner={partner} servicesLabel={servicesLabel} />

              <aside className="grid min-w-0 content-start gap-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
                  <h3 className="text-base font-bold text-slate-800">Services & Skills</h3>
                  <div className="mt-4 grid gap-5">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Main Service</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {serviceChips.length ? serviceChips.map((item) => (
                          <DetailPill key={item}>{item}</DetailPill>
                        )) : <span className="text-sm text-slate-500">No services added.</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sub Services</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {subServiceChips.length ? subServiceChips.map((item) => (
                          <DetailPill key={item}>{item}</DetailPill>
                        )) : <span className="text-sm text-slate-500">No sub-services added.</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Skills / Expertise</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {skillChips.length ? skillChips.map((item) => (
                          <SkillPill key={item}>{item}</SkillPill>
                        )) : <span className="text-sm text-slate-500">No skills added.</span>}
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <DocumentVerificationPanel documentCards={documentCards} />

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-[#67B529]/50 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800">Recent Bookings</h3>
                <button className="text-sm font-semibold text-[#003F86] hover:underline" onClick={() => onTabChange?.('Bookings')} type="button">
                  View All Bookings
                </button>
              </div>
              {recentBookings.length ? (
                <div className="max-w-full overflow-x-auto rounded-xl">
                  <table className="w-full min-w-[640px] text-left text-sm lg:min-w-full">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <tr>
                        {['S.No.', 'Booking ID', 'Customer', 'Service', 'Date', 'Amount', 'Status'].map((heading) => <th className="px-4 py-3 first:rounded-l-md last:rounded-r-md" key={heading}>{heading}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                      {recentBookings.map((booking, index) => (
                        <tr className="hover:bg-slate-50" key={booking.id || booking.booking_no}>
                          <td className="px-4 py-3.5 font-bold text-slate-500">{index + 1}</td>
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
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No bookings found for this vendor.
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {isIdCardOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 backdrop-blur-md p-4 animate-modal-fade">
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

