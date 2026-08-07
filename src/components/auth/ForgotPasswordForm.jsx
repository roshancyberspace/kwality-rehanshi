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
      <p className="text-center text-sm font-medium leading-5 text-blue-700">
        Reset your customer password with an email OTP.
      </p>

      {message && (
        <p className="mt-3 rounded-xl border border-[#67B529]/20 bg-[#EEF9E8] px-4 py-2.5 text-sm font-semibold text-[#67B529]">
          {message}
        </p>
      )}

      {step === 'email' && (
        <form className="mt-4 space-y-3" onSubmit={sendOtp}>
          <label className="block">
            <span className="text-sm font-bold text-blue-900">Registered email</span>
            <input
              className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-base outline-none transition placeholder:text-blue-300 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.email ? 'border-rose-500' : 'border-blue-200'}`}
              onChange={(event) => updateForm('email', event.target.value)}
              placeholder="Enter your email address"
              required
              type="email"
              value={form.email}
            />
            {fieldErrors.email && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.email}</p>}
          </label>
          <button
            className="h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 'otp' && (
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
            {isSubmitting ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            className="h-11 w-full rounded-xl border border-blue-100 px-5 font-bold text-blue-900 transition hover:border-[#003F86] hover:bg-[#F6FBFF]"
            disabled={isSubmitting}
            onClick={sendOtp}
            type="button"
          >
            Resend OTP
          </button>
        </form>
      )}

      {step === 'password' && (
        <form className="mt-4 space-y-3" onSubmit={resetPassword}>
          <label className="block">
            <span className="text-sm font-bold text-blue-900">New password</span>
            <div className={`mt-1.5 flex h-10 overflow-hidden rounded-xl border bg-[#F6FBFF] transition focus-within:border-[#003F86] focus-within:bg-white focus-within:shadow-sm ${fieldErrors.password ? 'border-rose-500' : 'border-blue-200'}`}>
              <input
                className="w-full bg-transparent px-4 text-base outline-none placeholder:text-blue-300"
                minLength={8}
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder="Minimum 8 characters"
                required
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
            <span className="text-sm font-bold text-blue-900">Confirm password</span>
            <input
              className={`mt-1.5 h-10 w-full rounded-xl border bg-[#F6FBFF] px-4 text-base outline-none transition placeholder:text-blue-300 focus:border-[#003F86] focus:bg-white focus:shadow-sm ${fieldErrors.passwordConfirmation ? 'border-rose-500' : 'border-blue-200'}`}
              minLength={8}
              onChange={(event) => updateForm('passwordConfirmation', event.target.value)}
              placeholder="Re-enter new password"
              required
              type={showPassword ? 'text' : 'password'}
              value={form.passwordConfirmation}
            />
            {fieldErrors.passwordConfirmation && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.passwordConfirmation}</p>}
          </label>
          <button
            className="h-10 w-full rounded-xl bg-[#003F86] px-5 font-bold text-white shadow-[0_12px_24px_rgba(0,84,166,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0054A6] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Changing password...' : 'Change password'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-blue-700">
        Remember password?{' '}
        <button className="font-bold text-[#003F86]" onClick={onBackToLogin} type="button">
          Login
        </button>
      </p>
    </div>
  )
}

export default ForgotPasswordForm
