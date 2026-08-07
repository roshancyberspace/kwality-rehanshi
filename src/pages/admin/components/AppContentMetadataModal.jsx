import { useState } from 'react'
import { ActionButton, Modal } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { showErrorAlert, showSuccessAlert } from '../utils/confirmations'

const parseInitialMetadata = (val) => {
  if (!val) return {}
  if (typeof val === 'string') {
    try { return JSON.parse(val) || {} } catch (e) { return {} }
  }
  return typeof val === 'object' ? { ...val } : {}
}

const formatKeyLabel = (key) => {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function AppContentMetadataModal({ isSaving, onClose, onSave, record }) {
  if (!record) return null

  const [meta, setMeta] = useState(() => parseInitialMetadata(record.metadata))
  const [customKeyName, setCustomKeyName] = useState('')
  const [customKeyType, setCustomKeyType] = useState('text')
  const [uploadingId, setUploadingId] = useState('')

  const handleFileUpload = async (file, callback, id) => {
    if (!file) return
    setUploadingId(id)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadMedia(formData)
      if (res && res.url) {
        callback(res.url)
        showSuccessAlert('File Uploaded', 'File successfully uploaded and direct URL populated.')
      }
    } catch (err) {
      showErrorAlert('Upload Failed', err.message || 'Failed to upload media file.')
    } finally {
      setUploadingId('')
    }
  }

  const handleValueChange = (key, value, isNumber = false) => {
    setMeta((current) => ({
      ...current,
      [key]: isNumber ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleRemoveKey = (key) => {
    setMeta((current) => {
      const copy = { ...current }
      delete copy[key]
      return copy
    })
  }

  const handleArrayItemChange = (key, idx, newVal) => {
    setMeta((current) => {
      const arr = Array.isArray(current[key]) ? [...current[key]] : []
      arr[idx] = newVal
      return { ...current, [key]: arr }
    })
  }

  const handleArrayItemRemove = (key, idx) => {
    setMeta((current) => {
      const arr = Array.isArray(current[key]) ? [...current[key]] : []
      arr.splice(idx, 1)
      return { ...current, [key]: arr }
    })
  }

  const handleArrayItemAdd = (key, emptyVal = '') => {
    setMeta((current) => {
      const arr = Array.isArray(current[key]) ? [...current[key]] : []
      arr.push(emptyVal)
      return { ...current, [key]: arr }
    })
  }

  const handleObjectItemPropertyChange = (key, idx, prop, propVal) => {
    setMeta((current) => {
      const arr = Array.isArray(current[key]) ? [...current[key]] : []
      const currentObj = typeof arr[idx] === 'object' && arr[idx] !== null ? { ...arr[idx] } : {}
      currentObj[prop] = propVal
      arr[idx] = currentObj
      return { ...current, [key]: arr }
    })
  }

  const addPreset = (presetType) => {
    setMeta((current) => {
      if (presetType === 'stats') {
        return { ...current, stats: current.stats?.length ? current.stats : [{ value: '4.8', label: 'Average rating' }] }
      }
      if (presetType === 'items') {
        return { ...current, items: current.items?.length ? current.items : ['Verified Professionals', 'Transparent Pricing'] }
      }
      if (presetType === 'keywords') {
        return { ...current, keywords: current.keywords?.length ? current.keywords : ['salon', 'beauty', 'care'] }
      }
      if (presetType === 'images') {
        return { ...current, images: current.images?.length ? current.images : [''] }
      }
      if (presetType === 'config') {
        return { ...current, mode: current.mode || 'auto', limit: current.limit ?? 4, service_ids: current.service_ids || [] }
      }
      return current
    })
  }

  const addCustomKey = (e) => {
    e.preventDefault()
    const cleanKey = customKeyName.trim().toLowerCase().replace(/\s+/g, '_')
    if (!cleanKey) return
    if (cleanKey in meta) {
      setCustomKeyName('')
      return
    }
    setMeta((current) => {
      let initialVal = ''
      if (customKeyType === 'number') initialVal = 0
      else if (customKeyType === 'array_text') initialVal = ['']
      else if (customKeyType === 'array_obj') initialVal = [{ value: '', label: '' }]
      return { ...current, [cleanKey]: initialVal }
    })
    setCustomKeyName('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const cleanedMeta = { ...meta }
    Object.keys(cleanedMeta).forEach((k) => {
      const v = cleanedMeta[k]
      if (Array.isArray(v)) {
        cleanedMeta[k] = v.filter((item) => {
          if (item === null || item === undefined) return false
          if (typeof item === 'string' && item.trim() === '') return false
          if (typeof item === 'object') {
            return Object.values(item).some((val) => val && String(val).trim() !== '')
          }
          return true
        })
      }
    })
    onSave(record, cleanedMeta)
  }

  const keys = Object.keys(meta)

  return (
    <Modal noPadding onClose={onClose} title="Edit App Content Metadata">
      <form className="flex max-h-[85vh] flex-col" onSubmit={handleSubmit}>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-thin-scrollbar">
          <div className="rounded-xl border border-[#67B529]/30 bg-[#EEF9E8]/40 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#67B529]">Content Type</span>
              <p className="font-mono text-sm font-bold text-slate-800">{record.type || 'Custom Banner'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-wider text-[#67B529]">Title</span>
              <p className="text-sm font-black text-slate-800">{record.title || '-'}</p>
            </div>
          </div>
          <p className="mt-2 border-t border-[#67B529]/20 pt-2 text-xs font-medium text-slate-600">
            Edit metadata fields using human-readable inputs below. Changes are saved back to the database in exact JSON formatting.
          </p>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <svg aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <p className="mt-2 text-sm font-bold text-slate-700">No metadata properties configured</p>
            <p className="mt-1 text-xs text-slate-500">Use the preset buttons or custom key creator below to add properties.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {keys.map((key) => {
              const val = meta[key]
              const isArray = Array.isArray(val)
              const isArrayOfObjects = isArray && (
                key === 'stats' ||
                key === 'faqs' ||
                key === 'testimonials' ||
                (val.length > 0 && typeof val[0] === 'object' && val[0] !== null)
              )
              const isArrayOfStrings = isArray && !isArrayOfObjects

              if (isArrayOfObjects) {
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4.5 shadow-xs transition hover:border-slate-300" key={key}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-base font-black text-slate-800">{formatKeyLabel(key)}</span>
                        <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">List of Objects ({key})</span>
                      </div>
                      <button
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => handleRemoveKey(key)}
                        type="button"
                      >
                        Remove property
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {val.map((itemObj, idx) => {
                        const cardObj = typeof itemObj === 'object' && itemObj ? itemObj : { value: '', label: '' }
                        return (
                          <div className="flex flex-wrap items-center gap-3 pb-1   md:flex-nowrap" key={idx}>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-600">
                              #{idx + 1}
                            </div>
                            <div className="grid min-w-40 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                              <label className="block">
                                <span className="text-xs font-bold text-slate-600">Value / Metric</span>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
                                  onChange={(e) => handleObjectItemPropertyChange(key, idx, 'value', e.target.value)}
                                  placeholder="e.g. 4.8 or 12M+"
                                  type="text"
                                  value={cardObj.value ?? ''}
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-bold text-slate-600">Label / Description</span>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
                                  onChange={(e) => handleObjectItemPropertyChange(key, idx, 'label', e.target.value)}
                                  placeholder="e.g. Average rating"
                                  type="text"
                                  value={cardObj.label ?? ''}
                                />
                              </label>
                            </div>
                            <button
                              aria-label="Remove stat"
                              className="mt-5 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 md:mt-0"
                              onClick={() => handleArrayItemRemove(key, idx)}
                              type="button"
                            >
                              <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M3 6h18M8 6V4h8v2M19 6 18 20H6L5 6M10 11v5M14 11v5" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      className="mt-4 flex items-center gap-1.5 rounded-xl border border-dashed border-[#67B529] bg-[#EEF9E8]/50 px-3.5 py-1.5 text-xs font-black text-[#67B529] transition hover:bg-[#EEF9E8]"
                      onClick={() => handleArrayItemAdd(key, { value: '', label: '' })}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add another {formatKeyLabel(key).slice(0, -1) || 'item'}
                    </button>
                  </div>
                )
              }

              if (isArrayOfStrings) {
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4.5 shadow-xs transition hover:border-slate-300" key={key}>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-base font-black text-slate-800">{formatKeyLabel(key)}</span>
                        <span className="ml-2 rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800">List of Values ({key})</span>
                      </div>
                      <button
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => handleRemoveKey(key)}
                        type="button"
                      >
                        Remove property
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2.5">
                      {val.map((itemStr, idx) => {
                        const isImage = typeof itemStr === 'string' && (itemStr.startsWith('http') || itemStr.startsWith('/')) && itemStr.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(?:\?.*)?$/i)
                        return (
                          <div className="flex items-center gap-2" key={idx}>
                            <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                            <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
                              <input
                                className="w-full min-w-40 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
                                onChange={(e) => handleArrayItemChange(key, idx, e.target.value)}
                                placeholder={`Paste direct URL or type ${formatKeyLabel(key).toLowerCase()} item...`}
                                type="text"
                                value={itemStr ?? ''}
                              />
                              <label
                                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#67B529] hover:bg-[#EEF9E8] hover:text-[#67B529] ${uploadingId === `${key}_${idx}` ? 'pointer-events-none opacity-50' : ''}`}
                                title="Upload file or image from computer"
                              >
                                <span>{uploadingId === `${key}_${idx}` ? '⌛ Uploading...' : '📁 Upload File'}</span>
                                <input
                                  accept="image/*,.pdf,.doc,.docx,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => handleArrayItemChange(key, idx, url), `${key}_${idx}`)}
                                  type="file"
                                />
                              </label>
                              {isImage && (
                                <img alt="preview" className="h-9 w-12 rounded border border-slate-200 object-cover shadow-xs" src={itemStr} />
                              )}
                            </div>
                            <button
                              aria-label="Remove item"
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => handleArrayItemRemove(key, idx)}
                              type="button"
                            >
                              <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-dashed border-[#67B529] bg-[#EEF9E8]/50 px-3.5 py-1.5 text-xs font-black text-[#67B529] transition hover:bg-[#EEF9E8]"
                      onClick={() => handleArrayItemAdd(key, '')}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add item to {formatKeyLabel(key)}
                    </button>
                  </div>
                )
              }

              const isNumeric = typeof val === 'number' || key === 'limit' || key === 'count'
              const isImageValue = typeof val === 'string' && (val.startsWith('http') || val.startsWith('/')) && val.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(?:\?.*)?$/i)
              return (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:flex-nowrap" key={key}>
                  <div className="w-full md:w-1/3">
                    <span className="block font-black text-slate-800">{formatKeyLabel(key)}</span>
                    <span className="font-mono text-xs text-slate-400">Key: {key}</span>
                  </div>
                  <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto">
                    <input
                      className="w-full min-w-40 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529] focus:ring-2 focus:ring-[#67B529]/20"
                      onChange={(e) => handleValueChange(key, e.target.value, isNumeric)}
                      placeholder={isNumeric ? `Enter number for ${key}...` : `Paste direct URL or enter value for ${key}...`}
                      type={isNumeric ? 'number' : 'text'}
                      value={val ?? ''}
                    />
                    {!isNumeric && (
                      <label
                        className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#67B529] hover:bg-[#EEF9E8] hover:text-[#67B529] ${uploadingId === `single_${key}` ? 'pointer-events-none opacity-50' : ''}`}
                        title="Upload file or image from computer"
                      >
                        <span>{uploadingId === `single_${key}` ? '⌛ Uploading...' : '📁 Upload File'}</span>
                        <input
                          accept="image/*,.pdf,.doc,.docx,.svg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files?.[0], (url) => handleValueChange(key, url, false), `single_${key}`)}
                          type="file"
                        />
                      </label>
                    )}
                    {isImageValue && (
                      <img alt="preview" className="h-9 w-12 rounded border border-slate-200 object-cover shadow-xs" src={val} />
                    )}
                    <button
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => handleRemoveKey(key)}
                      title="Remove field"
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6 18 20H6L5 6M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h4 className="text-sm font-black text-slate-800">+ Add Metadata Property</h4>
          <p className="text-xs font-semibold text-slate-500">Quickly attach standardized structures or add a custom property key:</p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-emerald-300 bg-emerald-50/80 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100"
              onClick={() => addPreset('stats')}
              type="button"
            >
              + Stats / Metrics (Key-Value)
            </button>
            <button
              className="rounded-lg border border-blue-300 bg-blue-50/80 px-3 py-1.5 text-xs font-black text-blue-800 hover:bg-blue-100"
              onClick={() => addPreset('items')}
              type="button"
            >
              + Promise Items / Bullet points
            </button>
            <button
              className="rounded-lg border border-purple-300 bg-purple-50/80 px-3 py-1.5 text-xs font-black text-purple-800 hover:bg-purple-100"
              onClick={() => addPreset('keywords')}
              type="button"
            >
              + Keywords / Tags
            </button>
            <button
              className="rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100"
              onClick={() => addPreset('images')}
              type="button"
            >
              + Image URLs List
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100"
              onClick={() => addPreset('config')}
              type="button"
            >
              + Display Mode & Limit
            </button>
          </div>

          <div className="mt-3.5 border-t border-slate-200/80 pt-3">
            <span className="text-xs font-bold text-slate-600">Or add a custom property:</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold sm:w-48"
                onChange={(e) => setCustomKeyName(e.target.value)}
                placeholder="Key name (e.g. badge_text)"
                type="text"
                value={customKeyName}
              />
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                onChange={(e) => setCustomKeyType(e.target.value)}
                value={customKeyType}
              >
                <option value="text">Single Text Value</option>
                <option value="number">Number Value</option>
                <option value="array_text">List of Texts (Array)</option>
                <option value="array_obj">Key-Value Pairs (Objects)</option>
              </select>
              <button
                className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-black text-white hover:bg-slate-900"
                onClick={addCustomKey}
                type="button"
              >
                Add Key
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <ActionButton disabled={isSaving} onClick={onClose}>Cancel</ActionButton>
          <ActionButton isLoading={isSaving} tone="primary" type="submit">
            Save Metadata
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}

export default AppContentMetadataModal
