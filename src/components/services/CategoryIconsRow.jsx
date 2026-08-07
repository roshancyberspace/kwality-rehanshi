import React, { useRef } from 'react'

const categories = [
  {
    name: 'AC Service',
    color: 'text-blue-600 bg-blue-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="8" rx="2" />
        <path d="M6 13v3" />
        <path d="M18 13v3" />
        <path d="M8 18h8" />
        <line x1="6" y1="9" x2="10" y2="9" />
        <circle cx="17" cy="9" r="1" />
      </svg>
    ),
  },
  {
    name: 'Cleaning',
    color: 'text-amber-500 bg-amber-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18" />
        <path d="M19 21v-4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v4" />
        <path d="M12 15V3" />
        <path d="M9 3h6" />
      </svg>
    ),
  },
  {
    name: 'Salon & Spa',
    color: 'text-rose-500 bg-rose-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
      </svg>
    ),
  },
  {
    name: 'Appliance Repair',
    color: 'text-slate-700 bg-slate-50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="14" r="4" />
        <path d="M8 6h.01" />
        <path d="M12 6h.01" />
      </svg>
    ),
  },
  {
    name: 'Electricians',
    color: 'text-blue-600 bg-blue-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    name: 'Interior Designing',
    color: 'text-amber-600 bg-amber-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: 'IT Hardware',
    color: 'text-blue-600 bg-blue-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    name: 'Pest Control',
    color: 'text-emerald-700 bg-emerald-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 4v4" />
        <path d="M12 16v4" />
        <path d="M4 12h4" />
        <path d="M16 12h4" />
        <path d="M6 6l2.8 2.8" />
        <path d="M15.2 15.2L18 18" />
      </svg>
    ),
  },
  {
    name: 'Manpower',
    color: 'text-indigo-600 bg-indigo-50/50',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    name: 'View All',
    color: 'text-[#003F86] bg-slate-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
]

function CategoryIconsRow({ onCategorySelect }) {
  const scrollRef = useRef(null)

  const handleScroll = (direction) => {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -300 : 300
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1D] tracking-tight">
            Browse by Category
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            Find the perfect service for your needs
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#003F86] hover:text-[#003F86] transition-colors focus:outline-none"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#003F86] hover:text-[#003F86] transition-colors focus:outline-none"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto py-1 px-0.5 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat, idx) => (
          <button
            key={cat.name + idx}
            type="button"
            onClick={() => onCategorySelect?.(cat.name === 'View All' ? 'ALL' : cat.name)}
            className="group flex flex-col items-center gap-2 min-w-[70px] sm:min-w-[80px] shrink-0 cursor-pointer focus:outline-none"
          >
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-slate-200 bg-white group-hover:border-[#003F86] transition-colors flex items-center justify-center ${cat.color}`}
            >
              {cat.icon}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 group-hover:text-[#003F86] text-center max-w-[80px] truncate transition-colors">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default CategoryIconsRow
