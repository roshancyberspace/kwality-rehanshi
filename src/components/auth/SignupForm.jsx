import { useRef, useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

const firstError = (value) => (Array.isArray(value) ? value[0] : value) || ''

function SignupForm({ onLoginSuccess, onShowLogin }) {
  const [step, setStep] = useState(1)
  const [, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({ email: '', name: '', password: '', confirmPassword: '', phone: '', otp: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const availabilityTimer = useRef(null)

  const updateForm = (field, value) => {
    setError('')
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setForm((current) => ({ ...current, [field]: value }))

    if (field === 'email' || field === 'phone') {
      window.clearTimeout(availabilityTimer.current)
      availabilityTimer.current = window.setTimeout(() => {
        checkAvailabilityField(field, value)
      }, 450)
    }
  }

  const checkAvailabilityField = async (field, value) => {
    const trimmed = String(value || '').trim()
    if (!trimmed) return
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return
    if (field === 'phone' && !/^\d{10}$/.test(trimmed.replace(/\D/g, ''))) return

    try {
      const result = await frontendApi.checkCustomerAvailability({
        email: field === 'email' ? trimmed : undefined,
        phone: field === 'phone' ? trimmed.replace(/\D/g, '') : undefined,
      })
      const message = firstError(result?.errors?.[field])
      setFieldErrors((current) => ({ ...current, [field]: message }))
    } catch {
      // Ignore network blips during live checks; continue still re-checks.
    }
  }

  const checkAccountAvailability = async () => {
    const result = await frontendApi.checkCustomerAvailability({
      email: form.email.trim(),
      phone: form.phone.replace(/\D/g, ''),
    })

    const nextErrors = {}
    if (result?.errors?.email) nextErrors.email = firstError(result.errors.email)
    if (result?.errors?.phone) nextErrors.phone = firstError(result.errors.phone)

    if (Object.keys(nextErrors).length) {
      setFieldErrors((current) => ({ ...current, ...nextErrors }))
      return false
    }

    return true
  }

  const validateStep1 = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    if (!form.phone.trim()) errors.phone = 'Mobile number is required'
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) errors.phone = 'Mobile number must be exactly 10 digits'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return false
    }
    return true
  }

  const handleNextStep1 = async () => {
    if (!validateStep1()) return
    setIsSubmitting(true)
    try {
      const available = await checkAccountAvailability()
      if (!available) return

      await new Promise((resolve) => setTimeout(resolve, 800))
      notify('OTP sent to your email address', { tone: 'success' })
      setStep(2)
    } catch (requestError) {
      notify(requestError.message || 'Unable to verify account details.', { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextStep2 = async () => {
    if (!form.otp || form.otp.length < 4) {
      setFieldErrors({ otp: 'Please enter a valid OTP' })
      return
    }
    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      notify('Email verified successfully', { tone: 'success' })
      setStep(3)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitSignup = async (event) => {
    event.preventDefault()

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    if (form.password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters' })
      return
    }

    setIsSubmitting(true)
    setError('')
    setFieldErrors({})

    try {
      const available = await checkAccountAvailability()
      if (!available) {
        setStep(1)
        return
      }

      await onLoginSuccess?.({
        mode: 'signup',
        email: form.email,
        name: form.name,
        password: form.password,
        phone: form.phone.replace(/\D/g, ''),
      })
    } catch (requestError) {
      const errors = requestError.errors || {}
      setFieldErrors({
        email: errors.email?.[0] || '',
        name: errors.name?.[0] || '',
        password: errors.password?.[0] || (!Object.keys(errors).length ? requestError.message : ''),
        phone: errors.phone?.[0] || '',
      })
      setError(requestError.message)
      notify(requestError.message, { tone: 'error' })
      if (errors.email || errors.phone || errors.name) setStep(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-blue-700">
        <span>Create your account</span>
        <span className="font-bold">Step {step} of 3</span>
      </div>

      <div className="mb-6 flex h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full bg-[#003F86] transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <form className="mt-4 grid gap-4" onSubmit={step === 3 ? submitSignup : (e) => e.preventDefault()}>
        {step === 1 && (
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm font-bold text-blue-900">Full name</span>
              <input
                className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-base outline-none transition placeholder:text-blue-300 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.name ? 'border-rose-500' : 'border-blue-200'}`}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Enter your name"
                type="text"
                value={form.name}
              />
              {fieldErrors.name && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.name}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-blue-900">Email address</span>
              <input
                className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-base outline-none transition placeholder:text-blue-300 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.email ? 'border-rose-500' : 'border-blue-200'}`}
                onBlur={() => checkAvailabilityField('email', form.email)}
                onChange={(event) => updateForm('email', event.target.value)}
                placeholder="Enter email address"
                type="email"
                value={form.email}
              />
              {fieldErrors.email && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.email}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-blue-900">Mobile number</span>
              <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${fieldErrors.phone ? 'border-rose-500' : 'border-blue-200'}`}>
                <span className="grid w-14 place-items-center border-r border-blue-100 text-sm font-bold text-blue-700">
                  +91
                </span>
                <input
                  className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
                  maxLength={10}
                  onBlur={() => checkAvailabilityField('phone', form.phone)}
                  onChange={(event) => updateForm('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  type="tel"
                  value={form.phone}
                />
              </div>
              {fieldErrors.phone && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.phone}</p>}
            </label>

            <button
              className="mt-2 h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
              disabled={isSubmitting || Boolean(fieldErrors.email || fieldErrors.phone)}
              onClick={handleNextStep1}
              type="button"
            >
              {isSubmitting ? 'Checking...' : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <p className="text-sm text-blue-800">
              We&apos;ve sent an OTP to <span className="font-bold">{form.email}</span>. Please enter it below to verify your email.
            </p>
            <label className="block mt-2">
              <span className="text-sm font-bold text-blue-900">Email OTP</span>
              <input
                className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-base tracking-widest outline-none transition placeholder:text-blue-300 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.otp ? 'border-rose-500' : 'border-blue-200'}`}
                maxLength={6}
                onChange={(event) => updateForm('otp', event.target.value)}
                placeholder="Enter 6-digit OTP"
                type="text"
                value={form.otp}
              />
              {fieldErrors.otp && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.otp}</p>}
            </label>

            <div className="mt-2 flex gap-3">
              <button
                className="h-10 w-1/3 rounded-xl border border-blue-200 bg-white px-5 font-bold text-blue-800 transition hover:bg-blue-50"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
                type="button"
              >
                Back
              </button>
              <button
                className="h-10 flex-1 rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
                disabled={isSubmitting}
                onClick={handleNextStep2}
                type="button"
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm font-bold text-blue-900">Password</span>
              <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${fieldErrors.password ? 'border-rose-500' : 'border-blue-200'}`}>
                <input
                  className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
                  minLength={8}
                  onChange={(event) => updateForm('password', event.target.value)}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                />
                <button
                  className="px-4 text-sm font-bold text-blue-800 hover:text-[#003F86]"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.password}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-blue-900">Confirm Password</span>
              <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${fieldErrors.confirmPassword ? 'border-rose-500' : 'border-blue-200'}`}>
                <input
                  className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
                  minLength={8}
                  onChange={(event) => updateForm('confirmPassword', event.target.value)}
                  placeholder="Re-enter password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                />
                <button
                  className="px-4 text-sm font-bold text-blue-800 hover:text-[#003F86]"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  type="button"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.confirmPassword}</p>}
            </label>

            <div className="mt-2 flex gap-3">
              <button
                className="h-10 w-1/3 rounded-xl border border-blue-200 bg-white px-5 font-bold text-blue-800 transition hover:bg-blue-50"
                disabled={isSubmitting}
                onClick={() => setStep(2)}
                type="button"
              >
                Back
              </button>
              <button
                className="h-10 flex-1 rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-blue-700">
        Already have an account?{' '}
        <button className="font-bold text-[#003F86]" onClick={onShowLogin} type="button">
          Login
        </button>
      </p>
    </div>
  )
}

export default SignupForm
