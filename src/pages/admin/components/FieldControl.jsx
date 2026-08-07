import { useState } from 'react'

function FieldControl({ field, value, onChange }) {
  const safeValue = value ?? ''
  const commonClass = 'mt-1.5 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20 read-only:cursor-not-allowed read-only:border-slate-300 read-only:bg-slate-100 read-only:text-slate-600 read-only:focus:border-slate-300 read-only:focus:ring-0'
  const previewUrl = value instanceof File ? URL.createObjectURL(value) : value
  const [uploadMode, setUploadMode] = useState(() => {
    if (typeof value === 'string' && value.startsWith('http')) {
      return 'url'
    }
    return 'file'
  })

  if (field.type === 'textarea' || field.type === 'json') {
    return (
      <label className="block col-span-full">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <textarea
          className={`${commonClass} min-h-20 font-mono`}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.type === 'json' ? '{"key":"value"}' : field.label}
          value={typeof safeValue === 'object' && safeValue !== null ? JSON.stringify(safeValue, null, 2) : safeValue}
        />
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <select className={commonClass} onChange={(event) => onChange(field.name, event.target.value)} value={safeValue}>
          <option value="">Select</option>
          {(field.options || []).map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>
          ))}
        </select>
        {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
      </label>
    )
  }

  if (field.type === 'multiselect') {
    return (
      <MultiSelectField
        commonClass={commonClass}
        field={field}
        onChange={onChange}
        value={value}
      />
    )
  }

  if (field.type === 'file' || field.type === 'image') {
    return (
      <div className="block col-span-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-700">{field.label}</span>
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

        {uploadMode === 'file' ? (
          <input
            accept={field.accept || (field.type === 'image' ? 'image/*' : '*/*')}
            className={`${commonClass} !mt-1 file:mr-2.5 file:cursor-pointer file:rounded file:border-0 file:bg-[#EEF9E8] file:px-2.5 file:py-1 file:text-xs file:font-black file:text-[#67B529] hover:file:bg-[#dff5d5]`}
            onChange={(event) => onChange(field.name, event.target.files?.[0] || '')}
            required={field.required && !value}
            type="file"
          />
        ) : (
          <input
            className={`${commonClass} !mt-1`}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={`Paste direct ${field.type === 'image' ? 'image' : 'file'} URL (e.g. https://...)`}
            type="text"
            value={typeof safeValue === 'string' ? safeValue : ''}
          />
        )}

        {previewUrl && typeof previewUrl === 'string' && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1.5 shadow-2xs">
            {previewUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(?:\?.*)?$/i) || field.type === 'image' || value instanceof File ? (
              <div className="flex w-full items-center gap-2.5">
                <img alt="Preview" className="h-12 w-20 shrink-0 rounded object-contain bg-white border border-slate-200" src={previewUrl} />
                <div className="overflow-hidden text-left font-sans">
                  <p className="text-xs font-bold text-slate-700 truncate max-w-sm">{value instanceof File ? value.name : value}</p>
                  <span className="mt-0.5 inline-block rounded bg-[#EEF9E8] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#67B529]">Image Selected</span>
                </div>
              </div>
            ) : (
              <a className="inline-flex items-center gap-1.5 py-1 text-xs font-black text-sky-700 underline hover:text-sky-900" href={previewUrl} rel="noreferrer" target="_blank">
                📄 View / Download Selected File
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{field.label}</span>
      <input
        className={commonClass}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.type === 'tags' ? 'Comma separated values' : field.label}
        readOnly={field.readOnly}
        required={field.required}
        step={field.step}
        type={field.type === 'tags' ? 'text' : field.type || 'text'}
        value={safeValue}
      />
    </label>
  )
}

function MultiSelectField({ commonClass, field, onChange, value }) {
  const [query, setQuery] = useState('')
  const selectedValues = (Array.isArray(value) ? value : String(value || '').split(','))
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => (Number.isFinite(Number(item)) ? String(Number(item)) : item))

  const options = (field.options || []).map((option) => ({
    label: String(option.label ?? option),
    value: String(option.value ?? option),
  }))

  const filteredOptions = options.filter((option) => {
    const haystack = `${option.label} ${option.value}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const toIdArray = (values) => values
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)

  const toggleValue = (optionValue) => {
    const nextValue = String(optionValue)
    const nextSelected = selectedValues.includes(nextValue)
      ? selectedValues.filter((item) => item !== nextValue)
      : [...selectedValues, nextValue]
    onChange(field.name, toIdArray(nextSelected))
  }

  const selectFiltered = () => {
    const merged = [...new Set([
      ...selectedValues,
      ...filteredOptions.map((option) => option.value),
    ])]
    onChange(field.name, toIdArray(merged))
  }

  const clearSelected = () => onChange(field.name, [])

  return (
    <div className="block col-span-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <span className="text-xs font-bold text-slate-500">{selectedValues.length} selected · IDs only</span>
      </div>
      {field.hint ? <p className="mt-1 text-xs font-semibold text-slate-500">{field.hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          className={`${commonClass} !mt-0 min-w-[220px] flex-1`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${String(field.label || '').toLowerCase()}...`}
          type="text"
          value={query}
        />
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-[#67B529] hover:text-[#67B529]"
          onClick={selectFiltered}
          type="button"
        >
          Select visible
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-rose-400 hover:text-rose-600"
          onClick={clearSelected}
          type="button"
        >
          Clear
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {selectedValues.length ? selectedValues.map((selected) => {
          const option = options.find((item) => item.value === String(selected))
          return (
            <button
              className="rounded-full bg-[#EEF9E8] px-3 py-1.5 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20"
              key={selected}
              onClick={() => toggleValue(selected)}
              type="button"
            >
              {option?.label || `ID ${selected}`} ×
            </button>
          )
        }) : (
          <span className="text-sm font-bold text-slate-400">Nothing selected yet</span>
        )}
      </div>

      {selectedValues.length > 0 && (
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          Stored IDs: [{selectedValues.join(', ')}]
        </p>
      )}

      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 custom-thin-scrollbar">
        {filteredOptions.length ? filteredOptions.map((option) => {
          const isSelected = selectedValues.includes(option.value)
          return (
            <button
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                isSelected
                  ? 'bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/25'
                  : 'bg-white text-slate-700 hover:bg-white'
              }`}
              key={option.value}
              onClick={() => toggleValue(option.value)}
              type="button"
            >
              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${isSelected ? 'border-[#67B529] bg-[#67B529] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                ✓
              </span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
                ID {option.value}
              </span>
            </button>
          )
        }) : (
          <p className="px-2 py-3 text-sm font-semibold text-slate-400">
            {options.length ? 'No matches found' : 'No options loaded yet. Re-open this form after packages refresh.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default FieldControl
