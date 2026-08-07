import React from 'react'

function ServicesHeroSection({ stats = [] }) {
  const displayStats = stats.length >= 3 ? stats : [
    { value: '4.8 ★', label: 'Average Rating' },
    { value: '12M+', label: 'Bookings Served' },
    { value: '46 min', label: 'Quick Service' },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-[#F6FAFF] border border-slate-100 p-5 sm:p-8 lg:p-10">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Content Column */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <div className="mb-3">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-[#003F86] bg-blue-50">
                All Services
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#003F86] leading-tight mb-3">
              Trusted care for <br />
              <span className="text-[#67B529]">your home,</span> every time!
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-sm leading-relaxed">
              Book verified professionals for all your home and personal needs in Lucknow.
            </p>

            {/* Stats Pills Row */}
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col items-center sm:items-start shadow-xs">
                <p className="text-base sm:text-lg font-bold text-[#003F86] flex items-center gap-1">
                  4.8 <span className="text-amber-400 text-sm">★</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Average Rating
                </p>
              </div>

              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col items-center sm:items-start shadow-xs">
                <p className="text-base sm:text-lg font-bold text-[#003F86]">
                  12M+
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Bookings Served
                </p>
              </div>

              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col items-center sm:items-start shadow-xs">
                <p className="text-base sm:text-lg font-bold text-[#003F86]">
                  46 min
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Quick Service
                </p>
              </div>
            </div>
          </div>

          {/* Right Image / Graphic Column */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[240px] sm:min-h-[300px] w-full">
            <div className="relative w-full max-w-[360px] aspect-4/3 rounded-xl overflow-hidden bg-slate-50">
              <img
                src="/sofacleing.png"
                alt="Professional Home Services in Lucknow"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Floating Happy Customers Badge */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-slate-100 max-w-[140px] z-20">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#003F86]">4.8</span>
                <span className="text-amber-400 text-xs">★</span>
              </div>
              <p className="text-[9px] text-slate-600 leading-tight mt-0.5">
                from <span className="font-bold text-slate-800">12K+</span> happy customers
              </p>
              
              <div className="flex -space-x-1.5 overflow-hidden mt-1.5">
                <div className="inline-block h-5 w-5 rounded-full ring-1 ring-white bg-blue-500 text-white text-[9px] flex items-center justify-center">R</div>
                <div className="inline-block h-5 w-5 rounded-full ring-1 ring-white bg-emerald-500 text-white text-[9px] flex items-center justify-center">S</div>
                <div className="inline-block h-5 w-5 rounded-full ring-1 ring-white bg-purple-500 text-white text-[9px] flex items-center justify-center">A</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ServicesHeroSection
