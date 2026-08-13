import React, { useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import SubServicesModal from '../../components/home/SubServicesModal'
import { ServiceCardGridSkeleton } from '../../components/common/Shimmer'
import { formatDisplayName } from '../../utils/displayText'

function ServicesPage({
  appSettings,
  cartCount,
  isLoggedIn,
  isContentLoading = false,
  locationLabel,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onOpenServiceDetails,
  onSearchSuggestionSelect,
  searchQuery = '',
  searchSuggestions,
  services = [],
  user,
}) {
  const [activeModalService, setActiveModalService] = useState(null)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const visibleServices = services.filter((service) => {
    if (normalizedSearchQuery) {
      return [
        service.name,
        service.description,
        ...(service.includes || []),
        ...(service.packages || []).map((item) => item.name),
        ...(service.sub_services || service.subServices || []).map((item) => item.name),
      ].join(' ').toLowerCase().includes(normalizedSearchQuery)
    }
    return true
  })

  const handleServiceClick = (service) => {
    const subServices = service.sub_services || service.subServices || []
    if (subServices.length > 0) {
      setActiveModalService(service)
    } else {
      onOpenServiceDetails?.(service)
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#1D1D1D] flex flex-col">
      <Navbar
        isLoggedIn={isLoggedIn}
        appSettings={appSettings}
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

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-bold text-[#003F86] sm:text-3xl">
              {normalizedSearchQuery ? `Search Results for "${searchQuery}"` : 'All Services'}
            </h1>
            {onBackHome ? (
              <button
                aria-label="Go to homepage"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-[#003F86] shadow-sm transition hover:border-[#67B529] hover:bg-[#EEF9E8] hover:text-[#67B529]"
                onClick={onBackHome}
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Select a service to view details and book.
          </p>
        </div>

        {isContentLoading && <ServiceCardGridSkeleton />}

        {!isContentLoading && !visibleServices.length && (
          <div className="border border-slate-200 py-16 text-center bg-slate-50 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800">No services found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try searching with different keywords.
            </p>
          </div>
        )}

        {!isContentLoading && visibleServices.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
            {visibleServices.map((service) => (
              <button
                key={service.id || service.slug || service.name}
                type="button"
                onClick={() => handleServiceClick(service)}
                className="group flex flex-col items-center rounded-xl border border-slate-100 bg-[#F8FBFF] px-2 py-3 text-center transition duration-200 hover:border-[#003F86]/30 hover:bg-white hover:shadow-md focus:outline-none sm:rounded-2xl sm:border-slate-200 sm:bg-white sm:p-5"
              >
                <div className="mb-2 flex h-14 w-14 items-center justify-center sm:mb-3 sm:h-16 sm:w-16">
                  <img
                    src={service.image || '/sofacleing.png'}
                    alt={service.name}
                    className="h-12 w-12 object-contain transition duration-300 group-hover:scale-110 sm:h-14 sm:w-14"
                  />
                </div>
                <h3 className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-[#003F86] sm:text-sm sm:font-bold">
                  {formatDisplayName(service.name)}
                </h3>
              </button>
            ))}
          </div>
        )}
      </div>

      <SubServicesModal
        service={activeModalService}
        onClose={() => setActiveModalService(null)}
        onSelectSubService={(subService, service) => {
          setActiveModalService(null)
          onOpenServiceDetails?.(service, subService)
        }}
      />

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default ServicesPage
