import { useEffect, useState } from 'react'
import { toastEventName } from '../../utils/feedback'

const toneStyles = {
  error: {
    icon: '!',
    ring: 'border-rose-200',
    title: 'Action needed',
    tone: 'bg-rose-600 text-white',
  },
  info: {
    icon: 'i',
    ring: 'border-sky-200',
    title: 'Update',
    tone: 'bg-sky-600 text-white',
  },
  success: {
    icon: 'OK',
    ring: 'border-[#67B529]/35',
    title: 'Success',
    tone: 'bg-[#67B529] text-white',
  },
  warning: {
    icon: '!',
    ring: 'border-amber-200',
    title: 'Please check',
    tone: 'bg-amber-500 text-white',
  },
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
      <div className={`rounded-xl border ${styles.ring} bg-white p-3.5 text-sm shadow-2xl shadow-blue-900/20`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${styles.tone}`}>
            {styles.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[#003F86]">{toast.title || styles.title}</p>
            <p className="mt-0.5 break-words font-semibold leading-5 text-blue-800">{toast.message}</p>
          </div>
          <button
            aria-label="Dismiss notification"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-lg font-black text-blue-300 hover:bg-blue-50 hover:text-[#003F86]"
            onClick={() => setToast(null)}
            type="button"
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toast
