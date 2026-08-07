import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { vendorApi } from '../../services/vendorApi'
import { notify } from '../../utils/feedback'

const REMEMBER_KEY = 'kwalitycare_staff_login_remember'

const modeCopy = {
  admin: {
    badge: 'Super Admin Access',
    button: 'Login to Admin Panel',
    helper: 'Manage bookings, partners, content, coupons, and finance from one secure desk.',
    title: 'Run the whole operation from one desk.',
    accent: 'one desk.',
    stats: [
      { label: 'KYC', detail: 'Approve vendors', icon: 'shield' },
      { label: 'Orders', detail: 'Assign jobs', icon: 'briefcase' },
      { label: 'Wallet', detail: 'Track payouts', icon: 'card' },
    ],
  },
  vendor: {
    badge: 'Vendor Access',
    button: 'Login to Vendor Panel',
    helper: 'Open assigned jobs, update work status, and keep your wallet moving.',
    title: 'Your jobs, wallet, and day — ready.',
    accent: 'ready.',
    stats: [
      { label: 'Jobs', detail: "Today's queue", icon: 'briefcase' },
      { label: 'Wallet', detail: 'See earnings', icon: 'card' },
      { label: 'Status', detail: 'Stay available', icon: 'pulse' },
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
  const [panelKey, setPanelKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const copy = modeCopy[mode]
  const formValue = mode === 'admin' ? adminCredentials : vendorCredentials

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  useEffect(() => {
    setPanelKey((current) => current + 1)
  }, [mode])

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
        onAdminLogin?.(response.admin)
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
      onVendorLogin?.(response.partner)
    } catch (error) {
      notify(error.message, { tone: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const titleParts = splitAccentTitle(copy.title, copy.accent)

  return (
    <main className="staff-login relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[var(--brand-page)] lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside className="relative hidden min-h-[420px] w-full overflow-hidden bg-[var(--brand-navy)] text-white lg:flex lg:h-full lg:w-[46%] xl:w-[44%] lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="staff-login-orb absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,84,166,0.55),transparent_68%)]" />
          <div className="staff-login-orb-delayed absolute -bottom-28 -right-16 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(103,181,41,0.28),transparent_70%)]" />
          <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black/20 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col px-10 py-10 xl:px-14 xl:py-12">
          <button className="mb-10 inline-flex w-fit items-center transition hover:opacity-90" onClick={onBackHome} type="button">
            <img alt="KwalityCare" className="h-16 w-auto object-contain xl:h-[4.75rem]" src="/white-logo.png" />
          </button>

          <div className="staff-login-panel max-w-md" key={panelKey}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#67B529]/20 text-[#9BE15D]">
                <ShieldIcon className="h-3 w-3" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">{copy.badge}</span>
            </div>

            <p className="mb-3 font-[Outfit,sans-serif] text-4xl font-extrabold leading-none tracking-tight text-white xl:text-5xl">
              KwalityCare
            </p>
            <h1 className="font-[Outfit,sans-serif] text-[2rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2.35rem]">
              {titleParts.before}
              {titleParts.accent ? (
                <span className="text-[#9BE15D]"> {titleParts.accent}</span>
              ) : null}
              {titleParts.after ? ` ${titleParts.after}` : null}
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-blue-100/80">
              {copy.helper}
            </p>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-3 border-t border-white/10 pt-8">
            {copy.stats.map((stat) => (
              <div className="staff-login-stat rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm" key={`${mode}-${stat.label}`}>
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#003F86]/55 text-[#9BE15D] ring-1 ring-white/10">
                  <StatIcon name={stat.icon} />
                </div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">{stat.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-blue-100/65">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-screen w-full flex-1 items-start justify-center px-4 pb-8 pt-6 sm:px-8 sm:pt-10 lg:min-h-0 lg:h-full lg:items-center lg:px-12 lg:py-10 xl:px-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(103,181,41,0.12),transparent_70%)]" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,63,134,0.1),transparent_70%)]" />
        </div>

        <div className="staff-login-form relative z-10 w-full max-w-[440px]">
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8 lg:mb-9">
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
                <button className="inline-flex max-w-[78%]" onClick={onBackHome} type="button">
                  <img alt="KwalityCare" className="h-[4.25rem] w-auto max-w-full object-contain object-left sm:h-20" src="/logo2.png" />
                </button>
                <button
                  aria-label="Go to Home"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#003F86]/30 hover:text-[#003F86]"
                  onClick={onBackHome}
                  title="Home"
                  type="button"
                >
                  <HomeIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#67B529]">Secure portal</p>
              <h2 className="font-[Outfit,sans-serif] text-[1.75rem] font-extrabold tracking-tight text-[var(--brand-ink)] sm:text-[2.1rem]">
                Welcome back
              </h2>
              <p className="mt-1.5 text-[13px] font-semibold text-slate-500 sm:mt-2 sm:text-sm">
                {mode === 'admin' ? 'Sign in as Super Admin to continue.' : 'Sign in as Vendor to continue.'}
              </p>
            </div>
            <button
              aria-label="Go to Home"
              className="mt-1 hidden h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#003F86]/30 hover:text-[#003F86] lg:grid"
              onClick={onBackHome}
              title="Home"
              type="button"
            >
              <HomeIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:mb-6">
            <span
              aria-hidden="true"
              className={`absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-xl bg-[#003F86] shadow-md transition-transform duration-300 ease-out ${
                mode === 'vendor' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
              }`}
            />
            <ModeTab active={mode === 'admin'} label="Super Admin" onClick={() => switchMode('admin')} icon="shield" />
            <ModeTab active={mode === 'vendor'} label="Vendor" onClick={() => switchMode('vendor')} icon="users" />
          </div>

          <form className="space-y-4" onSubmit={submitLogin}>
            <Field
              icon={<MailIcon className="h-4 w-4" />}
              label={mode === 'admin' ? 'Admin Email' : 'Phone or Email'}
            >
              <input
                autoComplete={mode === 'admin' ? 'email' : 'username'}
                className="staff-login-input"
                inputMode={mode === 'vendor' ? 'email' : undefined}
                onChange={(event) => updateField(mode === 'admin' ? 'email' : 'login', event.target.value)}
                placeholder={mode === 'admin' ? 'admin@rehanshi.com' : '9001122334 or vendor@email.com'}
                required
                type={mode === 'admin' ? 'email' : 'text'}
                value={mode === 'admin' ? formValue.email : formValue.login}
              />
            </Field>

            <Field icon={<LockIcon className="h-4 w-4" />} label="Password">
              <input
                autoComplete="current-password"
                className="staff-login-input pr-16"
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Enter password"
                required
                type={showPassword ? 'text' : 'password'}
                value={formValue.password}
              />
              <button
                className="absolute inset-y-0 right-0 px-4 text-[12px] font-extrabold uppercase tracking-wide text-[#003F86] transition hover:text-[#0054A6]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </Field>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 sm:justify-between">
              <label className="group flex cursor-pointer items-center gap-2.5">
                <input
                  checked={rememberMe}
                  className="peer sr-only"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span className="grid h-[18px] w-[18px] place-items-center rounded-md border border-slate-300 bg-white transition group-has-[:checked]:border-[#003F86] group-has-[:checked]:bg-[#003F86]">
                  <CheckIcon className="h-3 w-3 text-white opacity-0 transition group-has-[:checked]:opacity-100" />
                </span>
                <span className="text-[12px] font-bold text-slate-600 transition group-hover:text-slate-900">Remember me</span>
              </label>
              {mode === 'vendor' ? (
                <button
                  className="text-[12px] font-bold text-[#003F86] transition hover:text-[#67B529]"
                  onClick={onOpenBecomeProvider}
                  type="button"
                >
                  New Partner? Submit KYC
                </button>
              ) : (
                <span className="text-[12px] font-bold text-slate-400">Need help? Contact admin</span>
              )}
            </div>

            <button
              className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#003F86] px-4 py-3.5 text-[14px] font-extrabold text-white shadow-[0_12px_28px_rgba(0,63,134,0.28)] transition hover:bg-[#0054A6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67B529] disabled:cursor-not-allowed disabled:opacity-70 sm:mt-2"
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
                  <LockIcon className="h-4 w-4" />
                  {copy.button}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#EEF9E8] text-[#67B529]">
              <ShieldIcon className="h-3 w-3" />
            </span>
            Secure access protected by KwalityCare
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
      <span className="mb-1.5 block text-[12px] font-extrabold text-[var(--brand-ink)]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
      className={`relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-[12px] font-extrabold transition-colors duration-200 sm:gap-2 sm:text-[13px] ${
        active ? 'text-white' : 'text-slate-500 hover:text-[var(--brand-ink)]'
      }`}
      onClick={onClick}
      type="button"
    >
      {icon === 'shield' ? <ShieldIcon className="h-4 w-4 shrink-0" /> : <UsersIcon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  )
}

function StatIcon({ name }) {
  if (name === 'briefcase') return <BriefcaseIcon className="h-4 w-4" />
  if (name === 'card') return <CardIcon className="h-4 w-4" />
  if (name === 'pulse') return <PulseIcon className="h-4 w-4" />
  return <ShieldIcon className="h-4 w-4" />
}

function ShieldIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9.5 12 1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
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

function BriefcaseIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <rect height="12" rx="2" strokeWidth="2" width="16" x="4" y="6" />
      <path d="M4 12h16" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function CardIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="12" rx="2" strokeWidth="2" width="18" x="3" y="6" />
      <path d="M3 10h18M7 15h2m4 0h2" strokeLinecap="round" strokeWidth="2" />
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

function HomeIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
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

function CheckIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  )
}

export default StaffLoginPage
