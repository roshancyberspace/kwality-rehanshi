import { useEffect, useMemo, useRef, useState } from 'react'

const CUSTOM_SELECT_VALUE = '__custom__'

function looksLikeVideoSource(previewUrl, value) {
  if (value instanceof File) return String(value.type || '').startsWith('video/')
  if (typeof previewUrl !== 'string' || !previewUrl) return false
  if (previewUrl.match(/\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:\?.*)?$/i)) return true
  if (/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\//i.test(previewUrl)) return true
  return false
}

function looksLikeImageSource(previewUrl, value, fieldType) {
  if (value instanceof File) return String(value.type || '').startsWith('image/')
  if (typeof previewUrl !== 'string' || !previewUrl) return false
  if (previewUrl.startsWith('blob:') && !looksLikeVideoSource(previewUrl, value)) return true
  if (previewUrl.startsWith('data:image')) return true
  if (previewUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)(?:\?.*)?$/i)) return true
  if (fieldType === 'image' && (previewUrl.startsWith('/') || previewUrl.includes('/') || previewUrl.length > 8)) return true
  if (/^https?:\/\//i.test(previewUrl) && !previewUrl.match(/\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:\?.*)?$/i)) return true
  return false
}

function normalizeSelectOptions(options = []) {
  return options.map((option) => ({
    label: String(option.label ?? option),
    value: String(option.value ?? option),
    ...((option && typeof option === 'object') ? option : {}),
  }))
}

