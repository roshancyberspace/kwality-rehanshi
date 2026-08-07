function ServiceStatsHero({ eyebrow, title, stats }) {
  return (
    <section className="border-b border-blue-100 bg-white shadow-2xs">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6 lg:py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{eyebrow}</p>
          <h1 className="mt-1 max-w-2xl text-xl font-black leading-tight sm:text-2xl lg:text-3xl text-[#003F86]">{title}</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto min-w-[320px]">
          {stats.map((stat) => (
            <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-2.5 sm:p-3 text-center sm:text-left shadow-2xs" key={stat.label}>
              <p className="text-base sm:text-lg lg:text-xl font-black text-[#003F86]">{stat.value}</p>
              <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ServiceStatsHero
