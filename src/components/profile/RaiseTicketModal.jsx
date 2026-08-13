import { useEffect } from 'react'
import RaiseTicketForm from './RaiseTicketForm'

export default function RaiseTicketModal({ onClose, onSuccess, user }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-modal-slide sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#003F86]">Raise a Ticket</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Logged in as {user?.name || 'Customer'} · {user?.phone || user?.email || ''}
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <RaiseTicketForm
            onDone={(ticket) => {
              onSuccess?.(ticket)
            }}
            user={user}
            variant="modal"
          />
        </div>
      </div>
    </div>
  )
}
