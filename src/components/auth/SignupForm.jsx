import { useEffect, useRef, useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

const firstError = (value) => (Array.isArray(value) ? value[0] : value) || ''

function SignupForm({ onLoginSuccess, onShowLogin, onStepChange }) {
  const [step, setStep] = useState(1)
  const [, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({ email: '', name: '', password: '', confirmPassword: '', phone: '', otp: '' })
  const [signupToken, setSignupToken] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const availabilityTimer = useRef(null)

  const changeStep = (nextStep) => {
    setStep(nextStep)
    onStepChange?.(nextStep)
  }

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

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
    setError('')
    setFieldErrors({})
    try {
      const response = await frontendApi.sendCustomerSignupOtp({
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
      })
      notify(response?.message || 'Verification OTP sent to your mobile number and email', { tone: 'success' })
      setResendIn(Number(response?.resend_after) || 45)
      changeStep(2)
    } catch (requestError) {
      const errors = requestError.errors || {}
      setFieldErrors({
        email: errors.email?.[0] || '',
        name: errors.name?.[0] || '',
        phone: errors.phone?.[0] || '',
      })
      notify(requestError.message || 'Unable to send OTP. Please check your details.', { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendIn > 0 || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const response = await frontendApi.sendCustomerSignupOtp({
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
      })
      notify(response?.message || 'New verification OTP sent to your mobile number', { tone: 'success' })
      setResendIn(Number(response?.resend_after) || 45)
    } catch (requestError) {
      notify(requestError.message || 'Unable to resend OTP. Please try again.', { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextStep2 = async () => {
    const otpClean = String(form.otp || '').trim().replace(/\D/g, '')
    if (otpClean.length !== 6) {
      setFieldErrors({ otp: 'Please enter the 6-digit OTP' })
      return
    }
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    try {
      const response = await frontendApi.verifyCustomerSignupOtp({
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ''),
        otp: otpClean,
      })
      setSignupToken(response?.signup_token || '')
      notify(response?.message || 'Mobile number and email verified successfully', { tone: 'success' })
      changeStep(3)
    } catch (requestError) {
      const errors = requestError.errors || {}
      setFieldErrors({
        otp: errors.otp?.[0] || requestError.message || 'Invalid or expired OTP',
      })
      notify(requestError.message || 'Invalid OTP. Please try again.', { tone: 'error' })
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
      await onLoginSuccess?.({
        mode: 'signup',
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        phone: form.phone.replace(/\D/g, ''),
        signupToken,
      })
    } catch (requestError) {
      const errors = requestError.errors || {}
      setFieldErrors({
        email: errors.email?.[0] || '',
        name: errors.name?.[0] || '',
        password: errors.password?.[0] || (!Object.keys(errors).length ? requestError.message : ''),
        phone: errors.phone?.[0] || '',
        otp: errors.otp?.[0] || '',
      })
      setError(requestError.message)
      notify(requestError.message, { tone: 'error' })
      if (errors.otp) changeStep(2)
      else if (errors.email || errors.phone || errors.name) changeStep(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Progress Stepper Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span className={`transition-colors ${step >= 1 ? 'text-[#003F86] font-black' : 'text-slate-400'}`}>1. Basic Info</span>
          <span className={`transition-colors ${step >= 2 ? 'text-[#003F86] font-black' : 'text-slate-400'}`}>2. Verify Mobile & Email</span>
          <span className={`transition-colors ${step >= 3 ? 'text-[#003F86] font-black' : 'text-slate-400'}`}>3. Password</span>
        </div>
        <div className="mt-1.5 flex h-1.5 w-full gap-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#003F86]' : 'bg-slate-200'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#003F86]' : 'bg-slate-200'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#003F86]' : 'bg-slate-200'}`} />
        </div>
      </div>

      <form className="grid gap-3" onSubmit={step === 3 ? submitSignup : (e) => e.preventDefault()}>
        {step === 1 && (
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <input
                className={`mt-1 h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003F86] focus:bg-white focus:ring-2 focus:ring-[#003F86]/10 ${fieldErrors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Enter your full name"
                type="text"
                value={form.name}
              />
              {fieldErrors.name && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                className={`mt-1 h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003F86] focus:bg-white focus:ring-2 focus:ring-[#003F86]/10 ${fieldErrors.email ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}
                onBlur={() => checkAvailabilityField('email', form.email)}
                onChange={(event) => updateForm('email', event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={form.email}
              />
              {fieldErrors.email && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
              <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.phone ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
                <div className="flex h-full items-center gap-1 border-r border-slate-200 bg-slate-100/70 px-2.5 text-xs font-black text-slate-800">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  maxLength={10}
                  onBlur={() => checkAvailabilityField('phone', form.phone)}
                  onChange={(event) => updateForm('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  type="tel"
                  value={form.phone}
                />
              </div>
              {fieldErrors.phone && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.phone}</p>}
            </div>

            <button
              className="mt-1 flex h-9.5 w-full items-center justify-center gap-1.5 rounded-xl bg-[#003F86] px-4 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-[#0054A6] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || Boolean(fieldErrors.email || fieldErrors.phone)}
              onClick={handleNextStep1}
              type="button"
            >
              {isSubmitting ? 'Checking Details & Sending OTP...' : 'Continue to Verify OTP →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2.5">
            {/* Destination Info Card */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 px-3 ring-1 ring-slate-200/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#003F86]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OTP Sent Via SMS & Email to</p>
                  <p className="truncate text-xs font-bold text-slate-800">
                    +91 {form.phone} {form.email ? `• ${form.email}` : ''}
                  </p>
                </div>
              </div>
              <button
                className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#003F86] shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-[#0054A6]"
                onClick={() => changeStep(1)}
                type="button"
              >
                Change
              </button>
            </div>


            <div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Enter 6-digit Code</span>
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  className={`mt-1 h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-center font-mono text-lg font-black tracking-[0.35em] text-slate-900 outline-none transition placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:border-[#003F86] focus:bg-white focus:ring-2 focus:ring-[#003F86]/10 ${fieldErrors.otp ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => updateForm('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  type="text"
                  value={form.otp}
                />
                {fieldErrors.otp && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.otp}</p>}
              </label>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Didn&apos;t receive code?</span>
                {resendIn > 0 ? (
                  <span className="font-semibold text-slate-400">Resend in {resendIn}s</span>
                ) : (
                  <button
                    className="font-bold text-[#003F86] hover:underline"
                    disabled={isSubmitting}
                    onClick={handleResendOtp}
                    type="button"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-0.5">
              <button
                className="h-9.5 w-1/3 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                disabled={isSubmitting}
                onClick={() => changeStep(1)}
                type="button"
              >
                Back
              </button>
              <button
                className="flex h-9.5 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003F86] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0054A6] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || String(form.otp || '').trim().length !== 6}
                onClick={handleNextStep2}
                type="button"
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700">Create Password</label>
              <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.password ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
                <input
                  className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  minLength={8}
                  onChange={(event) => updateForm('password', event.target.value)}
                  placeholder="At least 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                />
                <button
                  className="flex h-full items-center px-3 text-xs font-bold text-slate-500 hover:text-[#003F86]"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
              <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.confirmPassword ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
                <input
                  className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  minLength={8}
                  onChange={(event) => updateForm('confirmPassword', event.target.value)}
                  placeholder="Re-enter password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                />
                <button
                  className="flex h-full items-center px-3 text-xs font-bold text-slate-500 hover:text-[#003F86]"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  type="button"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className="flex gap-2 pt-0.5">
              <button
                className="h-9.5 w-1/3 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                disabled={isSubmitting}
                onClick={() => changeStep(2)}
                type="button"
              >
                Back
              </button>
              <button
                className="flex h-9.5 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003F86] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0054A6] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Creating Account...' : 'Complete & Log In'}
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="mt-3.5 text-center text-xs font-medium text-slate-600">
        Already have an account?{' '}
        <button className="font-bold text-[#003F86] hover:underline" onClick={onShowLogin} type="button">
          Login here →
        </button>
      </div>
    </div>
  )
}

export default SignupForm
