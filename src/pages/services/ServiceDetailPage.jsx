import { useCallback, useEffect, useMemo, useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import PackageDetailsModal from '../../components/services/PackageDetailsModal'
import { getCartTotal, getDisplayCart, getCartItemQuantity, getCartItemKey, getPackageAmount } from '../../components/services/ServiceCartUtils'
import { ServiceDetailSkeleton } from '../../components/common/Shimmer'
import { formatDisplayName } from '../../utils/displayText'
import { buildBackendUrl } from '../../config/urls'

const packageImageUrl = (path) => buildBackendUrl(path || '')

const isVideoMedia = (url = '') => {
  if (typeof url !== 'string' || !url) return false
  return Boolean(url.match(/\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:\?.*)?$/i) || /youtube\.com|youtu\.be|vimeo\.com/i.test(url))
}

const groupLabels = {
  annual: 'Annual plan',
  bleach: 'Bleach',
  'd-tan': 'D-Tan / Bleach',
  'face-cleanup': 'Face Cleanup',
  facial: 'Facials',
  general: 'Popular packages',
  'hair-cut-styling': 'Hair cut & styling',
  install: 'Install & uninstall',
  'korean-facials': 'Korean Facials',
  'manicure-pedicure': 'Pedicure / Manicure',
  repair: 'Repair & gas refill',
  service: 'Service',
  threading: 'Threading',
  waxing: 'Waxing',
}

const groupOrder = ['waxing', 'threading', 'd-tan', 'bleach', 'korean-facials', 'facial', 'face-cleanup', 'manicure-pedicure', 'hair-cut-styling', 'annual', 'service', 'repair', 'install', 'general']

function QuantityStepper({ className = '', item, onAdd, onUpdateQuantity, quantity }) {
  const itemKey = item.id ?? item.name

  if (!quantity) {
    return (
      <button
        className={`rounded-lg border border-blue-300 bg-white px-3 text-base font-bold text-blue-700 shadow-sm hover:border-blue-500 ${className}`}
        onClick={() => onAdd(item)}
        type="button"
      >
        Add
      </button>
    )
  }

  return (
    <div className={`grid grid-cols-3 items-center overflow-hidden rounded-lg border border-blue-300 bg-white text-base font-bold text-blue-700 shadow-sm ${className}`}>
      <button
        aria-label={`Remove one ${item.name}`}
        className="h-full px-3 text-xl hover:bg-blue-50"
        onClick={() => onUpdateQuantity(itemKey, quantity - 1)}
        type="button"
      >
        -
      </button>
      <span className="min-w-8 text-center text-[#003F86]">{quantity}</span>
      <button
        aria-label={`Add one more ${item.name}`}
        className="h-full px-3 text-xl hover:bg-blue-50"
        onClick={() => onAdd(item)}
        type="button"
      >
        +
      </button>
    </div>
  )
}

const getServiceTitle = (service) => service?.name || 'Service details'

const getCouponTitle = (coupon) => {
  if (!coupon) return ''
  if (coupon.title) return coupon.title
  if (coupon.type === 'Percentage' && String(coupon.value).includes('%')) return `${coupon.value} coupon`
  if (coupon.type === 'Percentage') return `${coupon.value}% coupon`
  if (coupon.value) return `${coupon.value} coupon`
  return coupon.code || ''
}

const normalizeText = (value = '') => String(value).trim().toLowerCase()

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

const formatCount = (count) => {
  if (count >= 1000000) return `${Math.round(count / 100000) / 10}M`
  if (count >= 1000) return `${Math.round(count / 1000)}K`
  return String(count || 0)
}

const formatReviewDate = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getReviewServiceName = (review) => normalizeText(review.serviceName || review.service_name || review.service)

const getPackageGroupImage = (packages = [], fallbackImage = '') =>
  packageImageUrl(packages.find((item) => item.image)?.image || fallbackImage)

