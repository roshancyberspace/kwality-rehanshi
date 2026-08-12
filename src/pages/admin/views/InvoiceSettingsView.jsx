import { useEffect, useMemo, useState } from 'react'
import { ActionButton, Panel } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { notify } from '../../../utils/feedback'
import { readRows } from '../utils/formatters'

const invoiceFields = [
  ['business_name', 'Business name', 'text'],
  ['tagline', 'Tagline', 'text'],
  ['address', 'Address', 'textarea'],
  ['phone', 'Phone', 'text'],
  ['email', 'Email', 'email'],
  ['website', 'Website', 'text'],
  ['gst_number', 'GST number', 'text'],
  ['pan_number', 'PAN number', 'text'],
  ['invoice_prefix', 'Invoice number prefix', 'text'],
  ['bank_name', 'Bank name', 'text'],
  ['bank_branch', 'Branch', 'text'],
  ['account_number', 'Account number', 'text'],
  ['ifsc', 'IFSC', 'text'],
  ['upi_id', 'UPI ID', 'text'],
  ['terms', 'Terms and conditions', 'textarea'],
  ['footer_note', 'Footer note', 'text'],
  ['footer_note2', 'Powered by text', 'text'],
]

const defaults = {
  account_number: '',
  address: '',
  bank_branch: '',
  bank_name: '',
  business_name: 'KwalityCareServices',
  email: '',
  footer_note: 'Thank you for shopping with us!',
  footer_note2: 'Power By-BrainTech Info Solutions',
  gst_number: '',
  ifsc: '',
  invoice_prefix: 'INV',
  pan_number: '',
  phone: '',
  qr_image: '',
  show_gst_on_invoice: '0',
  signature_image: '',
  tagline: 'Home services and professional care',
  terms: 'Subject to local jurisdiction.\nServices once completed cannot be cancelled.\nPayment disputes must be raised within 48 hours.',
  upi_id: '',
  website: '',
}

const getSetting = (rows, key) => rows.find((item) => item.group === 'invoice' && item.key === key)

function InvoiceSettingsView() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(defaults)
  const [uploads, setUploads] = useState({ qr_image: null, signature_image: null })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadSettings = async () => {
    const response = await adminApi.list('/settings', { per_page: 500 })
    const nextRows = readRows(response)
    setRows(nextRows)
    setForm((current) => {
      const next = { ...current }
      Object.keys(defaults).forEach((key) => {
        const setting = getSetting(nextRows, key)
        if (setting) next[key] = setting.value || ''
      })
      return next
    })
  }

  useEffect(() => {
    loadSettings().catch((error) => setMessage(error.message))
  }, [])

  useEffect(() => {
    if (message) notify(message, { tone: message.includes('saved') ? 'success' : 'error' })
  }, [message])

  const saveSetting = async (key, value, type = 'text') => {
    const existing = getSetting(rows, key)
    const isFile = value instanceof File
    const payload = isFile ? new FormData() : {
      group: 'invoice',
      key,
      metadata: { label: key.replace(/_/g, ' ') },
      type,
      value: value ?? '',
    }

    if (isFile) {
      payload.append('group', 'invoice')
      payload.append('key', key)
      payload.append('metadata', JSON.stringify({ label: key.replace(/_/g, ' ') }))
      payload.append('type', 'image')
      payload.append('value', value)
    }

    return existing?.id ? adminApi.update('/settings', existing.id, payload) : (isFile ? adminApi.createForm('/settings', payload) : adminApi.create('/settings', payload))
  }

  const saveInvoiceSettings = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      await Promise.all([
        ...invoiceFields.map(([key, , type]) => saveSetting(key, form[key], type === 'textarea' ? 'textarea' : 'text')),
        saveSetting('show_gst_on_invoice', form.show_gst_on_invoice === '1' ? '1' : '0', 'boolean'),
        ...(uploads.qr_image ? [saveSetting('qr_image', uploads.qr_image, 'image')] : []),
        ...(uploads.signature_image ? [saveSetting('signature_image', uploads.signature_image, 'image')] : []),
      ])
      setUploads({ qr_image: null, signature_image: null })
      setMessage('Invoice settings saved.')
      await loadSettings()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const preview = useMemo(() => ({ ...form }), [form])

  return (
    <Panel
      action={<ActionButton disabled={isSaving} onClick={saveInvoiceSettings} tone="primary">{isSaving ? 'Saving...' : 'Save Invoice Setting'}</ActionButton>}
    >
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
            <span>
              <span className="block text-sm font-semibold text-slate-800">Add & Show GST on customer invoice</span>
              <span className="mt-1 block text-xs font-medium text-slate-500">When enabled, 18% GST will be calculated and added to the bill (if not already included), and the tax column will be shown.</span>
            </span>
            <input
              checked={form.show_gst_on_invoice === '1' || form.show_gst_on_invoice === true}
              className="h-5 w-5 accent-[#67B529]"
              onChange={(event) => setForm((current) => ({ ...current, show_gst_on_invoice: event.target.checked ? '1' : '0' }))}
              type="checkbox"
            />
          </label>
          {invoiceFields.map(([key, label, type]) => (
            <label className={type === 'textarea' ? 'lg:col-span-2' : ''} key={key}>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              {type === 'textarea' ? (
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} value={form[key] || ''} />
              ) : (
                <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} type={type} value={form[key] || ''} />
              )}
            </label>
          ))}
          {[
            ['qr_image', 'Manual payment QR'],
            ['signature_image', 'Authorised signature'],
          ].map(([key, label]) => (
            <label className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4" key={key}>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              <input accept="image/*" className="mt-3 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#67B529] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" onChange={(event) => setUploads((current) => ({ ...current, [key]: event.target.files?.[0] || null }))} type="file" />
              {(uploads[key] || form[key]) && <img alt="" className="mt-3 h-28 w-full rounded-md border border-slate-200 object-contain bg-white" src={uploads[key] ? URL.createObjectURL(uploads[key]) : form[key]} />}
            </label>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-400">Invoice preview copy</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{preview.business_name}</h3>
          <p className="mt-1 bg-teal-600 px-3 py-2 text-sm font-black text-white">{preview.tagline}</p>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
            <p>{preview.address || 'Business address'}</p>
            <p>PAN: {preview.pan_number || 'Not set'}</p>
            {(preview.show_gst_on_invoice === '1' || preview.show_gst_on_invoice === true) && <p>GST: {preview.gst_number || 'Not set'}</p>}
            <p>Invoice: {preview.invoice_prefix || 'INV'}-0001</p>
          </div>
          <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-700">
            <p>{preview.bank_name || 'Bank name'}</p>
            <p>{preview.account_number || 'Account number'}</p>
            <p>{preview.ifsc || 'IFSC'} | {preview.upi_id || 'UPI ID'}</p>
          </div>
        </aside>
      </div>
    </Panel>
  )
}

export default InvoiceSettingsView
