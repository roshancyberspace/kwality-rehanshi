import { useEffect, useMemo, useState } from 'react'
import { ActionButton, Panel } from '../../components/admin/AdminUI'
import { buildDocumentUrl } from '../../config/urls'
import { adminApi } from '../../services/adminApi'
import { notify } from '../../utils/feedback'
import AdminLayout from './components/AdminLayout'
import { readRows } from './utils/formatters'
import { canAccessModule } from './utils/permissions'

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'services', label: 'Services' },
  { id: 'location', label: 'Location & Pincodes' },
  { id: 'account', label: 'Account & KYC' },
  { id: 'bank', label: 'Bank Details' },
  { id: 'documents', label: 'Documents' },
]

const emptyForm = () => ({
  name: '',
  business_name: '',
  phone: '',
  email: '',
  alternate_phone: '',
  skill: '',
  service_experience_years: '',
  services_text: '',
  service_ids: [],
  sub_service_ids: [],
  area: '',
  city: '',
  pincode: '',
  address_line: '',
  serviceable_pincodes_text: '',
  gst_number: '',
  business_about: '',
  working_hours: '',
  service_radius: '',
  languages: '',
  availability: 'Available',
  status: 'Active',
  kyc_status: 'Pending',
  kyc_rejected_reason: '',
  commission_percentage: '',
  rating: '',
  bank_name: '',
  bank_branch_name: '',
  bank_account_holder: '',
  bank_account_number: '',
  bank_account_type: '',
  bank_ifsc: '',
})

const parsePincodeList = (value) => String(value || '')
  .split(/[\n,]+/)
  .map((item) => item.replace(/\D+/g, '').trim())
  .filter(Boolean)

const parseTags = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const toIdList = (value) => (Array.isArray(value) ? value : [])
  .map((item) => Number(item))
  .filter((item) => Number.isFinite(item) && item > 0)

function Field({ children, hint, label, required }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}{required ? <span className="text-rose-500"> *</span> : null}
        {hint ? <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">({hint})</span> : null}
      </span>
      {children}
    </label>
  )
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#67B529]'
const textareaClass = 'min-h-[72px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#67B529]'

const DOCUMENT_PRESETS = [
  { key: 'profile', match: /profile/, title: 'Profile Photo', description: 'Your profile photograph', tone: 'violet', icon: 'User' },
  { key: 'aadhaar', match: /aadhaar|aadhar/, title: 'Aadhaar', description: 'Aadhaar card document', tone: 'sky', icon: 'Id' },
  { key: 'pan', match: /\bpan\b/, title: 'PAN', description: 'PAN card document', tone: 'orange', icon: 'Card' },
  { key: 'address', match: /address/, title: 'Address Proof', description: 'Utility bill or address proof', tone: 'emerald', icon: 'Home' },
  { key: 'police', match: /police/, title: 'Police Verification Certificate', description: 'Police verification document', tone: 'violet', icon: 'Shield' },
  { key: 'experience', match: /experience|work/, title: 'Work Experience Proof', description: 'Experience letter or certificate', tone: 'rose', icon: 'Briefcase' },
]

const DOCUMENT_TONES = {
  violet: { wrap: 'bg-violet-100 text-violet-600', icon: 'User' },
  sky: { wrap: 'bg-sky-100 text-sky-600', icon: 'Id' },
  orange: { wrap: 'bg-orange-100 text-orange-500', icon: 'Card' },
  emerald: { wrap: 'bg-emerald-100 text-emerald-600', icon: 'Home' },
  rose: { wrap: 'bg-rose-100 text-rose-500', icon: 'Briefcase' },
  slate: { wrap: 'bg-slate-100 text-slate-500', icon: 'File' },
}

