function MostBookedSection({ onServiceSelect, services = [] }) {
  const items = services.filter((service) => service?.status !== 'Inactive').slice(0, 8)

  if (!items.length) {
    return (
      <section className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold tracking-tight text-[#1D1D1D] sm:text-xl">Most Booked Services</h2>
        <p className="mt-2 text-sm text-slate-500">No services available.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#1D1D1D] sm:text-xl">
          <span>Most booked services</span>
        </h2>
        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">Services currently available in the catalog</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <button
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-[#003F86]"
            key={item.id || item.name}
            onClick={() => onServiceSelect?.(item)}
            type="button"
          >
            <div>
              <div className="mb-3 flex aspect-16/10 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-1.5">
                {item.image ? (
                  <img alt={item.name} className="h-full w-full rounded-md object-cover" src={item.image} />
                ) : (
                  <span className="text-xs font-semibold text-slate-400">No image</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800">{item.name}</h3>
              <div className="mt-1.5 mb-3 flex flex-col gap-1 text-[10px] sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
                {item.rating ? (
                  <span className="inline-flex w-fit items-center gap-0.5 rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 font-bold text-slate-700">
                    <span className="text-amber-500">★</span>
                    <span>{item.rating}</span>
                  </span>
                ) : null}
                {item.price ? (
                  <span className="text-slate-500">
                    Starting at <span className="font-bold text-slate-800">{item.price}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-[#003F86]">
              <span>Book Now</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default MostBookedSection
