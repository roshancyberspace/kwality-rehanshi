import { useEffect, useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

const ISSUE_TYPES = [
  'Booking Issue',
  'Payment',
  'Service Quality',
  'Reschedule',
  'Refund',
  'App / Technical',
  'Other',
]

const emptyForm = {
  subject: '',
  description: '',
  type: 'Booking Issue',
  image: null,
}

export default function RaiseTicketForm({ onDone, user, variant = 'page' }) {
  const [form, setForm] = useState(emptyForm)
  const [previewUrl, setPreviewUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const updateField = (field, value) => {
    setErrors((current) => ({ ...current, [field]: '' }))
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(file ? URL.createObjectURL(file) : '')
    updateField('image', file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.subject.trim()) nextErrors.subject = 'Title is required.'
    if (!form.description.trim()) nextErrors.description = 'Description is required.'
    if (!form.type) nextErrors.type = 'Select an issue type.'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const ticket = await frontendApi.raiseSupportTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        type: form.type,
        image: form.image,
      })
      setSubmittedTicket(ticket)
      notify(`Ticket ${ticket.ticket_no || ''} raised. Check your email for acknowledgement.`)
      onDone?.(ticket)
    } catch (error) {
      setErrors({
        subject: error.errors?.subject?.[0] || '',
        description: error.errors?.description?.[0] || '',
        type: error.errors?.type?.[0] || '',
        image: error.errors?.image?.[0] || '',
        form: error.message || 'Unable to raise ticket.',
      })
      notify(error.message || 'Unable to raise ticket', { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submittedTicket) {
    return (
      <div className={variant === 'page' ? 'rounded-xl border border-slate-100 bg-white p-5 shadow-sm' : ''}>
        <div className="rounded-xl border border-[#67B529]/30 bg-[#F3FBED] p-5 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-[#167634]">Ticket raised</p>
          <p className="mt-2 text-2xl font-black text-[#003F86]">{submittedTicket.ticket_no}</p>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Acknowledgement has been sent to{' '}
            <span className="font-bold text-[#003F86]">{user?.email || 'your registered email'}</span>.
          </p>
          <p className="mt-1 text-xs text-slate-500">Our team will review your issue and get back to you soon.</p>
          <button
            className="mt-5 rounded-xl bg-[#003F86] px-5 py-2.5 text-sm font-bold text-white"
            onClick={() => {
              setSubmittedTicket(null)
              setForm(emptyForm)
              setPreviewUrl('')
              onDone?.(submittedTicket)
            }}
            type="button"
          >
            Raise another ticket
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={variant === 'page' ? 'rounded-xl border border-slate-100 bg-white p-5 shadow-sm' : ''}>
      {variant === 'page' ? (
        <div className="mb-5">
          <h3 className="text-xl font-black text-slate-900">Raise a Ticket</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Tell us what went wrong. We’ll email you an acknowledgement with your ticket number.
          </p>
          <p className="mt-2 text-xs font-semibold text-[#003F86]/80">
            Submitting as {user?.name || 'Customer'} · {user?.phone || ''} · {user?.email || 'No email on file'}
          </p>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Title</span>
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
            disabled={isSubmitting}
            onChange={(event) => updateField('subject', event.target.value)}
            placeholder="Short summary of the issue"
            type="text"
            value={form.subject}
          />
          {errors.subject ? <span className="mt-1 block text-xs font-semibold text-rose-600">{errors.subject}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Issue type</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
            disabled={isSubmitting}
            onChange={(event) => updateField('type', event.target.value)}
            value={form.type}
          >
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.type ? <span className="mt-1 block text-xs font-semibold text-rose-600">{errors.type}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Description</span>
          <textarea
            className="mt-1.5 min-h-28 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
            disabled={isSubmitting}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Describe your issue in detail"
            value={form.description}
          />
          {errors.description ? <span className="mt-1 block text-xs font-semibold text-rose-600">{errors.description}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Image (optional)</span>
          <input
            accept="image/*"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEF9E8] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#67B529]"
            disabled={isSubmitting}
            onChange={handleImageChange}
            type="file"
          />
          {previewUrl ? (
            <img alt="Attachment preview" className="mt-2 h-24 w-auto rounded-lg border border-slate-200 object-cover" src={previewUrl} />
          ) : null}
          {errors.image ? <span className="mt-1 block text-xs font-semibold text-rose-600">{errors.image}</span> : null}
        </label>

        {errors.form ? <p className="text-xs font-semibold text-rose-600">{errors.form}</p> : null}

        <button
          className="w-full rounded-xl bg-[#003F86] px-4 py-3 text-sm font-bold text-white shadow-md transition enabled:hover:bg-[#002f64] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Submitting…' : 'Submit ticket'}
        </button>
      </form>
    </div>
  )
}
