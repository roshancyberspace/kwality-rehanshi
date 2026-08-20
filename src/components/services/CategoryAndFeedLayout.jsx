import React from 'react'

const whyChooseFeatures = [
  {
    title: 'Verified Professionals',
    desc: 'Background verified experts',
    icon: (
      <svg className="w-5 h-5 text-[#003F86]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'On-time Service',
    desc: 'Punctual and reliable',
    icon: (
      <svg className="w-5 h-5 text-[#003F86]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Affordable Pricing',
    desc: 'Transparent & fair prices',
    icon: (
      <svg className="w-5 h-5 text-[#003F86]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Satisfaction Guarantee',
    desc: '100% satisfaction promise',
    icon: (
      <svg className="w-5 h-5 text-[#003F86]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    ),
  },
  {
    title: 'Secure Booking',
    desc: 'Safe and easy payments',
    icon: (
      <svg className="w-5 h-5 text-[#003F86]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

const howItWorksSteps = [
  {
    step: '1',
    title: 'Choose Service',
    desc: 'Select the service you need',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    step: '2',
    title: 'Pick Date & Time',
    desc: 'Choose your preferred slot',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    step: '3',
    title: 'We Arrive',
    desc: 'Our expert reaches you on time',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
        <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    ),
  },
  {
    step: '4',
    title: 'Service Delivered',
    desc: 'Sit back and relax, we do the rest',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    ),
  },
]

function CategoryAndFeedLayout({ onSelectCategory, onSelectSubService, onViewAll, categories = [], recentBookings = [] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Services by Category Header & Cards */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1D] tracking-tight">
                Services by Category
              </h2>
              <button
                type="button"
                onClick={onViewAll}
                className="text-[11px] sm:text-xs font-semibold text-[#003F86] hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View all categories</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

            {/* 2x2 Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.length ? categories.map((block) => (
                <div
                  key={block.title || block.name}
                  className={`rounded-2xl ${block.themeClass || 'bg-[#F2F8FF] border-blue-100'} border p-4 grid grid-cols-[1fr_auto] gap-3 items-stretch`}
                >
                  <div className="flex flex-col justify-between pr-1">
                    <div>
                      {block.icon ? (
                      <div className={`w-9 h-9 rounded-xl ${block.iconBg || 'bg-white'} border border-slate-100 flex items-center justify-center mb-2.5`}>
                        {block.icon}
                      </div>
                      ) : null}
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                        {block.title || block.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 my-1 leading-normal">
                        {block.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCategory?.(block.title || block.name)}
                      className="text-[11px] font-bold text-[#003F86] hover:underline inline-flex items-center gap-1 mt-3 transition-colors text-left"
                    >
                      <span>View Services</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="w-[120px] shrink-0 rounded-xl bg-white border border-slate-100 p-2.5 flex flex-col justify-center gap-2 my-auto">
                    {(block.subServices || block.sub_services || []).map((sub) => (
                      <button
                        key={sub.name || sub}
                        type="button"
                        onClick={() => onSelectSubService?.(sub.name || sub, block.title || block.name)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 hover:text-[#003F86] transition-colors text-left truncate w-full"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#003F86] shrink-0" />
                        <span className="truncate">{sub.name || sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No categories available.</p>
              )}
            </div>
          </div>

          {/* Why Choose KwalityCare Section */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <h3 className="text-base sm:text-lg font-bold text-[#1D1D1D] mb-4">
              Why Choose KwalityCare?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {whyChooseFeatures.map((feat) => (
                <div key={feat.title} className="flex flex-col items-start sm:items-center text-left sm:text-center p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
                    {feat.icon}
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800 leading-tight mb-0.5">
                    {feat.title}
                  </h4>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works Section */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <h3 className="text-base sm:text-lg font-bold text-[#1D1D1D] mb-5">
              How It Works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
              {howItWorksSteps.map((stepItem, idx) => (
                <div key={stepItem.step} className="flex flex-col items-center text-center px-1 relative">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#003F86] mb-2 relative z-10">
                    {stepItem.icon}
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {stepItem.step}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800 mb-0.5">
                    {stepItem.title}
                  </h4>
                  <p className="text-[9px] text-slate-500">
                    {stepItem.desc}
                  </p>
                  
                  {idx < howItWorksSteps.length - 1 && (
                    <div className="hidden sm:block absolute right-[-10px] top-4 text-slate-300 font-bold text-sm pointer-events-none">
                      ➔
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar (4 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#1D1D1D] mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Recently Booked</span>
            </h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {recentBookings.length ? recentBookings.map((bk, i) => (
                <div key={bk.id || i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${bk.color || 'bg-blue-50 text-blue-600'} text-[10px] flex items-center justify-center shrink-0`}>
                      {bk.char || String(bk.service || '?').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {bk.service}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate">
                        {bk.location}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                    {bk.time}
                  </span>
                </div>
              )) : (
                <p className="py-2 text-sm text-slate-500">No bookings yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#1D1D1D] mb-3">
              What Our Customers Say
            </h3>
            <p className="text-[11px] text-slate-500">Customer reviews appear when they are available in the database.</p>
          </div>

        </div>

      </div>
    </section>
  )
}

export default CategoryAndFeedLayout
