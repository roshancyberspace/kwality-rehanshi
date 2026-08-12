import { useEffect, useMemo, useState } from 'react'
import { ActionButton, Panel } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { logoFallbackClass, logoImageClass } from '../../../utils/branding'
import { notify } from '../../../utils/feedback'
import { readRows } from '../utils/formatters'

const settingTabs = [
  { group: 'branding', title: 'Branding', subtitle: 'Logo, app name and footer intro.' },
  { group: 'contact', title: 'Contact Details', subtitle: 'Phone, email, address and service area text.' },
  { group: 'social_links', title: 'Social Links', subtitle: 'Social platform icons and footer links.' },
  { group: 'payment_methods', title: 'Payment Methods', subtitle: 'Cash, wallet and online gateway controls.' },
  { group: 'auto_assignment', title: 'Auto Assignment', subtitle: 'Automatically approve and assign bookings to available professionals.' },
  { group: 'legal', title: 'Legal Texts', subtitle: 'Copyright, powered by and footer bottom text.' },
]

const settingFields = {
  branding: [
    ['app_name', 'App name', 'text'],
    ['tagline', 'Tagline', 'text'],
    ['logo_text', 'Logo text', 'text'],
    ['logo_url', 'Logo image URL', 'text'],
    ['logo_is_circular', 'Circular logo (uncheck for rectangular)', 'checkbox'],
    ['footer_description', 'Footer description', 'textarea'],
  ],
  contact: [
    ['phone', 'Phone', 'text', 'third'],
    ['email', 'Email', 'email', 'third'],
    ['whatsapp', 'WhatsApp', 'text', 'third'],
    ['address', 'Address', 'textarea', 'half'],
    ['service_area_text', 'Service area text', 'textarea', 'half'],
  ],
  legal: [
    ['copyright_text', 'Copyright text', 'text'],
    ['powered_by_text', 'Powered by text', 'text'],
    ['footer_bottom_text', 'Footer bottom text', 'text'],
  ],
  auto_assignment: [
    ['enabled', 'Enable automatic assignment', 'checkbox', 'half'],
    ['auto_approve', 'Auto approve booking before assignment', 'checkbox', 'half'],
    ['delay_minutes', 'Assignment delay in minutes', 'number', 'third'],
    ['match_area', 'Match professional area with booking address', 'checkbox', 'half'],
  ],
}

const paymentDefaults = [
  ['cod', 'Pay after service', 'Customer pays after service completion.'],
  ['wallet', 'Wallet', 'Customer wallet payment option.'],
  ['razorpay', 'Razorpay', 'Razorpay payment gateway.'],
  ['phonepe', 'PhonePe', 'PhonePe payment gateway.'],
  ['paypal', 'PayPal', 'PayPal payment gateway.'],
]

const gatewayFields = {
  custom: [['mode', 'Mode'], ['public_key', 'Public key'], ['secret_key', 'Secret key']],
  paypal: [['mode', 'Mode'], ['client_id', 'Client ID'], ['client_secret', 'Client secret']],
  phonepe: [['mode', 'Mode'], ['merchant_id', 'Merchant ID'], ['salt_key', 'Salt key'], ['salt_index', 'Salt index']],
  razorpay: [['mode', 'Mode'], ['public_key', 'Key ID'], ['secret_key', 'Key secret']],
}
const corePaymentKeys = ['cod', 'wallet']
const socialDefaults = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
]

const defaults = {
  branding: {
    app_name: 'Rehanshi',
    footer_description: 'Verified professionals for repair, cleaning, beauty, appliance care, and everyday home needs in Lucknow.',
    logo_is_circular: '0',
    logo_text: 'HC',
    logo_url: '',
    tagline: 'Home services, simplified',
  },
  contact: {
    address: 'Lucknow, Uttar Pradesh',
    email: 'support@Rehanshi.com',
    phone: '+91 98765 43210',
    service_area_text: 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.',
    whatsapp: '+91 98765 43210',
  },
  legal: {
    copyright_text: '(c) 2026 Rehanshi. All rights reserved.',
    footer_bottom_text: 'Transparent pricing | Trained professionals | Quality assured',
    powered_by_text: 'Powered by KwalityCareServices',
  },
  auto_assignment: {
    auto_approve: '1',
    delay_minutes: '2',
    enabled: '0',
    match_area: '0',
  },
}

