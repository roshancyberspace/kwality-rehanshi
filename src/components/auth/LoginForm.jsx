import { useState } from 'react'
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
    event.preventDefault()
    const login = form.login.trim()
    if (!login) {
      setFieldErrors({ login: 'Enter your mobile number or email.' })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const response = await frontendApi.sendCustomerLoginOtp({ login })
      setOtpMeta(response)
      setMessage(response.message || 'OTP sent successfully.')
      setStep('otp')
      notify(response.message || 'OTP sent')
      if (response.debug_otp) {
        setForm((current) => ({ ...current, otp: String(response.debug_otp) }))
      }
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
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const session = await frontendApi.verifyCustomerLoginOtp({
        login: form.login.trim(),
        otp: form.otp.trim(),
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
      setFieldErrors({ login: 'Enter your mobile number or email.' })
      return
    }
    if (!form.password) {
      setFieldErrors({ password: 'Enter your password.' })
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
    <div className={compact ? '' : 'w-full max-w-md rounded-lg border border-blue-100 bg-white p-6 shadow-sm'}>
      {!compact && (
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold">Login to KwalityCare</h1>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 rounded-xl border border-blue-100 bg-[#F6FBFF] p-1">
        <button
          className={`rounded-lg py-2 text-xs font-extrabold transition sm:text-sm ${
            method === 'otp' ? 'bg-[#003F86] text-white shadow-sm' : 'text-blue-700 hover:text-[#003F86]'
          }`}
          onClick={() => switchMethod('otp')}
          type="button"
        >
          Login with OTP
        </button>
        <button
          className={`rounded-lg py-2 text-xs font-extrabold transition sm:text-sm ${
            method === 'password' ? 'bg-[#003F86] text-white shadow-sm' : 'text-blue-700 hover:text-[#003F86]'
          }`}
          onClick={() => switchMethod('password')}
          type="button"
        >
          Password login
        </button>
      </div>

      <p className="text-center text-sm font-medium leading-5 text-blue-700">
        {method === 'otp'
          ? step === 'otp'
            ? `Enter the OTP sent to ${otpMeta?.masked_destination || 'your contact'}.`
            : 'Enter your mobile number or email to get an OTP.'
          : 'Enter your mobile number or email and password.'}
      </p>

      {message && method === 'otp' && (
        <p className="mt-3 rounded-xl border border-[#67B529]/20 bg-[#EEF9E8] px-4 py-2.5 text-sm font-semibold text-[#67B529]">
          {message}
        </p>
      )}

      {method === 'otp' && step === 'identifier' && (
        <form className="mt-4 space-y-3" onSubmit={sendOtp}>
          <IdentifierField
            error={fieldErrors.login}
            onChange={(value) => updateForm('login', value)}
            value={form.login}
          />
          <button
            className="h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {method === 'otp' && step === 'otp' && (
        <form className="mt-4 space-y-3" onSubmit={verifyOtp}>
          <label className="block">
            <span className="text-sm font-bold text-blue-900">OTP</span>
            <input
              className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-center text-lg font-bold tracking-[0.35em] outline-none transition placeholder:text-blue-200 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.otp ? 'border-rose-500' : 'border-blue-200'}`}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => updateForm('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              value={form.otp}
            />
            {fieldErrors.otp && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.otp}</p>}
          </label>
          <button
            className="h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
            disabled={isSubmitting || form.otp.length !== 6}
            type="submit"
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Login'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-bold text-blue-900 transition hover:border-[#003F86] hover:bg-[#F6FBFF]"
              disabled={isSubmitting}
              onClick={() => {
                setStep('identifier')
                setForm((current) => ({ ...current, otp: '' }))
                setMessage('')
              }}
              type="button"
            >
              Change number/email
            </button>
            <button
              className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-bold text-blue-900 transition hover:border-[#003F86] hover:bg-[#F6FBFF]"
              disabled={isSubmitting}
              onClick={sendOtp}
              type="button"
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}

      {method === 'password' && (
        <form className="mt-4 space-y-3" onSubmit={submitPasswordLogin}>
          <IdentifierField
            error={fieldErrors.login}
            onChange={(value) => updateForm('login', value)}
            value={form.login}
          />

          <label className="block">
            <span className="flex items-center justify-between gap-3 text-sm font-bold text-blue-900">
              Password
              {onForgotPassword && (
                <button className="text-xs font-black text-blue-700 transition hover:text-[#003F86]" onClick={onForgotPassword} type="button">
                  Forgot password?
                </button>
              )}
            </span>
            <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${fieldErrors.password ? 'border-rose-500' : 'border-blue-200'}`}>
              <input
                className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder="Enter password"
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

          <button
            className="h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-blue-700">
        New to KwalityCare?{' '}
        <button className="font-bold text-[#003F86]" onClick={onCreateAccount} type="button">
          Create account
        </button>
      </p>

      {onOpenBecomeProvider && (
        <div className="mt-4 border-t border-blue-100 pt-3 text-center">
          <button
            className="h-11 w-full rounded-xl border border-[#67B529]/50 px-5 font-bold text-[#67B529] transition hover:border-[#5CA827] hover:bg-[#EEF9E8]"
            onClick={onOpenBecomeProvider}
            type="button"
          >
            Become Service Provider
          </button>
        </div>
      )}
    </div>
  )
}

function IdentifierField({ error, onChange, value }) {
  const looksLikePhone = value && !value.includes('@') && /^[\d\s+()-]*$/.test(value)

  return (
    <label className="block">
      <span className="text-sm font-bold text-blue-900">Mobile number or email</span>
      <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${error ? 'border-rose-500' : 'border-blue-200'}`}>
        {looksLikePhone ? (
          <span className="grid w-14 shrink-0 place-items-center border-r border-blue-100 text-sm font-bold text-blue-700">
            +91
          </span>
        ) : null}
        <input
          autoComplete="username"
          className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
          onChange={(event) => onChange(event.target.value)}
          placeholder="98765 43210 or email@example.com"
          type="text"
          value={value}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-rose-600">{error}</p>}
    </label>
  )
}

export default LoginForm
