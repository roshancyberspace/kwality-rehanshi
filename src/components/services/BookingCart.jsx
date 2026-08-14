import { getCartItemKey } from './ServiceCartUtils'

function BookingCart({ cart, emptyTitle, emptyText, onContinue, onUpdateQuantity, total }) {
  return (
    <aside className="h-fit rounded-lg border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-28">
      <h2 className="text-xl font-bold">Cart</h2>
      {cart.length === 0 ? (
        <div className="mt-5 rounded-lg bg-[#F6FBFF] p-5 text-center">
          <p className="font-semibold">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-blue-700">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {cart.map((item) => {
            const itemKey = getCartItemKey(item)
            return (
              <div className="flex items-start justify-between gap-2 text-sm" key={itemKey}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{item.name}</p>
                    <button
                      aria-label={`Remove ${item.name}`}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => onUpdateQuantity?.(itemKey, 0)}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex h-7 w-[84px] items-center justify-between rounded-md border border-blue-200 px-1">
                      <button
                        aria-label={`Decrease ${item.name}`}
                        className="h-full w-6 text-sm font-bold text-[#003F86]"
                        onClick={() => onUpdateQuantity?.(itemKey, item.quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold tabular-nums text-[#003F86]">{item.quantity}</span>
                      <button
                        aria-label={`Increase ${item.name}`}
                        className="h-full w-6 text-sm font-bold text-[#003F86]"
                        onClick={() => onUpdateQuantity?.(itemKey, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold">{typeof item.lineTotal === 'number' ? `Rs. ${item.lineTotal}` : item.price}</p>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="border-t border-blue-100 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rs. {total}</span>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-md bg-[#003F86] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0054A6]"
                onClick={onContinue}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default BookingCart
