import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { vendorApi } from '../../services/vendorApi'
import { notify } from '../../utils/feedback'

const REMEMBER_KEY = 'kwalitycare_staff_login_remember'

const modeCopy = {
  admin: {
    portalBadge: 'Secure Admin Portal',
    pageTitle: 'Admin Login',
    button: 'Login to Admin Panel',
    subtitle: 'Sign in as Super Admin to continue to the KwalityCare dashboard.',
    helper: 'Manage bookings, partners, content, coupons, and finance — all from one secure platform.',
    title: 'Run the entire operation from one desk.',
    accent: 'one desk.',
    stats: [
      { label: 'Bookings', detail: 'Manage easily', icon: 'calendar', bg: 'bg-blue-500/20 text-blue-300' },
      { label: 'Vendors', detail: 'Approve & track', icon: 'users', bg: 'bg-purple-500/20 text-purple-300' },
      { label: 'Coupons', detail: 'Create offers', icon: 'tag', bg: 'bg-amber-500/20 text-amber-300' },
      { label: 'Finance', detail: 'Track payouts', icon: 'wallet', bg: 'bg-emerald-500/20 text-emerald-300' },
    ],
  },
  vendor: {
    portalBadge: 'Secure Vendor Portal',
    pageTitle: 'Vendor Login',
    button: 'Login to Vendor Panel',
    subtitle: 'Sign in as Vendor to continue to the KwalityCare partner portal.',
    helper: 'Open assigned jobs, update work status, and keep your wallet moving seamlessly.',
    title: 'Your jobs, earnings, and day — ready.',
    accent: 'ready.',
    stats: [
      { label: 'Jobs Queue', detail: "Today's queue", icon: 'calendar', bg: 'bg-blue-500/20 text-blue-300' },
      { label: 'Earnings', detail: 'Track payouts', icon: 'wallet', bg: 'bg-emerald-500/20 text-emerald-300' },
      { label: 'KYC Status', detail: 'Verified badge', icon: 'shield', bg: 'bg-purple-500/20 text-purple-300' },
      { label: 'Availability', detail: 'Stay online', icon: 'pulse', bg: 'bg-amber-500/20 text-amber-300' },
    ],
  },
}

