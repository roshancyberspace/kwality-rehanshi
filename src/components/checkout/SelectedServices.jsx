function SelectedServices({ displayCart, onShowServices, onUpdateQuantity }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Selected services</h2>
        <button className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors" onClick={onShowServices} type="button">
          Add more
        </button>
      </div>

      {displayCart.length === 0 ? (
        <div className="mt-4 rounded-xl bg-[#F6FBFF] border border-blue-50 px-6 py-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white border border-blue-100 text-[#003F86] shadow-sm">
            <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <p className="text-base font-bold text-[#003F86]">Your cart is waiting to be filled</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm font-medium leading-relaxed text-blue-700/80">
            Explore our home services and add what you need — booking takes just a few taps.
          </p>
          <button
            className="mt-5 rounded-lg bg-[#003F86] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0054A6] transition shadow-sm"
            onClick={onShowServices}
            type="button"
          >
            Browse services
          </button>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-neutral-100">
          {displayCart.map((item) => (
            <article className="flex gap-3 py-3" key={item.id ?? item.name}>
              <img className="h-14 w-14 shrink-0 rounded-lg object-contain p-1 bg-slate-50" src={item.image} alt={item.name} />
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 truncate">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-blue-700">{item.duration}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Rs. {item.lineTotal}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex h-7 w-[76px] items-center justify-between rounded-md border border-blue-200 px-1.5">
                    <button className="h-full w-6 text-sm font-bold leading-none text-blue-900 hover:text-[#6338E0]" onClick={() => onUpdateQuantity(item.id ?? item.name, item.quantity - 1)} type="button">
                      -
                    </button>
                    <span className="text-xs font-bold text-blue-900 tabular-nums">{item.quantity}</span>
                    <button className="h-full w-6 text-sm font-bold leading-none text-blue-900 hover:text-[#6338E0]" onClick={() => onUpdateQuantity(item.id ?? item.name, item.quantity + 1)} type="button">
                      +
                    </button>
                  </div>
                  <button
                    className="text-[10px] font-semibold uppercase tracking-wide text-red-400 hover:text-red-600 transition-colors"
                    onClick={() => onUpdateQuantity(item.id ?? item.name, 0)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default SelectedServices