function DocumentIcon({ name }) {
  const className = 'h-4 w-4'
  if (name === 'User') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    )
  }
  if (name === 'Id') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <circle cx="8" cy="10" r="2" />
        <path d="M14 10h4M14 14h4M6 14h4" />
      </svg>
    )
  }
  if (name === 'Card') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="14" rx="2" width="20" x="2" y="5" />
        <path d="M2 10h20" />
      </svg>
    )
  }
  if (name === 'Home') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    )
  }
  if (name === 'Shield') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }
  if (name === 'Briefcase') {
    return (
      <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="14" rx="2" width="18" x="3" y="7" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function documentMeta(label = '', preset = null) {
  const resolved = preset || DOCUMENT_PRESETS.find((item) => item.match.test(String(label).toLowerCase()))
  if (resolved) {
    const tone = DOCUMENT_TONES[resolved.tone] || DOCUMENT_TONES.violet
    return {
      title: resolved.title,
      description: resolved.description,
      wrap: tone.wrap,
      icon: resolved.icon || tone.icon,
    }
  }
  return {
    title: label || 'Document',
    description: 'Uploaded partner document',
    wrap: DOCUMENT_TONES.slate.wrap,
    icon: 'File',
  }
}

function buildDocumentCards(documents = []) {
  const list = Array.isArray(documents) ? documents : []
  const used = new Set()
  const cards = DOCUMENT_PRESETS.map((preset) => {
    const index = list.findIndex((doc, i) => {
      if (used.has(i)) return false
      const label = String(doc.label || doc.name || doc.type || '').toLowerCase()
      return preset.match.test(label)
    })
    if (index >= 0) used.add(index)
    return {
      preset,
      document: index >= 0 ? list[index] : {},
      index: index >= 0 ? index : null,
      label: preset.title,
    }
  })
  list.forEach((document, index) => {
    if (used.has(index)) return
    cards.push({
      preset: null,
      document,
      index,
      label: document.label || document.name || document.type || `Document ${index + 1}`,
    })
  })
  return cards
}

function PartnerEditPage({
  adminProfile,
  onBackAdmin,
  onBackHome,
  onLogout,
  onOpenPartnerDetails,
  onTabChange,
  partnerId,
}) {
  const [activeSection, setActiveSection] = useState('basic')
  const [form, setForm] = useState(emptyForm)
  const [partner, setPartner] = useState(null)
  const [services, setServices] = useState([])
  const [subServices, setSubServices] = useState([])
  const [serviceQuery, setServiceQuery] = useState('')
  const [subServiceQuery, setSubServiceQuery] = useState('')
  const [newDocumentLabel, setNewDocumentLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canEdit = canAccessModule(adminProfile, 'Partners', 'edit')

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const toggleId = (field, id) => {
    const numericId = Number(id)
    setForm((current) => {
      const list = toIdList(current[field])
      const next = list.includes(numericId)
        ? list.filter((item) => item !== numericId)
        : [...list, numericId]
      return { ...current, [field]: next }
    })
  }

  const hydrateForm = (record) => {
    const metadata = record?.metadata || {}
    setForm({
      ...emptyForm(),
      name: record?.name || '',
      business_name: record?.business_name || '',
      phone: record?.phone || '',
      email: record?.email || '',
      alternate_phone: record?.alternate_phone || '',
      skill: record?.skill || '',
      service_experience_years: record?.service_experience_years ?? '',
      services_text: Array.isArray(record?.services) ? record.services.join(', ') : (record?.services || ''),
      service_ids: toIdList(record?.service_ids),
      sub_service_ids: toIdList(record?.sub_service_ids),
      area: record?.area || '',
      city: record?.city || '',
      pincode: record?.pincode || '',
      address_line: record?.address_line || '',
      serviceable_pincodes_text: Array.isArray(record?.serviceable_pincodes)
        ? record.serviceable_pincodes.join(', ')
        : '',
      gst_number: metadata.gst_number || '',
      business_about: metadata.business_about || '',
      working_hours: metadata.working_hours || '',
      service_radius: metadata.service_radius || '',
      languages: metadata.languages || '',
      availability: record?.availability || 'Available',
      status: record?.status || 'Active',
      kyc_status: record?.kyc_status || 'Pending',
      kyc_rejected_reason: record?.kyc_rejected_reason || '',
      commission_percentage: record?.commission_percentage ?? '',
      rating: record?.rating ?? '',
      bank_name: record?.bank_name || '',
      bank_branch_name: record?.bank_branch_name || '',
      bank_account_holder: record?.bank_account_holder || '',
      bank_account_number: record?.bank_account_number || '',
      bank_account_type: record?.bank_account_type || '',
      bank_ifsc: record?.bank_ifsc || '',
    })
  }

  const loadPage = async () => {
    setLoading(true)
    setError('')
    try {
      const [overview, servicesPayload, subServicesPayload] = await Promise.all([
        adminApi.partnerOverview(partnerId),
        adminApi.list('/services', { per_page: 'all', all: 1, lite: 1, options: 1, limit: 500 }),
        adminApi.list('/sub-services', { per_page: 'all', all: 1, lite: 1, options: 1, limit: 1000 }),
      ])
      const nextPartner = overview.partner || overview.data?.partner || overview.data || overview
      setPartner(nextPartner)
      hydrateForm(nextPartner)
      setServices(readRows(servicesPayload))
      setSubServices(readRows(subServicesPayload))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
  }, [partnerId])

  useEffect(() => {
    if (!error) return undefined
    notify(error, { tone: 'error' })
    return undefined
  }, [error])

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
      const saved = response.partner || response.data || response
      setPartner(saved)
      setNewDocumentLabel('')
      notify('Document uploaded', { tone: 'success' })
    } catch (requestError) {
      setError(requestError.message || 'Unable to upload document.')
    } finally {
      setSaving(false)
    }
  }

  const filteredServices = useMemo(() => {
    const needle = serviceQuery.trim().toLowerCase()
    if (!needle) return services
    return services.filter((item) => String(item.name || '').toLowerCase().includes(needle))
  }, [serviceQuery, services])

  const documentCards = useMemo(() => buildDocumentCards(partner?.documents), [partner?.documents])

  const filteredSubServices = useMemo(() => {
    const selectedServices = toIdList(form.service_ids)
    const scoped = selectedServices.length
      ? subServices.filter((item) => selectedServices.includes(Number(item.service_id)))
      : subServices
    const needle = subServiceQuery.trim().toLowerCase()
    if (!needle) return scoped
    return scoped.filter((item) => String(item.name || '').toLowerCase().includes(needle))
  }, [form.service_ids, subServiceQuery, subServices])

  const savePartner = async (event) => {
    event.preventDefault()
    if (!canEdit || !partner?.id) return
    if (!String(form.name || '').trim()) {
      setError('Partner name is required.')
      setActiveSection('basic')
      return
    }

    setSaving(true)
    setError('')
    try {
      const serviceablePincodes = parsePincodeList(form.serviceable_pincodes_text)
      const payload = {
        name: String(form.name || '').trim(),
        business_name: form.business_name || '',
        phone: form.phone || '',
        email: form.email || '',
        alternate_phone: form.alternate_phone || '',
        skill: form.skill || '',
        service_experience_years: form.service_experience_years === '' ? null : Number(form.service_experience_years),
        services: parseTags(form.services_text),
        service_ids: toIdList(form.service_ids),
        sub_service_ids: toIdList(form.sub_service_ids),
        area: form.area || '',
        city: form.city || '',
        pincode: form.pincode || '',
        address_line: form.address_line || '',
        serviceable_pincodes: serviceablePincodes,
        availability: form.availability || 'Available',
        status: form.status || 'Active',
        kyc_status: form.kyc_status || 'Pending',
        kyc_rejected_reason: form.kyc_rejected_reason || '',
        commission_percentage: form.commission_percentage === '' ? null : Number(form.commission_percentage),
        rating: form.rating === '' ? null : Number(form.rating),
        bank_name: form.bank_name || '',
        bank_branch_name: form.bank_branch_name || '',
        bank_account_holder: form.bank_account_holder || '',
        bank_account_number: form.bank_account_number || '',
        bank_account_type: form.bank_account_type || '',
        bank_ifsc: form.bank_ifsc || '',
        documents: partner.documents || [],
        metadata: {
          ...(partner.metadata || {}),
          gst_number: form.gst_number || '',
          business_about: form.business_about || '',
          working_hours: form.working_hours || '',
          service_radius: form.service_radius || '',
          languages: form.languages || '',
        },
      }

      const response = await adminApi.update('/partners', partner.id, payload)
      const saved = response.data || response
      setPartner(saved)
      hydrateForm(saved)
      notify('Partner updated successfully', { tone: 'success' })
    } catch (requestError) {
      setError(requestError.message || 'Unable to save partner.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout
      activeTab="Partners"
      adminProfile={adminProfile}
      globalSearch=""
      onBackHome={onBackHome}
      onGlobalSearchChange={() => {}}
      onLogout={onLogout}
      onSelectSearchRecord={() => {}}
      onTabChange={(tab) => {
        if (tab === 'Partners') {
          onBackAdmin?.()
          return
        }
        onTabChange?.(tab)
      }}
    >
      <div className="mx-auto w-full max-w-none space-y-3 px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              {partner?.name || 'Loading…'}
            </h1>
            {partner?.business_name ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">{partner.business_name}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => onBackAdmin?.()} size="sm">Back to list</ActionButton>
            <ActionButton disabled={saving || !canEdit || loading} onClick={savePartner} size="sm" tone="primary">
              {saving ? 'Saving…' : 'Save changes'}
            </ActionButton>
          </div>
        </div>

        {!canEdit ? (
          <Panel>
            <div className="p-5 text-sm font-semibold text-rose-600">You do not have permission to edit partners.</div>
          </Panel>
        ) : null}

        {loading ? (
          <Panel>
            <div className="grid min-h-[240px] place-items-center p-8 text-sm font-semibold text-slate-500">Loading partner…</div>
          </Panel>
        ) : (
          <form className="space-y-3" onSubmit={savePartner}>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
              {TABS.map((tab) => (
                <button
                  className={`rounded-lg px-4 py-2 text-xs font-black  tracking-wide transition ${
                    activeSection === tab.id
                      ? 'bg-[#67B529] text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Panel>
              <div className="grid gap-3 p-3 sm:p-4">
                {activeSection === 'basic' ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Partner name" required>
                        <input className={inputClass} onChange={(event) => updateField('name', event.target.value)} required value={form.name} />
                      </Field>
                      <Field label="Business name">
                        <input className={inputClass} onChange={(event) => updateField('business_name', event.target.value)} value={form.business_name} />
                      </Field>
                      <Field label="Phone">
                        <input className={inputClass} onChange={(event) => updateField('phone', event.target.value)} value={form.phone} />
                      </Field>
                      <Field label="Alternate phone">
                        <input className={inputClass} onChange={(event) => updateField('alternate_phone', event.target.value)} value={form.alternate_phone} />
                      </Field>
                      <Field label="Email">
                        <input className={inputClass} onChange={(event) => updateField('email', event.target.value)} type="email" value={form.email} />
                      </Field>
                      <Field label="Skill">
                        <input className={inputClass} onChange={(event) => updateField('skill', event.target.value)} value={form.skill} />
                      </Field>
                      <Field label="Experience (years)">
                        <input className={inputClass} min="0" onChange={(event) => updateField('service_experience_years', event.target.value)} type="number" value={form.service_experience_years} />
                      </Field>
                      <Field label="GST number">
                        <input className={inputClass} onChange={(event) => updateField('gst_number', event.target.value)} value={form.gst_number} />
                      </Field>
                      <Field label="Working hours">
                        <input className={inputClass} onChange={(event) => updateField('working_hours', event.target.value)} value={form.working_hours} />
                      </Field>
                      <Field label="Languages">
                        <input className={inputClass} onChange={(event) => updateField('languages', event.target.value)} placeholder="Hindi, English" value={form.languages} />
                      </Field>
                    </div>
                    <Field label="About business">
                      <textarea className={textareaClass} onChange={(event) => updateField('business_about', event.target.value)} value={form.business_about} />
                    </Field>
                  </>
                ) : null}

                {activeSection === 'services' ? (
                  <>
                    <Field hint="comma separated" label="Service names (tags)">
                      <input className={inputClass} onChange={(event) => updateField('services_text', event.target.value)} placeholder="Cleaning, Salon" value={form.services_text} />
                    </Field>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-black text-slate-800">Services · {form.service_ids.length} selected</p>
                          <input
                            className="h-9 w-44 rounded-md border border-slate-300 px-2 text-xs font-semibold outline-none focus:border-[#67B529]"
                            onChange={(event) => setServiceQuery(event.target.value)}
                            placeholder="Search services…"
                            value={serviceQuery}
                          />
                        </div>
                        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                          {filteredServices.map((service) => {
                            const checked = form.service_ids.includes(Number(service.id))
                            return (
                              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50" key={service.id}>
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <input checked={checked} onChange={() => toggleId('service_ids', service.id)} type="checkbox" />
                                  {service.name}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400">ID: {service.id}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-black text-slate-800">Sub-services · {form.sub_service_ids.length} selected</p>
                          <input
                            className="h-9 w-44 rounded-md border border-slate-300 px-2 text-xs font-semibold outline-none focus:border-[#67B529]"
                            onChange={(event) => setSubServiceQuery(event.target.value)}
                            placeholder="Search sub-services…"
                            value={subServiceQuery}
                          />
                        </div>
                        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                          {filteredSubServices.map((item) => {
                            const checked = form.sub_service_ids.includes(Number(item.id))
                            return (
                              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50" key={item.id}>
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <input checked={checked} onChange={() => toggleId('sub_service_ids', item.id)} type="checkbox" />
                                  {item.name}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400">ID: {item.id}</span>
                              </label>
                            )
                          })}
                          {!filteredSubServices.length ? (
                            <p className="px-2 py-6 text-center text-xs font-semibold text-slate-400">
                              {form.service_ids.length ? 'No sub-services for selected services.' : 'Select services first to narrow this list.'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {activeSection === 'location' ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Area">
                        <input className={inputClass} onChange={(event) => updateField('area', event.target.value)} value={form.area} />
                      </Field>
                      <Field label="City">
                        <input className={inputClass} onChange={(event) => updateField('city', event.target.value)} value={form.city} />
                      </Field>
                      <Field hint="Primary / home pincode" label="Primary pincode">
                        <input className={inputClass} onChange={(event) => updateField('pincode', event.target.value)} value={form.pincode} />
                      </Field>
                      <Field label="Service radius">
                        <input className={inputClass} onChange={(event) => updateField('service_radius', event.target.value)} placeholder="e.g. 10 km" value={form.service_radius} />
                      </Field>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Business address">
                        <textarea className={textareaClass} onChange={(event) => updateField('address_line', event.target.value)} value={form.address_line} />
                      </Field>
                      <Field
                        hint="comma or new-line separated"
                        label="Serviceable pincodes"
                      >
                        <textarea
                          className={`${textareaClass} font-mono text-[13px]`}
                          onChange={(event) => updateField('serviceable_pincodes_text', event.target.value)}
                          placeholder="226001, 226002, 226010"
                          value={form.serviceable_pincodes_text}
                        />
                        {parsePincodeList(form.serviceable_pincodes_text).length ? (
                          <p className="text-xs font-bold text-slate-500">
                            {parsePincodeList(form.serviceable_pincodes_text).length} pincode(s) will be saved:
                            {' '}
                            [{parsePincodeList(form.serviceable_pincodes_text).join(', ')}]
                          </p>
                        ) : null}
                      </Field>
                    </div>
                  </>
                ) : null}

                {activeSection === 'account' ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Availability">
                        <select className={inputClass} onChange={(event) => updateField('availability', event.target.value)} value={form.availability}>
                          {['Available', 'Busy', 'Unavailable', 'On job'].map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Account status">
                        <select className={inputClass} onChange={(event) => updateField('status', event.target.value)} value={form.status}>
                          {['Active', 'Inactive', 'Pending', 'Approved', 'Blocked'].map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="KYC status">
                        <select className={inputClass} onChange={(event) => updateField('kyc_status', event.target.value)} value={form.kyc_status}>
                          {['Pending', 'Approved', 'Rejected'].map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Commission %">
                        <input className={inputClass} min="0" max="100" onChange={(event) => updateField('commission_percentage', event.target.value)} step="0.01" type="number" value={form.commission_percentage} />
                      </Field>
                      <Field label="Rating">
                        <input className={inputClass} min="0" max="5" onChange={(event) => updateField('rating', event.target.value)} step="0.1" type="number" value={form.rating} />
                      </Field>
                    </div>
                    <Field label="KYC rejection reason">
                      <textarea className={textareaClass} onChange={(event) => updateField('kyc_rejected_reason', event.target.value)} value={form.kyc_rejected_reason} />
                    </Field>
                  </>
                ) : null}

                {activeSection === 'bank' ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Bank name">
                      <input className={inputClass} onChange={(event) => updateField('bank_name', event.target.value)} value={form.bank_name} />
                    </Field>
                    <Field label="Branch name">
                      <input className={inputClass} onChange={(event) => updateField('bank_branch_name', event.target.value)} value={form.bank_branch_name} />
                    </Field>
                    <Field label="Account holder">
                      <input className={inputClass} onChange={(event) => updateField('bank_account_holder', event.target.value)} value={form.bank_account_holder} />
                    </Field>
                    <Field label="Account number">
                      <input className={inputClass} onChange={(event) => updateField('bank_account_number', event.target.value)} value={form.bank_account_number} />
                    </Field>
                    <Field label="Account type">
                      <input className={inputClass} onChange={(event) => updateField('bank_account_type', event.target.value)} placeholder="Savings / Current" value={form.bank_account_type} />
                    </Field>
                    <Field label="IFSC">
                      <input className={inputClass} onChange={(event) => updateField('bank_ifsc', event.target.value)} value={form.bank_ifsc} />
                    </Field>
                  </div>
                ) : null}

                {activeSection === 'documents' ? (
                  <>
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      {documentCards.map((card) => {
                        const document = card.document || {}
                        const label = card.label
                        const meta = documentMeta(label, card.preset)
                        const href = document.path ? buildDocumentUrl(document.path) : ''
                        const submitted = Boolean(document.path)
                        const index = card.index
                        return (
                          <article className="rounded-xl border border-slate-200 bg-white p-3" key={`${label}-${index ?? meta.title}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className={`grid h-8 w-8 place-items-center rounded-lg ${meta.wrap}`}>
                                <DocumentIcon name={meta.icon} />
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                                submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {submitted ? (
                                  <svg aria-hidden="true" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
                                    <path d="m5 12 5 5L20 7" />
                                  </svg>
                                ) : null}
                                {submitted ? 'Submitted' : 'Pending'}
                              </span>
                            </div>
                            <h4 className="mt-2 text-sm text-slate-700">{meta.title}</h4>
                            <p className="mt-0.5 text-xs font-medium text-slate-400">{meta.description}</p>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                              {href ? (
                                <a
                                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                  href={href}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  View
                                </a>
                              ) : (
                                <span className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-100 text-xs font-bold text-slate-300">
                                  View
                                </span>
                              )}
                              <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-600 hover:bg-emerald-50">
                                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
                                  <path d="M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16" />
                                  <path d="M21 21v-5h-5" />
                                </svg>
                                Replace
                                <input
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  disabled={saving || !canEdit}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    event.target.value = ''
                                    if (!file) return
                                    uploadDocument({ file, index, label })
                                  }}
                                  type="file"
                                />
                              </label>
                            </div>
                          </article>
                        )
                      })}
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-200 p-2.5 sm:flex-row sm:items-end">
                      <Field label="Add extra document">
                        <input
                          className={inputClass}
                          onChange={(event) => setNewDocumentLabel(event.target.value)}
                          placeholder="Shop photo, GST…"
                          value={newDocumentLabel}
                        />
                      </Field>
                      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#67B529] px-4 text-xs font-black text-white">
                        {saving ? 'Uploading…' : 'Upload file'}
                        <input
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={saving || !canEdit}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.target.value = ''
                            if (!file) return
                            uploadDocument({ file, label: newDocumentLabel.trim() || file.name })
                          }}
                          type="file"
                        />
                      </label>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                <p className="text-xs font-semibold text-slate-400">
                  {activeSection === 'documents' ? 'Replace uploads a new file immediately. Other changes apply after Save.' : 'Changes apply after Save. Serviceable pincodes are stored as an array.'}
                </p>
                <div className="flex gap-2">
                  <ActionButton onClick={() => onOpenPartnerDetails?.(partnerId)} type="button">Cancel</ActionButton>
                  <ActionButton disabled={saving || !canEdit} tone="primary" type="submit">
                    {saving ? 'Saving…' : 'Save changes'}
                  </ActionButton>
                </div>
              </div>
            </Panel>
          </form>
        )}
      </div>
    </AdminLayout>
  )
}

export default PartnerEditPage
