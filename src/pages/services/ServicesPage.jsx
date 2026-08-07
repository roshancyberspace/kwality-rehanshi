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

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#003F86]">
            {normalizedSearchQuery ? `Search Results for "${searchQuery}"` : 'All Services'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {visibleServices.map((service) => (
              <button
                key={service.id || service.slug || service.name}
                type="button"
                onClick={() => handleServiceClick(service)}
                className="group flex flex-col items-center justify-center p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#003F86] hover:shadow-lg transition-all duration-300 cursor-pointer focus:outline-none"
              >
                <div className="w-20 h-20 sm:w-20 sm:h-20 mb-4 bg-[#F6FAFF] flex items-center justify-center  group-hover:bg-blue-50 transition-colors">
                  <img
                    src={service.image || '/sofacleing.png'}
                    alt={service.name}
                    className="w-15 h-15 sm:w-12 sm:h-12 object-contain transform group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-800 text-center leading-tight group-hover:text-[#003F86] transition-colors">
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