const getSetting = (rows, group, key) => rows.find((item) => item.group === group && item.key === key)
const makeKey = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80)

function SettingsView() {
  const [activeGroup, setActiveGroup] = useState('branding')
  const [settingsRows, setSettingsRows] = useState([])
  const [form, setForm] = useState(defaults)
  const [logoUpload, setLogoUpload] = useState(null)
  const [logoUploadMode, setLogoUploadMode] = useState('file')
  const [socialLinks, setSocialLinks] = useState(socialDefaults.map(([key, label]) => ({ key, label, url: '' })))
  const [paymentMethods, setPaymentMethods] = useState(paymentDefaults.map(([key, label, description]) => ({
    description,
    enabled: key === 'cod',
    key,
    label,
    mode: ['paypal'].includes(key) ? 'sandbox' : 'test',
    provider: gatewayFields[key] ? key : '',
  })))
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadSettings = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      const response = await adminApi.list('/settings', { per_page: 500 })
      const rows = readRows(response)
      setSettingsRows(rows)

      setForm((current) => {
        const next = { ...current }
        Object.entries(settingFields).forEach(([group, fields]) => {
          next[group] = { ...next[group] }
          fields.forEach(([key]) => {
            const setting = getSetting(rows, group, key)
            if (setting) next[group][key] = setting.value || ''
          })
        })
        return next
      })

      const defaultKeys = paymentDefaults.map(([key]) => key)
      const legacyKeys = ['online', 'upi']
      const paymentRows = [
        ...paymentDefaults.map(([key, fallbackLabel, fallbackDescription]) => ({ fallbackDescription, fallbackLabel, key, setting: getSetting(rows, 'payment_methods', key) })),
        ...rows
          .filter((row) => row.group === 'payment_methods' && !defaultKeys.includes(row.key) && !legacyKeys.includes(row.key))
          .map((setting) => ({ fallbackDescription: setting.metadata?.description || '', fallbackLabel: setting.metadata?.label || setting.key, key: setting.key, setting })),
      ]
      setPaymentMethods(paymentRows.map(({ key, fallbackLabel, fallbackDescription, setting }) => {
        return {
          client_id: setting?.metadata?.client_id || '',
          client_secret: setting?.metadata?.client_secret || '',
          description: setting?.metadata?.description || fallbackDescription,
          enabled: setting ? String(setting.value) === '1' : key === 'cod',
          key,
          label: setting?.metadata?.label || fallbackLabel,
          merchant_id: setting?.metadata?.merchant_id || '',
          mode: setting?.metadata?.mode || (key === 'paypal' ? 'sandbox' : 'test'),
          provider: setting?.metadata?.provider || (gatewayFields[key] ? key : ''),
          public_key: setting?.metadata?.public_key || '',
          salt_index: setting?.metadata?.salt_index || '',
          salt_key: setting?.metadata?.salt_key || '',
          secret_key: setting?.metadata?.secret_key || '',
        }
      }))

      const socialDefaultKeys = socialDefaults.map(([key]) => key)
      const socialRows = [
        ...socialDefaults.map(([key, fallbackLabel]) => ({ fallbackLabel, key, setting: getSetting(rows, 'social_links', key) })),
        ...rows
          .filter((row) => row.group === 'social_links' && !socialDefaultKeys.includes(row.key))
          .map((setting) => ({ fallbackLabel: setting.metadata?.label || setting.key, key: setting.key, setting })),
      ]
      setSocialLinks(socialRows.map(({ key, fallbackLabel, setting }) => ({
        key,
        label: setting?.metadata?.label || fallbackLabel,
        url: setting?.value || '',
      })))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (!message) return

    notify(message, { tone: message.includes('success') ? 'success' : 'error' })
  }, [message])

  const updateForm = (group, key, value) => {
    setForm((current) => ({
      ...current,
      [group]: { ...(current[group] || {}), [key]: value },
    }))
  }

  const saveSetting = async ({ group, key, metadata = {}, type = 'text', value }) => {
    const existing = getSetting(settingsRows, group, key)
    const isFile = value instanceof File
    const payload = isFile ? new FormData() : { group, key, metadata, type, value: value ?? '' }
    if (isFile) {
      payload.append('group', group)
      payload.append('key', key)
      payload.append('type', type)
      payload.append('value', value)
      payload.append('metadata', JSON.stringify(metadata))
    }
    if (existing?.id) return adminApi.update('/settings', existing.id, payload)
    return isFile ? adminApi.createForm('/settings', payload) : adminApi.create('/settings', payload)
  }

  const addPaymentMethod = () => {
    const nextIndex = paymentMethods.length + 1
    setPaymentMethods((current) => [
      ...current,
      {
        description: 'Custom payment option.',
        enabled: true,
        key: `custom_method_${nextIndex}`,
        label: `Custom Method ${nextIndex}`,
        mode: 'test',
        provider: 'custom',
      },
    ])
  }

  const addSocialLink = () => {
    const nextIndex = socialLinks.length + 1
    setSocialLinks((current) => [
      ...current,
      {
        key: `custom_social_${nextIndex}`,
        label: `Custom Social ${nextIndex}`,
        url: '',
      },
    ])
  }

  const updateSocialLink = (linkKey, field, value) => {
    setSocialLinks((current) => current.map((item) => {
      if (item.key !== linkKey) return item
      const next = { ...item, [field]: value }
      if (field === 'label' && item.key.startsWith('custom_social_')) {
        next.key = makeKey(value) || item.key
      }
      return next
    }))
  }

  const updatePaymentMethod = (methodKey, field, value) => {
    setPaymentMethods((current) => current.map((item) => {
      if (item.key !== methodKey) return item
      const next = { ...item, [field]: value }
      if (field === 'label' && methodKey.startsWith('custom_method_')) {
        next.key = makeKey(value) || methodKey
      }
      return next
    }))
  }

  const saveCurrentGroup = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      if (activeGroup === 'payment_methods') {
        await Promise.all(paymentMethods.map((method) => saveSetting({
          group: 'payment_methods',
          key: method.key,
          metadata: {
            client_id: method.client_id || '',
            client_secret: method.client_secret || '',
            description: method.description,
            label: method.label,
            merchant_id: method.merchant_id || '',
            mode: method.mode || '',
            provider: method.provider || '',
            public_key: method.public_key || '',
            salt_index: method.salt_index || '',
            salt_key: method.salt_key || '',
            secret_key: method.secret_key || '',
          },
          type: 'boolean',
          value: method.enabled ? '1' : '0',
        })))
      } else if (activeGroup === 'social_links') {
        await Promise.all(socialLinks.map((link) => saveSetting({
          group: 'social_links',
          key: link.key,
          metadata: { label: link.label },
          type: 'url',
          value: link.url || '',
        })))
      } else {
        await Promise.all((settingFields[activeGroup] || []).map(([key, label, type]) => saveSetting({
          group: activeGroup,
          key,
          metadata: { label },
          type: type === 'checkbox' ? 'boolean' : type === 'number' ? 'number' : type === 'textarea' ? 'textarea' : 'text',
          value: type === 'checkbox'
            ? (String(form[activeGroup]?.[key] || '0') === '1' ? '1' : '0')
            : activeGroup === 'branding' && key === 'logo_url' && logoUpload ? logoUpload : form[activeGroup]?.[key] || '',
        })))
      }
      setLogoUpload(null)
      setMessage('Settings saved successfully.')
      await loadSettings()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const previewBranding = useMemo(() => form.branding || defaults.branding, [form.branding])

  return (
    <Panel
      action={<ActionButton disabled={isLoading} onClick={saveCurrentGroup} tone="primary">{isLoading ? 'Saving...' : 'Save Settings'}</ActionButton>}
    >
      <div className="grid gap-5 p-5">
        <div className="flex flex-wrap gap-2">
          {settingTabs.map((tab) => (
            <button
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${activeGroup === tab.group ? 'border-[#67B529] bg-[#67B529] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#67B529]/30 hover:bg-[#EEF9E8] hover:text-[#67B529]'}`}
              key={tab.group}
              onClick={() => {
                setActiveGroup(tab.group)
                setMessage('')
              }}
              type="button"
            >
              {tab.title}
            </button>
          ))}
        </div>

        {activeGroup === 'payment_methods' ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Simple checkout options</p>
              <p className="mt-1 text-xs font-medium text-slate-500">These are shown directly at checkout.</p>
            </section>
            <div className="grid gap-3 md:grid-cols-2">
            {paymentMethods.filter((method) => corePaymentKeys.includes(method.key)).map((method) => (
              <section className="rounded-lg border border-slate-200 bg-white p-4" key={method.key}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{method.label}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{method.description}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{method.key}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      checked={method.enabled}
                      className="h-5 w-5 rounded border-slate-300 text-[#67B529]"
                      onChange={(event) => updatePaymentMethod(method.key, 'enabled', event.target.checked)}
                      type="checkbox"
                    />
                    Enabled
                  </label>
                </div>
                <div className="mt-4 grid gap-3">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={method.label} onChange={(event) => updatePaymentMethod(method.key, 'label', event.target.value)} />
                  <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={method.description} onChange={(event) => updatePaymentMethod(method.key, 'description', event.target.value)} />
                </div>
              </section>
            ))}
            </div>

            <section className="rounded-lg border border-[#67B529]/20 bg-[#EEF9E8] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Online gateways</p>
                  <p className="mt-1 text-xs font-medium text-[#67B529]">You can keep Razorpay, PhonePe, PayPal and custom gateways active together.</p>
                </div>
                <ActionButton onClick={addPaymentMethod}>Add gateway</ActionButton>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2">
            {paymentMethods.filter((method) => !corePaymentKeys.includes(method.key)).map((method) => {
              const fields = gatewayFields[method.provider] || []
              return (
              <section className="rounded-lg border border-slate-200 bg-white p-4" key={method.key}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{method.label}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{method.description}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{method.key}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      checked={method.enabled}
                      className="h-5 w-5 rounded border-slate-300 text-[#67B529]"
                      onChange={(event) => updatePaymentMethod(method.key, 'enabled', event.target.checked)}
                      type="checkbox"
                    />
                    Active
                  </label>
                </div>
                <div className="mt-4 grid gap-3">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={method.label} onChange={(event) => updatePaymentMethod(method.key, 'label', event.target.value)} />
                  <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={method.description} onChange={(event) => updatePaymentMethod(method.key, 'description', event.target.value)} />
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={method.provider || 'custom'} onChange={(event) => updatePaymentMethod(method.key, 'provider', event.target.value)}>
                    <option value="custom">Custom gateway</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                  {fields.length > 0 && (
                    <div className="grid gap-3 rounded-lg bg-slate-50 p-3">
                      {fields.map(([field, label]) => (
                        <label className="block" key={`${method.key}-${field}`}>
                          <span className="text-xs font-semibold text-slate-500">{label}</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]"
                            onChange={(event) => updatePaymentMethod(method.key, field, event.target.value)}
                            type={field.includes('secret') || field.includes('salt') ? 'password' : 'text'}
                            value={method[field] || ''}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              )
            })}
            </div>
          </div>
        ) : activeGroup === 'social_links' ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Footer social icons</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Only links with URLs are shown on the website footer.</p>
                </div>
                <ActionButton onClick={addSocialLink}>Add social link</ActionButton>
              </div>
            </section>
            <div className="grid gap-3 md:grid-cols-2">
              {socialLinks.map((link) => (
                <section className="rounded-lg border border-slate-200 bg-white p-4" key={link.key}>
                  <div className="grid gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-500">Platform name</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]"
                        onChange={(event) => updateSocialLink(link.key, 'label', event.target.value)}
                        type="text"
                        value={link.label}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-500">Profile URL</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]"
                        onChange={(event) => updateSocialLink(link.key, 'url', event.target.value)}
                        placeholder="https://..."
                        type="url"
                        value={link.url}
                      />
                    </label>
                    <p className="text-[11px] font-semibold text-slate-400">{link.key}</p>
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : activeGroup === 'auto_assignment' ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-[#67B529]/20 bg-[#EEF9E8] p-4">
              <p className="text-sm font-semibold text-[#2F6412]">Automatic professional assignment</p>
              <p className="mt-1 text-xs font-medium leading-5 text-[#67B529]">
                When enabled, every new booking will be checked after the delay. If an approved and available professional matches the service skill/category, the system assigns it automatically.
              </p>
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              {(settingFields.auto_assignment || []).map(([key, label, type]) => (
                <label className="rounded-lg border border-slate-200 bg-white p-4" key={key}>
                  <span className="text-sm font-semibold text-slate-800">{label}</span>
                  {type === 'checkbox' ? (
                    <span className="mt-3 flex items-center gap-3 text-sm font-semibold text-slate-600">
                      <input
                        checked={String(form.auto_assignment?.[key] || '0') === '1'}
                        className="h-5 w-5 rounded border-slate-300 text-[#67B529]"
                        onChange={(event) => updateForm('auto_assignment', key, event.target.checked ? '1' : '0')}
                        type="checkbox"
                      />
                      {String(form.auto_assignment?.[key] || '0') === '1' ? 'On' : 'Off'}
                    </span>
                  ) : (
                    <input
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]"
                      min="0"
                      max="30"
                      onChange={(event) => updateForm('auto_assignment', key, event.target.value)}
                      type="number"
                      value={form.auto_assignment?.[key] || '2'}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${activeGroup === 'contact' ? 'lg:grid-cols-6' : 'lg:grid-cols-2'}`}>
            {(settingFields[activeGroup] || []).map(([key, label, type, width]) => (
              <div
                className={[
                  'block',
                  activeGroup === 'contact' && width === 'third' ? 'lg:col-span-2' : '',
                  activeGroup === 'contact' && width === 'half' ? 'lg:col-span-3' : '',
                  activeGroup !== 'contact' && type === 'textarea' && width !== 'half' ? 'lg:col-span-2' : '',
                  key === 'logo_url' ? 'col-span-full' : '',
                ].filter(Boolean).join(' ')}
                key={key}
              >
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {type === 'textarea' ? (
                  <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" value={form[activeGroup]?.[key] || ''} onChange={(event) => updateForm(activeGroup, key, event.target.value)} />
                ) : type === 'checkbox' ? (
                  <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600">
                    <input
                      checked={String(form[activeGroup]?.[key] || '0') === '1'}
                      className="h-5 w-5 rounded border-slate-300 text-[#67B529]"
                      onChange={(event) => updateForm(activeGroup, key, event.target.checked ? '1' : '0')}
                      type="checkbox"
                    />
                    {String(form[activeGroup]?.[key] || '0') === '1' ? 'Circular' : 'Rectangular'}
                  </label>
                ) : key === 'logo_url' ? (
                  <div className="mt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-500">Choose Source:</span>
                      <div className="flex rounded-md bg-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setLogoUploadMode('file')}
                          className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-bold transition-all ${
                            logoUploadMode === 'file'
                              ? 'bg-white text-[#67B529] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          📁 Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoUploadMode('url')}
                          className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-bold transition-all ${
                            logoUploadMode === 'url'
                              ? 'bg-white text-[#67B529] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🔗 Paste Direct URL
                        </button>
                      </div>
                    </div>

                    {logoUploadMode === 'file' ? (
                      <div>
                        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none file:mr-2.5 file:cursor-pointer file:rounded file:border-0 file:bg-[#EEF9E8] file:px-2.5 file:py-1 file:text-xs file:font-black file:text-[#67B529] hover:file:bg-[#dff5d5]" type="file" accept="image/*" onChange={(event) => setLogoUpload(event.target.files?.[0] || null)} />
                        {logoUpload && <p className="mt-1 text-xs font-semibold text-[#67B529]">✨ {logoUpload.name} selected. Save settings to upload.</p>}
                      </div>
                    ) : (
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#67B529]" placeholder="https://..." type="text" value={form[activeGroup]?.[key] || ''} onChange={(event) => updateForm(activeGroup, key, event.target.value)} />
                    )}
                  </div>
                ) : (
                  <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]" type={type} value={form[activeGroup]?.[key] || ''} onChange={(event) => updateForm(activeGroup, key, event.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}

        {activeGroup === 'branding' && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Preview</p>
            <div className="mt-3 flex items-center gap-3">
              {previewBranding.logo_url ? (
                <img className={logoImageClass(String(previewBranding.logo_is_circular || '0') === '1')} src={previewBranding.logo_url} alt="" />
              ) : (
                <span className={`${logoFallbackClass(String(previewBranding.logo_is_circular || '0') === '1', 'md', 'neutral')} text-sm font-semibold`}>{previewBranding.logo_text || 'HC'}</span>
              )}
              {String(previewBranding.app_name || '').trim() && (
                <div>
                  <p className="text-base font-semibold text-slate-800">{previewBranding.app_name}</p>
                  <p className="text-xs font-medium text-slate-500">{previewBranding.tagline || 'Home services, simplified'}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Panel>
  )
}

export default SettingsView
