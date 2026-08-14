import { useCallback, useEffect, useState } from 'react'
import AuthModal from '../auth/AuthModal'
import MobileTabletGuestAuthBottomSheet from '../auth/MobileTabletGuestAuthBottomSheet'
import LocationModal from './LocationModal'
import MobilePromoCarousel from '../home/MobilePromoCarousel'
import { buildBackendUrl } from '../../config/urls'
import { getBrandingDisplay } from '../../utils/branding'

const LG_BREAKPOINT_PX = 1024

function isMobileOrTabletViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${LG_BREAKPOINT_PX - 1}px)`).matches
}

const SEARCH_PLACEHOLDER_SERVICES = [
  'AC service',
  'Salon at home',
  'Deep cleaning',
  'Plumbing',
  'Electrician',
  'Pest control',
  'Painting',
  'Carpenter',
]

const useTypingPlaceholder = (services, { enabled = true } = {}) => {
  const [displayText, setDisplayText] = useState(`Search for ${services[0] || 'service'}`)

  useEffect(() => {
    if (!enabled || !services.length) return undefined

    let serviceIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeoutId

    const tick = () => {
      const current = services[serviceIndex]
      const typed = current.slice(0, charIndex)
      setDisplayText(`Search for '${typed}'`)

      if (!isDeleting && charIndex < current.length) {
        charIndex += 1
        timeoutId = window.setTimeout(tick, 90)
        return
      }

      if (!isDeleting && charIndex === current.length) {
        isDeleting = true
        timeoutId = window.setTimeout(tick, 1600)
        return
      }

      if (isDeleting && charIndex > 0) {
        charIndex -= 1
        timeoutId = window.setTimeout(tick, 45)
        return
      }

      isDeleting = false
      serviceIndex = (serviceIndex + 1) % services.length
      timeoutId = window.setTimeout(tick, 320)
    }

    timeoutId = window.setTimeout(tick, 400)
    return () => window.clearTimeout(timeoutId)
  }, [enabled, services])

  return displayText
}

const highlightMatch = (text, query) => {
  if (!query || !text) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)
  return (
    <>
      {before}
      <span className="font-extrabold text-slate-950">{match}</span>
      {after}
    </>
  )
}

function Navbar({
  appSettings = {},
  cartCount = 0,
  isLoggedIn,
  locationLabel = 'Location not detected',
  mobileBanner = null,
  mobileBannerSlides = null,
  mobileNavTitle,
  onMobileBack,
  onBackHome,
  onGlobalSearch,
  onSearchSuggestionSelect,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenBecomeProvider,
  onOpenCart,
  onOpenProfile,
  onClearSearch,
  searchSuggestions = [],
  user,
}) {
  const [authMode, setAuthMode] = useState(null)
  const [isGuestAuthOpen, setIsGuestAuthOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  const openLogin = useCallback(() => {
    if (isMobileOrTabletViewport()) {
      setAuthMode(null)
      setIsGuestAuthOpen(true)
      return
    }
    setIsGuestAuthOpen(false)
    setAuthMode('login')
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const typingPlaceholder = useTypingPlaceholder(SEARCH_PLACEHOLDER_SERVICES, {
    enabled: !searchQuery.trim(),
  })
  const { appName, isLogoCircular, logoText, logoUrl, showBrandName, tagline } = getBrandingDisplay(appSettings)
  const profileImage = buildBackendUrl(user?.metadata?.profile_picture || user?.metadata?.avatar_url || user?.avatar_url || user?.image || '')
  const profileInitials = (user?.name || user?.phone || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const hasMobileHero = !mobileNavTitle && (Boolean(mobileBanner) || (Array.isArray(mobileBannerSlides) && mobileBannerSlides.length > 0))

  const updateLocationLabel = useCallback((label) => {
    onLocationChange?.(label)
  }, [onLocationChange])

  const submitSearch = (event) => {
    event.preventDefault()
    onGlobalSearch?.(searchQuery)
    setIsSearchFocused(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearchFocused(false)
    onClearSearch?.()
  }

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.name)
    setIsSearchFocused(false)
    onSearchSuggestionSelect?.(suggestion)
  }

  const visibleSuggestions = searchQuery.trim()
    ? searchSuggestions
      .filter((suggestion) => suggestion.searchText.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      .slice(0, 8)
    : []

  const searchSuggestionsDropdown = isSearchFocused && visibleSuggestions.length > 0 ? (
    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200/80 bg-white py-1 shadow-xl divide-y divide-slate-100">
      {visibleSuggestions.map((suggestion, idx) => (
        <button
          className="flex w-full items-start gap-4 px-4 py-3 text-left transition hover:bg-[#F6FBFF] sm:px-4 sm:py-3.5"
          key={`${suggestion.type}-${suggestion.name}-${idx}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => selectSuggestion(suggestion)}
          type="button"
        >
          <span className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 mt-0.5 border border-slate-100/80">
            <img className="h-full w-full object-cover" src={suggestion.image} alt="" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-[15px] text-slate-800 font-normal leading-snug">
              {highlightMatch(suggestion.name, searchQuery)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
              {suggestion.rating && (
                <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                  <span>★</span>
                  <span>{suggestion.rating}</span>
                </span>
              )}
              {suggestion.price && (
                <>
                  {suggestion.rating && <span className="text-slate-300 font-bold">•</span>}
                  <span className="text-slate-700 font-medium">{suggestion.price}</span>
                </>
              )}
              {suggestion.serviceName && (
                <>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-slate-600">{suggestion.serviceName}</span>
                </>
              )}
              {suggestion.subServiceName && suggestion.subServiceName !== suggestion.serviceName && (
                <>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-slate-600">{suggestion.subServiceName}</span>
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  ) : null

  const mobileHeroOverlay = (
    <div className="flex flex-col gap-2 px-4 pt-2.5 pb-1">
      <div className="flex items-center justify-between min-h-[28px]">
        <button className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setIsLocationModalOpen(true)} type="button">
          <svg className="w-4.5 h-4.5 w-[18px] h-[18px] text-white shrink-0 mt-0.5 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
          <div className="min-w-0 flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide drop-shadow">Your location</span>
            <span className="flex items-center gap-1 text-xs text-white/85 mt-0.5 drop-shadow">
              <span className="truncate">{locationLabel}</span>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-center ml-3">
          {isLoggedIn ? (
            <button
              aria-label="Open profile"
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-white/80 bg-white text-[10px] font-black text-[#15171C] shadow-md"
              onClick={onOpenProfile}
              type="button"
            >
              {profileImage ? (
                <img className="h-full w-full object-cover" src={profileImage} alt="" />
              ) : (
                <span>{profileInitials}</span>
              )}
            </button>
          ) : (
            <button
              className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-[#15171C] shadow-md"
              onClick={openLogin}
              type="button"
            >
              Login
            </button>
          )}
        </div>
      </div>

      <div className="relative min-w-0">
        <form
          className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-md"
          onSubmit={submitSearch}
        >
          <button
            aria-label="Search services"
            className="grid h-5 w-5 shrink-0 place-items-center text-slate-400"
            type="submit"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          <input
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 font-medium"
            placeholder={typingPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 150)}
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600"
              onClick={clearSearch}
              type="button"
            >
              x
            </button>
          )}
        </form>
        {searchSuggestionsDropdown}
      </div>
    </div>
  )

  return (
    <>
      {Array.isArray(mobileBannerSlides) && mobileBannerSlides.length > 0 ? (
        <MobilePromoCarousel overlayTop={mobileHeroOverlay} slides={mobileBannerSlides} />
      ) : null}

      <nav className={`${hasMobileHero && mobileBannerSlides?.length ? 'hidden lg:block' : ''} sticky top-0 z-20 ${mobileNavTitle ? 'bg-white border-b border-blue-100 shadow-sm' : 'bg-[#15171C]'} lg:bg-white lg:border-b lg:border-blue-100 lg:shadow-md`}>
        <div className={`mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-3 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-2 lg:gap-2 ${!mobileNavTitle && (mobileBanner || mobileBannerSlides?.length) ? 'pb-2 lg:pb-2' : 'pb-3'}`}>
          
          {/* MOBILE TOP ROW */}
          <div className="flex items-center justify-between lg:hidden min-h-[32px]">
            {mobileNavTitle ? (
              <div className="flex items-center gap-3 w-full">
                <button className="p-1 -ml-1 text-[#003F86]" onClick={onMobileBack} type="button">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-lg font-black text-[#003F86] truncate">{mobileNavTitle}</h1>
              </div>
            ) : (
              <>
                <button className="flex min-w-0 flex-1 items-start gap-2.5 text-left" onClick={() => setIsLocationModalOpen(true)} type="button">
                  <svg className="w-5 h-5 text-white shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                  </svg>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-md font-bold text-white tracking-wide">Your location</span>
                    <span className="flex items-center gap-1 text-sm text-slate-300 mt-0.5">
                      <span className="truncate">{locationLabel}</span>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </button>

                <div className="flex shrink-0 items-center ml-4">
                  {isLoggedIn ? (
                    <button
                      aria-label="Open profile"
                      className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-slate-600 bg-slate-800 text-[10px] font-black text-white bg-white"
                      onClick={onOpenProfile}
                      type="button"
                    >
                      {profileImage ? (
                        <img className="h-full w-full object-cover" src={profileImage} alt="" />
                      ) : (
                        <span>{profileInitials}</span>
                      )}
                    </button>
                  ) : (
                    <button
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#15171C]"
                      onClick={openLogin}
                      type="button"
                    >
                      Login
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* DESKTOP LOGO */}
          <div className="hidden lg:flex items-center justify-between gap-3 lg:contents">
            <button className="hidden min-w-0 items-center gap-3 text-left lg:flex shrink-0" onClick={onBackHome} type="button">
              <img src="/logo2.png" alt="logo" className="w-[224px] object-contain" />
            </button>
          </div>

          {/* SEARCH & DESKTOP LOCATION */}
          <div className={`${mobileNavTitle ? 'hidden lg:grid' : 'grid'} w-full grid-cols-1 gap-2 lg:max-w-3xl lg:grid-cols-[280px_1fr] lg:gap-3`}>
            <button
              className="hidden min-w-0 items-center justify-center gap-2 rounded-md border border-blue-900 bg-white px-2.5 py-2 text-left shadow-sm hover:border-green-900 lg:order-1 lg:flex lg:justify-between lg:px-4 lg:py-2.5"
              onClick={() => setIsLocationModalOpen(true)}
              type="button"
            >
              <span className="hidden min-w-0 lg:block">
                <span className="block truncate text-sm font-semibold">{locationLabel}</span>
              </span>
              <span className="hidden shrink-0 text-xs font-bold lg:block lg:text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-blue-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"
                  />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
            </button>

            <div className="relative min-w-0 lg:order-2">
              <form
                className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm lg:border lg:border-blue-900 lg:rounded-md lg:px-4 focus-within:ring-2 focus-within:ring-[#003F86] lg:focus-within:border-[#67B529] lg:focus-within:ring-0"
                onSubmit={submitSearch}
              >
                <button
                  aria-label="Search services"
                  className="grid h-5 w-5 shrink-0 place-items-center text-slate-400 lg:h-7 lg:w-7 lg:text-blue-700 lg:hover:bg-blue-50 lg:rounded-md"
                  type="submit"
                >
                  <svg className="w-4 h-4 lg:w-4 lg:h-4 lg:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span className="hidden lg:block relative h-4 w-4 rounded-full border-2 border-current after:absolute after:-bottom-1 after:-right-1 after:h-2 after:w-0.5 after:rotate-[-45deg] after:rounded-full after:bg-current" />
                </button>
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 lg:placeholder:text-blue-700 font-medium lg:font-normal"
                  placeholder={typingPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                />
                {searchQuery && (
                  <button
                    aria-label="Clear search"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 lg:h-7 lg:w-7 lg:bg-blue-700 lg:text-white"
                    onClick={clearSearch}
                    type="button"
                  >
                    x
                  </button>
                )}
              </form>
              {searchSuggestionsDropdown}
            </div>
          </div>

          {/* DESKTOP RIGHT */}
          <div className="hidden shrink-0 items-center gap-2 text-sm font-semibold lg:flex lg:order-3">
            {onOpenCart && (
              <button
                aria-label="Open cart"
                className="relative hidden h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white text-[#003F86] shadow-sm transition hover:border-[#67B529] hover:bg-blue-50 lg:grid"
                onClick={onOpenCart}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 7H6" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#67B529] px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <button
                  aria-label="Open profile"
                  className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-blue-200 bg-blue-50 text-sm font-black text-[#003F86] shadow-sm ring-2 ring-white transition hover:border-[#67B529] hover:bg-blue-100"
                  onClick={onOpenProfile}
                  type="button"
                >
                  {profileImage ? (
                    <img className="h-full w-full object-cover" src={profileImage} alt="" />
                  ) : (
                    <span>{profileInitials}</span>
                  )}
                </button>
                <button
                  className="hidden lg:block rounded-md border border-blue-900 bg-blue-900 px-2 py-2 text-xs font-bold text-white transition hover:border-[#67B529] hover:bg-[#67B529] sm:px-3 sm:text-sm"
                  onClick={onLogout}
                  type="button"
                >
                  Logout
                </button>
              </div>
            )}
            {!isLoggedIn && (
              <button
                className="rounded-md bg-blue-900 px-3 py-2 text-white hover:bg-[#67B529] lg:px-4"
                onClick={openLogin}
                type="button"
              >
                Login
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* Legacy mobile banner slot (non-CRUD fallback) */}
      {!mobileNavTitle && mobileBanner && !(mobileBannerSlides?.length) ? (
        <div className="bg-[#15171C] px-4 pb-3 lg:hidden">
          {mobileBanner}
        </div>
      ) : null}

      {isGuestAuthOpen ? (
        <MobileTabletGuestAuthBottomSheet
          onAuthenticated={async (session) => {
            await onLogin?.(session)
            setIsGuestAuthOpen(false)
          }}
          onClose={() => setIsGuestAuthOpen(false)}
          subtitle="Enter your email or mobile number to login or create an account."
          title="Login or Sign up"
        />
      ) : null}

      {authMode && (
        <AuthModal
          defaultMode={authMode}
          onClose={() => setAuthMode(null)}
          onLogin={(user) => onLogin?.(user)}
          onOpenBecomeProvider={() => {
            setAuthMode(null)
            onOpenBecomeProvider?.()
          }}
        />
      )}

      {isLocationModalOpen && (
        <LocationModal
          currentLocation={locationLabel}
          onClose={() => setIsLocationModalOpen(false)}
          onLocationSelect={updateLocationLabel}
        />
      )}
    </>
  )
}

export default Navbar
