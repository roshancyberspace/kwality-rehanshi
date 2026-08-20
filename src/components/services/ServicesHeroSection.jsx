import React from 'react'

function ServicesHeroSection({ stats = [] }) {
  const displayStats = stats.filter((item) => item?.value && item?.label)

  return (
    <section className="mx-auto mt-2 mb-8 max-w-7xl px-4 sm:mt-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-[#F6FAFF] p-5 sm:p-8 lg:p-10">
        <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-center text-left lg:col-span-7">
            <div className="mb-3">
              <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#003F86] uppercase">
                All Services
              </span>
            </div>
            <h1 className="mb-3 text-2xl leading-tight font-extrabold tracking-tight text-[#003F86] sm:text-3xl lg:text-4xl">
              Trusted care for <br />
              <span className="text-[#67B529]">your home,</span> every time!
            </h1>
            <p className="mb-6 max-w-sm text-xs leading-relaxed text-slate-600 sm:text-sm">
              Book verified professionals for all your home and personal needs in Lucknow.
            </p>
            {displayStats.length ? (
              <div className="grid max-w-md grid-cols-3 gap-3">
                {displayStats.slice(0, 3).map((stat) => (
                  <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs sm:items-start sm:p-3" key={stat.label}>
                    <p className="text-base font-bold text-[#003F86] sm:text-lg">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ServicesHeroSection
