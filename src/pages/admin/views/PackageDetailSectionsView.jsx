import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionButton, DataTable, Panel, StatusBadge } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { showErrorAlert, showSuccessAlert } from '../utils/confirmations'

const readList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const fetchAllRows = async (endpoint) => {
  const dump = await adminApi.list(endpoint, { all: 1, per_page: -1, limit: 10000 })
  const dumped = readList(dump)
  const dumpedTotal = Number(dump?.total || 0)
  if (dumped.length && (!dumpedTotal || dumped.length >= dumpedTotal)) return dumped

  const pageSize = 100
  const rows = []
  let page = 1
  let lastPage = 1
  let total = dumpedTotal

  do {
    const payload = await adminApi.list(endpoint, { per_page: pageSize, page })
    const chunk = readList(payload)
    rows.push(...chunk)
    lastPage = Math.max(1, Number(payload?.last_page || payload?.meta?.last_page || page))
    total = Number(payload?.total || payload?.meta?.total || total || rows.length)
    if (!chunk.length) break
    page += 1
  } while (page <= lastPage && rows.length < total)

  return rows
}

const sectionTemplates = [
  ['all', 'All sections', 'all'],
  ['summary', 'Package summary', 'summary'],
  ['included', 'Included', 'list'],
  ['not_included', 'Not included', 'list'],
  ['process', 'Process', 'steps'],
  ['requirements', 'Requirements', 'cards'],
  ['description', 'Description', 'list'],
  ['brands', 'Brands', 'grid'],
  ['faq', 'FAQ', 'faq'],
  ['reviews', 'Reviews', 'review_summary'],
  ['warranty', 'Warranty', 'note'],
  ['custom', 'Custom', 'list'],
]

const sectionTypes = ['summary', 'list', 'steps', 'cards', 'grid', 'faq', 'review_summary', 'note']
const statuses = ['Active', 'Inactive']
const defaultSectionTitles = {
  brands: 'We service all brands*',
  faq: 'Frequently asked questions',
  reviews: 'Customer reviews',
}
const defaultSectionMetadata = {
  faq: { faqs: [{ question: '', answer: '' }] },
  reviews: { rating: '', reviews: '', five_star_percent: '' },
}

const blankForm = {
  body: '',
  image: '',
  items: '',
  metadata: '',
  section_key: 'summary',
  section_type: 'summary',
  service_id: '',
  service_package_id: '',
  is_visible: true,
  sort_order: 1,
  status: 'Active',
  subtitle: '',
  title: 'Package summary',
}

const parseJson = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  return JSON.parse(value)
}

const stringifyJson = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const tagsToArray = (value) =>
  Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

const parseMetadata = (value) => {
  try {
    return parseJson(value) || {}
  } catch {
    return {}
  }
}

const updateMetadataValue = (metadata, key, value) => stringifyJson({ ...metadata, [key]: value })

const recordToForm = (record) => ({
  body: record.body || '',
  image: record.image || '',
  items: Array.isArray(record.items) ? record.items.join(', ') : '',
  metadata: stringifyJson(record.metadata),
  section_key: record.section_key || 'custom',
  section_type: record.section_type || 'list',
  service_id: record.service_id || '',
  service_package_id: record.service_package_id || '',
  is_visible: record.is_visible ?? true,
  sort_order: record.sort_order || 1,
  status: record.status || 'Active',
  subtitle: record.subtitle || '',
  title: record.title || '',
})

