import { useEffect, useRef, useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { notify } from '../../utils/feedback'

const RESEND_SECONDS = 45

function isEmailValue(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isPhoneValue(value) {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits.length >= 10
}

function IdentifierStep({ disabled, error, login, onChange, onSubmit, subtitle, title }) {
  return (
    <form className="flex flex-col gap-5 pb-2" onSubmit={onSubmit}>
      <div>
        <h2 className="text-xl font-bold text-[#003F86]">{title || 'Login to Continue'}</h2>
        <p className="mt-1.5 text-sm font-medium text-[#003F86]/75">
          {subtitle || 'Enter your email or mobile number to continue booking.'}
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-[#003F86]">Email or mobile number</span>
        <input
          autoComplete="username"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
          disabled={disabled}
          inputMode="email"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your email or mobile number"
          type="text"
          value={login}
        />
        {error ? <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span> : null}
      </label>

      <button
        className="mt-1 w-full rounded-xl bg-[#003F86] px-4 py-3.5 text-sm font-bold text-white shadow-md transition enabled:hover:bg-[#002f64] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {disabled ? 'Please wait…' : 'Continue'}
      </button>
    </form>
  )
}

function OtpStep({
  channel,
  disabled,
  error,
  maskedDestination,
  onBack,
  onChangeOtp,
  onResend,
  onSubmit,
  otp,
  resendIn,
}) {
  const changeLabel = channel === 'email' ? 'Change email' : 'Change mobile number'

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div>
        <h2 className="text-xl font-bold text-[#003F86]">Verify OTP</h2>
        <p className="mt-1 text-sm font-medium text-[#003F86]/75">
          OTP sent to {maskedDestination || 'your contact'}
        </p>
        <button
          className="mt-1.5 text-sm font-bold text-[#003F86] underline underline-offset-2 hover:text-[#002f64] disabled:opacity-50"
          disabled={disabled}
          onClick={onBack}
          type="button"
        >
          {changeLabel}
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-[#003F86]">Enter 6-digit OTP</span>
        <input
          autoComplete="one-time-code"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
          disabled={disabled}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => onChangeOtp(event.target.value.replace(/\D+/g, '').slice(0, 6))}
          placeholder="••••••"
          type="text"
          value={otp}
        />
        {error ? <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span> : null}
      </label>

      <button
        className="w-full rounded-xl bg-[#003F86] px-4 py-3 text-sm font-bold text-white shadow-md transition enabled:hover:bg-[#002f64] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || otp.length !== 6}
        type="submit"
      >
        {disabled ? 'Verifying…' : 'Verify OTP'}
      </button>

      <div className="text-center text-sm font-semibold text-slate-600">
        {resendIn > 0 ? (
          <span>Resend OTP in {resendIn}s</span>
        ) : (
          <button
            className="font-bold text-[#003F86] underline-offset-2 hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={onResend}
            type="button"
          >
            Resend OTP
          </button>
        )}
      </div>
    </form>
  )
}

function OnboardingStep({
  channel,
  disabled,
  errors,
  form,
  identifier,
  onChange,
  onSubmit,
}) {
  const secondaryIsEmail = channel === 'phone'

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div>
        <h2 className="text-xl font-bold text-[#003F86]">Complete your profile</h2>
        <p className="mt-1 text-sm font-medium text-[#003F86]/75">
          Almost done — tell us a bit about you.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-bold text-[#003F86]">Customer name</span>
        <input
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86] focus:ring-2 focus:ring-[#003F86]/15"
          disabled={disabled}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Your full name"
          type="text"
          value={form.name}
        />
        {errors.name ? <span className="mt-1 block text-xs font-semibold text-rose-600">{errors.name}</span> : null}
      </label>

      {channel === 'phone' ? (
        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Verified mobile</span>
          <input
            aria-readonly="true"
            className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-sm font-semibold text-slate-600"
            readOnly
            tabIndex={-1}
            type="text"
            value={identifier}
          />
        </label>
      ) : (
        <label className="block">
          <span className="text-sm font-bold text-[#003F86]">Verified email</span>
          <input
            aria-readonly="true"
            className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-sm font-semibold text-slate-600"
            readOnly
            tabIndex={-1}
            type="text"
            value={identifier}
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-bold text-[#003F86]">
          {secondaryIsEmail ? 'Email address' : 'Mobile number'}
        </span>
        <input
          className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 disabled:opacity-60 ${
            (secondaryIsEmail ? errors.email : errors.phone)
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-[#003F86] focus:ring-[#003F86]/15'
          }`}
          disabled={disabled}
          inputMode={secondaryIsEmail ? 'email' : 'tel'}
          onChange={(event) => onChange(secondaryIsEmail ? 'email' : 'phone', event.target.value)}
          placeholder={secondaryIsEmail ? 'email@example.com' : '10-digit mobile number'}
          type={secondaryIsEmail ? 'email' : 'tel'}
          value={secondaryIsEmail ? form.email : form.phone}
        />
        {(secondaryIsEmail ? errors.email : errors.phone) ? (
          <span className="mt-1.5 block text-xs font-semibold text-rose-600">
            {secondaryIsEmail ? errors.email : errors.phone}
          </span>
        ) : null}
      </label>

      <button
        className="w-full rounded-xl bg-[#003F86] px-4 py-3 text-sm font-bold text-white shadow-md transition enabled:hover:bg-[#002f64] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {disabled ? 'Creating account…' : 'Continue'}
      </button>
    </form>
  )
}

/**
 * Mobile + Tablet only OTP login/signup bottom sheet.
 * Desktop must use the existing AuthModal — do not render this at lg+.
 */
export default function MobileTabletGuestAuthBottomSheet({
  onAuthenticated,
  onClose,
  subtitle,
  title,
}) {
  const [step, setStep] = useState('identifier')
  const [login, setLogin] = useState('')
  const [otp, setOtp] = useState('')
  const [otpMeta, setOtpMeta] = useState(null)
  const [verificationToken, setVerificationToken] = useState('')
  const [channel, setChannel] = useState('phone')
  const [identifier, setIdentifier] = useState('')
  const [onboarding, setOnboarding] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const requestLock = useRef(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const runLocked = async (fn) => {
    if (requestLock.current) return
    requestLock.current = true
    setIsSubmitting(true)
    try {
      await fn()
    } finally {
      requestLock.current = false
      setIsSubmitting(false)
    }
  }

  const handleContinue = (event) => {
    event.preventDefault()
    const value = login.trim()
    if (!value) {
      setErrors({ login: 'Enter your email or mobile number.' })
      return
    }
    if (!isEmailValue(value) && !isPhoneValue(value)) {
      setErrors({ login: 'Enter a valid email or 10-digit mobile number.' })
      return
    }

    runLocked(async () => {
      setErrors({})
      try {
        await frontendApi.guestCartCheckIdentifier({ login: value })
        const response = await frontendApi.guestCartSendOtp({ login: value })
        setOtpMeta(response)
        setChannel(response.channel || (isEmailValue(value) ? 'email' : 'phone'))
        setIdentifier(value)
        setStep('otp')
        setResendIn(response.resend_after || RESEND_SECONDS)
        setOtp('')
        notify(response.message || 'OTP sent')
      } catch (error) {
        setErrors({ login: error.errors?.login?.[0] || error.message })
        notify(error.message || 'Unable to continue', { tone: 'error' })
      }
    })
  }

  const handleResend = () => {
    if (resendIn > 0) return
    runLocked(async () => {
      setErrors({})
      try {
        const response = await frontendApi.guestCartSendOtp({ login: login.trim() })
        setOtpMeta(response)
        setResendIn(response.resend_after || RESEND_SECONDS)
        setOtp('')
        notify(response.message || 'OTP resent')
      } catch (error) {
        setErrors({ otp: error.errors?.login?.[0] || error.message })
        notify(error.message || 'Unable to resend OTP', { tone: 'error' })
      }
    })
  }

  const handleVerifyOtp = (event) => {
    event.preventDefault()
    if (otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit OTP.' })
      return
    }

    runLocked(async () => {
      setErrors({})
      try {
        const response = await frontendApi.guestCartVerifyOtp({
          login: login.trim(),
          otp: otp.trim(),
        })

        if ((response.auth_status === 'authenticated' || response.session?.token) && response.session) {
          notify('Login successful')
          await onAuthenticated?.(response.session)
          return
        }

        if (response.auth_status === 'needs_onboarding') {
          setVerificationToken(response.verification_token)
          setChannel(response.channel || channel)
          setIdentifier(response.identifier || login.trim())
          setOnboarding((current) => ({
            ...current,
            email: response.channel === 'email' ? (response.identifier || '') : '',
            phone: response.channel === 'phone' ? (response.identifier || '') : '',
          }))
          setStep('onboarding')
          return
        }

        setErrors({ otp: 'Unexpected response. Please try again.' })
      } catch (error) {
        setErrors({ otp: error.errors?.otp?.[0] || error.message })
        notify(error.message || 'Invalid OTP', { tone: 'error' })
      }
    })
  }

  const handleCompleteRegistration = (event) => {
    event.preventDefault()
    const name = onboarding.name.trim()
    const email = onboarding.email.trim()
    const phone = onboarding.phone.trim()
    const nextErrors = {}

    if (!name) nextErrors.name = 'Customer name is required.'
    if (channel === 'phone' && !isEmailValue(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (channel === 'email' && !isPhoneValue(phone)) {
      nextErrors.phone = 'Enter a valid 10-digit mobile number.'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    runLocked(async () => {
      setErrors({})
      try {
        const response = await frontendApi.guestCartCompleteRegistration({
          verificationToken,
          name,
          email: channel === 'phone' ? email : undefined,
          phone: channel === 'email' ? phone : undefined,
        })

        if (response.session?.token) {
          notify('Account created successfully')
          await onAuthenticated?.(response.session)
          return
        }

        setErrors({ name: 'Unable to complete registration. Please try again.' })
      } catch (error) {
        const secondaryKey = channel === 'phone' ? 'email' : 'phone'
        const secondaryMsg = error.errors?.[secondaryKey]?.[0] || ''
        const nameMsg = error.errors?.name?.[0] || ''
        const tokenMsg = error.errors?.verification_token?.[0] || ''

        // Show uniqueness / field errors only under the editable input — never under verified OTP field
        setErrors({
          name: nameMsg,
          email: secondaryKey === 'email' ? (secondaryMsg || '') : '',
          phone: secondaryKey === 'phone' ? (secondaryMsg || '') : '',
          form: (!secondaryMsg && !nameMsg) ? (tokenMsg || error.message || '') : '',
        })

        if (tokenMsg) {
          notify(tokenMsg, { tone: 'error' })
          setStep('identifier')
          setVerificationToken('')
          return
        }

        notify(
          secondaryMsg || nameMsg || error.message || 'Unable to complete registration',
          { tone: 'error' },
        )
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[1px] lg:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className="relative flex min-h-[42dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-modal-slide"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid shrink-0 grid-cols-[minmax(4.5rem,auto)_1fr_2.25rem] items-center px-4 pt-3 pb-1">
          {step !== 'identifier' ? (
            <button
              className="inline-flex h-9 items-center gap-0.5 justify-self-start rounded-full text-sm font-bold leading-none text-[#003F86] transition hover:bg-slate-50 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => {
                if (step === 'otp') {
                  setStep('identifier')
                  setOtp('')
                  setOtpMeta(null)
                  setErrors({})
                  setResendIn(0)
                  return
                }
                if (step === 'onboarding') {
                  setStep('otp')
                  setErrors({})
                }
              }}
              type="button"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          ) : (
            <span aria-hidden="true" className="h-9 w-9" />
          )}
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">
          {step === 'identifier' ? (
            <IdentifierStep
              disabled={isSubmitting}
              error={errors.login}
              login={login}
              onChange={(value) => {
                setErrors((current) => ({ ...current, login: '' }))
                setLogin(value)
              }}
              onSubmit={handleContinue}
              subtitle={subtitle}
              title={title}
            />
          ) : null}

          {step === 'otp' ? (
            <OtpStep
              channel={channel}
              disabled={isSubmitting}
              error={errors.otp}
              maskedDestination={otpMeta?.masked_destination}
              onBack={() => {
                setStep('identifier')
                setOtp('')
                setOtpMeta(null)
                setErrors({})
                setResendIn(0)
              }}
              onChangeOtp={(value) => {
                setErrors((current) => ({ ...current, otp: '' }))
                setOtp(value)
              }}
              onResend={handleResend}
              onSubmit={handleVerifyOtp}
              otp={otp}
              resendIn={resendIn}
            />
          ) : null}

          {step === 'onboarding' ? (
            <OnboardingStep
              channel={channel}
              disabled={isSubmitting}
              errors={errors}
              form={onboarding}
              identifier={identifier}
              onChange={(field, value) => {
                setErrors((current) => ({ ...current, [field]: '', form: '' }))
                setOnboarding((current) => ({ ...current, [field]: value }))
              }}
              onSubmit={handleCompleteRegistration}
            />
          ) : null}

          {errors.form && step === 'identifier' ? (
            <p className="mt-3 text-xs font-semibold text-rose-600">{errors.form}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