function RichTextField({ field, onChange, value }) {
  const editorRef = useRef(null)
  const [mode, setMode] = useState('visual')
  const htmlValue = typeof value === 'string' ? value : ''

  useEffect(() => {
    if (mode !== 'visual' || !editorRef.current) return
    if (editorRef.current.innerHTML !== htmlValue) {
      editorRef.current.innerHTML = htmlValue || ''
    }
  }, [htmlValue, mode])

  const syncFromEditor = () => {
    if (!editorRef.current) return
    onChange(field.name, editorRef.current.innerHTML)
  }

  const execCommand = (command, commandValue = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    syncFromEditor()
  }

  const applyTextColor = () => {
    const color = window.prompt('Text color (hex or name)', '#FFFFFF')
    if (!color) return
    execCommand('foreColor', color)
  }

  const applyFontSize = (size) => {
    execCommand('fontSize', size)
  }

  const toolbarBtn = 'px-2 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100'

  return (
    <div className="block col-span-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <div className="flex rounded-md bg-slate-200 p-0.5">
          <button
            className={`rounded px-2.5 py-0.5 text-xs font-bold transition ${mode === 'visual' ? 'bg-white text-[#003F86] shadow-xs' : 'text-slate-600'}`}
            onClick={() => setMode('visual')}
            type="button"
          >
            Visual
          </button>
          <button
            className={`rounded px-2.5 py-0.5 text-xs font-bold transition ${mode === 'html' ? 'bg-white text-[#003F86] shadow-xs' : 'text-slate-600'}`}
            onClick={() => {
              if (mode === 'visual') syncFromEditor()
              setMode('html')
            }}
            type="button"
          >
            HTML
          </button>
        </div>
      </div>

      <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-400 bg-white">
        {mode === 'visual' ? (
          <>
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
              <button className={toolbarBtn} onClick={() => execCommand('bold')} title="Bold" type="button">B</button>
              <button className={`${toolbarBtn} italic`} onClick={() => execCommand('italic')} title="Italic" type="button">I</button>
              <button className={`${toolbarBtn} underline`} onClick={() => execCommand('underline')} title="Underline" type="button">U</button>
              <span className="text-slate-300 px-0.5">|</span>
              <button className={toolbarBtn} onClick={() => applyFontSize('3')} title="Normal size" type="button">A</button>
              <button className={toolbarBtn} onClick={() => applyFontSize('5')} title="Large size" type="button">A+</button>
              <button className={toolbarBtn} onClick={() => applyFontSize('6')} title="XL size" type="button">A++</button>
              <span className="text-slate-300 px-0.5">|</span>
              <button className={toolbarBtn} onClick={applyTextColor} title="Text color" type="button">Color</button>
              <button className={toolbarBtn} onClick={() => execCommand('justifyLeft')} title="Align left" type="button">Left</button>
              <button className={toolbarBtn} onClick={() => execCommand('justifyCenter')} title="Align center" type="button">Center</button>
              <button
                className={toolbarBtn}
                onClick={() => {
                  const url = window.prompt('Enter link URL')
                  if (url) execCommand('createLink', url)
                }}
                title="Insert link"
                type="button"
              >
                Link
              </button>
              <button className={toolbarBtn} onClick={() => execCommand('removeFormat')} title="Clear formatting" type="button">Clear</button>
            </div>
            <div
              className="min-h-28 max-h-56 overflow-y-auto px-3 py-2 text-sm text-slate-800 outline-none prose prose-sm max-w-none [&_p]:my-1"
              contentEditable
              onBlur={syncFromEditor}
              onInput={syncFromEditor}
              ref={editorRef}
              suppressContentEditableWarning
            />
          </>
        ) : (
          <textarea
            className="min-h-28 w-full bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-300 outline-none"
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder="<p>Your formatted text...</p>"
            value={htmlValue}
          />
        )}
      </div>
      {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
    </div>
  )
}

function SelectField({ commonClass, field, onChange, value }) {
  const options = useMemo(() => normalizeSelectOptions(field.options), [field.options])
  const optionValues = useMemo(() => options.map((option) => option.value), [options])
  const stringValue = String(value ?? '')
  const valueIsCustom = Boolean(field.allowCustom && stringValue !== '' && !optionValues.includes(stringValue))
  const [customMode, setCustomMode] = useState(valueIsCustom)

  useEffect(() => {
    if (valueIsCustom) setCustomMode(true)
    if (stringValue && optionValues.includes(stringValue)) setCustomMode(false)
  }, [optionValues, stringValue, valueIsCustom])

  const showCustomInput = Boolean(field.allowCustom && !field.customSentinel && (customMode || valueIsCustom))
  const selectValue = (showCustomInput || (field.customSentinel && stringValue === CUSTOM_SELECT_VALUE))
    ? CUSTOM_SELECT_VALUE
    : stringValue

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{field.label}</span>
      <select
        className={commonClass}
        disabled={field.readOnly}
        onChange={(event) => {
          const next = event.target.value
          if (next === CUSTOM_SELECT_VALUE) {
            setCustomMode(true)
            if (field.customSentinel) {
              onChange(field.name, CUSTOM_SELECT_VALUE)
              return
            }
            if (!valueIsCustom) onChange(field.name, '')
            return
          }
          setCustomMode(false)
          onChange(field.name, next)
        }}
        required={field.required && !stringValue}
        value={selectValue}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
        ))}
        {field.allowCustom ? <option value={CUSTOM_SELECT_VALUE}>Custom...</option> : null}
      </select>
      {showCustomInput ? (
        field.customType === 'textarea' || field.name === 'warranty' ? (
          <textarea
            className={`${commonClass} !mt-2 min-h-[72px] resize-y`}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.customPlaceholder || `Custom ${String(field.label || '').toLowerCase()}`}
            required={field.required}
            rows={field.customRows || 3}
            value={stringValue}
          />
        ) : (
          <input
            className={`${commonClass} !mt-2`}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.customPlaceholder || `Custom ${String(field.label || '').toLowerCase()}`}
            required={field.required}
            type="text"
            value={stringValue}
          />
        )
      ) : null}
      {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
    </label>
  )
}

