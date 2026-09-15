import HeroSection from '../../components/home/HeroSection'
import MakeupServices from '../../components/home/MakeupServices'
import MostBookedServices from '../../components/home/MostBookedServices'
import OffersDiscounts from '../../components/home/OffersDiscounts'
import PopularServices from '../../components/home/PopularServices'
import SalonServices from '../../components/home/SalonServices'
import ServicesSection from '../../components/home/ServicesSection'
import TestimonialsSection from '../../components/home/TestimonialsSection'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import ServiceShowcaseSection from '../../components/home/ServiceShowcaseSection'
import { selectSectionServices, serviceToCard } from '../../components/home/serviceSectionUtils'
import { useMemo, useState } from 'react'
import { HomeSkeleton } from '../../components/common/Shimmer'
import SubServicesModal from '../../components/home/SubServicesModal'

function HomePage({
  appSettings,
  isLoggedIn,
  isContentLoading,
  locationLabel,
  categories,
  content = {},
  cartCount,
  coupons,
  mobileBanners = [],
  packageGroups = {},
  servicePackages = [],
  testimonials = [],
  reviews = [],
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenBecomeProvider,
  onOpenCart,
  onOpenProfile,
  onOpenServiceDetails,
  onOpenPackageDetails,
  onSearchSuggestionSelect,
  onShowServices,
  searchSuggestions,
  services,
  user,
}) {
  const hasServices = services?.length || categories?.length
  const [activeModalService, setActiveModalService] = useState(null)

  const newlyAddedPackages = useMemo(() => {
    let list = []
    if (servicePackages && servicePackages.length > 0) {
      list = [...servicePackages]
    } else if (packageGroups && Object.keys(packageGroups).length > 0) {
      list = Object.values(packageGroups).flat()
    } else if (services && services.length > 0) {
      services.forEach((s) => {
        const subServices = s.sub_services || s.subServices || []
        subServices.forEach((sub) => {
          const pkgs = sub.packages || []
          pkgs.forEach((pkg) => {
            list.push({ ...pkg, parentService: s, subService: sub })
          })
        })
        const directPkgs = s.packages || []
        directPkgs.forEach((pkg) => {
          list.push({ ...pkg, parentService: s })
        })
      })
    }

    // Attach parentService and subService if missing
    list = list.map((pkg) => {
      const parent = pkg.parentService || services?.find((s) => String(s.id) === String(pkg.service_id))
      const subList = parent?.sub_services || parent?.subServices || []
      const sub = pkg.subService || subList.find((item) => String(item.id) === String(pkg.sub_service_id))
      return {
        ...pkg,
        parentService: parent,
        subService: sub,
        image: pkg.image || sub?.image || parent?.image,
      }
    })

    // Filter only packages marked as 'Display in New Arrival'
    const newArrivals = list.filter((pkg) => {
      const isMarked = pkg.is_new_arrival === 1 ||
        pkg.is_new_arrival === '1' ||
        pkg.is_new_arrival === true ||
        pkg.is_new_arrival === 'true' ||
        pkg.metadata?.is_new_arrival === 1 ||
        pkg.metadata?.is_new_arrival === true ||
        pkg.metadata?.is_new_arrival === '1'
      const isActive = !pkg.status || String(pkg.status).toLowerCase() === 'active'
      return isMarked && isActive
    })

    // Sort newest/latest first and limit to top 20
    return newArrivals.sort((a, b) => {
      if (b.created_at && a.created_at) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return (Number(b.id) || 0) - (Number(a.id) || 0)
    }).slice(0, 20)
  }, [servicePackages, packageGroups, services])

  const handleServiceClick = (service) => {
    const subServices = service.sub_services || service.subServices || []
    if (subServices.length > 0) {
      setActiveModalService(service)
    } else {
      onOpenServiceDetails(service)
    }
  }

  const handleShowcaseItemClick = (item) => {
    if (item?.packageItem) {
      onOpenPackageDetails?.(item.packageItem, item.service || item.packageItem.parentService)
      return
    }
    if (item?.service) {
      handleServiceClick(item.service)
      return
    }
    handleServiceClick(item)
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        isLoggedIn={isLoggedIn}
        appSettings={appSettings}
        cartCount={cartCount}
        locationLabel={locationLabel}
        mobileBannerSlides={mobileBanners}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenBecomeProvider={onOpenBecomeProvider}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={user}
      />
      {isContentLoading ? (
        <HomeSkeleton />
      ) : (
        <>
          <HeroSection content={content.hero?.[0]} services={services} onOpenServiceDetails={handleServiceClick} />
          {!hasServices && (
        <section className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h1 className="text-3xl font-bold">No frontend services found</h1>
          <p className="mt-3 text-sm text-blue-800">
            Add active categories, services, packages, and coupons from the admin panel.
          </p>
        </section>
          )}
          <OffersDiscounts content={content.offers?.[0]} coupons={coupons} onShowServices={onShowServices} />
          <ServicesSection
            content={content.services_section?.[0]}
            packages={newlyAddedPackages}
            services={services}
            onOpenPackageDetails={onOpenPackageDetails}
            onOpenServiceDetails={handleServiceClick}
            onShowServices={onShowServices}
          />
          <MostBookedServices content={content.most_booked?.[0]} services={services} onOpenServiceDetails={handleShowcaseItemClick} onShowServices={onShowServices} />
          
          {(() => {
            const renderSection = (eyebrow, title, keywords, categorySlugs, excludeSlugs) => {
              const items = selectSectionServices({
                categorySlugs,
                content: {},
                excludeSlugs,
                fallbackKeywords: keywords,
                limit: 8,
                services,
              }).map(serviceToCard);
            
              if (!items?.length) return null;
            
              return (
                <div className="bg-white" key={eyebrow}>
                  <div className="mx-auto max-w-7xl">
                    <ServiceShowcaseSection
                      eyebrow={eyebrow}
                      title={title}
                      items={items}
                      onExplore={onShowServices}
                      onItemSelect={handleShowcaseItemClick}
                    />
                  </div>
                </div>
              );
            };

            return (
              <>
                {renderSection(
                  "AC & Appliance Repair Services",
                  "Top AC & Appliance Repair for you",
                  ['ac', 'appliance', 'refrigerator', 'washing machine', 'microwave', 'air conditioner', 'gas refill', 'foam jet', 'ac service', 'ac repair'],
                  ['ac', 'appliance', 'refrigerator', 'washing-machine', 'microwave'],
                  ['salon', 'spa', 'beauty', 'waxing', 'facial', 'makeup', 'cleaning', 'plumber', 'carpenter', 'painting']
                )}
                {renderSection(
                  "Cleaning Services",
                  "Top Cleaning Services for you",
                  ['cleaning', 'deep clean', 'bathroom clean', 'sofa clean', 'kitchen clean', 'scrubbing', 'home clean', 'mopping', 'degreasing', 'sanitization'],
                  ['cleaning', 'deep-clean', 'bathroom-cleaning', 'sofa-cleaning', 'home-cleaning', 'kitchen-cleaning'],
                  ['salon', 'spa', 'beauty', 'waxing', 'facial', 'makeup', 'ac-appliance', 'ac', 'refrigerator', 'microwave', 'plumber', 'carpenter', 'painting']
                )}
                {renderSection(
                  "Painting Services",
                  "Top Interior Design Services for you",
                  ['painting', 'painter', 'waterproofing', 'wall paint', 'interior design', 'wall decor', 'texture', 'dampness', 'terrace waterproofing'],
                  ['painting', 'water-proofing', 'waterproofing', 'interior', 'wall-decor'],
                  ['salon', 'spa', 'beauty', 'waxing', 'facial', 'makeup', 'ac-appliance', 'ac', 'cleaning', 'bathroom', 'kitchen']
                )}
                {renderSection(
                  "Electrician, Plumber & Carpenter Services",
                  "Top Electrician, Plumber & Carpenter for you",
                  ['electrician', 'plumber', 'carpenter', 'switchboard', 'switchbox', 'wiring', 'geyser', 'drill', 'pipe leakage', 'tap repair', 'furniture', 'socket', 'fan repair', 'lock repair'],
                  ['electrician', 'plumber', 'carpenter', 'electrical', 'plumbing'],
                  ['salon', 'spa', 'beauty', 'waxing', 'facial', 'makeup', 'cleaning', 'painting', 'ac-appliance']
                )}
              </>
            );
          })()}

          <SalonServices content={content.salon_services?.[0]} services={services} onOpenServiceDetails={handleShowcaseItemClick} onShowServices={onShowServices} />
          <MakeupServices content={content.makeup_services?.[0]} services={services} onOpenServiceDetails={handleShowcaseItemClick} onShowServices={onShowServices} />
          <TestimonialsSection items={testimonials} />
          
          <PopularServices content={content.popular_services?.[0]} services={services} onSearch={onGlobalSearch} />
        </>
      )}
      <SubServicesModal
        service={activeModalService}
        onClose={() => setActiveModalService(null)}
        onSelectSubService={(subService, service) => {
          setActiveModalService(null)
          onOpenServiceDetails(service, subService)
        }}
      />
      <Footer appSettings={appSettings} services={services} />
    </main>
  )
}

export default HomePage
