import { useEffect, useMemo, useRef, useState } from 'react'
import { vendorApi } from '../../services/vendorApi'
import { getBrandingDisplay } from '../../utils/branding'
import { notify } from '../../utils/feedback'

const initialForm = {
  address_line: '',
  alternate_phone: '',
  area: '',
  bank_account_holder: '',
  bank_account_number: '',
  bank_account_type: 'Savings',
  bank_branch_name: '',
  bank_ifsc: '',
  bank_name: '',
  business_name: '',
  city: 'Lucknow',
  email: '',
  name: '',
  password: '',
  phone: '',
  pincode: '',
  service_experience_years: '',
  service_ids: [],
  services: [],
  sub_service_ids: [],
}

const fallbackRequirements = {
  services: [
    { id: 1, name: 'AC Repair', category_name: 'Home Repair', sub_services: [] },
    { id: 2, name: 'Cleaning', category_name: 'Home Care', sub_services: [] },
    { id: 3, name: 'Salon', category_name: 'Beauty', sub_services: [] },
    { id: 4, name: 'Electrician', category_name: 'Home Repair', sub_services: [] },
    { id: 5, name: 'Plumber', category_name: 'Home Repair', sub_services: [] },
    { id: 6, name: 'Carpenter', category_name: 'Home Repair', sub_services: [] },
    { id: 7, name: 'Painting', category_name: 'Home Repair', sub_services: [] },
  ],
  documents: {},
  common_documents: [
    { id: 1, label: 'Profile photo', required: true },
    { id: 2, label: 'Aadhaar', required: true },
    { id: 3, label: 'PAN', required: true },
    { id: 4, label: 'Address proof', required: true },
    { id: 5, label: 'Police Verification Certificate', required: true },
    { id: 6, label: 'Work experience proof', required: false },
  ],
}

const normalizeDocumentEntry = (document) => {
  if (typeof document === 'string') {
    return { id: null, label: document, required: true }
  }

  return {
    id: document?.id ?? null,
    label: document?.label || document?.name || 'Document',
    required: document?.required !== false,
  }
}

const steps = [
  { id: 'account', title: 'Account', caption: 'Login details' },
  { id: 'services', title: 'Services', caption: 'Work category' },
  { id: 'location', title: 'Location', caption: 'Service area' },
  { id: 'payout', title: 'Payout', caption: 'Bank details' },
  { id: 'documents', title: 'Documents', caption: 'KYC upload' },
  { id: 'review', title: 'Review', caption: 'Submit details' },
]

const fieldLabels = {
  address_line: 'Full address',
  area: 'Service area',
  bank_account_holder: 'Account holder name',
  bank_account_number: 'Account number',
  bank_account_type: 'Account type',
  bank_branch_name: 'Branch name',
  bank_ifsc: 'IFSC code',
  bank_name: 'Bank name',
  city: 'City',
  email: 'Email',
  name: 'Full name',
  password: 'Password',
  phone: 'Phone',
  pincode: 'Pincode',
  service_experience_years: 'Experience in years',
  services: 'Services',
  service_ids: 'Services',
  sub_service_ids: 'Sub-services',
}

const stepFieldOrder = {
  account: ['name', 'phone', 'email', 'password'],
  services: ['service_ids', 'sub_service_ids', 'services', 'service_experience_years'],
  location: ['city', 'pincode', 'area', 'address_line'],
  payout: ['bank_name', 'bank_account_type', 'bank_branch_name', 'bank_account_holder', 'bank_account_number', 'bank_ifsc'],
  documents: [],
  review: [],
}

