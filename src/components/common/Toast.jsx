import { useEffect, useState } from 'react'
import { toastEventName } from '../../utils/feedback'

const toneStyles = {
  error: {
    icon: 'error',
    ring: 'border-rose-200',
    title: 'Action needed',
    tone: 'bg-rose-600 text-white',
  },
  info: {
    icon: 'info',
    ring: 'border-sky-200',
    title: 'Update',
    tone: 'bg-sky-600 text-white',
  },
  success: {
    icon: 'success',
    ring: 'border-[#67B529]/35',
    title: 'Success',
    tone: 'bg-[#67B529] text-white',
  },
  warning: {
    icon: 'warning',
    ring: 'border-amber-200',
    title: 'Please check',
    tone: 'bg-amber-500 text-white',
  },
}

function ToastIcon({ name }) {
  const common = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: '2.4',
    viewBox: '0 0 24 24',
  }

  if (name === 'error') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
  }

  if (name === 'info') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6" />
        <path d="M12 7h.01" />
      </svg>
    )
  }

  if (name === 'warning') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.7 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function Toast({ message }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!message) return undefined

    setToast({ message, tone: 'success' })
    return undefined
  }, [message])

  useEffect(() => {
    const handleToast = (event) => setToast(event.detail)

    window.addEventListener(toastEventName, handleToast)
    return () => window.removeEventListener(toastEventName, handleToast)
  }, [])

  useEffect(() => {
    if (!toast?.message) return undefined

    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!toast?.message) return null

  const styles = toneStyles[toast.tone] || toneStyles.success

  return (
    <div className="fixed inset-x-3 top-3 z-[70] mx-auto w-[calc(100%-1.5rem)] max-w-sm sm:inset-x-auto sm:right-5 sm:top-5 sm:w-full">
      <div className={`rounded-xl border ${styles.ring} bg-white px-3.5 py-3 text-sm shadow-xl shadow-slate-900/10`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${styles.tone}`}>
            <ToastIcon name={styles.icon} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-[#003F86]">{toast.title || styles.title}</p>
            <p className="mt-0.5 break-words text-[13px] font-medium leading-5 text-slate-600">{toast.message}</p>
          </div>
          <button
            aria-label="Dismiss notification"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setToast(null)}
            type="button"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toast
