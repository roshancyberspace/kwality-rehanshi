import { useEffect, useRef, useState } from 'react'

const getOriginalPrice = (item) => item.originalPrice || item.original_price

const normalizeText = (value = '') => String(value).trim().toLowerCase()

const formatReviewDate = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatCount = (count) => {
  if (count >= 1000000) return `${Math.round(count / 100000) / 10}M`
  if (count >= 1000) return `${Math.round(count / 1000)}K`
  return String(count)
}

const parseReviewCount = (value = '') => {
  const match = String(value).match(/([\d.]+)\s*([kKmM]?)/)
  if (!match) return 0
  const number = Number(match[1])
  if (Number.isNaN(number)) return 0
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'm') return Math.round(number * 1000000)
  if (suffix === 'k') return Math.round(number * 1000)
  return Math.round(number)
}

const getRatingDistribution = (reviews, section) => {
  const liveCounts = [5, 4, 3, 2, 1].map((rating) => reviews.filter((review) => Math.round(Number(review.rating)) === rating).length)
  if (reviews.length) return liveCounts
  return [0, 0, 0, 0, 0]
}

const emptyReviewForm = (customerName = '') => ({
  customerName,
  rating: '5',
  text: '',
})

const getBrandDisplayItems = (section, brands = []) => {
  if (section.section_key !== 'brands') return section.items || []

  const selectedBrandNames = section.items || []
  const activeBrands = brands.filter((brand) => brand.status !== 'Inactive')
  const brandByName = new Map(activeBrands.map((brand) => [normalizeText(brand.name), brand]))
  const displayBrands = selectedBrandNames.map((item) => {
    const brandName = item?.name || item
    return brandByName.get(normalizeText(brandName)) || { name: brandName }
  })

  if (!displayBrands.length) return []

  return displayBrands.some((brand) => normalizeText(brand.name || brand) === '& more')
    ? displayBrands
    : [...displayBrands, { name: '& more' }]
}

function BrandLogo({ brand }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const brandName = brand?.name || brand
  const normalizedName = normalizeText(brandName)

  if (brand?.logo && !logoFailed) {
    return (
      <img
        alt={`${brandName} logo`}
        className="max-h-12 max-w-[150px] object-contain"
        loading="lazy"
        onError={() => setLogoFailed(true)}
        src={brand.logo}
      />
    )
  }

  if (normalizedName === 'lg') {
    return (
      <span className="flex items-center gap-2 text-3xl font-black text-blue-700">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#a50034] text-base text-white">LG</span>
        LG
      </span>
    )
  }

  if (normalizedName === 'voltas') return <span className="text-3xl font-black italic text-[#3a92cc]">VOLTAS</span>
  if (normalizedName === 'haier') return <span className="text-3xl font-black text-[#006db8]">Haier</span>
  if (normalizedName === 'hitachi') return <span className="text-2xl font-black tracking-wide text-[#003F86]">HITACHI</span>
  if (normalizedName === 'panasonic') return <span className="text-2xl font-black text-[#0046ad]">Panasonic</span>
  if (normalizedName === 'samsung') return <span className="text-2xl font-black tracking-wide text-[#0b5cab]">SAMSUNG</span>
  if (normalizedName === 'toshiba') return <span className="text-2xl font-black text-[#e60012]">TOSHIBA</span>
  if (normalizedName === 'daikin') {
    return (
      <span className="flex items-center gap-2 text-2xl font-black italic text-[#00a6d6]">
        <span className="h-0 w-0 border-b-[24px] border-r-[24px] border-b-[#1aa6b7] border-r-transparent" />
        DAIKIN
      </span>
    )
  }
  if (normalizedName === 'blue star') {
    return (
      <span className="flex items-center gap-2 border-2 border-[#006fba] px-2 py-1 text-sm font-black text-[#006fba]">
        <span className="grid h-5 w-5 place-items-center border border-[#006fba] text-xs">★</span>
        BLUE STAR
      </span>
    )
  }
  if (normalizedName === 'mitsubishi electric') {
    return (
      <span className="flex items-center gap-2">
        <span className="grid grid-cols-2 gap-0.5">
          <span className="h-3 w-3 rotate-45 bg-[#e60012]" />
          <span className="h-3 w-3 rotate-45 bg-[#e60012]" />
          <span className="col-span-2 mx-auto h-3 w-3 rotate-45 bg-[#e60012]" />
        </span>
        <span className="text-sm font-black uppercase leading-4 text-[#003F86]">
          Mitsubishi
          <span className="block">Electric</span>
        </span>
      </span>
    )
  }
  if (normalizedName === 'godrej') return <span className="font-serif text-3xl font-black italic text-[#65b82e]">Godrej</span>

  return <span className="text-2xl font-black text-blue-700">{brandName}</span>
}

