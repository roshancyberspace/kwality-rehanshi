import { useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

const initialForm = {
  email: '',
  otp: '',
  password: '',
  passwordConfirmation: '',
}

function ForgotPasswordForm({ onBackToLogin }) {
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState('email')
  const [resetToken, setResetToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const updateForm = (field, value) => {
    setMessage('')
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setForm((current) => ({ ...current, [field]: value }))
  }

  const sendOtp = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const response = await frontendApi.sendCustomerPasswordOtp({ email: form.email.trim() })
      setMessage(response.message || 'OTP sent to your email.')
      setStep('otp')
      notify('OTP sent to your email')
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({ email: errors.email?.[0] || error.message })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const response = await frontendApi.verifyCustomerPasswordOtp({
        email: form.email.trim(),
        otp: form.otp.trim(),
      })
      setResetToken(response.reset_token || '')
      setMessage(response.message || 'OTP verified.')
      setStep('password')
      notify('OTP verified')
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({ otp: errors.otp?.[0] || error.message })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const response = await frontendApi.resetCustomerPassword({
        email: form.email.trim(),
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        resetToken,
      })
      notify(response.message || 'Password changed successfully')
      setForm(initialForm)
      setResetToken('')
      onBackToLogin?.()
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({
        password: errors.password?.[0] || error.message,
        passwordConfirmation: errors.password_confirmation?.[0] || '',
      })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-center text-xs font-medium text-slate-500">
        Reset your customer account password using an email verification code.
      </p>

      {message && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
          {message}
        </p>
      )}

      {step === 'email' && (
        <form className="mt-3.5 space-y-3" onSubmit={sendOtp}>
          <div>
            <label className="text-xs font-semibold text-slate-700">Registered Email Address</label>
            <input
              autoComplete="email"
              className={`mt-1 h-10 w-full rounded-xl border bg-slate-50/50 px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003F86] focus:bg-white focus:ring-2 focus:ring-[#003F86]/10 ${fieldErrors.email ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}
              onChange={(event) => updateForm('email', event.target.value)}
              placeholder="e.g. name@example.com"
              required
              type="email"
              value={form.email}
            />
            {fieldErrors.email && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.email}</p>}
          </div>

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !form.email.trim()}
            type="submit"
          >
            {isSubmitting ? 'Sending Code...' : 'Send Reset Code →'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="mt-3.5 space-y-3" onSubmit={verifyOtp}>
          {/* Destination Info Card */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 px-3 ring-1 ring-slate-200/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#003F86]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Code sent to</p>
                <p className="truncate text-xs font-bold text-slate-800">{form.email}</p>
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#003F86] shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-[#0054A6]"
              onClick={() => {
                setStep('email')
                setForm((current) => ({ ...current, otp: '' }))
              }}
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
                required
                value={form.otp}
              />
              {fieldErrors.otp && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.otp}</p>}
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || form.otp.length !== 6}
              type="submit"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP →'}
            </button>

            <button
              className="h-10 w-full rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              disabled={isSubmitting}
              onClick={sendOtp}
              type="button"
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form className="mt-3.5 space-y-2.5" onSubmit={resetPassword}>
          <div>
            <label className="text-xs font-semibold text-slate-700">New Password</label>
            <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.password ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
              <input
                className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                minLength={8}
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder="Minimum 8 characters"
                required
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
            <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
            <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.passwordConfirmation ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
              <input
                className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                minLength={8}
                onChange={(event) => updateForm('passwordConfirmation', event.target.value)}
                placeholder="Re-enter password"
                required
                type={showPassword ? 'text' : 'password'}
                value={form.passwordConfirmation}
              />
            </div>
            {fieldErrors.passwordConfirmation && <p className="mt-1 text-xs font-bold text-rose-600">{fieldErrors.passwordConfirmation}</p>}
          </div>

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Updating Password...' : 'Save New Password & Login'}
          </button>
        </form>
      )}

      <div className="mt-3.5 text-center text-xs font-medium text-slate-600">
        Remember password?{' '}
        <button className="font-bold text-[#003F86] hover:underline" onClick={onBackToLogin} type="button">
          Login here →
        </button>
      </div>
    </div>
  )
}

export default ForgotPasswordForm