function RatingStars({ rating = 0 }) {
  const roundedRating = Math.round(Number(rating) || 0)

  return (
    <span className="flex items-center gap-0.5 text-base leading-none text-yellow-400" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= roundedRating ? 'text-yellow-400' : 'text-blue-200'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewsModal({ onClose, packages = [], reviews = [], service, target }) {
  const [isVisible, setIsVisible] = useState(false)
  const isPackageTarget = target?.type === 'package'
  const targetItem = target?.item
  const targetTitle = isPackageTarget ? targetItem?.name : getServiceTitle(service)
  const targetRating = isPackageTarget ? targetItem?.rating : service?.rating
  const targetReviewText = isPackageTarget ? targetItem?.jobs : service?.metadata?.bookings
  const packageNames = packages.map((item) => normalizeText(item.name))
  const matchedReviews = reviews.filter((review) => {
    const reviewServiceName = getReviewServiceName(review)
    if (!reviewServiceName) return false
    if (isPackageTarget) {
      return reviewServiceName === normalizeText(targetItem?.name) || reviewServiceName === normalizeText(service?.name)
    }
    return reviewServiceName === normalizeText(service?.name) || packageNames.includes(reviewServiceName)
  })
  const displayReviewCount = matchedReviews.length || parseReviewCount(targetReviewText) || parseReviewCount(service?.metadata?.bookings)
  const displayRating = matchedReviews.length
    ? (matchedReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / matchedReviews.length).toFixed(2)
    : targetRating || service?.rating || ''
  const distribution = [5, 4, 3, 2, 1].map((rating) => matchedReviews.filter((review) => Math.round(Number(review.rating)) === rating).length)
  const bars = distribution
  const maxBar = Math.max(...bars, 1)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    window.setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true))
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  return (
    <div
      className={`fixed inset-0 z-[70] grid place-items-center bg-[#003F86]/70 px-4 py-6 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={`max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl transition duration-300 ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{targetTitle}</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-bold leading-none">{displayRating}</span>
              <div className="pb-1">
                <RatingStars rating={displayRating} />
                <p className="mt-1 text-sm text-blue-700">{formatCount(displayReviewCount)} reviews</p>
              </div>
            </div>
          </div>
          <button
            aria-label="Close reviews"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-100 text-3xl leading-none text-blue-900 hover:bg-blue-50"
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(88vh-120px)] overflow-y-auto">
          <div className="grid gap-4 border-b border-blue-100 p-5">
            {[5, 4, 3, 2, 1].map((rating, index) => (
              <div className="grid grid-cols-[42px_1fr_56px] items-center gap-4 text-sm" key={rating}>
                <span className="font-bold text-[#003F86]">★ {rating}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <span
                    className="block h-full rounded-full bg-[#003F86] transition-all duration-500"
                    style={{ width: `${Math.max(4, (bars[index] / maxBar) * 100)}%` }}
                  />
                </span>
                <span className="text-blue-800">{formatCount(bars[index])}</span>
              </div>
            ))}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-3xl font-bold">All reviews</h3>
              <button className="text-sm font-bold text-blue-700" type="button">Filter</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Most detailed', 'In my area', 'Frequent users'].map((filter) => (
                <span className="rounded-lg border border-blue-100 px-4 py-2 text-sm font-bold text-blue-800" key={filter}>{filter}</span>
              ))}
            </div>

            {matchedReviews.length ? (
              <div className="mt-4 divide-y divide-black/10">
                {matchedReviews.map((review) => (
                  <article className="py-5" key={review.id || `${review.customerName}-${review.reviewedAt}-${review.text}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold">{review.customerName}</p>
                        <p className="mt-1 text-sm text-blue-700">
                          {formatReviewDate(review.reviewedAt)}
                          <span> • For {review.serviceName || targetTitle}</span>
                        </p>
                      </div>
                      <span className="rounded-md bg-[#67B529] px-2.5 py-1 text-sm font-bold text-white">★ {review.rating || '5'}</span>
                    </div>
                    {review.text && <p className="mt-4 text-base leading-7 text-[#003F86]">{review.text}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-[#F6FBFF] p-5 text-sm text-blue-700">No customer reviews added yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function ServiceDetailPage({
  appSettings,
  brands = [],
  cart,
  cartCount,
  content = {},
  coupons = [],
  isLoggedIn,
  isContentLoading = false,
  locationLabel,
  onAddToCart,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onSaveReview,
  onSearchSuggestionSelect,
  onShowServices,
  onUpdateQuantity,
  reviews = [],
  searchSuggestions,
  selectedPackageName = '',
  selectedSubServiceId = null,
  onClearSelectedPackage,
  onClearSubService,
  service,
  user,
}) {
  const activeSubService = useMemo(() => {
    if (!selectedSubServiceId || !service) return null
    const subs = service.sub_services || service.subServices || []
    return subs.find((sub) => String(sub.id) === String(selectedSubServiceId))
  }, [selectedSubServiceId, service])

  const packages = useMemo(
    () => {
      const allPackages = service?.packages || []
      if (!selectedSubServiceId) return allPackages
      return allPackages.filter((item) => String(item.sub_service_id) === String(selectedSubServiceId))
    },
    [service, selectedSubServiceId],
  )
  const groups = useMemo(() => {
    const packageGroups = packages.reduce((collection, item) => {
      const key = item.category_key || 'general'
      collection[key] = [...(collection[key] || []), item]
      return collection
    }, {})

    return Object.keys(packageGroups)
      .sort((first, second) => {
        const firstIndex = groupOrder.indexOf(first)
        const secondIndex = groupOrder.indexOf(second)
        return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex)
      })
      .map((key) => ({
        id: key,
        image: getPackageGroupImage(packageGroups[key], service?.image),
        name: groupLabels[key] || key.replace(/-/g, ' '),
        packages: packageGroups[key],
      }))
  }, [packages, service?.image])
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id || 'general')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [reviewsTarget, setReviewsTarget] = useState(null)
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [activeCouponIdx, setActiveCouponIdx] = useState(0)
  const displayActiveGroup = groups.some((group) => group.id === activeGroup) ? activeGroup : groups[0]?.id

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsHeaderScrolled(true)
      } else {
        setIsHeaderScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!selectedPackageName) return

    const packageToOpen = packages.find((item) => item.name === selectedPackageName)
    if (packageToOpen) {
      window.setTimeout(() => setSelectedDetails(packageToOpen), 100)
    }
  }, [packages, selectedPackageName])

  const displayCart = getDisplayCart(cart)
  const cartTotal = getCartTotal(cart)
  const getPackageQuantity = (item) => getCartItemQuantity(cart, item)
  const primaryCoupon = coupons[0]

  const activeCouponsList = useMemo(() => {
    return (coupons || []).map((c, idx) => ({
      id: c.id || c.code || `coupon-${idx}`,
      title: getCouponTitle(c),
      description: c.description || (c.minimum_order ? `On orders above Rs.${c.minimum_order}` : ''),
    })).filter((c) => c.title)
  }, [coupons])

  useEffect(() => {
    if (activeCouponsList.length <= 1) return
    const timer = setInterval(() => {
      setActiveCouponIdx((prev) => (prev + 1) % activeCouponsList.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [activeCouponsList.length])

  const originalCartTotal = useMemo(() => {
    return displayCart.reduce((sum, item) => {
      const origPrice = Number(item.originalPrice || item.original_price || (Number(item.lineTotal || item.price) + 100))
      return sum + origPrice
    }, 0)
  }, [displayCart])

  const menuModalItems = useMemo(() => {
    const subs = service?.sub_services || service?.subServices || []
    if (subs.length > 0) {
      return subs.map((sub) => ({
        id: sub.id,
        slug: sub.slug || sub.name,
        name: sub.name,
        image: sub.icon || sub.image || service?.image,
        type: 'sub_service',
      }))
    }
    return groups.map((g) => ({
      id: g.id,
      slug: g.id,
      name: formatDisplayName(g.name),
      image: g.image || service?.image,
      type: 'group',
    }))
  }, [service, groups])

  const handleMenuSelect = useCallback((item) => {
    setIsMenuModalOpen(false)
    if (item.type === 'group' || document.getElementById(`section-${item.id}`)) {
      const targetId = `section-${item.id}`
      const elem = document.getElementById(targetId)
      if (elem) {
        if (item.type === 'group') setActiveGroup(item.id)
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }

    const headingElem = Array.from(document.querySelectorAll('section [id^="section-"] h2, section h2')).find(
      (el) => el.textContent?.trim()?.toLowerCase() === item.name?.trim()?.toLowerCase()
    )
    if (headingElem) {
      headingElem.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (item.type === 'sub_service') {
      if (String(selectedSubServiceId) === String(item.id)) {
        document.querySelector('.scroll-mt-28')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        const slug = service?.slug || service?.name || ''
        const subSlug = item.slug || item.name
        const cleanServiceSlug = slug.toString().toLowerCase().replace(/\s+/g, '-')
        const cleanSubSlug = subSlug.toString().toLowerCase().replace(/\s+/g, '-')
        window.location.href = `/services/${cleanServiceSlug}/${cleanSubSlug}`
      }
    }
  }, [selectedSubServiceId, service, setActiveGroup])
  const promiseContent = content.service_promise?.[0]
  const promiseItems = promiseContent?.metadata?.items || ['Verified Professionals', 'Hassle Free Booking', 'Transparent Pricing']

  if (isContentLoading) {
    return (
      <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
        <Navbar
          appSettings={appSettings}
          isLoggedIn={isLoggedIn}
          cartCount={cartCount}
          locationLabel={locationLabel}
          onBackHome={onBackHome}
          onGlobalSearch={onGlobalSearch}
          onLocationChange={onLocationChange}
          onLogin={onLogin}
          onLogout={onLogout}
          onOpenCart={onOpenCart}
          onOpenProfile={onOpenProfile}
          onSearchSuggestionSelect={onSearchSuggestionSelect}
          searchSuggestions={searchSuggestions}
          user={user}
        />
        <ServiceDetailSkeleton />
        <div className="hidden lg:block">
          <Footer appSettings={appSettings} services={service ? [service] : []} />
        </div>
      </main>
    )
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
        <Navbar
          appSettings={appSettings}
          isLoggedIn={isLoggedIn}
          cartCount={cartCount}
          locationLabel={locationLabel}
          onBackHome={onBackHome}
          onGlobalSearch={onGlobalSearch}
          onLocationChange={onLocationChange}
          onLogin={onLogin}
          onLogout={onLogout}
          onOpenCart={onOpenCart}
          onOpenProfile={onOpenProfile}
          onSearchSuggestionSelect={onSearchSuggestionSelect}
          searchSuggestions={searchSuggestions}
          user={user}
        />
        <section className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h1 className="text-3xl font-bold">Service not found</h1>
          <button className="mt-6 rounded-md bg-[#003F86] px-5 py-3 text-sm font-bold text-white" onClick={onShowServices} type="button">
            View all services
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <div className="hidden lg:block sticky top-0 z-40 bg-white">
        <Navbar
          appSettings={appSettings}
          isLoggedIn={isLoggedIn}
          cartCount={cartCount}
          locationLabel={locationLabel}
          onBackHome={onBackHome}
          onGlobalSearch={onGlobalSearch}
          onLocationChange={onLocationChange}
          onLogin={onLogin}
          onLogout={onLogout}
          onOpenCart={onOpenCart}
          onOpenProfile={onOpenProfile}
          onSearchSuggestionSelect={onSearchSuggestionSelect}
          searchSuggestions={searchSuggestions}
          user={user}
        />
      </div>

      {/* Mobile Urban Company Style Header & Hero Section */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between gap-2 lg:hidden shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
          <button
            type="button"
            onClick={onShowServices}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-800 shadow-xs hover:bg-neutral-50 active:scale-95 transition duration-200"
          >
            <svg className="h-5 w-5 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span
            className={`text-base font-extrabold text-neutral-900 truncate transition-all duration-300 transform ${
              isHeaderScrolled ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none absolute left-14 w-0 overflow-hidden'
            }`}
          >
            {activeSubService ? activeSubService.name : getServiceTitle(service)}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onGlobalSearch}
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-800 shadow-xs hover:bg-neutral-50 active:scale-95 transition duration-200"
          >
            <svg className="h-5 w-5 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: service?.name, url: window.location.href }).catch(() => {})
              }
            }}
            aria-label="Share"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-800 shadow-xs hover:bg-neutral-50 active:scale-95 transition duration-200"
          >
            <svg className="h-5 w-5 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="bg-white px-5 pt-4 pb-2 lg:hidden">
        <div className="flex flex-col">
          {activeSubService && (
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#67B529]">
              <span className="uppercase tracking-wider">{service?.name}</span>
              <span>/</span>
              <span className="text-[#003F86]">{activeSubService.name}</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
            {activeSubService ? activeSubService.name : getServiceTitle(service)}
          </h1>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
            <button
              className="flex items-center gap-1 text-neutral-800 focus:outline-none"
              onClick={() => setReviewsTarget({ type: 'service', item: service })}
              type="button"
            >
              <RatingStars rating={service.rating || 0} />
              <span className="ml-1 text-neutral-800 font-bold">{service.rating || 'No ratings yet'}</span>
              {service.metadata?.bookings ? (
              <span className="text-neutral-500 font-normal">({service.metadata.bookings})</span>
              ) : null}
            </button>
          </div>

          {/* Automatic Horizontally Scrolling Coupon Carousel */}
          <div className="my-4 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeCouponIdx * 100}%)` }}
            >
              {activeCouponsList.map((coupon, idx) => (
                <div key={coupon.id || idx} className="w-full shrink-0 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#167634] font-black text-white text-sm shadow-xs">%</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-900 truncate">{coupon.title}</p>
                      <p className="text-xs font-medium text-neutral-500 mt-0.5 truncate">{coupon.description}</p>
                    </div>
                  </div>
                  <div className="border-l border-neutral-200 pl-3.5 text-center shrink-0">
                    <span className="text-xs font-extrabold text-neutral-800">{idx + 1}/{activeCouponsList.length}</span>
                    <div className="mt-1 flex justify-center gap-1">
                      {activeCouponsList.map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          onClick={() => setActiveCouponIdx(dotIdx)}
                          className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 cursor-pointer ${
                            dotIdx === activeCouponIdx ? 'bg-neutral-800 scale-110' : 'bg-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2.5 bg-[#F4F5F8] lg:hidden" />

      {/* Mobile Service Package Groups / Categories Grid */}
      <section className="px-2 py-5 border-b border-neutral-100 lg:hidden">
        <div className="grid grid-cols-3 gap-x-4 gap-y-5 max-w-md sm:max-w-md mx-auto">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                setActiveGroup(group.id)
                document.getElementById(`section-${group.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              type="button"
              className="group flex flex-col items-center text-center cursor-pointer focus:outline-none transition-transform duration-200 active:scale-95"
            >
              <div className="h-[76px] w-[76px] sm:h-[84px] sm:w-[84px] rounded-[11px] bg-slate-100 overflow-hidden shadow-xs border border-neutral-200/80 transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
                {group.image ? (
                  <img src={group.image} alt={formatDisplayName(group.name)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <img src={service?.image} alt={formatDisplayName(group.name)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                )}
              </div>
              <span className="mt-2 text-sm sm:text-[13px] font-semibold text-neutral-800 leading-tight line-clamp-2 px-1 group-hover:text-[#003F86] transition-colors">
                {formatDisplayName(group.name)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-2.5 bg-[#F4F5F8] lg:hidden mb-2" />

      <section className="hidden lg:block border-b border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8">
          <button className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-[#003F86] transition-colors group cursor-pointer" onClick={onShowServices} type="button">
            <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to all services</span>
          </button>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              {activeSubService && (
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold text-[#67B529]">
                  <span className="uppercase tracking-wider">{service?.name}</span>
                  <span>/</span>
                  <span className="text-[#003F86]">{activeSubService.name}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold leading-tight text-[#003F86]">
                {activeSubService ? activeSubService.name : getServiceTitle(service)}
              </h1>
              
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-blue-900">
                <button
                  className="flex items-center gap-1.5 rounded-md text-left transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                  onClick={() => setReviewsTarget({ type: 'service', item: service })}
                  type="button"
                >
                  <RatingStars rating={service.rating || 0} />
                  <span className="rating-dotted-underline">{service.rating ? `${service.rating} rating` : 'No ratings yet'}</span>
                </button>
                <span>{service.metadata?.bookings || ''}</span>
              </div>
            </div>
            <p className="max-w-xl text-xs leading-5 text-blue-800">{service.description}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 py-2 lg:pt-3 lg:pb-8 lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:px-8">
        <aside className="hidden lg:block h-fit rounded-xl border border-blue-100 bg-white p-4 shadow-sm lg:sticky lg:top-[92px]">
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-sm font-bold text-blue-900">Select a service</p>
            <div className="h-px flex-1 bg-[#003F86]/10" />
          </div>

          <div className="mt-3.5 grid grid-cols-3 items-start gap-x-4 gap-y-3">
            {groups.map((group) => (
              <button
                className="group grid min-h-[120px] grid-rows-[56px_1fr] justify-items-center text-center focus:outline-none cursor-pointer transition duration-200 hover:-translate-y-0.5"
                key={group.id}
                onClick={() => {
                  setActiveGroup(group.id)
                  document.getElementById(`section-${group.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                type="button"
              >
                <span
                  className={`mx-auto grid h-[56px] w-[56px] place-items-center overflow-hidden rounded-xl border transition-all duration-200 ${
                    displayActiveGroup === group.id ? 'border-[#003F86] shadow-[0_0_0_2px_rgba(0,84,166,0.22)]' : 'border-transparent group-hover:border-blue-200'
                  }`}
                >
                  {group.image ? (
                    <img className="h-full w-full object-cover rounded-[10px] p-0.5 transition duration-300 group-hover:scale-110" src={group.image} alt="" />
                  ) : (
                    <img className="h-full w-full object-cover rounded-[10px] p-0.5 transition duration-300 group-hover:scale-110" src={service?.image} alt="" />
                  )}
                </span>
                <span className="mt-2 block min-h-[50px] w-full text-xs font-semibold capitalize leading-4">
                  <span className="relative inline-block pb-0.5 transition-colors duration-200 group-hover:text-[#003F86]">
                    {formatDisplayName(group.name)}
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#003F86] transition-all duration-300 ease-out group-hover:w-full" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-3 sm:gap-5 pb-48 sm:pb-52 lg:pb-0">
          {groups.map((group) => (
            <section
              className="overflow-hidden rounded-xl sm:rounded-lg border border-neutral-200/80 sm:border-blue-100 bg-white shadow-xs sm:shadow-sm scroll-mt-24"
              id={`section-${group.id}`}
              key={group.id}
              onMouseEnter={() => setActiveGroup(group.id)}
            >
              <div className="border-b border-neutral-100 sm:border-blue-100 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-[#F8FAFC]/50 sm:bg-white">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight">{formatDisplayName(group.name)}</h2>
              </div>

              <div className="divide-y divide-neutral-200/60 sm:divide-black/10">
                {group.packages.map((item) => {
                  const bannerMedia = item.banner_media || item.bannerMedia
                  const isVideo = isVideoMedia(bannerMedia)

                  return (
                    <div className="flex flex-col" key={`${group.id}-${item.name}`}>
                      {bannerMedia ? (
                        <div className="px-3.5 pt-3 sm:px-5 sm:pt-4">
                          {isVideo ? (
                            <div className="w-full overflow-hidden rounded-xl bg-black aspect-video sm:aspect-[21/9] max-h-60 relative shadow-xs border border-slate-300">
                              <video
                                autoPlay
                                className="h-full w-full object-cover"
                                controls
                                loop
                                muted
                                playsInline
                                preload="auto"
                                src={packageImageUrl(bannerMedia)}
                              />
                            </div>
                          ) : (
                            <div className="w-full overflow-hidden rounded-xl bg-slate-100 max-h-60 relative shadow-xs border border-slate-200/80">
                              <img
                                alt={`${item.name} banner`}
                                className="w-full max-h-60 object-cover"
                                src={packageImageUrl(bannerMedia)}
                              />
                            </div>
                          )}
                        </div>
                      ) : null}

                      <article className="group flex items-start justify-between gap-3.5 sm:gap-5 px-4 py-3.5 sm:px-5 sm:py-4">
                        <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                          <h3 className="text-[16.5px] sm:text-[18px] font-bold leading-snug text-[#003F86]">{item.name}</h3>

                          <button
                            className="mt-0.5 flex items-center gap-1 rounded-md text-left text-[9.5px] sm:text-[11px] text-blue-800 transition hover:text-blue-700 focus:outline-none"
                            onClick={() => setReviewsTarget({ type: 'package', item })}
                            type="button"
                          >
                            <span className="grid h-2.5 w-2.5 sm:h-3 sm:w-3 place-items-center rounded-full bg-blue-700 text-[6.5px] sm:text-[8px] font-bold leading-none text-white">
                              ★
                            </span>
                            <span className="rating-dotted-underline font-normal text-neutral-600 sm:font-medium">{item.rating} ({item.jobs || 'New service'})</span>
                          </button>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-neutral-600">
                            <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-900">Rs. {item.price}</span>
                            {(item.originalPrice || item.original_price) && (
                              <span className="text-[11px] sm:text-xs text-neutral-400 line-through font-normal">Rs. {item.originalPrice || item.original_price}</span>
                            )}
                            <span className="text-neutral-300">•</span>
                            <span>{item.duration}</span>
                          </div>

                          {item.description ? (
                            <p className="mt-1.5 sm:mt-2 text-[12.5px] sm:text-[13px] leading-relaxed text-neutral-500 line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}

                          <button
                            className="mt-1.5 sm:mt-2 text-xs sm:text-[13px] font-extrabold text-blue-700 hover:text-blue-800 focus:outline-none inline-block"
                            onClick={() => setSelectedDetails(item)}
                            type="button"
                          >
                            View details
                          </button>
                        </div>

                        <div className="flex flex-col items-center shrink-0 w-[94px] sm:w-32 md:w-36 pt-0.5">
                          <div className="relative h-[94px] w-[94px] sm:h-32 sm:w-32 md:h-36 md:w-36 overflow-hidden rounded-xl bg-slate-100 shadow-xs sm:shadow-sm border border-slate-200/80">
                            {item.offer && (
                              <div className="absolute left-1 right-1 sm:left-2 sm:right-2 top-0 z-10 rounded-b-xs sm:rounded-b-md bg-[#167634] px-1 sm:px-2 py-0.5 text-center text-[9px] sm:text-[11px] font-extrabold text-white shadow-xs truncate">
                                {item.offer}
                              </div>
                            )}
                            <img
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              src={packageImageUrl(item.image || service.image)}
                              alt={item.name}
                            />
                          </div>
                          <QuantityStepper
                            className="relative z-10 -mt-3 sm:-mt-5 h-7 sm:h-8 min-w-[76px] sm:min-w-20 text-xs sm:text-sm shadow-md"
                            item={{ ...item, serviceName: service.name, groupName: formatDisplayName(group.name), originalPrice: item.originalPrice || item.original_price }}
                            onAdd={onAddToCart}
                            onUpdateQuantity={onUpdateQuantity}
                            quantity={getPackageQuantity(item)}
                          />
                          {item.optionCount && <p className="mt-1 text-[10px] sm:text-xs font-semibold text-blue-700 text-center leading-tight">{item.optionCount}</p>}
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="hidden lg:block h-fit lg:sticky lg:top-[92px] space-y-3.5">
          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-[#003F86]">Cart</h2>
            {displayCart.length === 0 ? (
              <div className="mt-3 rounded-lg bg-[#F6FBFF] p-4 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[#003F86]">
                 <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle><path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 7H6"></path></svg>
                </div>
                <p className="mt-2 text-xs font-semibold text-blue-700">No items in your cart</p>
              </div>
            ) : (
              <div className="mt-3 grid gap-2.5">
                {displayCart.map((item) => {
                  const qty = Number(item.quantity || 0)
                  const lineTotal = getPackageAmount(item.price) * qty

                  return (
                    <div className="flex items-start justify-between gap-3 text-xs text-[#003F86]" key={getCartItemKey(item)}>
                      <p className="min-w-0 font-semibold leading-snug">
                        {qty} x {item.name}
                      </p>
                      <p className="shrink-0 font-semibold tabular-nums">
                        Rs. {lineTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )
                })}
                <div className="border-t border-blue-100 pt-2.5">
                  <div className="flex justify-between text-xs font-bold text-[#003F86]">
                    <span>Total</span>
                    <span>Rs. {Number(cartTotal).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      className="rounded-md bg-[#003F86] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0054A6]"
                      onClick={onOpenCart}
                      type="button"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <h3 className="text-[15px] font-bold leading-tight text-[#0F172A]">{promiseContent?.title || 'Rehanshi Promise'}</h3>
                </div>
                <div className="mt-3.5 grid gap-2.5">
                  {promiseItems.map((item) => (
                    <p className="flex items-center gap-2.5 whitespace-nowrap text-[13px] font-medium text-slate-800" key={item}>
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#16A34A] text-[9px] font-bold text-white">
                        ✓
                      </span>
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#E8F8EE] text-center">
                <span className="text-[9px] font-black uppercase leading-3 text-[#16A34A]">
                  Verified
                  <span className="block">Quality</span>
                </span>
              </div>
            </div>
          </div>

          <a
            href="/contact"
            className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3.5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1877F2] text-white shadow-xs">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  <path d="M14 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-[14px] font-bold text-slate-900 group-hover:text-[#003F86] transition-colors leading-tight">Need help?</h4>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5 truncate">Contact our support team</p>
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#003F86] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </aside>
      </section>

      <PackageDetailsModal
        item={selectedDetails}
        brands={brands}
        cart={cart}
        onAdd={(addedItem) => onAddToCart({ ...addedItem, serviceName: service.name, originalPrice: addedItem.originalPrice || addedItem.original_price })}
        onClose={() => {
          setSelectedDetails(null)
          onClearSelectedPackage?.()
        }}
        onOpenReviews={(item) => setReviewsTarget({ type: 'package', item })}
        onSaveReview={onSaveReview}
        onUpdateQuantity={onUpdateQuantity}
        reviews={reviews}
        serviceName={service.name}
      />

      {reviewsTarget && (
        <ReviewsModal
          onClose={() => setReviewsTarget(null)}
          packages={packages}
          reviews={reviews}
          service={service}
          target={reviewsTarget}
        />
      )}

      {/* Floating Menu Pill Button (Mobile Only) */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-[65] lg:hidden transition-all duration-300 ${displayCart.length > 0 ? 'bottom-[122px]' : 'bottom-6'}`}>
        <button
          onClick={() => setIsMenuModalOpen(true)}
          type="button"
          aria-label="Open menu"
          className="flex items-center gap-2.5 rounded-full bg-[#222222] hover:bg-[#111111] active:scale-95 text-white px-5 py-2.5 text-sm font-extrabold shadow-xl shadow-black/35 border border-white/15 transition duration-200"
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="tracking-wide">Menu</span>
        </button>
      </div>

      {/* Sticky Bottom Cart Bar (Mobile Only) */}
      {displayCart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-neutral-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] lg:hidden transition-all duration-300 transform translate-y-0">
          <div className="bg-[#E7F7ED] px-4 py-2 text-[#156E30] text-xs sm:text-sm font-extrabold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#167634] text-[11px] text-white font-black shadow-xs">%</span>
              <span>{cartTotal >= 1300 ? '🎉 Visitation fee waived off!' : `Add Rs.${1300 - cartTotal} more to save on visitation fee`}</span>
            </span>
            
          </div>
          <div className="p-3.5 px-4 flex items-center justify-between gap-4 bg-white">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">Rs.{cartTotal}</span>
                {originalCartTotal > cartTotal && (
                  <span className="text-sm font-semibold text-slate-400 line-through">Rs.{originalCartTotal}</span>
                )}
              </div>
              <p className="text-[11px] font-bold text-[#6338E0] tracking-tight">{displayCart.reduce((acc, item) => acc + (item.quantity || 1), 0)} {displayCart.reduce((acc, item) => acc + (item.quantity || 1), 0) === 1 ? 'item' : 'items'} added</p>
            </div>
            <button
              onClick={onOpenCart}
              type="button"
              className="rounded-xl bg-[#6338E0] hover:bg-[#5229C0] active:scale-95 text-white px-8 py-3 text-sm sm:text-base font-bold shadow-md shadow-[#6338E0]/30 transition duration-200 shrink-0"
              style={{ backgroundColor: '#6338E0' }}
            >
              View Cart
            </button>
          </div>
        </div>
      )}

      {/* Menu / Subservice Modal (Mobile Only, Image 2) */}
      {isMenuModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/65 p-4 lg:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsMenuModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[410px] sm:max-w-[380px] rounded-2xl bg-white p-5 shadow-2xl animate-[scaleUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-x-2 gap-y-6 max-h-[65vh] overflow-y-auto custom-thin-scrollbar p-1">
              {menuModalItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuSelect(item)}
                  type="button"
                  className="group flex flex-col items-center text-center cursor-pointer focus:outline-none transition-transform duration-200 active:scale-95"
                >
                  <div className="h-[76px] w-[76px] sm:h-[82px] sm:w-[82px] rounded-[15px] border border-black/5 shadow-xs p-2 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105">
                    {item.image && (typeof item.image === 'string') && (item.image.startsWith('http') || item.image.startsWith('/') || item.image.endsWith('.png') || item.image.endsWith('.svg') || item.image.endsWith('.webp') || item.image.endsWith('.jpg') || item.image.endsWith('.jpeg')) ? (
                      <img
                        src={packageImageUrl(item.image)}
                        alt={item.name}
                        className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                      />
                    ) : (
                      <span className="text-3xl select-none">{item.image || ''}</span>
                    )}
                  </div>
                  <span className="mt-2 text-xs sm:text-[13px] font-semibold text-neutral-800 leading-tight line-clamp-2 px-1 group-hover:text-[#6338E0] transition-colors">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMenuModalOpen(false)}
            type="button"
            aria-label="Close menu modal"
            className="mt-6 h-12 w-12 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
          >
            <svg className="h-6 w-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="hidden lg:block">
        <Footer appSettings={appSettings} services={service ? [service] : []} />
      </div>
    </main>
  )
}

export default ServiceDetailPage