const sanitizeFieldValue = (name, value) => {
  if (['phone', 'alternate_phone'].includes(name)) {
    return value.replace(/\D/g, '').slice(0, 10)
  }

  if (name === 'pincode') {
    return value.replace(/\D/g, '').slice(0, 6)
  }

  if (name === 'bank_account_number') {
    return value.replace(/\D/g, '').slice(0, 18)
  }

  return value
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

const ONBOARDING_DRAFT_KEY = 'vendor_onboarding_draft_v1'

const readOnboardingDraft = () => {
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const writeOnboardingDraft = (draft) => {
  try {
    window.sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

const clearOnboardingDraft = () => {
  try {
    window.sessionStorage.removeItem(ONBOARDING_DRAFT_KEY)
  } catch {
    // Ignore storage failures.
  }
}

const fileToDraftPayload = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve({
    dataUrl: reader.result,
    lastModified: file.lastModified,
    name: file.name,
    type: file.type,
  })
  reader.onerror = () => reject(reader.error || new Error('Unable to read file.'))
  reader.readAsDataURL(file)
})

const draftPayloadToFile = (payload) => {
  if (!payload?.dataUrl || typeof payload.dataUrl !== 'string') return null

  try {
    const [header, base64] = payload.dataUrl.split(',')
    if (!base64) return null
    const mime = payload.type || header?.match(/data:(.*?);/)?.[1] || 'application/octet-stream'
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new File([bytes], payload.name || 'document', {
      lastModified: payload.lastModified || Date.now(),
      type: mime,
    })
  } catch {
    return null
  }
}

const restoreFormFromDraft = (draftForm) => {
  if (!draftForm || typeof draftForm !== 'object') return initialForm

  return {
    ...initialForm,
    ...draftForm,
    service_ids: Array.isArray(draftForm.service_ids)
      ? draftForm.service_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [],
    services: Array.isArray(draftForm.services) ? draftForm.services : [],
    sub_service_ids: Array.isArray(draftForm.sub_service_ids)
      ? draftForm.sub_service_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [],
  }
}

const restoreActiveStepFromDraft = (draftStep) => {
  const step = Number(draftStep)
  if (!Number.isFinite(step) || step < 0 || step >= steps.length) return 0
  return step
}

function SearchableMultiSelect({
  error = '',
  label,
  name,
  onRemove,
  onToggle,
  open,
  options = [],
  placeholder = 'Search and select...',
  query,
  required = false,
  selectedIds = [],
  setOpen,
  setQuery,
}) {
  const rootRef = useRef(null)
  const selectedSet = useMemo(
    () => new Set(selectedIds.map((id) => Number(id))),
    [selectedIds],
  )
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(Number(option.id))),
    [options, selectedSet],
  )
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => {
      const haystack = `${option.label || ''} ${option.meta || ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open, setOpen])

  return (
    <div className="block" data-field={name} ref={rootRef}>
      <span className="text-xs font-extrabold text-[#003F86]">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      <div
        className={`relative mt-1.5 rounded-xl border bg-white transition ${
          error ? 'border-rose-500' : open ? 'border-[#003F86] ring-2 ring-[#003F86]/10' : 'border-slate-300'
        }`}
      >
        <div className="flex w-full items-start gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            {selectedOptions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedOptions.map((option) => (
                  <span
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-[#F6FBFF] px-2.5 py-1 text-[11px] font-bold text-[#003F86]"
                    key={option.id}
                  >
                    <span className="truncate">{option.label}</span>
                    <button
                      aria-label={`Remove ${option.label}`}
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700 hover:bg-rose-100 hover:text-rose-700"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onRemove(option)
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <button
                className="w-full text-left text-sm font-semibold text-slate-400"
                onClick={() => setOpen(!open)}
                type="button"
              >
                {placeholder}
              </button>
            )}
            {selectedOptions.length ? (
              <button
                className="mt-2 text-[11px] font-extrabold text-[#003F86] hover:underline"
                onClick={() => setOpen(!open)}
                type="button"
              >
                {open ? 'Close list' : 'Add more'}
              </button>
            ) : null}
          </div>
          <button
            aria-expanded={open}
            aria-label={open ? 'Close options' : 'Open options'}
            className={`mt-0.5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
            onClick={() => setOpen(!open)}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                className="h-10 w-full rounded-lg border border-slate-200 bg-[#F8FBFF] px-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#003F86]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type to search..."
                type="text"
                value={query}
              />
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain p-2 custom-thin-scrollbar">
              {filteredOptions.length ? filteredOptions.map((option) => {
                const selected = selectedSet.has(Number(option.id))
                return (
                  <button
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-bold transition ${
                      selected ? 'bg-[#EEF9E8] text-[#2F6412] ring-1 ring-[#67B529]/30' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    key={option.id}
                    onClick={() => onToggle(option)}
                    type="button"
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${selected ? 'border-[#67B529] bg-[#67B529] text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.meta ? <span className="shrink-0 text-[10px] font-black uppercase text-slate-400">{option.meta}</span> : null}
                  </button>
                )
              }) : (
                <p className="px-2 py-4 text-center text-sm font-semibold text-slate-400">No matching options.</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error ? <p className="mt-1 text-xs font-bold text-rose-600">{error}</p> : null}
    </div>
  )
}

function BecomeServiceProviderPage({ appSettings = {}, onBackHome, onOpenVendorLogin }) {
  const { logoUrl } = getBrandingDisplay(appSettings)
  const [requirements, setRequirements] = useState(fallbackRequirements)
  const [form, setForm] = useState(() => restoreFormFromDraft(readOnboardingDraft()?.form))
  const [files, setFiles] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [activeStep, setActiveStep] = useState(() => restoreActiveStepFromDraft(readOnboardingDraft()?.activeStep))
  const [serviceSearch, setServiceSearch] = useState('')
  const [subServiceSearch, setSubServiceSearch] = useState('')
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)
  const [subServiceDropdownOpen, setSubServiceDropdownOpen] = useState(false)
  const [status, setStatus] = useState({ message: '', tone: 'neutral' })
  const [ifscLookup, setIfscLookup] = useState({ message: '', tone: 'neutral' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAccount, setIsCheckingAccount] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const availabilityTimerRef = useRef(null)

  useEffect(() => {
    vendorApi.requirements()
      .then(setRequirements)
      .catch(() => setStatus({ message: 'Service list loaded locally. Start backend before final KYC submit.', tone: 'error' }))
  }, [])

  useEffect(() => {
    let cancelled = false
    const draft = readOnboardingDraft()
    const restoreFiles = async () => {
      if (draft?.files && typeof draft.files === 'object') {
        const restored = {}
        await Promise.all(Object.entries(draft.files).map(async ([key, payload]) => {
          const file = draftPayloadToFile(payload)
          if (file) restored[key] = file
        }))
        if (!cancelled) setFiles(restored)
      }
      if (!cancelled) setDraftReady(true)
    }
    restoreFiles()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftReady) return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const fileEntries = await Promise.all(
          Object.entries(files).map(async ([key, file]) => {
            if (!(file instanceof File)) return null
            return [key, await fileToDraftPayload(file)]
          }),
        )
        if (cancelled) return
        writeOnboardingDraft({
          activeStep,
          form,
          files: Object.fromEntries(fileEntries.filter(Boolean)),
          savedAt: Date.now(),
        })
      } catch {
        // Ignore draft serialization failures.
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeStep, draftReady, files, form])

  useEffect(() => {
    if (!status.message) return

    notify(status.message, { tone: status.tone === 'error' ? 'error' : 'success' })
  }, [status])

  useEffect(() => {
    if (!ifscLookup.message) return

    notify(ifscLookup.message, {
      tone: ifscLookup.tone === 'error' ? 'error' : ifscLookup.tone === 'success' ? 'success' : 'info',
    })
  }, [ifscLookup])
  const catalogServices = useMemo(() => {
    const list = requirements.services || []
    if (!list.length) return []
    if (typeof list[0] === 'string') {
      return list.map((name, index) => ({
        id: index + 1,
        name,
        category_name: '',
        sub_services: [],
      }))
    }
    return list
  }, [requirements.services])

  const requiredDocuments = useMemo(() => {
    const docs = (requirements.common_documents || []).map(normalizeDocumentEntry)

    const unique = []
    const seen = new Set()
    docs.forEach((document) => {
      const key = document.label.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      unique.push(document)
    })
    return unique
  }, [requirements])

  const selectedStep = steps[activeStep]
  const progress = Math.round(((activeStep + 1) / steps.length) * 100)
  const serviceOptions = useMemo(
    () => catalogServices.map((service) => ({
      id: Number(service.id),
      label: service.name,
      meta: `${(service.sub_services || []).length} sub`,
      service,
    })),
    [catalogServices],
  )
  const selectedServices = useMemo(
    () => catalogServices.filter((service) => form.service_ids.includes(Number(service.id))),
    [catalogServices, form.service_ids],
  )
  const subServiceOptions = useMemo(
    () => selectedServices.flatMap((service) => (service.sub_services || []).map((subService) => ({
      id: Number(subService.id),
      label: subService.name,
      meta: service.name,
      service,
      subService,
    }))),
    [selectedServices],
  )
  const selectedSubServiceNames = catalogServices
    .flatMap((service) => service.sub_services || [])
    .filter((sub) => form.sub_service_ids.includes(Number(sub.id)))
    .map((sub) => sub.name)
  const documentRows = requiredDocuments.map((document, index) => ({
    file: files[index],
    index,
    label: document.label,
    required: document.required,
  }))
  const summarySections = [
    {
      editStep: 0,
      fields: [
        ['Full name', form.name],
        ['Business name', form.business_name || '-'],
        ['Phone', form.phone],
        ['Alternate phone', form.alternate_phone || '-'],
        ['Email', form.email],
        ['Password', form.password ? '••••••••' : '-'],
      ],
      title: 'Account',
    },
    {
      editStep: 1,
      fields: [
        ['Services', form.services.join(', ') || 'None selected'],
        ['Sub-services', selectedSubServiceNames.join(', ') || 'None selected'],
        ['Experience in years', form.service_experience_years || '-'],
      ],
      title: 'Services',
    },
    {
      editStep: 2,
      fields: [
        ['City', form.city],
        ['Pincode', form.pincode],
        ['Service area', form.area],
        ['Full address', form.address_line],
      ],
      title: 'Location',
    },
    {
      editStep: 3,
      fields: [
        ['Bank name', form.bank_name],
        ['Branch name', form.bank_branch_name],
        ['Account holder', form.bank_account_holder],
        ['Account type', form.bank_account_type],
        ['Account number', form.bank_account_number || '-'],
        ['IFSC', form.bank_ifsc],
      ],
      title: 'Payout / Bank details',
    },
    {
      editStep: 4,
      documents: documentRows,
      title: 'Documents',
    },
  ]

  const clearFieldError = (name) => {
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const firstApiError = (value) => (Array.isArray(value) ? value[0] : value) || ''

  const checkAccountAvailability = async ({ email = form.email, phone = form.phone } = {}) => {
    const payload = {}
    const emailValue = String(email || '').trim()
    const phoneValue = String(phone || '').trim()

    if (emailValue && isValidEmail(emailValue)) payload.email = emailValue
    if (phoneValue && /^\d{10}$/.test(phoneValue)) payload.phone = phoneValue
    if (!payload.email && !payload.phone) return {}

    const result = await vendorApi.checkAvailability(payload)
    const nextErrors = {}
    if (result?.errors?.email) nextErrors.email = firstApiError(result.errors.email)
    if (result?.errors?.phone) nextErrors.phone = firstApiError(result.errors.phone)
    return nextErrors
  }

  const scheduleAvailabilityCheck = (name, value) => {
    if (name !== 'email' && name !== 'phone') return

    window.clearTimeout(availabilityTimerRef.current)
    availabilityTimerRef.current = window.setTimeout(async () => {
      try {
        const nextErrors = await checkAccountAvailability(
          name === 'email' ? { email: value, phone: '' } : { email: '', phone: value },
        )
        setFieldErrors((current) => {
          const next = { ...current }
          if (name === 'email') {
            if (nextErrors.email) next.email = nextErrors.email
            else delete next.email
          }
          if (name === 'phone') {
            if (nextErrors.phone) next.phone = nextErrors.phone
            else delete next.phone
          }
          return next
        })
      } catch {
        // Ignore transient network issues during live checks.
      }
    }, 450)
  }

  const updateField = (name, value) => {
    const nextValue = sanitizeFieldValue(name, value)
    setForm((current) => ({ ...current, [name]: nextValue }))
    clearFieldError(name)
    scheduleAvailabilityCheck(name, nextValue)
  }

  const focusFirstError = (errors, stepId = selectedStep.id) => {
    const orderedFields = [
      ...(stepFieldOrder[stepId] || []),
      ...Object.keys(errors).filter((field) => !(stepFieldOrder[stepId] || []).includes(field)),
    ]
    const firstErrorField = orderedFields.find((field) => errors[field])
    const target = firstErrorField
      ? document.querySelector(`[name="${firstErrorField}"], [data-field="${firstErrorField}"]`)
      : null

    if (target) {
      requestAnimationFrame(() => {
        target.focus()
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  const lookupIfscDetails = async () => {
    const ifsc = form.bank_ifsc.trim().toUpperCase()

    if (!ifsc || ifsc.length < 4) {
      if (!ifsc) setIfscLookup({ message: '', tone: 'neutral' })
      return
    }

    setIfscLookup({ message: 'Checking IFSC...', tone: 'neutral' })
    try {
      const bank = await vendorApi.lookupIfsc(ifsc)
      setForm((current) => ({
        ...current,
        bank_branch_name: bank.BRANCH || current.bank_branch_name,
        bank_ifsc: bank.IFSC || ifsc,
        bank_name: bank.BANK || current.bank_name,
      }))
      setIfscLookup({ message: 'Bank and branch auto-filled from IFSC.', tone: 'success' })
    } catch {
      setIfscLookup({ message: 'You can enter bank and branch manually.', tone: 'neutral' })
    }
  }

  const toggleService = (service) => {
    const serviceId = Number(service.id)
    const subIds = (service.sub_services || []).map((item) => Number(item.id))

    setForm((current) => {
      const isSelected = current.service_ids.includes(serviceId)
      if (isSelected) {
        return {
          ...current,
          service_ids: current.service_ids.filter((id) => id !== serviceId),
          services: current.services.filter((name) => name !== service.name),
          sub_service_ids: current.sub_service_ids.filter((id) => !subIds.includes(id)),
        }
      }

      return {
        ...current,
        service_ids: [...current.service_ids, serviceId],
        services: current.services.includes(service.name)
          ? current.services
          : [...current.services, service.name],
      }
    })
    clearFieldError('services')
    clearFieldError('service_ids')
    clearFieldError('sub_service_ids')
  }

  const toggleSubService = (service, subService) => {
    const serviceId = Number(service.id)
    const subId = Number(subService.id)

    setForm((current) => {
      let nextServiceIds = current.service_ids
      let nextServices = current.services

      if (!current.service_ids.includes(serviceId)) {
        nextServiceIds = [...current.service_ids, serviceId]
        nextServices = current.services.includes(service.name)
          ? current.services
          : [...current.services, service.name]
      }

      const nextSubIds = current.sub_service_ids.includes(subId)
        ? current.sub_service_ids.filter((id) => id !== subId)
        : [...current.sub_service_ids, subId]

      return {
        ...current,
        service_ids: nextServiceIds,
        services: nextServices,
        sub_service_ids: nextSubIds,
      }
    })
    clearFieldError('sub_service_ids')
    clearFieldError('service_ids')
    clearFieldError('services')
  }

  const validateStep = (stepIndex = activeStep) => {
    const stepId = steps[stepIndex].id
    const requiredByStep = {
      account: ['name', 'phone', 'email', 'password'],
      location: ['city', 'area', 'address_line', 'pincode'],
      payout: ['bank_account_holder', 'bank_account_number', 'bank_account_type', 'bank_ifsc', 'bank_name', 'bank_branch_name'],
    }
    const errors = {}

    if (stepId === 'services') {
      if (!form.service_ids.length) {
        errors.service_ids = 'Please select at least one service.'
        errors.services = 'Please select at least one service.'
      }

      catalogServices
        .filter((service) => form.service_ids.includes(Number(service.id)))
        .forEach((service) => {
          const availableSubIds = (service.sub_services || []).map((item) => Number(item.id))
          if (!availableSubIds.length) return
          const picked = form.sub_service_ids.filter((id) => availableSubIds.includes(Number(id)))
          if (!picked.length) {
            errors.sub_service_ids = `Select at least one sub-service for ${service.name}.`
          }
        })
    }

    ;(requiredByStep[stepId] || []).forEach((field) => {
      if (!String(form[field] || '').trim()) {
        errors[field] = `${fieldLabels[field] || 'This field'} is required.`
      }
    })

    if (stepId === 'account') {
      if (form.phone && !/^\d{10}$/.test(form.phone)) {
        errors.phone = 'Phone number must be exactly 10 digits.'
      }

      if (form.alternate_phone && !/^\d{10}$/.test(form.alternate_phone)) {
        errors.alternate_phone = 'Alternate phone must be exactly 10 digits.'
      }

      if (form.email && !isValidEmail(form.email.trim())) {
        errors.email = 'Enter a valid email address.'
      }

      if (form.password && form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.'
      }
    }

    if (stepId === 'location' && form.pincode && !/^\d{6}$/.test(form.pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits.'
    }

    if (stepId === 'payout') {
      if (form.bank_account_number && !/^\d{9,18}$/.test(form.bank_account_number)) {
        errors.bank_account_number = 'Account number must be 9 to 18 digits.'
      }
    }

    if (stepId === 'documents') {
      requiredDocuments.forEach((document, index) => {
        if (document.required && !files[index]) {
          errors[`document_${index}`] = `Please upload ${document.label}.`
        }
      })
    }

    return errors
  }

  const validateAllSteps = () => {
    const stepErrors = steps.reduce((nextErrors, _, index) => {
      if (steps[index].id === 'review') return nextErrors
      return { ...nextErrors, ...validateStep(index) }
    }, {})

    return stepErrors
  }

  const goToStep = async (nextStep) => {
    if (nextStep <= activeStep) {
      setActiveStep(nextStep)
      setStatus({ message: '', tone: 'neutral' })
      setFieldErrors({})
      if (nextStep !== steps.length - 1) setReviewConfirmed(false)
      return
    }

    const errors = validateStep()
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setStatus({ message: '', tone: 'neutral' })
      focusFirstError(errors)
      return
    }

    if (selectedStep.id === 'account') {
      setIsCheckingAccount(true)
      try {
        const availabilityErrors = await checkAccountAvailability()
        if (Object.keys(availabilityErrors).length) {
          setFieldErrors(availabilityErrors)
          focusFirstError(availabilityErrors)
          return
        }
      } catch (requestError) {
        setStatus({ message: requestError.message || 'Unable to verify phone/email right now.', tone: 'error' })
        return
      } finally {
        setIsCheckingAccount(false)
      }
    }

    setActiveStep(nextStep)
    setStatus({ message: '', tone: 'neutral' })
    setFieldErrors({})
    if (nextStep !== steps.length - 1) {
      setReviewConfirmed(false)
    }
  }

  const submitKyc = async (event) => {
    event.preventDefault()
    const errors = validateAllSteps()
    if (Object.keys(errors).length) {
      const firstStepWithError = steps.findIndex((step, index) => step.id !== 'review' && Object.keys(validateStep(index)).length)
      setFieldErrors(errors)
      setStatus({ message: '', tone: 'neutral' })
      if (firstStepWithError >= 0) setActiveStep(firstStepWithError)
      window.setTimeout(() => {
        focusFirstError(errors, firstStepWithError >= 0 ? steps[firstStepWithError].id : selectedStep.id)
      }, 0)
      return
    }

    if (!reviewConfirmed) {
      setStatus({ message: 'Please confirm that all details are correct before submitting KYC.', tone: 'error' })
      return
    }

    setIsSubmitting(true)
    setStatus({ message: '', tone: 'neutral' })
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (['services', 'service_ids', 'sub_service_ids'].includes(key)) {
          ;(Array.isArray(value) ? value : []).forEach((item) => payload.append(`${key}[]`, item))
          return
        }
        if (key === 'service_experience_years' && value !== '') {
          payload.append('experience', `${value} years`)
        }
        payload.append(key, value)
      })
      payload.append('onboarding_step', 'review')
      requiredDocuments.forEach((_, index) => {
        if (files[index]) payload.append(`document_${index}`, files[index])
      })

      const response = await vendorApi.register(payload)
      clearOnboardingDraft()
      setStatus({ message: response.message, tone: 'success' })
      setActiveStep(0)
      setForm(initialForm)
      setFiles({})
      setFieldErrors({})
      setReviewConfirmed(false)
      setDraftReady(true)
    } catch (submitError) {
      const apiErrors = submitError.errors || {}
      const nextErrors = {}
      if (apiErrors.phone?.[0]) nextErrors.phone = apiErrors.phone[0]
      if (apiErrors.email?.[0]) nextErrors.email = apiErrors.email[0]

      if (Object.keys(nextErrors).length) {
        setFieldErrors(nextErrors)
        setActiveStep(0)
        setStatus({ message: '', tone: 'neutral' })
        window.setTimeout(() => focusFirstError(nextErrors, 'account'), 0)
      } else {
        setStatus({ message: submitError.message, tone: 'error' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="vendor-onboard flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--brand-page)] text-[var(--brand-ink)]">
      <header className="shrink-0 border-b border-blue-100/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#003F86] sm:text-base">Become Service Provider</p>
              <p className="hidden text-[11px] font-semibold text-slate-500 sm:block">Step-wise KYC onboarding</p>
            </div>
          </div>
          <button
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-[#003F86] transition hover:border-[#003F86]/30 hover:bg-[#F6FBFF] sm:text-sm"
            onClick={onOpenVendorLogin}
            type="button"
          >
            Vendor login
          </button>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full max-w-[1200px] flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-4 lg:px-6 lg:py-4">
        <MobileStepper activeStep={activeStep} goToStep={goToStep} progress={progress} />

        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[var(--brand-navy)] p-4 text-white shadow-sm lg:flex">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9BE15D]">Smooth KYC</p>
          <h1 className="mt-2 font-[Outfit,sans-serif] text-xl font-extrabold leading-tight">
            Build your provider profile in 6 short steps.
          </h1>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#67B529] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-blue-100/70">{progress}% complete</p>

          <div className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-hidden">
            {steps.map((step, index) => {
              const isActive = activeStep === index
              const isDone = index < activeStep
              return (
                <button
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isActive
                      ? 'bg-white text-[#003F86] shadow-sm'
                      : isDone
                        ? 'bg-white/10 text-white hover:bg-white/15'
                        : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
                  }`}
                  key={step.id}
                  onClick={() => goToStep(index)}
                  type="button"
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black ${
                    isActive ? 'bg-[#003F86] text-white' : isDone ? 'bg-[#67B529] text-white' : 'bg-white/10 text-white'
                  }`}>
                    {isDone ? '✓' : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold">{step.title}</span>
                    <span className="block truncate text-[10px] font-semibold opacity-70">{step.caption}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 shrink-0 rounded-xl border border-[#67B529]/25 bg-[#67B529]/15 px-3 py-2.5 text-[11px] font-bold leading-snug text-[#E8F9D8]">
            Login unlocks only after super admin KYC approval.
          </div>
        </aside>

        <form className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm" noValidate onSubmit={submitKyc}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#67B529]">
                Step {activeStep + 1} of {steps.length}
              </p>
              <h2 className="font-[Outfit,sans-serif] text-lg font-extrabold text-[#003F86] sm:text-xl">{selectedStep.title}</h2>
            </div>
            <div className="hidden h-10 w-10 place-items-center rounded-xl bg-[#F6FBFF] text-sm font-black text-[#003F86] sm:grid">
              {activeStep + 1}/{steps.length}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-4 py-3 sm:px-5">
            <div className={`vendor-onboard-step h-full min-h-0 ${['documents', 'review'].includes(selectedStep.id) ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain custom-thin-scrollbar'}`}>
              {selectedStep.id === 'account' && (
                <div className="grid h-full content-start gap-3 sm:grid-cols-2">
                  <Field error={fieldErrors.name} label="Full name" name="name" required value={form.name} onChange={updateField} />
                  <Field label="Business name" name="business_name" value={form.business_name} onChange={updateField} />
                  <Field
                    error={fieldErrors.phone}
                    inputMode="numeric"
                    label="Phone"
                    maxLength={10}
                    name="phone"
                    required
                    value={form.phone}
                    onBlur={() => scheduleAvailabilityCheck('phone', form.phone)}
                    onChange={updateField}
                  />
                  <Field error={fieldErrors.alternate_phone} inputMode="numeric" label="Alternate phone" maxLength={10} name="alternate_phone" value={form.alternate_phone} onChange={updateField} />
                  <Field
                    error={fieldErrors.email}
                    label="Email"
                    name="email"
                    required
                    type="email"
                    value={form.email}
                    onBlur={() => scheduleAvailabilityCheck('email', form.email)}
                    onChange={updateField}
                  />
                  <Field error={fieldErrors.password} label="Password" minLength={6} name="password" required type="password" value={form.password} onChange={updateField} />
                </div>
              )}

              {selectedStep.id === 'services' && (
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain custom-thin-scrollbar">
                  <div className="shrink-0">
                    <p className="text-sm font-extrabold text-[#003F86]">Services you provide</p>
                    <p className="text-xs font-semibold text-slate-500">Search and multi-select services, then pick sub-services.</p>
                    {(fieldErrors.service_ids || fieldErrors.services || fieldErrors.sub_service_ids) && (
                      <p className="mt-1.5 text-xs font-bold text-rose-600">
                        {fieldErrors.sub_service_ids || fieldErrors.service_ids || fieldErrors.services}
                      </p>
                    )}
                  </div>

                  <SearchableMultiSelect
                    error={fieldErrors.service_ids || fieldErrors.services}
                    label="Services"
                    name="service_ids"
                    onRemove={(option) => toggleService(option.service)}
                    onToggle={(option) => toggleService(option.service)}
                    open={serviceDropdownOpen}
                    options={serviceOptions}
                    placeholder="Search and select services..."
                    query={serviceSearch}
                    required
                    selectedIds={form.service_ids}
                    setOpen={(next) => {
                      setServiceDropdownOpen(next)
                      if (next) setSubServiceDropdownOpen(false)
                    }}
                    setQuery={setServiceSearch}
                  />

                  <SearchableMultiSelect
                    error={fieldErrors.sub_service_ids}
                    label="Sub-services"
                    name="sub_service_ids"
                    onRemove={(option) => toggleSubService(option.service, option.subService)}
                    onToggle={(option) => toggleSubService(option.service, option.subService)}
                    open={subServiceDropdownOpen}
                    options={subServiceOptions}
                    placeholder={selectedServices.length ? 'Search and select sub-services...' : 'Select a service first'}
                    query={subServiceSearch}
                    required={subServiceOptions.length > 0}
                    selectedIds={form.sub_service_ids}
                    setOpen={(next) => {
                      if (!selectedServices.length) return
                      setSubServiceDropdownOpen(next)
                      if (next) setServiceDropdownOpen(false)
                    }}
                    setQuery={setSubServiceSearch}
                  />

                  <Field error={fieldErrors.service_experience_years} label="Experience in years" min="0" name="service_experience_years" type="number" value={form.service_experience_years} onChange={updateField} />
                </div>
              )}

              {selectedStep.id === 'location' && (
                <div className="grid h-full content-start gap-3 sm:grid-cols-2">
                  <Field error={fieldErrors.city} label="City" name="city" required value={form.city} onChange={updateField} />
                  <Field error={fieldErrors.pincode} inputMode="numeric" label="Pincode" maxLength={6} name="pincode" required value={form.pincode} onChange={updateField} />
                  <Field className="sm:col-span-2" error={fieldErrors.area} label="Service area" name="area" placeholder="Gomti Nagar, Indira Nagar..." required value={form.area} onChange={updateField} />
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-extrabold text-[#003F86]">Full address <span className="text-rose-600">*</span></span>
                    <textarea
                      aria-invalid={fieldErrors.address_line ? 'true' : 'false'}
                      className={`mt-1.5 min-h-[72px] w-full resize-none rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${fieldErrors.address_line ? 'border-rose-500' : 'border-slate-300 focus:border-[#003F86]'}`}
                      name="address_line"
                      required
                      value={form.address_line}
                      onChange={(event) => updateField('address_line', event.target.value)}
                    />
                    {fieldErrors.address_line && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.address_line}</p>}
                  </label>
                </div>
              )}

              {selectedStep.id === 'payout' && (
                <div className="grid h-full content-start gap-3 sm:grid-cols-2">
                  <Field error={fieldErrors.bank_name} label="Bank name" name="bank_name" required value={form.bank_name} onChange={updateField} />
                  <SelectField error={fieldErrors.bank_account_type} label="Account type" name="bank_account_type" options={['Savings', 'Current']} required value={form.bank_account_type} onChange={updateField} />
                  <Field error={fieldErrors.bank_branch_name} label="Branch name" name="bank_branch_name" required value={form.bank_branch_name} onChange={updateField} />
                  <Field error={fieldErrors.bank_account_holder} label="Account holder name" name="bank_account_holder" required value={form.bank_account_holder} onChange={updateField} />
                  <Field error={fieldErrors.bank_account_number} inputMode="numeric" label="Account number" maxLength={18} name="bank_account_number" required value={form.bank_account_number} onChange={updateField} />
                  <Field
                    error={fieldErrors.bank_ifsc}
                    label="IFSC code"
                    name="bank_ifsc"
                    required
                    value={form.bank_ifsc}
                    onBlur={lookupIfscDetails}
                    onChange={(name, value) => {
                      setIfscLookup({ message: '', tone: 'neutral' })
                      updateField(name, value.toUpperCase())
                    }}
                  />
                </div>
              )}

              {selectedStep.id === 'documents' && (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <p className="mb-2 shrink-0 text-xs font-semibold text-slate-500">Upload each required document below. Fields marked <span className="text-rose-600">*</span> are mandatory.</p>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 custom-thin-scrollbar">
                    {requiredDocuments.map((document, index) => {
                      const uploadedFile = files[index]
                      return (
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-[#F8FBFF] px-3 py-2.5 text-sm font-bold transition sm:gap-3 ${fieldErrors[`document_${index}`] ? 'border-rose-500' : uploadedFile ? 'border-emerald-200' : 'border-blue-100'}`}
                          key={document.label}
                        >
                          <label className="min-w-0 flex-1 cursor-pointer sm:grid sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-3">
                            <span className="block text-[#003F86]">
                              {document.label}
                              {document.required ? <span className="text-rose-600"> *</span> : null}
                            </span>
                            <div className="mt-2 min-w-0 sm:mt-0">
                              <input
                                accept=".jpg,.jpeg,.png,.webp,.pdf"
                                aria-invalid={fieldErrors[`document_${index}`] ? 'true' : 'false'}
                                className="sr-only"
                                data-field={`document_${index}`}
                                required={document.required}
                                onChange={(event) => {
                                  setFiles((current) => ({ ...current, [index]: event.target.files?.[0] }))
                                  clearFieldError(`document_${index}`)
                                }}
                                type="file"
                              />
                              {uploadedFile ? (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
                                  <span className="truncate">{uploadedFile.name}</span>
                                  <span className="shrink-0 text-[10px] font-extrabold">Change</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#003F86]/40 bg-white px-2.5 py-1.5 text-xs font-bold text-[#003F86]">
                                  Upload PDF / Image
                                </span>
                              )}
                              {fieldErrors[`document_${index}`] && (
                                <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors[`document_${index}`]}</p>
                              )}
                            </div>
                          </label>

                          {uploadedFile ? (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                className="rounded-lg border border-[#003F86]/20 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-[#003F86] transition hover:border-[#003F86] hover:bg-[#EEF5FF]"
                                onClick={(event) => {
                                  event.preventDefault()
                                  const url = URL.createObjectURL(uploadedFile)
                                  window.open(url, '_blank', 'noopener,noreferrer')
                                  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
                                }}
                                type="button"
                              >
                                View
                              </button>
                              <span
                                aria-label="Uploaded"
                                className="grid h-7 w-7 place-items-center rounded-full bg-[#67B529] text-white shadow-sm"
                                title="Uploaded"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
                                  <path d="m5 12 5 5L20 7" />
                                </svg>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedStep.id === 'review' && (
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
                  <div className="shrink-0 rounded-xl border border-[#67B529]/30 bg-[#EEF9E8] px-3 py-2.5">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#67B529]">Full application review</p>
                    <p className="text-sm font-semibold text-[#2F6412]">Check every section below. Confirm, then submit KYC for admin approval.</p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 custom-thin-scrollbar">
                    {summarySections.map((section) => (
                      <section className="rounded-xl border border-blue-100 bg-white p-3.5 shadow-sm sm:p-4" key={section.title}>
                        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <h3 className="text-sm font-extrabold text-[#003F86] sm:text-base">{section.title}</h3>
                          <button
                            className="rounded-lg border border-[#003F86]/15 bg-[#F6FBFF] px-2.5 py-1 text-[11px] font-extrabold text-[#003F86] transition hover:border-[#003F86]/40"
                            onClick={() => goToStep(section.editStep)}
                            type="button"
                          >
                            Edit
                          </button>
                        </div>

                        {section.documents ? (
                          <div className="space-y-2">
                            {section.documents.map((document) => (
                              <div
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                                  document.file ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/40'
                                }`}
                                key={document.label}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                                    {document.label}
                                    {document.required ? <span className="text-rose-600"> *</span> : null}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs font-bold text-[#003F86]">
                                    {document.file?.name || 'Not uploaded'}
                                  </p>
                                </div>
                                {document.file ? (
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <button
                                      className="rounded-lg border border-[#003F86]/20 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-[#003F86] transition hover:border-[#003F86] hover:bg-[#EEF5FF]"
                                      onClick={() => {
                                        const url = URL.createObjectURL(document.file)
                                        window.open(url, '_blank', 'noopener,noreferrer')
                                        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
                                      }}
                                      type="button"
                                    >
                                      View
                                    </button>
                                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#67B529] text-white" title="Uploaded">
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="m5 12 5 5L20 7" />
                                      </svg>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-extrabold text-rose-700">Missing</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <dl className="grid gap-2.5 sm:grid-cols-2">
                            {section.fields.map(([label, value]) => (
                              <div className={`rounded-lg bg-[#F8FBFF] px-3 py-2.5 ${label === 'Full address' || label === 'Sub-services' || label === 'Services' ? 'sm:col-span-2' : ''}`} key={label}>
                                <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</dt>
                                <dd className="mt-1 break-words text-sm font-bold text-[#003F86]">{value || '-'}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </section>
                    ))}

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-[#F8FBFF] px-3.5 py-3">
                      <input
                        checked={reviewConfirmed}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#67B529]"
                        onChange={(event) => setReviewConfirmed(event.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-xs font-semibold leading-5 text-slate-700 sm:text-sm">
                        I have reviewed all account, services, location, bank, and document details. They are correct and ready for KYC submission.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-white disabled:opacity-40"
              disabled={activeStep === 0 || isSubmitting}
              onClick={() => goToStep(activeStep - 1)}
              type="button"
            >
              Back
            </button>
            {activeStep < steps.length - 1 ? (
              <button
                className="rounded-xl bg-[#003F86] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(0,63,134,0.2)] transition hover:bg-[#0054A6] disabled:opacity-60"
                disabled={isCheckingAccount || Boolean(fieldErrors.email || fieldErrors.phone)}
                onClick={() => goToStep(activeStep + 1)}
                type="button"
              >
                {isCheckingAccount ? 'Checking...' : 'Save and continue'}
              </button>
            ) : (
              <button
                className="rounded-xl bg-[#003F86] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(0,63,134,0.2)] transition hover:bg-[#0054A6] disabled:opacity-60"
                disabled={isSubmitting || !reviewConfirmed}
                type="submit"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit KYC'}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}

function MobileStepper({ activeStep, goToStep, progress }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm lg:hidden">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#67B529]">
          {steps[activeStep].title} · {activeStep + 1}/{steps.length}
        </p>
        <p className="text-[10px] font-bold text-slate-500">{progress}%</p>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#67B529] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between gap-0.5">
        {steps.map((step, index) => {
          const isActive = index === activeStep
          const isComplete = index < activeStep
          return (
            <button
              className="grid flex-1 justify-items-center"
              key={step.id}
              onClick={() => goToStep(index)}
              type="button"
            >
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                isComplete ? 'bg-[#67B529] text-white' : isActive ? 'bg-[#003F86] text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {isComplete ? '✓' : index + 1}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Field({ className = '', error = '', label, name, onChange, required = false, type = 'text', value, ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-extrabold text-[#003F86]">{label} {required && <span className="text-rose-600">*</span>}</span>
      <input
        aria-invalid={error ? 'true' : 'false'}
        className={`mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none transition ${error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/10'}`}
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
    </label>
  )
}

function SelectField({ className = '', error = '', label, name, onChange, options, required = false, value }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-extrabold text-[#003F86]">{label} {required && <span className="text-rose-600">*</span>}</span>
      <select
        aria-invalid={error ? 'true' : 'false'}
        className={`mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold outline-none ${error ? 'border-rose-500' : 'border-slate-300 focus:border-[#003F86]'}`}
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
    </label>
  )
}

export default BecomeServiceProviderPage