function SearchSelect({ label, options, placeholder = 'Search and select', value, onChange }) {
  const wrapperRef = useRef(null)
  const searchRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => String(option.value) === String(value))
  const filteredOptions = options
    .filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 80)

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus()
    }
  }, [isOpen])

  const selectOption = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="relative block" ref={wrapperRef}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <button
        className="mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-sm font-bold outline-none transition focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-xs text-slate-500">v</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#67B529]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              ref={searchRef}
              value={query}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              className="w-full px-3 py-2 text-left text-sm font-bold text-slate-500 hover:bg-slate-50"
              onClick={() => selectOption('')}
              type="button"
            >
              {placeholder}
            </button>
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                className={`w-full px-3 py-2 text-left text-sm font-bold hover:bg-[#EEF9E8] ${String(option.value) === String(value) ? 'bg-[#EEF9E8] text-[#67B529]' : 'text-slate-800'}`}
                key={option.value}
                onClick={() => selectOption(option.value)}
                type="button"
              >
                {option.label}
              </button>
            )) : (
              <div className="px-3 py-3 text-sm font-bold text-slate-400">No results found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ImageField({ label = 'Banner / section image', value, onChange }) {
  const [uploadMode, setUploadMode] = useState(() => {
    if (typeof value === 'string' && value.startsWith('http')) return 'url'
    return 'file'
  })
  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    onChange(file || '')
  }
  const previewUrl = value instanceof File ? URL.createObjectURL(value) : value

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 col-span-full shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-slate-700">{label}</span>
        <div className="flex rounded-md bg-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-bold transition-all ${
              uploadMode === 'file'
                ? 'bg-white text-[#67B529] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 Upload File
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-bold transition-all ${
              uploadMode === 'url'
                ? 'bg-white text-[#67B529] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔗 Paste Direct URL
          </button>
        </div>
      </div>

      <div className="mt-2 grid gap-3 lg:grid-cols-[1fr_160px] items-center">
        <div>
          {uploadMode === 'file' ? (
            <input
              accept="image/*"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none file:mr-2.5 file:cursor-pointer file:rounded file:border-0 file:bg-[#EEF9E8] file:px-2.5 file:py-1 file:text-xs file:font-black file:text-[#67B529] hover:file:bg-[#dff5d5]"
              onChange={handleUpload}
              type="file"
            />
          ) : (
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold outline-none focus:border-[#67B529] bg-white"
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://..."
              value={typeof value === 'string' ? value : ''}
            />
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {previewUrl ? (
            <img alt="Section preview" className="h-16 w-full object-contain bg-white p-1" src={previewUrl} />
          ) : (
            <div className="grid h-16 place-items-center text-xs font-bold text-slate-400">No image</div>
          )}
        </div>
      </div>
    </div>
  )
}

function TextArea({ label, monospace = false, onChange, placeholder, value }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        className={`mt-1.5 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#67B529] ${monospace ? 'font-mono' : ''}`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function ItemsEditor({ label = 'Items', onChange, value }) {
  const items = tagsToArray(value)
  const updateItem = (index, nextValue) => {
    const nextItems = [...items]
    nextItems[index] = nextValue
    onChange(nextItems)
  }

  const removeItem = (index) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-700">{label}</span>
        <ActionButton onClick={() => onChange([...items, ''])}>Add item</ActionButton>
      </div>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item, index) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" key={index}>
            <input
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={`${label} ${index + 1}`}
              value={item}
            />
            <ActionButton onClick={() => removeItem(index)} tone="danger">Remove</ActionButton>
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-400">No items added</div>
        )}
      </div>
    </div>
  )
}

function FaqEditor({ items, metadata, onItemsChange, onMetadataChange }) {
  const faqs = Array.isArray(metadata.faqs) && metadata.faqs.length
    ? metadata.faqs
    : tagsToArray(items).map((question) => ({ question, answer: '' }))
  const updateFaq = (index, field, value) => {
    const nextFaqs = faqs.map((faq, faqIndex) => (faqIndex === index ? { ...faq, [field]: value } : faq))
    onMetadataChange(updateMetadataValue(metadata, 'faqs', nextFaqs))
    onItemsChange(nextFaqs.map((faq) => faq.question).filter(Boolean))
  }
  const addFaq = () => {
    const nextFaqs = [...faqs, { question: '', answer: '' }]
    onMetadataChange(updateMetadataValue(metadata, 'faqs', nextFaqs))
  }
  const removeFaq = (index) => {
    const nextFaqs = faqs.filter((_, faqIndex) => faqIndex !== index)
    onMetadataChange(updateMetadataValue(metadata, 'faqs', nextFaqs))
    onItemsChange(nextFaqs.map((faq) => faq.question).filter(Boolean))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-700">Frequently asked questions</span>
        <ActionButton onClick={addFaq}>Add FAQ</ActionButton>
      </div>
      <div className="mt-3 grid gap-3">
        {faqs.length ? faqs.map((faq, index) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={index}>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
              <input
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
                onChange={(event) => updateFaq(index, 'question', event.target.value)}
                placeholder="Question"
                value={faq.question || ''}
              />
              <ActionButton onClick={() => removeFaq(index)} tone="danger">Remove</ActionButton>
            </div>
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold outline-none focus:border-[#67B529]"
              onChange={(event) => updateFaq(index, 'answer', event.target.value)}
              placeholder="Answer"
              value={faq.answer || ''}
            />
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-400">No FAQs added</div>
        )}
      </div>
    </div>
  )
}

function ReviewSummaryEditor({ metadata, onMetadataChange }) {
  const rating = Number(metadata.rating || 0)
  const setValue = (key, value) => onMetadataChange(updateMetadataValue(metadata, key, value))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-sm font-black text-slate-700">Customer reviews with stars</span>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">Rating</span>
          <input
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
            max="5"
            min="0"
            onChange={(event) => setValue('rating', event.target.value)}
            step="0.1"
            type="number"
            value={metadata.rating || ''}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">Reviews text</span>
          <input
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
            onChange={(event) => setValue('reviews', event.target.value)}
            placeholder="2.4M reviews"
            value={metadata.reviews || ''}
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">5 star percent</span>
          <input
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
            max="100"
            min="0"
            onChange={(event) => setValue('five_star_percent', Number(event.target.value || 0))}
            type="number"
            value={metadata.five_star_percent || ''}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xl text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            className={star <= Math.round(rating) ? 'text-amber-400' : 'text-slate-300'}
            key={star}
            onClick={() => setValue('rating', String(star))}
            type="button"
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

function BrandMultiSelect({ brands, onChange, value }) {
  const [query, setQuery] = useState('')
  const selectedBrands = tagsToArray(value)
  const filteredBrands = brands
    .filter((brand) => brand.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 100)
  const toggleBrand = (brandName) => {
    const nextBrands = selectedBrands.includes(brandName)
      ? selectedBrands.filter((item) => item !== brandName)
      : [...selectedBrands, brandName]
    onChange(nextBrands)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-black text-slate-700">We service all brands*</span>
        <span className="text-xs font-bold text-slate-400">Add/edit master brands from Catalog / Brands</span>
      </div>
      <input
        className="mt-3 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search brands..."
        value={query}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedBrands.length ? selectedBrands.map((brandName) => (
          <button
            className="rounded-full bg-[#EEF9E8] px-3 py-1.5 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20"
            key={brandName}
            onClick={() => toggleBrand(brandName)}
            type="button"
          >
            {brandName} x
          </button>
        )) : (
          <span className="text-sm font-bold text-slate-400">No brands selected</span>
        )}
      </div>
      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBrands.length ? filteredBrands.map((brand) => (
          <button
            className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${selectedBrands.includes(brand.name) ? 'border-[#67B529] bg-[#EEF9E8] text-[#67B529]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#67B529]/30'}`}
            key={brand.id}
            onClick={() => toggleBrand(brand.name)}
            type="button"
          >
            {brand.name}
          </button>
        )) : (
          <div className="col-span-full p-3 text-sm font-bold text-slate-400">No brands found</div>
        )}
      </div>
    </div>
  )
}

function SectionContentEditor({ brands, form, metadata, updateForm }) {
  const itemLabel = form.section_type === 'steps' ? 'Steps' : form.section_key === 'requirements' ? 'Cards' : 'Items'

  return (
    <div className="grid gap-4">
      {form.section_key === 'faq' || form.section_type === 'faq' ? (
        <FaqEditor
          items={form.items}
          metadata={metadata}
          onItemsChange={(items) => updateForm('items', items)}
          onMetadataChange={(value) => updateForm('metadata', value)}
        />
      ) : null}

      {form.section_key === 'reviews' || form.section_type === 'review_summary' ? (
        <ReviewSummaryEditor metadata={metadata} onMetadataChange={(value) => updateForm('metadata', value)} />
      ) : null}

      {form.section_key === 'brands' ? (
        <BrandMultiSelect brands={brands} onChange={(items) => updateForm('items', items)} value={form.items} />
      ) : null}

      {form.section_key !== 'faq' && form.section_type !== 'faq' && form.section_key !== 'reviews' && form.section_type !== 'review_summary' && form.section_key !== 'brands' ? (
        <ItemsEditor label={itemLabel} onChange={(items) => updateForm('items', items)} value={form.items} />
      ) : null}

      <TextArea label="Body / note" onChange={(value) => updateForm('body', value)} value={form.body} />
      <TextArea label="Metadata JSON" monospace onChange={(value) => updateForm('metadata', value)} placeholder='{"faqs":[{"question":"...","answer":"..."}]}' value={form.metadata} />
    </div>
  )
}

function VisibilityCheckbox({ checked, disabled = false, label = 'Visible in modal', onChange }) {
  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-slate-300 text-[#67B529] focus:ring-[#EEF9E8]0"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  )
}

function PackageDetailSectionsView({ onRefresh }) {
  const [sections, setSections] = useState([])
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [brands, setBrands] = useState([])
  const [activeKey, setActiveKey] = useState('all')
  const [editorMode, setEditorMode] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [subServiceFilter, setSubServiceFilter] = useState('')
  const [sectionNameFilter, setSectionNameFilter] = useState('')
  const [subServices, setSubServices] = useState([])
  const [loading, setLoading] = useState(false)

  const packageOptions = packages.map((item) => ({
    label: `#${item.id} - ${item.name}${item.service?.name ? ` (${item.service.name})` : ''}`,
    value: item.id,
  }))
  const serviceOptions = services.map((item) => ({ label: `#${item.id} - ${item.name}`, value: item.id }))
  const sectionKeyOptions = sectionTemplates.filter(([value]) => value !== 'all').map(([value, label]) => ({ label, value }))
  const sectionTypeOptions = sectionTypes.map((item) => ({ label: item.replace(/_/g, ' '), value: item }))
  const statusOptions = statuses.map((item) => ({ label: item, value: item }))
  const metadata = useMemo(() => parseMetadata(form.metadata), [form.metadata])
  const activeBrands = useMemo(
    () => [...brands].filter((brand) => brand.status !== 'Inactive').sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [brands],
  )
  const packageById = useMemo(
    () => new Map(packages.map((item) => [String(item.id), item])),
    [packages],
  )
  const serviceById = useMemo(
    () => new Map(services.map((item) => [String(item.id), item])),
    [services],
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const [sectionRows, serviceRows, packageRows, brandRows, subServiceRows] = await Promise.all([
        fetchAllRows('/service-package-sections'),
        fetchAllRows('/services'),
        fetchAllRows('/service-packages'),
        fetchAllRows('/brands'),
        fetchAllRows('/sub-services'),
      ])
      setSections(sectionRows)
      setServices(serviceRows)
      setPackages(packageRows)
      setBrands(brandRows)
      setSubServices(subServiceRows)
    } catch (error) {
      showErrorAlert('Unable to load sections', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const activeTemplate = (activeKey === 'all'
    ? sectionTemplates.find(([key]) => key === 'summary')
    : sectionTemplates.find(([key]) => key === activeKey)) || sectionTemplates.find(([key]) => key === 'summary')
  const resolvePackage = (section) => (
    section.service_package
    || section.servicePackage
    || packageById.get(String(section.service_package_id))
    || null
  )

  const resolveService = (section, servicePackage) => (
    section.service
    || serviceById.get(String(section.service_id))
    || servicePackage?.service
    || null
  )

  const subServiceOptions = useMemo(() => (
    subServices
      .filter((item) => !serviceFilter || String(item.service_id) === String(serviceFilter))
      .map((item) => ({ label: item.name, value: item.id }))
  ), [serviceFilter, subServices])

  const sectionNameOptions = useMemo(() => {
    const titles = new Set()
    sections.forEach((section) => {
      const title = String(section.title || '').trim()
      if (title) titles.add(title)
    })
    return [...titles].sort((left, right) => left.localeCompare(right))
  }, [sections])

  const visibleSections = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const hasQuery = Boolean(needle || serviceFilter || subServiceFilter || sectionNameFilter)

    return sections.filter((section) => {
      if (!hasQuery) {
        const matchesTab = activeKey === 'all'
          || (activeKey === 'custom'
            ? !sectionTemplates.some(([key]) => key === section.section_key && key !== 'custom' && key !== 'all')
            : section.section_key === activeKey)
        if (!matchesTab) return false
      }

      const servicePackage = resolvePackage(section)
      const service = resolveService(section, servicePackage)
      const serviceId = section.service_id || servicePackage?.service_id || service?.id
      const subServiceId = servicePackage?.sub_service_id
      if (sectionNameFilter && String(section.title || '') !== sectionNameFilter) return false
      if (serviceFilter && String(serviceId) !== String(serviceFilter)) return false
      if (subServiceFilter && String(subServiceId) !== String(subServiceFilter)) return false
      if (!needle) return true

      return [
        section.title,
        section.section_key,
        section.section_type,
        servicePackage?.name,
        service?.name,
        section.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [activeKey, packageById, search, sectionNameFilter, sections, serviceById, serviceFilter, subServiceFilter])

  const startAdd = () => {
    setEditorMode('add')
    setEditingRecord(null)
    setForm({
      ...blankForm,
      section_key: activeTemplate[0],
      section_type: activeTemplate[2],
      metadata: stringifyJson(defaultSectionMetadata[activeTemplate[0]]),
      title: defaultSectionTitles[activeTemplate[0]] || activeTemplate[1],
      sort_order: visibleSections.length + 1,
    })
  }

  const startEdit = (record) => {
    setEditorMode('edit')
    setEditingRecord(record)
    setForm(recordToForm(record))
  }

  const closeEditor = () => {
    setEditorMode(null)
    setEditingRecord(null)
    setForm(blankForm)
  }

  const updateForm = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'service_package_id') {
        const selectedPackage = packages.find((item) => String(item.id) === String(value))
        if (selectedPackage?.service_id && !next.service_id) {
          next.service_id = selectedPackage.service_id
        }
      }
      if (name === 'section_key') {
        const template = sectionTemplates.find(([key]) => key === value)
        if (template) {
          next.section_type = template[2]
          if (!next.title || sectionTemplates.some(([, title]) => title === next.title)) {
            next.title = defaultSectionTitles[value] || template[1]
          }
          if (!next.metadata && defaultSectionMetadata[value]) {
            next.metadata = stringifyJson(defaultSectionMetadata[value])
          }
        }
      }
      return next
    })
  }

  const saveSection = async (event) => {
    event.preventDefault()

    const duplicateSection = sections.find((section) =>
      String(section.service_package_id) === String(form.service_package_id)
      && String(section.section_key) === String(form.section_key)
      && String(section.id) !== String(editingRecord?.id || ''),
    )

    if (duplicateSection) {
      showErrorAlert('Duplicate section', 'This package already has this section. Edit the existing section instead.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        body: form.body || null,
        image: form.image || null,
        is_visible: Boolean(form.is_visible),
        items: tagsToArray(form.items),
        metadata: parseJson(form.metadata),
        section_key: form.section_key || 'custom',
        section_type: form.section_type,
        service_id: form.service_id ? Number(form.service_id) : null,
        service_package_id: form.service_package_id ? Number(form.service_package_id) : null,
        sort_order: Number(form.sort_order || 0),
        status: form.status || 'Active',
        subtitle: form.subtitle || null,
        title: form.title,
      }
      const requestPayload = form.image instanceof File
        ? Object.entries(payload).reduce((formData, [key, value]) => {
          if (value === null || value === undefined || value === '') return formData
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item))
          } else if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0')
          } else if (typeof value === 'object' && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, value)
          }
          return formData
        }, new FormData())
        : payload

      if (editingRecord?.id) {
        await adminApi.update('/service-package-sections', editingRecord.id, requestPayload)
        showSuccessAlert('Section updated')
      } else {
        await adminApi.create('/service-package-sections', requestPayload)
        showSuccessAlert('Section created')
      }
      closeEditor()
      await loadData()
      onRefresh?.()
    } catch (error) {
      showErrorAlert('Section save failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteSection = async (record) => {
    setLoading(true)
    try {
      await adminApi.remove('/service-package-sections', record.id)
      showSuccessAlert('Section deleted')
      await loadData()
      onRefresh?.()
    } catch (error) {
      showErrorAlert('Delete failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = async (record, isVisible) => {
    setSections((current) => current.map((section) => (
      String(section.id) === String(record.id) ? { ...section, is_visible: isVisible } : section
    )))

    try {
      await adminApi.update('/service-package-sections', record.id, { is_visible: isVisible })
      showSuccessAlert(isVisible ? 'Section visible' : 'Section hidden')
      onRefresh?.()
    } catch (error) {
      setSections((current) => current.map((section) => (
        String(section.id) === String(record.id) ? { ...section, is_visible: record.is_visible ?? true } : section
      )))
      showErrorAlert('Visibility update failed', error.message)
    }
  }

  if (editorMode) {
    return (
      <Panel
        action={<ActionButton onClick={closeEditor}>Back to sections</ActionButton>}
        subtitle="Use searchable dropdowns, URL images, manual upload, and full section content editing."
        title={`${editorMode === 'edit' ? 'Edit' : 'Add'} Package Detail Section`}
      >
        <form className="grid gap-5 p-4" onSubmit={saveSection}>
          <div className="grid gap-4 lg:grid-cols-2">
            <SearchSelect label="Service package" onChange={(value) => updateForm('service_package_id', value)} options={packageOptions} value={form.service_package_id} />
            <SearchSelect label="Service" onChange={(value) => updateForm('service_id', value)} options={serviceOptions} value={form.service_id} />
            <SearchSelect label="Section tab/key" onChange={(value) => updateForm('section_key', value)} options={sectionKeyOptions} value={form.section_key} />
            <SearchSelect label="Section type" onChange={(value) => updateForm('section_type', value)} options={sectionTypeOptions} value={form.section_type} />
            <label className="block">
              <span className="text-sm font-black text-slate-700">Section title</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]" onChange={(event) => updateForm('title', event.target.value)} value={form.title} />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-700">Subtitle</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]" onChange={(event) => updateForm('subtitle', event.target.value)} value={form.subtitle} />
            </label>
          </div>

          <ImageField
            label={form.section_key === 'summary' ? 'Modal banner image' : 'Section image'}
            onChange={(value) => updateForm('image', value)}
            value={form.image}
          />

          <SectionContentEditor brands={activeBrands} form={form} metadata={metadata} updateForm={updateForm} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-4">
              <label className="block">
                <span className="text-sm font-black text-slate-700">Display order</span>
                <input className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#67B529]" onChange={(event) => updateForm('sort_order', event.target.value)} type="number" value={form.sort_order} />
              </label>
              <VisibilityCheckbox checked={Boolean(form.is_visible)} onChange={(value) => updateForm('is_visible', value)} />
              <SearchSelect label="Status" onChange={(value) => updateForm('status', value)} options={statusOptions} value={form.status} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <ActionButton onClick={closeEditor}>Cancel</ActionButton>
            <button className="rounded-lg bg-[#67B529] px-4 py-2 text-sm font-black text-white hover:bg-[#5CA827]" disabled={loading} type="submit">
              {loading ? 'Saving...' : 'Save section'}
            </button>
          </div>
        </form>
      </Panel>
    )
  }

  const columns = [
    { key: 'title', label: 'Section', className: 'w-[15%]' },
    { key: 'package_name', label: 'Package', className: 'w-[21%]' },
    { key: 'service_name', label: 'Service', className: 'w-[15%]' },
    { key: 'section_type', label: 'Type', className: 'w-[8%]' },
    { key: 'sort_order', label: 'Order', className: 'w-[6%] text-center' },
    { key: 'is_visible', label: 'Visible', className: 'w-[7%] text-center' },
    { key: 'status', label: 'Status', className: 'w-[8%]' },
    { key: 'actions', label: 'Action', className: 'w-[14%]' },
  ]
  const rows = visibleSections.map((section) => {
    const servicePackage = resolvePackage(section)
    const service = resolveService(section, servicePackage)

    return {
      ...section,
      package_name: <span className="block truncate">{servicePackage?.name || section.package_name || 'Not selected'}</span>,
      service_name: <span className="block truncate">{service?.name || section.service_name_label || section.service_name || 'Not selected'}</span>,
      title: <span className="block truncate font-bold text-slate-800">{section.title}</span>,
      status: <StatusBadge>{section.status || 'Active'}</StatusBadge>,
      is_visible: (
        <input
          checked={section.is_visible ?? true}
          className="h-4 w-4 rounded border-slate-300 text-[#67B529] focus:ring-[#67B529]/20"
          disabled={loading}
          onChange={(event) => toggleVisibility(section, event.target.checked)}
          title={section.is_visible ?? true ? 'Visible' : 'Hidden'}
          type="checkbox"
        />
      ),
      actions: (
        <div className="flex flex-nowrap items-center justify-center gap-1">
          <ActionButton onClick={() => startEdit(section)} size="sm">Edit</ActionButton>
          <ActionButton onClick={() => deleteSection(section)} size="sm" tone="danger">Delete</ActionButton>
        </div>
      ),
    }
  })

  const filterSelectClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529] sm:w-44'

  return (
    <Panel>
      <div className="border-b border-slate-100 bg-white px-3 py-2.5">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-thin-scrollbar">
          {sectionTemplates.map(([key, label]) => (
            <button
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition ${activeKey === key ? 'bg-[#67B529] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EEF9E8] hover:text-[#67B529]'}`}
              key={key}
              onClick={() => setActiveKey(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[#67B529]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sections..."
            value={search}
          />
          <select
            className={filterSelectClass}
            onChange={(event) => setSectionNameFilter(event.target.value)}
            value={sectionNameFilter}
          >
            <option value="">All Section names</option>
            {sectionNameOptions.map((title) => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
          <select
            className={filterSelectClass}
            onChange={(event) => {
              setServiceFilter(event.target.value)
              setSubServiceFilter('')
            }}
            value={serviceFilter}
          >
            <option value="">All Services</option>
            {services.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select
            className={filterSelectClass}
            onChange={(event) => setSubServiceFilter(event.target.value)}
            value={subServiceFilter}
          >
            <option value="">All Sub-services</option>
            {subServiceOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <ActionButton className="shrink-0" onClick={startAdd} size="sm" tone="primary">Add Section</ActionButton>
        </div>
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          Showing {visibleSections.length} of {sections.length} sections
        </p>
      </div>
      <DataTable
        columns={columns}
        compact
        dense
        fitToWidth
        key={`sections-${activeKey}-${search}-${serviceFilter}-${subServiceFilter}-${sectionNameFilter}-${sections.length}`}
        pageSize={25}
        paginated
        rows={rows}
      />
      {loading && <div className="p-3 text-sm font-bold text-slate-500">Loading...</div>}
    </Panel>
  )
}

export default PackageDetailSectionsView
