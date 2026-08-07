import { useEffect, useRef, useState } from 'react'

const DEFAULT_SLIDES = [
  {
    id: 'ac-services',
    alt: 'AC Services — Cool comfort, perfect care',
    image: '/banners/ac-services-banner.png',
  },
]

function MobilePromoCarousel({ slides: slidesProp }) {
  const slides = slidesProp?.length ? slidesProp : DEFAULT_SLIDES
  const scrollRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const syncActiveIndex = () => {
    const row = scrollRef.current
    if (!row) return
    const width = row.clientWidth
    if (!width) return
    const next = Math.round(row.scrollLeft / width)
    setActiveIndex(Math.min(Math.max(next, 0), slides.length - 1))
  }

  useEffect(() => {
    const row = scrollRef.current
    if (!row || slides.length <= 1) return

    const interval = setInterval(() => {
      const width = row.clientWidth
      if (!width) return
      const next = (Math.round(row.scrollLeft / width) + 1) % slides.length
      row.scrollTo({ left: next * width, behavior: 'smooth' })
      setActiveIndex(next)
    }, 3500)

    return () => clearInterval(interval)
  }, [slides.length])

  return (
    <div className="w-full lg:hidden">
      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={syncActiveIndex}
        >
          {slides.map((slide) => (
            <div
              className="w-full shrink-0 snap-start"
              key={slide.id || slide.image}
              style={{ aspectRatio: '1024 / 341' }}
            >
              <img
                alt={slide.alt || slide.title || 'Promo'}
                className="h-full w-full object-cover object-center"
                draggable={false}
                src={slide.image}
              />
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {slides.map((slide, index) => (
              <span
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
                key={slide.id || slide.image}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobilePromoCarousel
