import { useEffect, useRef, useState } from 'react'
import { buildBackendUrl, toBrowserPath } from '../../config/urls'

const resolveImageUrl = (image) => {
  if (!image) return ''
  if (/^https?:\/\//i.test(image) || image.startsWith('blob:') || image.startsWith('data:')) {
    return image
  }
  return buildBackendUrl(image)
}

const resolveHref = (url) => {
  if (!url) return null
  const trimmed = String(url).trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed
  }
  if (trimmed.startsWith('/')) return trimmed
  return `/${trimmed.replace(/^\/+/, '')}`
}

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function SlideContent({ slide }) {
  const subtitle = slide.subtitle || ''
  const titleHtml = slide.title || ''
  const bodyHtml = slide.body || ''
  const buttonText = slide.buttonText || slide.button_text || ''
  const href = resolveHref(slide.buttonUrl || slide.button_url)
  const buttonColor = slide.buttonColor || slide.button_color || '#FFFFFF'
  const imageUrl = resolveImageUrl(slide.image)

  const cta = buttonText ? (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold leading-none tracking-wide">
      <span style={{ color: buttonColor }}>{buttonText}</span>
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        style={{ color: buttonColor }}
        viewBox="0 0 24 24"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  ) : null

  const richTextClass =
    'banner-rich-text break-words text-[15px] font-extrabold leading-[1.2] text-white ' +
    '[&_*]:!text-[15px] [&_*]:!leading-[1.2] [&_*]:!font-extrabold ' +
    '[&_p]:m-0 [&_font]:!text-[15px] [&_span]:!text-[15px] [&_b]:font-extrabold [&_strong]:font-extrabold'

  return (
    <div className="grid min-h-[132px] grid-cols-[1.15fr_0.85fr] items-center gap-2 px-4 pb-5 pt-2">
      <div className="flex min-w-0 flex-col items-start justify-center gap-1.5 py-1">
        {subtitle ? (
          <p className="text-[11px] font-medium leading-none text-white/90">{subtitle}</p>
        ) : null}

        {titleHtml ? (
          <div className={richTextClass} dangerouslySetInnerHTML={{ __html: titleHtml }} />
        ) : null}

        {bodyHtml ? (
          <div className={`${richTextClass} !font-semibold opacity-95 [&_*]:!font-semibold`} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : null}

        {cta && href ? (
          <a
            className="mt-0.5 inline-flex w-fit"
            href={href}
            onClick={(event) => {
              if (href.startsWith('/') && !href.startsWith('//')) {
                event.preventDefault()
                window.history.pushState({}, '', toBrowserPath(href))
                window.dispatchEvent(new PopStateEvent('popstate'))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
          >
            {cta}
          </a>
        ) : (
          cta
        )}
      </div>

      <div className="relative h-[118px] overflow-hidden">
        {imageUrl ? (
          <img
            alt={stripHtml(titleHtml) || subtitle || 'Promo'}
            className="h-full w-full object-cover object-top"
            draggable={false}
            src={imageUrl}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--banner-bg)] to-transparent" />
      </div>
    </div>
  )
}

function MobilePromoCarousel({ slides: slidesProp = [], overlayTop = null }) {
  const slides = Array.isArray(slidesProp) ? slidesProp.filter((slide) => slide?.image) : []
  const scrollRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const activeBg = slides[activeIndex]?.bgColor || slides[activeIndex]?.bg_color || '#6D28D9'

  const syncActiveIndex = () => {
    const row = scrollRef.current
    if (!row) return
    const width = row.clientWidth
    if (!width) return
    const next = Math.round(row.scrollLeft / width)
    setActiveIndex(Math.min(Math.max(next, 0), Math.max(slides.length - 1, 0)))
  }

  useEffect(() => {
    const row = scrollRef.current
    if (!row || slides.length <= 1) return undefined

    const interval = setInterval(() => {
      const width = row.clientWidth
      if (!width) return
      const next = (Math.round(row.scrollLeft / width) + 1) % slides.length
      row.scrollTo({ left: next * width, behavior: 'smooth' })
      setActiveIndex(next)
    }, 4000)

    return () => clearInterval(interval)
  }, [slides.length])

  if (!slides.length) return null

  return (
    <div className="w-full max-w-full overflow-x-hidden lg:hidden" style={{ backgroundColor: activeBg }}>
      {overlayTop ? <div className="relative z-10">{overlayTop}</div> : null}

      <div className="relative w-full max-w-full overflow-x-hidden overflow-y-visible">
        <div
          ref={scrollRef}
          className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-visible scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={syncActiveIndex}
        >
          {slides.map((slide) => {
            const bg = slide.bgColor || slide.bg_color || activeBg
            return (
              <div
                className="w-full min-w-full max-w-full shrink-0 snap-start"
                key={slide.id || slide.image}
                style={{ backgroundColor: bg, '--banner-bg': bg }}
              >
                <SlideContent slide={slide} />
              </div>
            )
          })}
        </div>

        {slides.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[2] flex items-center justify-center gap-1.5">
            {slides.map((slide, index) => (
              <span
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                }`}
                key={slide.id || slide.image || index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobilePromoCarousel
