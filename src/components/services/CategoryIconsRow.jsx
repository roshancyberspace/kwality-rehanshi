import React, { useRef } from 'react'

function CategoryIconsRow({ onCategorySelect, categories = [] }) {
  const scrollRef = useRef(null)
  const items = categories.filter((item) => item?.name)

  const handleScroll = (direction) => {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -300 : 300
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  if (!items.length) {
    return (
      <section className="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold tracking-tight text-[#1D1D1D] sm:text-xl">Browse by Category</h2>
        <p className="mt-2 text-sm text-slate-500">No categories available.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#1D1D1D] sm:text-xl">Browse by Category</h2>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">Find the perfect service for your needs</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-[#003F86] hover:text-[#003F86] focus:outline-none"
            onClick={() => handleScroll('left')}
            type="button"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-[#003F86] hover:text-[#003F86] focus:outline-none"
            onClick={() => handleScroll('right')}
            type="button"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="flex gap-4 overflow-x-auto scroll-smooth px-0.5 py-1 sm:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        {items.map((cat, idx) => (
          <button
            className="group flex min-w-[70px] shrink-0 cursor-pointer flex-col items-center gap-2 focus:outline-none sm:min-w-[80px]"
            key={cat.id || cat.name + idx}
            onClick={() => onCategorySelect?.(cat.name)}
            type="button"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors group-hover:border-[#003F86] sm:h-16 sm:w-16">
              {cat.image ? <img alt="" className="h-8 w-8 object-contain" src={cat.image} /> : <span className="text-xs font-bold text-[#003F86]">{String(cat.name).slice(0, 2)}</span>}
            </div>
            <span className="max-w-[80px] truncate text-center text-[10px] font-semibold text-slate-700 transition-colors group-hover:text-[#003F86] sm:text-[11px]">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default CategoryIconsRow