function RatingStars({ rating = 5, sizeClass = 'text-base' }) {
  const roundedRating = Math.round(Number(rating) || 5)

  return (
    <span className={`inline-flex items-center gap-0.5 leading-none text-yellow-400 ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= roundedRating ? 'text-yellow-400' : 'text-blue-200'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

const getBannerImage = (item, sections) => {
  const summarySection = sections.find((section) => section.section_key === 'summary')
  const sectionWithImage = sections.find((section) => section.image)

  return summarySection?.image
    || sectionWithImage?.image
    || item.metadata?.banner_image
    || item.metadata?.bannerImage
    || item.image
}

const buildFallbackSections = (item) => {
  const sections = []
  if (item.description) {
    sections.push({
      section_key: 'summary',
      section_type: 'summary',
      title: 'Package summary',
      body: item.description,
      items: [],
      metadata: { offer: item.offer },
      sort_order: 1,
    })
  }
  const included = item.included || item.highlights
  if (included?.length) {
    sections.push({
      section_key: 'included',
      section_type: 'list',
      title: 'Included in this service',
      items: included,
      metadata: { tone: 'positive' },
      sort_order: 2,
    })
  }
  const notIncluded = item.notIncluded || item.not_included
  if (notIncluded?.length) {
    sections.push({
      section_key: 'not_included',
      section_type: 'list',
      title: 'Not included',
      items: notIncluded,
      sort_order: 3,
    })
  }
  if (item.process?.length) {
    sections.push({
      section_key: 'process',
      section_type: 'steps',
      title: 'Our process',
      items: item.process,
      sort_order: 4,
    })
  }
  if (item.warranty) {
    sections.push({
      section_key: 'warranty',
      section_type: 'note',
      title: 'Warranty and important notes',
      body: item.warranty,
      sort_order: 5,
    })
  }
  return sections
}

function ListSection({ section }) {
  const positive = section.metadata?.tone === 'positive' || section.section_key === 'included'

  return (
    <section className={`rounded-lg border bg-white p-4 h-full shadow-2xs ${positive ? 'border-[#67B529]/30 bg-gradient-to-b from-white to-[#67B529]/5' : 'border-blue-100 bg-gradient-to-b from-white to-blue-50/20'}`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black shadow-xs ${positive ? 'bg-[#67B529] text-white' : 'bg-blue-100 text-blue-800'}`}>
          {positive ? '✓' : '✕'}
        </span>
        <h3 className="text-sm md:text-base font-bold text-[#003F86]">{section.title}</h3>
      </div>
      {section.body && <p className="mt-2 text-xs md:text-sm leading-5 text-blue-800">{section.body}</p>}
      <ul className="mt-2.5 grid gap-1.5 text-xs md:text-sm leading-5 text-blue-950 font-medium">
        {(section.items || []).map((point) => (
          <li className="flex items-start gap-2.5" key={point}>
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? 'bg-[#67B529]' : 'bg-slate-400'}`} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StepsSection({ section }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <h3 className="text-sm md:text-base font-bold text-[#003F86]">{section.title}</h3>
      {section.body && <p className="mt-1 text-xs leading-5 text-blue-800">{section.body}</p>}
      <div className="mt-3.5 grid">
        {(section.items || []).map((step, index) => (
          <div className="grid grid-cols-[28px_1fr] gap-3" key={`${step}-${index}`}>
            <div className="flex flex-col items-center">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#003F86] text-xs font-bold text-white shadow-xs">{index + 1}</span>
              {index < section.items.length - 1 && <span className="h-full min-h-6 w-0.5 bg-[#003F86]/20 my-0.5" />}
            </div>
            <div className="pb-3.5">
              <p className="font-bold text-xs md:text-sm text-blue-950">{step}</p>
              <p className="mt-0.5 text-xs leading-4 text-slate-600">{section.metadata?.step_texts?.[index] || 'Completed by the assigned professional.'}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CardsSection({ section }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <h3 className="text-sm md:text-base font-bold text-[#003F86]">{section.title}</h3>
      {section.body && <p className="mt-1.5 text-xs leading-5 text-blue-800">{section.body}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(section.items || []).map((item, index) => (
          <div className="rounded-lg bg-[#F6FBFF] p-3 border border-blue-100/60" key={item}>
            <div className="grid h-8 w-8 place-items-center rounded-md border-2 border-[#003F86] text-xs font-bold text-[#003F86]">{index + 1}</div>
            <p className="mt-2.5 text-sm font-bold leading-5 text-blue-950">{item}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function GridSection({ brands, section }) {
  const items = getBrandDisplayItems(section, brands)
  const isBrandGrid = section.section_key === 'brands'

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <h3 className={isBrandGrid ? 'text-sm md:text-base font-bold text-[#003F86]' : 'text-sm md:text-base font-bold text-[#003F86]'}>{isBrandGrid ? 'We service all brands' : section.title}</h3>
      {items.length ? (
        <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3`}>
          {items.map((item) => (
            <div className="grid min-h-16 place-items-center rounded-lg border border-blue-200/80 bg-blue-50/50 p-2.5 text-center" key={item.name || item}>
              {isBrandGrid ? <BrandLogo brand={item} /> : <span className="text-xs font-bold text-blue-900">{item}</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-[#F6FBFF] p-3 text-xs font-semibold text-blue-700">No brands selected for this package.</p>
      )}
      {section.body && <p className="mt-3 text-xs leading-4 text-slate-600">{section.body}</p>}
    </section>
  )
}

function FaqSection({ section, openFaq, setOpenFaq }) {
  const faqs = section.metadata?.faqs || (section.items || []).map((question) => ({ question, answer: section.body || 'Details will be shared by the professional during service.' }))

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <h3 className="text-sm md:text-base font-bold text-[#003F86]">{section.title}</h3>
      <div className="mt-2.5 divide-y divide-blue-100 rounded-lg border border-blue-100">
        {faqs.map((faq, index) => (
          <div key={faq.question}>
            <button
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs md:text-sm font-semibold hover:bg-blue-50/50 text-[#003F86]"
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
              type="button"
            >
              <span>{faq.question}</span>
              <span className="text-base font-bold text-blue-400">{openFaq === index ? '-' : '+'}</span>
            </button>
            {openFaq === index && <p className="px-3.5 pb-3 text-xs leading-5 text-slate-600 bg-blue-50/20">{faq.answer}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function ReviewSummarySection({ item, onSaveReview, reviews = [], section, serviceName = '' }) {
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [reviewForm, setReviewForm] = useState(emptyReviewForm())
  const [isSavingReview, setIsSavingReview] = useState(false)
  const packageName = normalizeText(item.name)
  const parentServiceName = normalizeText(serviceName || item.service?.name)
  const matchedReviews = reviews.filter((review) => {
    const reviewServiceName = normalizeText(review.serviceName || review.service_name)
    return reviewServiceName && (reviewServiceName === packageName || reviewServiceName === parentServiceName)
  })
  const visibleReviews = showAllReviews ? matchedReviews : matchedReviews.slice(0, 3)
  const hiddenReviewCount = Math.max(0, matchedReviews.length - 3)
  const distribution = getRatingDistribution(matchedReviews, section)
  const totalDistribution = distribution.reduce((sum, count) => sum + count, 0) || 1
  const displayReviewCount = matchedReviews.length || parseReviewCount(section.metadata?.reviews)
  const displayRating = matchedReviews.length
    ? (matchedReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / matchedReviews.length).toFixed(2)
    : section.metadata?.rating || item.rating || ''
  const startAddReview = () => {
    setEditingReview(null)
    setReviewForm(emptyReviewForm())
    setIsReviewFormOpen(true)
  }
  const startEditReview = (review) => {
    setEditingReview(review)
    setIsReviewFormOpen(true)
    setReviewForm({
      customerName: review.customerName || '',
      rating: review.rating || '5',
      text: review.text || '',
    })
  }
  const handleReviewSubmit = async (event) => {
    event.preventDefault()
    if (!reviewForm.customerName.trim() || !reviewForm.text.trim() || !onSaveReview) return

    setIsSavingReview(true)
    try {
      await onSaveReview({
        id: editingReview?.id,
        customerName: reviewForm.customerName.trim(),
        partnerName: editingReview?.partnerName || '',
        rating: reviewForm.rating,
        reviewedAt: editingReview?.reviewedAt || new Date().toISOString().slice(0, 10),
        serviceName: item.name,
        text: reviewForm.text.trim(),
      })
      setEditingReview(null)
      setReviewForm(emptyReviewForm())
      setIsReviewFormOpen(false)
    } finally {
      setIsSavingReview(false)
    }
  }

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{section.title}</h3>
        {onSaveReview && (
          <button className="rounded-md bg-[#003F86] px-4 py-2 text-sm font-bold text-white hover:bg-[#0054A6]" onClick={startAddReview} type="button">
            Add review
          </button>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-white p-1">
        <div className="flex items-start gap-1">
          <span className="pt-2 text-xl text-[#003F86]">★</span>
          <div>
            <p className="text-5xl font-bold leading-none">{displayRating}</p>
            <p className="mt-2 text-sm text-blue-800">{formatCount(displayReviewCount)} reviews</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {[5, 4, 3, 2, 1].map((rating, index) => (
            <div className="grid grid-cols-[48px_1fr_56px] items-center gap-4 text-sm" key={rating}>
              <span className="font-bold text-[#003F86]">★ {rating}</span>
              <div className="h-1 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-[#003F86]"
                  style={{ width: `${Math.min(100, Math.max(2, (distribution[index] / totalDistribution) * 100))}%` }}
                />
              </div>
              <span className="text-right text-blue-800">{formatCount(distribution[index])}</span>
            </div>
          ))}
        </div>
      </div>

      {onSaveReview && isReviewFormOpen && (
        <form className="mt-6 rounded-lg border border-blue-100 bg-[#F6FBFF] p-4" onSubmit={handleReviewSubmit}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-bold">{editingReview ? 'Edit review' : 'Add review'}</h4>
            <button className="text-sm font-bold text-blue-700 hover:text-[#003F86]" onClick={() => {
              setEditingReview(null)
              setReviewForm(emptyReviewForm())
              setIsReviewFormOpen(false)
            }} type="button">
              Cancel
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="grid gap-1 text-sm font-semibold">
              Name
              <input
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none focus:border-[#003F86]"
                onChange={(event) => setReviewForm((current) => ({ ...current, customerName: event.target.value }))}
                placeholder="Customer name"
                value={reviewForm.customerName}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Rating
              <select
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none focus:border-[#003F86]"
                onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                value={reviewForm.rating}
              >
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 grid gap-1 text-sm font-semibold">
            Review
            <textarea
              className="min-h-28 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#003F86]"
              onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
              placeholder="Write customer review"
              value={reviewForm.text}
            />
          </label>
          <button
            className="mt-4 rounded-md bg-[#67B529] px-5 py-2 text-sm font-bold text-white hover:bg-[#5CA827] disabled:cursor-not-allowed disabled:bg-blue-100"
            disabled={isSavingReview || !reviewForm.customerName.trim() || !reviewForm.text.trim()}
            type="submit"
          >
            {isSavingReview ? 'Saving...' : editingReview ? 'Update review' : 'Save review'}
          </button>
        </form>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <h4 className="text-3xl font-bold">All reviews</h4>
        <button className="text-sm font-bold text-blue-700" type="button">Filter</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {['Most detailed', 'In my area', 'Frequent users'].map((filter) => (
          <button className="rounded-lg border border-blue-100 px-4 py-2 text-sm font-bold text-blue-800 hover:border-[#003F86]" key={filter} type="button">
            {filter}
          </button>
        ))}
      </div>

      {matchedReviews.length > 0 && (
        <div className="mt-6 divide-y divide-black/10 border-y border-blue-100">
          {visibleReviews.map((review) => (
            <article className="py-5" key={review.id || `${review.customerName}-${review.reviewedAt}-${review.text}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-bold">{review.customerName}</p>
                  <p className="mt-1 text-sm text-blue-700">
                    {formatReviewDate(review.reviewedAt)}
                    <span> • For {review.serviceName || item.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#67B529] px-2.5 py-1 text-sm font-bold text-white">★ {review.rating || '5'}</span>
                  {onSaveReview && (
                    <button className="text-sm font-bold text-blue-700" onClick={() => startEditReview(review)} type="button">
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {review.text && <p className="mt-4 text-base leading-7 text-[#003F86]">{review.text}</p>}
            </article>
          ))}
          {hiddenReviewCount > 0 && (
            <button
              className="mt-5 w-fit rounded-md border border-blue-100 px-4 py-2 text-sm font-bold hover:bg-[#F6FBFF]"
              onClick={() => setShowAllReviews((current) => !current)}
              type="button"
            >
              {showAllReviews ? 'Show less' : `View more (${hiddenReviewCount})`}
            </button>
          )}
        </div>
      )}
      {!matchedReviews.length && <p className="mt-5 rounded-lg bg-[#F6FBFF] p-5 text-sm text-blue-700">No customer reviews added yet.</p>}
    </section>
  )
}

function SummarySection({ item, section }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <div className="grid gap-4 md:grid-cols-[1fr_220px] items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#003F86]">{section.title}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
            <p className="text-xl md:text-2xl font-black text-green-700">Rs. {item.price}</p>
            {getOriginalPrice(item) && <p className="text-sm font-semibold text-slate-400 line-through">Rs. {getOriginalPrice(item)}</p>}
            {(section.metadata?.offer || item.offer) && (
              <span className="rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-bold text-green-700">
                {section.metadata?.offer || item.offer}
              </span>
            )}
          </div>
          {section.body && <p className="mt-2.5 max-w-2xl text-xs md:text-sm leading-5 text-slate-600 font-medium">{section.body}</p>}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-xs font-bold text-[#003F86] uppercase tracking-wider">{section.subtitle || 'Good to know'}</p>
          <ul className="mt-2 grid gap-1.5 text-xs font-medium text-slate-700">
            {(section.items || []).map((point) => (
              <li className="flex items-start gap-1.5" key={point}>
                <span className="text-blue-600 font-bold">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function NoteSection({ section }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-2xs">
      <h3 className="text-sm md:text-base font-bold text-[#003F86]">{section.title}</h3>
      {section.body && <p className="mt-1.5 text-xs md:text-sm leading-5 text-slate-600">{section.body}</p>}
    </section>
  )
}

function DynamicSection({ brands, item, onSaveReview, openFaq, reviews, section, serviceName, setOpenFaq }) {
  if (section.section_type === 'summary') return <SummarySection item={item} section={section} />
  if (section.section_type === 'steps') return <StepsSection section={section} />
  if (section.section_type === 'cards') return <CardsSection section={section} />
  if (section.section_type === 'grid') return <GridSection brands={brands} section={section} />
  if (section.section_type === 'faq') return <FaqSection openFaq={openFaq} section={section} setOpenFaq={setOpenFaq} />
  if (section.section_type === 'review_summary') return <ReviewSummarySection item={item} onSaveReview={onSaveReview} reviews={reviews} section={section} serviceName={serviceName} />
  if (section.section_type === 'note') return <NoteSection section={section} />
  return <ListSection section={section} />
}

function PackageDetailsModal({
  brands = [],
  cart = [],
  item,
  onAdd,
  onClose,
  onOpenReviews,
  onSaveReview,
  onUpdateQuantity,
  reviews = [],
  serviceName = '',
}) {
  const [openFaq, setOpenFaq] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    setIsClosing(false)
    setOpenFaq(null)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [item?.name])

  if (!item) {
    return null
  }

  const closeSmoothly = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, 180)
  }

  const sections = (item.detailSections?.length ? item.detailSections : item.detail_sections?.length ? item.detail_sections : buildFallbackSections(item))
    .filter((section) => section.status !== 'Inactive')
    .filter((section) => section.is_visible !== false)
    .sort((first, second) => (first.sort_order || 0) - (second.sort_order || 0))
  const bannerImage = getBannerImage(item, sections)
  const quantity = cart.find((cartItem) => cartItem.name === item.name)?.quantity || 0

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade'}`}
      onClick={closeSmoothly}
      role="presentation"
    >
      <div
        className={`flex h-auto max-h-[90vh] w-full max-w-xl sm:max-w-2xl flex-col overflow-hidden rounded-xl bg-[#F6FBFF] shadow-2xl border border-white/20 ${isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide'}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
      >
        {/* Hero image — taller so more of the photo stays visible */}
        <header className="relative shrink-0 h-56 sm:h-64 md:h-44 lg:h-48 overflow-hidden bg-[#003F86]">
          <img
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover object-center"
            src={bannerImage}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
          <button
            aria-label="Close"
            className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-sm font-bold text-slate-800 shadow-md transition hover:bg-white hover:scale-105"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              closeSmoothly()
            }}
            type="button"
            title="Close modal"
          >
            ✕
          </button>
          <button
            className="pointer-events-auto absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-lg bg-[#67B529] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-md transition hover:bg-[#579c21] sm:text-xs"
            onClick={() => {
              const serviceId = item.service_id || item.service?.id || ''
              const srvName = item.service_name || item.service?.name || ''
              window.open(`/rate-list?service_id=${serviceId}&service_name=${encodeURIComponent(srvName)}&package_name=${encodeURIComponent(item.name)}`, '_blank')
            }}
            type="button"
          >
            <span>📋</span>
            <span>Item Rate List</span>
          </button>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-3.5 sm:p-5 md:px-6 md:pb-5 text-white">
            {item.badge ? (
              <span className="mb-1.5 inline-flex rounded bg-[#67B529] px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-xs sm:text-[11px]">
                {item.badge}
              </span>
            ) : null}
            <h2 className="max-w-3xl text-base font-black leading-snug tracking-tight text-white drop-shadow-sm sm:text-xl md:text-2xl md:leading-tight">
              {item.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-100 sm:gap-2 sm:text-xs">
              <button
                className="pointer-events-auto rounded bg-white/20 px-2.5 py-0.5 backdrop-blur-xs transition hover:bg-white/30 focus:outline-none"
                onClick={() => onOpenReviews?.(item)}
                type="button"
              >
                ★ {item.rating} rated
              </button>
              <span className="rounded bg-white/20 px-2.5 py-0.5 backdrop-blur-xs">{item.jobs}</span>
              <span className="rounded bg-white/20 px-2.5 py-0.5 backdrop-blur-xs">⏱ {item.duration}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area with Compact Spacing */}
        <div className="overflow-y-auto flex-1 p-3.5 md:p-5">
          <div className="grid gap-3.5">
            {sections.map((section) => {
              if (section.section_key === 'included') {
                const notIncludedSection = sections.find((s) => s.section_key === 'not_included')
                if (notIncludedSection) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch" key="included-and-not-included">
                      <div className="h-full">
                        <DynamicSection
                          brands={brands}
                          item={item}
                          onSaveReview={onSaveReview}
                          openFaq={openFaq}
                          reviews={reviews}
                          section={section}
                          serviceName={serviceName}
                          setOpenFaq={setOpenFaq}
                        />
                      </div>
                      <div className="h-full">
                        <DynamicSection
                          brands={brands}
                          item={item}
                          onSaveReview={onSaveReview}
                          openFaq={openFaq}
                          reviews={reviews}
                          section={notIncludedSection}
                          serviceName={serviceName}
                          setOpenFaq={setOpenFaq}
                        />
                      </div>
                    </div>
                  )
                }
              }

              if (section.section_key === 'not_included' && sections.some((s) => s.section_key === 'included')) {
                return null
              }

              return (
                <DynamicSection
                  brands={brands}
                  item={item}
                  key={section.id || section.section_key || section.title}
                  onSaveReview={onSaveReview}
                  openFaq={openFaq}
                  reviews={reviews}
                  section={section}
                  serviceName={serviceName}
                  setOpenFaq={setOpenFaq}
                />
              )
            })}
          </div>
        </div>

        {/* Compact Footer Bar */}
        <div className="shrink-0 flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Price</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-lg sm:text-xl font-black text-green-700">Rs. {item.price}</p>
              {getOriginalPrice(item) && <p className="text-xs text-slate-400 font-semibold line-through">Rs. {getOriginalPrice(item)}</p>}
            </div>
          </div>
          {quantity ? (
            <div className="grid h-9.5 min-w-32 grid-cols-3 items-center overflow-hidden rounded-lg border-2 border-[#003F86] bg-white text-sm font-bold text-[#003F86] shadow-xs">
              <button
                aria-label={`Remove one ${item.name}`}
                className="grid h-full place-items-center text-lg hover:bg-[#003F86] hover:text-white transition"
                onClick={() => onUpdateQuantity?.(item.name, quantity - 1)}
                type="button"
              >
                -
              </button>
              <span className="grid h-full place-items-center border-x border-[#003F86]/20 text-sm font-extrabold">{quantity}</span>
              <button
                aria-label={`Add one more ${item.name}`}
                className="grid h-full place-items-center text-lg hover:bg-[#003F86] hover:text-white transition"
                onClick={() => onAdd(item)}
                type="button"
              >
                +
              </button>
            </div>
          ) : (
            <button
              className="rounded-lg bg-[#003F86] px-6 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-md hover:bg-blue-900 hover:scale-[1.02] transition duration-150"
              onClick={() => onAdd(item)}
              type="button"
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PackageDetailsModal
