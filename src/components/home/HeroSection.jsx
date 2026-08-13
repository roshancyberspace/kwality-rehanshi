import { useState } from 'react';
import ServiceQuickCard from "./ServiceQuickCard";

const getStats = (services) => {
  const ratings = services
    .map((service) => Number(service.rating))
    .filter(Boolean);
  const averageRating = ratings.length
    ? (
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      ).toFixed(1)
    : "4.8";

  return [
    { value: averageRating, label: "Service rating" },
    { value: `${services.length}+`, label: "Live services" },
    { value: "Live", label: "Admin managed" },
  ];
};

function HeroSection({
  content,
  services: liveServices = [],
  onOpenServiceDetails,
}) {
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);

  const handleServiceSelect = (service) => {
    onOpenServiceDetails?.(service);
  };
  const stats = content?.metadata?.stats?.length
    ? content.metadata.stats
    : getStats(liveServices);
  const heroImages = [
    content?.image,
    ...(content?.metadata?.images || []),
    ...liveServices.map((service) => service.image),
  ]
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="mx-auto grid max-w-7xl gap-8 overflow-x-hidden px-4 pt-8 pb-10 sm:pt-10 sm:pb-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8 lg:gap-10 lg:px-6 lg:pt-12 lg:pb-14">
      <div className="flex flex-col justify-center">
        {/* <p className="mb-4 text-sm font-semibold uppercase text-blue-700">Expert home services</p> */}
        <h1 className="max-w-xl text-3xl sm:text-4xl lg:text-[40px] font-extrabold leading-tight text-[#67B529] tracking-tight">
          {content?.title || "Quality Home services in Lucknow"}
        </h1>
        {content?.subtitle && (
          <p className="mt-3 max-w-lg font-normal text-sm sm:text-base leading-6 text-slate-600">
            {content.subtitle}
          </p>
        )}

        <div className="mt-6 max-w-[560px] rounded-2xl border border-slate-200/70 bg-white p-5 lg:p-6 shadow-sm">
          <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6">
            {liveServices.slice(0, liveServices.length > 9 ? 8 : 9).map((service) => (
              <ServiceQuickCard
                key={service.name}
                service={service}
                onSelect={() => handleServiceSelect(service)}
              />
            ))}

            {liveServices.length > 9 && (
              <button 
                className="group flex flex-col items-center text-center transition duration-200 hover:-translate-y-0.5 focus:outline-none" 
                onClick={() => setIsAllModalOpen(true)} 
                type="button"
              >
                <span className="flex h-15 w-15 sm:h-16 sm:w-16 items-center justify-center overflow-hidden p-2 transition-transform duration-200">
                  <svg className="w-7 h-7 text-[#003F86] transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
                  </svg>
                </span>
                <span className="relative mt-2 block max-w-[125px] pb-1 text-[13px] sm:text-sm font-normal sm:font-medium text-slate-700 leading-tight transition-colors duration-200 group-hover:text-[#003F86]">
                  All Services
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#003F86] transition-all duration-300 ease-out group-hover:w-full"></span>
                </span>
              </button>
            )}
          </div>
        </div>

        {isAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-modal-fade">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl animate-modal-slide">
              <div className="sticky top-0 -mx-6 mb-3 border-b border-slate-300 flex items-center justify-between bg-white px-6 py-3 z-10">
                <h2 className="text-2xl font-black text-[#003F86]">All Services</h2>
                <button 
                  onClick={() => setIsAllModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-900 transition hover:bg-blue-100 font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-8 pt-6 pb-2">
                {liveServices.map((service) => (
                  <ServiceQuickCard
                    key={service.name}
                    service={service}
                    onSelect={() => {
                      setIsAllModalOpen(false);
                      handleServiceSelect(service);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* <div className="mt-6 grid max-w-[520px] grid-cols-3 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm lg:mt-8">
          {stats.map((item) => (
            <div
              className="border-r border-blue-100 px-3 py-4 text-center last:border-r-0"
              key={item.label}
            >
              <div className="mx-auto mb-2 h-1.5 w-8 rounded-full bg-[#67B529]" />
              <p className="text-2xl font-black leading-none text-blue-950 lg:text-3xl">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-semibold leading-4 font-mono text-blue-950 sm:text-sm">
                {item.label}
              </p>
            </div>
          ))}
        </div> */}
      </div>

      <div className="hidden h-[380px] md:grid md:h-[420px] lg:h-[460px] xl:h-[480px] grid-cols-2 gap-3 lg:gap-4">
        {/* Top Large Image */}
        <div className="col-span-2 overflow-hidden rounded-2xl shadow-md group border border-slate-100">
          {heroImages[0] && (
            <img
              src={heroImages[0]}
              alt={content?.title || "Featured"}
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          )}
        </div>

        {/* Bottom Left */}
        <div className="overflow-hidden rounded-2xl shadow-md group border border-slate-100">
          {heroImages[1] && (
            <img
              src={heroImages[1]}
              alt={content?.title || "Service"}
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          )}
        </div>

        {/* Bottom Right */}
        <div className="overflow-hidden rounded-2xl shadow-md group border border-slate-100">
          {heroImages[2] && (
            <img
              src={heroImages[2]}
              alt={content?.title || "Service"}
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