const COLOR_PRESETS = [
  '#6D28D9',
  '#003F86',
  '#67B529',
  '#0F172A',
  '#000000',
  '#FFFFFF',
  '#DC2626',
  '#F97316',
  '#EC4899',
  '#0EA5E9',
]

function toPickerHex(value, fallback = '#000000') {
  const raw = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase()
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toUpperCase()
  }
  return fallback
}

function ColorField({ commonClass, field, onChange, value }) {
  const hexValue = String(value || field.defaultValue || '')
  const pickerValue = toPickerHex(hexValue, toPickerHex(field.defaultValue, '#000000'))
  const selectedHex = toPickerHex(hexValue, '')

  const commitHex = (next) => {
    onChange(field.name, toPickerHex(next, next))
  }

  return (
    <div className="block">
      <span className="text-sm font-bold text-slate-700">{field.label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          aria-label={`${field.label} palette`}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-400 bg-white p-0.5 outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
          onChange={(event) => commitHex(event.target.value)}
          title="Open color palette"
          type="color"
          value={pickerValue}
        />
        <input
          className={`${commonClass} !mt-0 font-mono uppercase`}
          onBlur={() => {
            if (!hexValue.trim()) return
            commitHex(hexValue)
          }}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder="#6D28D9"
          required={field.required}
          type="text"
          value={hexValue}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((preset) => {
          const isActive = selectedHex === preset
          return (
            <button
              aria-label={`Choose ${preset}`}
              className={`h-6 w-6 rounded-md border shadow-xs transition hover:scale-110 ${
                isActive ? 'ring-2 ring-[#67B529] ring-offset-1 border-slate-700' : 'border-slate-300'
              }`}
              key={preset}
              onClick={() => commitHex(preset)}
              style={{ backgroundColor: preset }}
              title={preset}
              type="button"
            />
          )
        })}
      </div>
      {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
    </div>
  )
}

function getCleanFileName(previewUrl, value) {
  if (value instanceof File) return value.name
  if (typeof previewUrl !== 'string' || !previewUrl) return ''
  try {
    const urlObj = new URL(previewUrl, window.location.origin)
    const filename = urlObj.pathname.split('/').filter(Boolean).pop()
    if (filename) return decodeURIComponent(filename)
  } catch {
    const filename = previewUrl.split('?')[0].split('/').filter(Boolean).pop()
    if (filename) return decodeURIComponent(filename)
  }
  return previewUrl
}

function MediaUploadField({ commonClass, field, onChange, value }) {
  const isMediaType = field.type === 'media'
  const safeValue = value ?? ''
  const previewUrl = value instanceof File ? URL.createObjectURL(value) : value
  const isVideo = looksLikeVideoSource(previewUrl, value)
  const isImg = looksLikeImageSource(previewUrl, value, field.type)
  const hasValue = Boolean(value)
  const [isChanging, setIsChanging] = useState(false)
  const [uploadMode, setUploadMode] = useState(() => (typeof value === 'string' && value.startsWith('http') ? 'url' : 'file'))

  return (
    <div className="block col-span-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        {!hasValue || isChanging ? (
          <button
            type="button"
            onClick={() => setUploadMode((prev) => (prev === 'file' ? 'url' : 'file'))}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
          >
            {uploadMode === 'file' ? '🔗 Paste URL' : '📁 Upload File'}
          </button>
        ) : null}
      </div>

      {hasValue && !isChanging ? (
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 p-2 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black border border-slate-200/80 shadow-2xs flex items-center justify-center">
              {isVideo ? (
                <>
                  <video
                    src={previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/95 text-slate-900 shadow-xs text-[10px] font-bold pl-0.5">
                      ▶
                    </span>
                  </div>
                </>
              ) : isImg ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-full w-full object-cover bg-white"
                />
              ) : (
                <span className="text-xl">📄</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate" title={typeof safeValue === 'string' ? safeValue : ''}>
                {getCleanFileName(previewUrl, value)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isVideo ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isVideo ? '🎬 Video' : '🖼️ Image'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsChanging(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(field.name, '')
              setIsChanging(false)
            }}
            className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition cursor-pointer"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {uploadMode === 'file' ? (
              <input
                accept={field.accept || (field.type === 'image' ? 'image/*' : isMediaType ? 'image/*,video/*' : '*/*')}
                className={`${commonClass} !mt-0 file:mr-2.5 file:cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-[#003F86] hover:file:bg-blue-100`}
                onChange={(event) => {
                  onChange(field.name, event.target.files?.[0] || '')
                  setIsChanging(false)
                }}
                required={field.required && !value}
                type="file"
              />
            ) : (
              <input
                className={`${commonClass} !mt-0`}
                onChange={(event) => onChange(field.name, event.target.value)}
                onBlur={() => { if (value) setIsChanging(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsChanging(false) }}
                placeholder={field.placeholder || `Paste ${isMediaType ? 'image or video' : 'image'} URL`}
                type="text"
                value={typeof safeValue === 'string' ? safeValue : ''}
              />
            )}
          </div>
          {isChanging && hasValue ? (
            <button
              type="button"
              onClick={() => setIsChanging(false)}
              className="h-9 px-2.5 shrink-0 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
          ) : null}
        </div>
      )}

      {field.hint ? <span className="mt-1 block text-xs text-slate-400">{field.hint}</span> : null}
    </div>
  )
}