function readRemembered() {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function StaffLoginPage({
  defaultMode = 'admin',
  onAdminLogin,
  onBackHome,
  onOpenBecomeProvider,
  onVendorLogin,
}) {
  const remembered = useMemo(() => readRemembered(), [])
  const [mode, setMode] = useState(defaultMode)
  const [adminCredentials, setAdminCredentials] = useState({
    email: remembered?.mode === 'admin' ? remembered.login || '' : '',
    password: '',
  })
  const [vendorCredentials, setVendorCredentials] = useState({
    login: remembered?.mode === 'vendor' ? remembered.login || '' : '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(Boolean(remembered?.login && remembered?.mode === defaultMode))
  const [isLoading, setIsLoading] = useState(false)
  const copy = modeCopy[mode]
  const formValue = mode === 'admin' ? adminCredentials : vendorCredentials

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  const updateField = (name, value) => {
    if (mode === 'admin') {
      setAdminCredentials((current) => ({ ...current, [name]: value }))
      return
    }
    setVendorCredentials((current) => ({ ...current, [name]: value }))
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    setShowPassword(false)
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      if (mode === 'admin') {
        const response = await adminApi.login(adminCredentials)
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({
            mode: 'admin',
            login: adminCredentials.email,
          }))
        } else {
          window.localStorage.removeItem(REMEMBER_KEY)
        }
        onAdminLogin?.(response)
        return
      }

      const response = await vendorApi.login(vendorCredentials)
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({
          mode: 'vendor',
          login: vendorCredentials.login,
        }))
      } else {
        window.localStorage.removeItem(REMEMBER_KEY)
      }
      onVendorLogin?.(response)
    } catch (error) {
      notify(error.message, { tone: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const titleParts = splitAccentTitle(copy.title, copy.accent)

  return (
    <main className="staff-login relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[var(--brand-page)] lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Left Aside for Desktop */}
      <aside className="relative hidden min-h-[420px] w-full overflow-hidden bg-[var(--brand-navy)] text-white lg:flex lg:h-full lg:w-[46%] xl:w-[44%] lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="staff-login-orb absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,84,166,0.55),transparent_68%)]" />
          <div className="staff-login-orb-delayed absolute -bottom-28 -right-16 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(103,181,41,0.28),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/25 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-8 xl:px-12 xl:py-10">
          <div>
            {/* Logo */}
            <button className="mb-6 inline-flex flex-col items-start transition hover:opacity-90" onClick={onBackHome} type="button">
              <img alt="KwalityCare" className="h-14 w-auto object-contain xl:h-16" src="/white-logo.png" />
            </button>

            {/* Portal Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>{copy.portalBadge}</span>
            </div>

            {/* Main Heading & Subtitle */}
            <div className="min-h-[140px] max-w-md">
              <h1 className="font-[Outfit,sans-serif] text-[1.85rem] font-extrabold leading-[1.2] tracking-tight text-white xl:text-[2.2rem]">
                {titleParts.before}
                {titleParts.accent ? (
                  <span className="text-[#9BE15D]"> {titleParts.accent}</span>
                ) : null}
                {titleParts.after ? ` ${titleParts.after}` : null}
              </h1>
              <p className="mt-3 text-[13.5px] leading-relaxed text-blue-100/75">
                {copy.helper}
              </p>
            </div>

            {/* 2x2 Feature Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {copy.stats.map((stat) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm transition-transform duration-200 hover:bg-white/10"
                  key={stat.label}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${stat.bg}`}>
                    <StatIcon name={stat.icon} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-white">{stat.label}</p>
                    <p className="truncate text-[10.5px] font-medium text-blue-100/60">{stat.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Footer: Trust Highlights & Tagline */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center">
                <div className="mb-1 text-emerald-400">
                  <LockIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-bold text-white">Data Encrypted</p>
                <p className="text-[10px] font-medium text-blue-100/60">Your data is safe</p>
              </div>
              <div className="flex flex-col items-center border-x border-white/10 px-1">
                <div className="mb-1 text-[#9BE15D]">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-bold text-white">24/7 Access</p>
                <p className="text-[10px] font-medium text-blue-100/60">Anytime, anywhere</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 text-emerald-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-bold text-white">Reliable Platform</p>
                <p className="text-[10px] font-medium text-blue-100/60">Built for business</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-[11px] italic text-blue-100/60">Trusted. Secure. Always with KwalityCare.</p>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-white/40">
                YOUR HOME, OUR CARE
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Login Card Section */}
      <section className="relative flex min-h-screen w-full flex-1 items-start justify-center px-4 pb-8 pt-5 sm:px-8 sm:pt-8 lg:min-h-0 lg:h-full lg:items-center lg:px-10 lg:py-6 xl:px-14">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(103,181,41,0.12),transparent_70%)]" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,63,134,0.08),transparent_70%)]" />
        </div>

        <div className="staff-login-form relative z-10 w-full max-w-[420px]">
          {/* Top Bar on Desktop: Back to Home Link */}
          <div className="mb-2 hidden justify-end lg:flex">
            <button
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:text-[#003F86]"
              onClick={onBackHome}
              type="button"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Mobile Top Header */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button className="inline-flex max-w-[65%]" onClick={onBackHome} type="button">
              <img alt="KwalityCare" className="h-12 w-auto object-contain object-left sm:h-14" src="/logo2.png" />
            </button>
            <button
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:text-[#003F86]"
              onClick={onBackHome}
              type="button"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Mobile Badge */}
          <div className="mb-3 lg:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              <ShieldCheckIcon className="h-3 w-3 text-emerald-600" />
              <span>{copy.portalBadge}</span>
            </span>
          </div>

          {/* Welcome Heading */}
          <div className="mb-4">
            <p className="mb-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#67B529]">
              WELCOME BACK
            </p>
            <h2 className="font-[Outfit,sans-serif] text-[1.65rem] font-extrabold tracking-tight text-[var(--brand-ink)] sm:text-[1.9rem]">
              {copy.pageTitle}
            </h2>
            <p className="mt-1 min-h-[20px] text-[12.5px] font-medium text-slate-500 sm:text-[13px]">
              {copy.subtitle}
            </p>
          </div>

          {/* Pill Tabs Switcher */}
          <div className="relative mb-4 grid grid-cols-2 rounded-full border border-slate-200/90 bg-slate-100/80 p-1 shadow-inner">
            <span
              aria-hidden="true"
              className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#003F86] shadow-sm transition-transform duration-300 ease-out ${
                mode === 'vendor' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <ModeTab active={mode === 'admin'} icon="shield" label="Super Admin" onClick={() => switchMode('admin')} />
            <ModeTab active={mode === 'vendor'} icon="users" label="Vendor" onClick={() => switchMode('vendor')} />
          </div>

          {/* Form */}
          <form className="space-y-3.5" onSubmit={submitLogin}>
            <Field
              icon={<MailIcon className="h-3.5 w-3.5" />}
              label={mode === 'admin' ? 'Admin Email' : 'Phone or Email'}
            >
              <input
                autoComplete={mode === 'admin' ? 'email' : 'username'}
                className="staff-login-input"
                inputMode={mode === 'vendor' ? 'email' : undefined}
                onChange={(event) => updateField(mode === 'admin' ? 'email' : 'login', event.target.value)}
                placeholder={mode === 'admin' ? 'admin@rehanshi.com' : 'Email or Mobile'}
                required
                type={mode === 'admin' ? 'email' : 'text'}
                value={mode === 'admin' ? formValue.email : formValue.login}
              />
            </Field>

            <Field icon={<LockIcon className="h-3.5 w-3.5" />} label="Password">
              <input
                autoComplete="current-password"
                className="staff-login-input pr-10"
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Enter your password"
                required
                type={showPassword ? 'text' : 'password'}
                value={formValue.password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-[#003F86]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </Field>

            <div className="flex min-h-[24px] items-center justify-between gap-2 pt-0.5">
              <label className="group flex cursor-pointer items-center gap-2 select-none">
                <input
                  checked={rememberMe}
                  className="peer sr-only"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span className="grid h-4 w-4 place-items-center rounded-md border border-slate-400 bg-white transition group-has-[:checked]:border-[#003F86] group-has-[:checked]:bg-[#003F86]">
                  <CheckIcon className="h-2.5 w-2.5 text-white opacity-0 transition group-has-[:checked]:opacity-100" />
                </span>
                <span className="text-[12px] font-semibold text-slate-600 transition group-hover:text-slate-900">
                  Remember me
                </span>
              </label>
              {mode === 'vendor' ? (
                <button
                  className="text-[12px] font-bold text-[#003F86] transition hover:text-[#67B529] whitespace-nowrap"
                  onClick={onOpenBecomeProvider}
                  type="button"
                >
                  New Partner? Submit KYC
                </button>
              ) : (
                <span className="text-[12px] font-semibold text-slate-400 whitespace-nowrap">
                  Need help? Contact admin
                </span>
              )}
            </div>

            <button
              className="mt-1 flex min-h-10 sm:min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#003F86] px-4 py-2.5 text-[13px] sm:text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(0,63,134,0.22)] transition hover:bg-[#0054A6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67B529] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <span className="staff-login-spinner" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LockIcon className="h-3.5 w-3.5" />
                  <span>{copy.button}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3.5 flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-[var(--brand-page)] px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              OR
            </span>
          </div>

          {/* Security Banner */}
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2 text-[11.5px] font-semibold text-emerald-800 shadow-sm">
            <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Secure access protected by KwalityCare</span>
          </div>

          {/* Mobile Bottom Feature Chips & Tagline */}
          <div className="mt-5 flex flex-col items-center sm:hidden">
            <div className="grid w-full grid-cols-4 gap-1.5 border-t border-slate-200/80 pt-3">
              <div className="flex flex-col items-center rounded-xl bg-slate-100/80 p-1.5 text-center">
                <div className="mb-1 grid h-6 w-6 place-items-center rounded-lg bg-blue-100 text-blue-600">
                  <CalendarIcon className="h-3 w-3" />
                </div>
                <span className="text-[9.5px] font-bold text-slate-700">Bookings</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-100/80 p-1.5 text-center">
                <div className="mb-1 grid h-6 w-6 place-items-center rounded-lg bg-purple-100 text-purple-600">
                  <UsersIcon className="h-3 w-3" />
                </div>
                <span className="text-[9.5px] font-bold text-slate-700">Vendors</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-100/80 p-1.5 text-center">
                <div className="mb-1 grid h-6 w-6 place-items-center rounded-lg bg-amber-100 text-amber-600">
                  <TagIcon className="h-3 w-3" />
                </div>
                <span className="text-[9.5px] font-bold text-slate-700">Coupons</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-100/80 p-1.5 text-center">
                <div className="mb-1 grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                  <WalletIcon className="h-3 w-3" />
                </div>
                <span className="text-[9.5px] font-bold text-slate-700">Finance</span>
              </div>
            </div>
            <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              YOUR HOME, OUR CARE
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function splitAccentTitle(title, accent) {
  if (!accent || !title.includes(accent)) {
    return { before: title, accent: '', after: '' }
  }
  const [before, ...rest] = title.split(accent)
  return {
    before: before.trim(),
    accent,
    after: rest.join(accent).trim(),
  }
}

function Field({ children, icon, label }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] sm:text-[13.5px] font-bold text-[var(--brand-ink)]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          {icon}
        </span>
        {children}
      </span>
    </label>
  )
}

function ModeTab({ active, icon, label, onClick }) {
  return (
    <button
      className={`relative z-10 flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-bold transition-colors duration-200 sm:gap-2 sm:text-[13px] ${
        active ? 'text-white' : 'text-slate-500 hover:text-[var(--brand-ink)]'
      }`}
      onClick={onClick}
      type="button"
    >
      {icon === 'shield' ? <ShieldIcon className="h-3.5 w-3.5 shrink-0" /> : <UsersIcon className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  )
}

function StatIcon({ name }) {
  if (name === 'calendar') return <CalendarIcon className="h-4 w-4" />
  if (name === 'users') return <UsersIcon className="h-4 w-4" />
  if (name === 'tag') return <TagIcon className="h-4 w-4" />
  if (name === 'wallet') return <WalletIcon className="h-4 w-4" />
  if (name === 'pulse') return <PulseIcon className="h-4 w-4" />
  return <ShieldCheckIcon className="h-4 w-4" />
}

function ShieldIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9.5 12 1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function ShieldCheckIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M16 11a4 4 0 1 0-8 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 20a6 6 0 0 1 16 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M18 8a3 3 0 1 0 0-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="18" rx="2" strokeWidth="2" width="18" x="3" y="4" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="7" x2="7.01" y1="7" y2="7" />
    </svg>
  )
}

function WalletIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="14" rx="2" strokeWidth="2" width="20" x="2" y="5" />
      <path d="M2 10h20M6 14h2" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function PulseIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M3 12h4l2-5 4 10 2-5h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function MailIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M4 6h16v12H4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function LockIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="10" rx="2" strokeWidth="2" width="14" x="5" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function EyeIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  )
}

function EyeOffIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="1" x2="23" y1="1" y2="23" />
    </svg>
  )
}

function ArrowRightIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function ArrowLeftIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  )
}

export default StaffLoginPage
