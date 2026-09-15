import { useEffect, useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

function LoginForm({ compact = false, onCreateAccount, onForgotPassword, onLogin, onOpenBecomeProvider }) {
  const [method, setMethod] = useState('otp')
  const [step, setStep] = useState('identifier')
  const [form, setForm] = useState({ login: '', otp: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpMeta, setOtpMeta] = useState(null)
  const [message, setMessage] = useState('')
  const [resendIn, setResendIn] = useState(0)

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
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setMessage('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const switchMethod = (nextMethod) => {
    setMethod(nextMethod)
    setStep('identifier')
    setFieldErrors({})
    setMessage('')
    setOtpMeta(null)
    setForm((current) => ({ ...current, otp: '', password: '' }))
  }

  const sendOtp = async (event) => {
    event?.preventDefault?.()
    const login = form.login.trim()
    if (!login) {
      setFieldErrors({ login: 'Please enter your mobile number or email address.' })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const response = await frontendApi.sendCustomerLoginOtp({ login })
      setOtpMeta(response)
      setMessage(response.message || 'OTP sent successfully.')
      setStep('otp')
      setResendIn(Number(response.resend_after) || 45)
      setForm((current) => ({ ...current, otp: '' }))
      notify(response.message || 'Verification OTP sent successfully', { tone: 'success' })
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({ login: errors.login?.[0] || error.message })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    const cleanOtp = form.otp.trim().replace(/\D/g, '')
    if (cleanOtp.length !== 6) {
      setFieldErrors({ otp: 'Please enter the complete 6-digit OTP.' })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const session = await frontendApi.verifyCustomerLoginOtp({
        login: form.login.trim(),
        otp: cleanOtp,
      })
      await onLogin?.(session)
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({ otp: errors.otp?.[0] || error.message })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitPasswordLogin = async (event) => {
    event.preventDefault()
    const login = form.login.trim()
    if (!login) {
      setFieldErrors({ login: 'Please enter your mobile number or email address.' })
      return
    }
    if (!form.password) {
      setFieldErrors({ password: 'Enter your account password.' })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      await onLogin?.({
        mode: 'login',
        login,
        phone: login.includes('@') ? undefined : login,
        email: login.includes('@') ? login : undefined,
        password: form.password,
      })
    } catch (error) {
      const errors = error.errors || {}
      setFieldErrors({
        login: errors.login?.[0] || errors.phone?.[0] || errors.email?.[0] || '',
        password: errors.password?.[0] || (!errors.login && !errors.phone && !errors.email ? error.message : ''),
      })
      notify(error.message, { tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={compact ? '' : 'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl'}>
      {!compact && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0B3B7A]">Welcome back!</p>
          <h1 className="mt-0.5 text-xl font-black tracking-tight text-[#0B3B7A]">Sign in to continue to KwalityCare</h1>
        </div>
      )}

      {/* Pill Method Tabs */}
      <div className="mb-3 flex rounded-full bg-slate-100 p-1 ring-1 ring-slate-200/70">
        <button
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all ${
            method === 'otp'
              ? 'bg-[#003F86] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
          onClick={() => switchMethod('otp')}
          type="button"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          OTP Login
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all ${
            method === 'password'
              ? 'bg-[#003F86] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
          onClick={() => switchMethod('password')}
          type="button"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Password Login
        </button>
      </div>

      {/* OTP Method Flow */}
      {method === 'otp' && step === 'identifier' && (
        <form className="flex min-h-[188px] flex-col justify-between" onSubmit={sendOtp}>
          <div className="space-y-1.5">
            <IdentifierField
              error={fieldErrors.login}
              onChange={(value) => updateForm('login', value)}
              value={form.login}
            />
            <p className="text-[11px] font-medium text-slate-500">
              We&apos;ll send a secure 6-digit verification code to this contact.
            </p>
          </div>

          <button
            className="group mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] hover:shadow-lg hover:shadow-[#003F86]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            disabled={isSubmitting || !form.login.trim()}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Get OTP</span>
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      )}

      {/* OTP Input Step */}
      {method === 'otp' && step === 'otp' && (
        <form className="flex min-h-[188px] flex-col justify-between" onSubmit={verifyOtp}>
          <div className="space-y-2.5">
            {/* Destination Info Card */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 px-3 ring-1 ring-slate-200/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#003F86]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Code sent to</p>
                  <p className="truncate text-xs font-bold text-slate-800">{otpMeta?.masked_destination || form.login}</p>
                </div>
              </div>
              <button
                className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#003F86] shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-[#0054A6]"
                onClick={() => {
                  setStep('identifier')
                  setForm((current) => ({ ...current, otp: '' }))
                  setMessage('')
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

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Didn&apos;t receive code?</span>
                {resendIn > 0 ? (
                  <span className="font-semibold text-slate-400">Resend in {resendIn}s</span>
                ) : (
                  <button
                    className="font-bold text-[#003F86] hover:underline"
                    disabled={isSubmitting}
                    onClick={sendOtp}
                    type="button"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] hover:shadow-lg hover:shadow-[#003F86]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            disabled={isSubmitting || form.otp.length !== 6}
            type="submit"
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
          </button>
        </form>
      )}

      {/* Password Method Flow */}
      {method === 'password' && (
        <form className="flex min-h-[188px] flex-col justify-between" onSubmit={submitPasswordLogin}>
          <div className="space-y-2">
            <IdentifierField
              error={fieldErrors.login}
              onChange={(value) => updateForm('login', value)}
              value={form.login}
            />

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                {onForgotPassword && (
                  <button
                    className="text-[11px] font-bold text-[#003F86] transition hover:underline"
                    onClick={onForgotPassword}
                    type="button"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${fieldErrors.password ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
                <input
                  autoComplete="current-password"
                  className="h-full w-full bg-transparent px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  onChange={(event) => updateForm('password', event.target.value)}
                  placeholder="Enter your password"
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
          </div>

          <button
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-[#003F86]/20 transition-all hover:bg-[#0054A6] hover:shadow-lg hover:shadow-[#003F86]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            disabled={isSubmitting || !form.login.trim() || !form.password}
            type="submit"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      )}

      {/* New User Footer */}
      <div className="mt-3 text-center text-xs font-medium text-slate-600">
        New to KwalityCare?{' '}
        <button className="font-bold text-[#003F86] hover:underline" onClick={onCreateAccount} type="button">
          Create an account →
        </button>
      </div>

      {/* Partner Onboarding Card */}
      {onOpenBecomeProvider && (
        <div className="mt-3 rounded-xl border border-[#A3E9C6] bg-[#EAFBF3] p-2.5 transition hover:border-[#86dfaf]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#00875A] text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">Join as Service Partner</p>
                <p className="text-[10px] font-medium text-emerald-700 leading-tight">Get jobs & grow income</p>
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg bg-[#00875A] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#00704A] active:scale-[0.98]"
              onClick={onOpenBecomeProvider}
              type="button"
            >
              Join Us →
            </button>
          </div>
        </div>
      )}

      {/* Compact Trust Badges */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          100% Secure
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Data Safe
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Trusted
        </span>
      </div>
    </div>
  )
}

function IdentifierField({ error, onChange, value }) {
  const isPhone = value && !value.includes('@') && /^[\d\s+()-]*$/.test(value)

  return (
    <div>
      <label className="text-xs font-semibold text-slate-700">Mobile Number or Email</label>
      <div className={`mt-1 flex h-10 items-center overflow-hidden rounded-xl border bg-slate-50/50 transition focus-within:border-[#003F86] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003F86]/10 ${error ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'}`}>
        {isPhone ? (
          <div className="flex h-full items-center gap-1 border-r border-slate-200 bg-slate-100/70 px-2.5 text-xs font-black text-slate-800">
            <span>🇮🇳</span>
            <span>+91</span>
          </div>
        ) : (
          <div className="flex h-full items-center px-3 text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <input
          autoComplete="username"
          className="h-full w-full bg-transparent px-2.5 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mobile or Email"
          type="text"
          value={value}
        />
      </div>
      {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  )
}

export default LoginForm