function FieldControl({ field, value, onChange }) {
  const safeValue = value ?? ''
  const commonClass = 'mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20 read-only:cursor-not-allowed read-only:border-slate-300 read-only:bg-slate-100 read-only:text-slate-600 read-only:focus:border-slate-300 read-only:focus:ring-0'

  if (field.type === 'checkbox') {
    const isChecked = Boolean(value === true || value === 1 || value === '1' || value === 'true')
    return (
      <div className="flex flex-col justify-start">
        <label className="flex items-center gap-2.5 cursor-pointer select-none mt-3.5 sm:mt-5">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => onChange(field.name, event.target.checked ? 1 : 0)}
            className="h-4.5 w-4.5 rounded border-slate-400 text-[#4E9B1F] focus:ring-[#4E9B1F] cursor-pointer"
          />
          <span className="text-sm font-bold text-slate-700">{field.label}</span>
        </label>
        {field.hint ? <span className="mt-0.5 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
      </div>
    )
  }

  if (field.type === 'richtext') {
    return <RichTextField field={field} onChange={onChange} value={safeValue} />
  }

  if (field.type === 'color') {
    return (
      <ColorField
        commonClass={commonClass}
        field={field}
        onChange={onChange}
        value={safeValue}
      />
    )
  }

  if (field.type === 'tags') {
    return (
      <label className="block">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <textarea
          className={`${commonClass} min-h-[72px] resize-y`}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder || (field.hint || 'Comma separated values')}
          value={Array.isArray(safeValue) ? safeValue.join(', ') : safeValue}
          rows={field.rows || 3}
        />
        {field.hint ? <span className="mt-0.5 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
      </label>
    )
  }

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
        {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <SelectField
        commonClass={commonClass}
        field={field}
        onChange={onChange}
        value={safeValue}
      />
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

  if (field.type === 'file' || field.type === 'image' || field.type === 'media') {
    return (
      <MediaUploadField
        commonClass={commonClass}
        field={field}
        onChange={onChange}
        value={value}
      />
    )
  }

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{field.label}</span>
      <input
        className={commonClass}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder || (field.type === 'tags' ? 'Comma separated values' : field.label)}
        readOnly={field.readOnly}
        required={field.required}
        step={field.inputStep ?? field.step}
        type={field.type === 'tags' ? 'text' : field.type || 'text'}
        value={safeValue}
      />
      {field.hint ? <span className="mt-1 block text-xs font-semibold text-slate-500">{field.hint}</span> : null}
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
