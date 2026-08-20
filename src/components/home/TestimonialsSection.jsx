import { useEffect, useMemo, useRef, useState } from 'react'
import { buildBackendUrl } from '../../config/urls'

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value
  return buildBackendUrl(value)
}

const toEmbedUrl = (url = '') => {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.includes('/embed/')) return raw

  const ytWatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i)
  if (ytWatch?.[1]) return `https://www.youtube.com/embed/${ytWatch[1]}`

  const ytShorts = raw.match(/youtube\.com\/shorts\/([\w-]{6,})/i)
  if (ytShorts?.[1]) return `https://www.youtube.com/embed/${ytShorts[1]}`

  return raw
}

const isDirectVideo = (url = '') => /\.(mp4|webm|ogg)(\?|$)/i.test(url)

const stars = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating) || 0))
  const full = Math.round(value)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

const fromApi = (items = []) =>
  items.map((item) => {
    const videoUrl = item.videoUrl || item.video_url || ''
    const isVideo = item.isVideo || item.is_video || Boolean(videoUrl)
    const service = item.serviceLine || [item.serviceType || item.service_type, item.location].filter(Boolean).join(' · ')

    return {
      id: `testimonial-${item.id || item.customerName || item.customer_name}`,
      kind: isVideo ? 'video' : 'text',
      name: item.customerName || item.customer_name || 'Customer',
      service,
      text: item.reviewText || item.review_text || '',
      rating: Number(item.rating || 5),
      image: resolveMediaUrl(item.image),
      videoUrl: toEmbedUrl(videoUrl),
    }
  })

function VideoModal({ item, onClose }) {
  if (!item?.videoUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close video"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-sm font-bold text-slate-800"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
        {isDirectVideo(item.videoUrl) ? (
          <video className="aspect-video w-full" controls autoPlay src={item.videoUrl} />
        ) : (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
            src={`${item.videoUrl}${item.videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
            title={item.name}
          />
        )}
      </div>
    </div>
  )
}

function TestimonialCard({ item, onPlay }) {
  const hasVideo = item.kind === 'video' && item.videoUrl

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-slate-100 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.image ? (
          <img alt={item.name} className="h-full w-full object-cover" loading="lazy" src={item.image} />
        ) : (
          <div className="grid h-full place-items-center bg-[#003F86] text-2xl font-black text-white/80 sm:text-4xl">
            {(item.name || 'C').slice(0, 1)}
          </div>
        )}
        {hasVideo ? (
          <button
            aria-label={`Play ${item.name} testimonial`}
            className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/35"
            onClick={() => onPlay(item)}
            type="button"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#003F86] shadow-lg sm:h-11 sm:w-11">
              <svg className="ml-0.5 h-3.5 w-3.5 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        ) : null}
        {hasVideo ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-[#67B529] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[10px]">
            Video
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <p className="text-[10px] font-bold tracking-wide text-amber-500 sm:text-sm">{stars(item.rating)}</p>
        <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-slate-700 sm:mt-1.5 sm:text-sm sm:leading-relaxed">
          {item.text || 'Great service experience.'}
        </p>
        <div className="mt-auto pt-2">
          <p className="truncate text-[11px] font-bold text-[#003F86] sm:text-sm">{item.name}</p>
          {item.service ? <p className="mt-0.5 truncate text-[9px] text-slate-500 sm:text-xs">{item.service}</p> : null}
        </div>
      </div>
    </article>
  )
}

function TestimonialsSection({ items: apiItems = [] }) {
  const [activeVideo, setActiveVideo] = useState(null)
  const scrollRef = useRef(null)

  const items = useMemo(() => fromApi(apiItems), [apiItems])

  useEffect(() => {
    const row = scrollRef.current
    if (!row || items.length <= 3) return undefined

    const interval = setInterval(() => {
      const card = row.firstElementChild
      if (!card) return

      const styles = window.getComputedStyle(row)
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '12') || 12
      const step = card.offsetWidth + gap
      const maxScroll = row.scrollWidth - row.clientWidth
      const visibleCount = Math.max(1, Math.round(row.clientWidth / step))

      if (items.length <= visibleCount) return

      if (row.scrollLeft + step >= maxScroll - 4) {
        row.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        row.scrollBy({ left: step, behavior: 'smooth' })
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [items.length])

  if (!items.length) return null

  return (
    <section className="overflow-x-hidden bg-[#F6FBFF] py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#67B529]">Testimonials</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#003F86] sm:text-3xl">
          What our customers say
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
          Real stories from customers — some in video, some in their own words.
        </p>

        <div
          ref={scrollRef}
          className="mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-1 sm:mt-6 sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div
              className="w-[calc((100%-1.25rem)/3)] min-w-[calc((100%-1.25rem)/3)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] sm:min-w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] lg:min-w-[calc((100%-3rem)/4)]"
              key={item.id}
            >
              <TestimonialCard item={item} onPlay={setActiveVideo} />
            </div>
          ))}
        </div>
      </div>

      {activeVideo ? <VideoModal item={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
    </section>
  )
}

export default TestimonialsSection
