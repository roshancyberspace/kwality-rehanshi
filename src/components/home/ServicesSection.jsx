import { useEffect, useRef } from "react";

function ServicesSection({
  content,
  packages = [],
  services = [],
  onOpenPackageDetails,
  onOpenServiceDetails,
  onShowServices,
}) {
  const scrollRef = useRef(null);
  const intervalRef = useRef(null);

  const displayPackages = (packages || []).slice(0, 20);

  const scrollNext = () => {
    const row = scrollRef.current;
    if (!row) return;
    const card = row.querySelector("[data-package-card]");
    if (!card) return;
    const gap = 20;
    const scrollAmount = card.offsetWidth + gap;
    const maxScroll = row.scrollWidth - row.clientWidth;

    if (row.scrollLeft >= maxScroll - 10) {
      row.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      row.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollPrev = () => {
    const row = scrollRef.current;
    if (!row) return;
    const card = row.querySelector("[data-package-card]");
    if (!card) return;
    const gap = 20;
    const scrollAmount = card.offsetWidth + gap;

    if (row.scrollLeft <= 10) {
      row.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
    } else {
      row.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    if (displayPackages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      scrollNext();
    }, 3500);
  };

  const stopAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [displayPackages.length]);

  if (!displayPackages || displayPackages.length === 0) {
    return null;
  }

  const handleCardClick = (pkg) => {
    if (onOpenPackageDetails) {
      onOpenPackageDetails(pkg, pkg.parentService);
    } else if (onOpenServiceDetails && pkg.parentService) {
      onOpenServiceDetails(pkg.parentService);
    }
  };

  return (
    <section id="new-and-noteworthy" className="bg-white pt-2 pb-2 sm:pt-5 sm:pb-4 block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF9E8] px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-[#4E9B1F] border border-[#67B529]/25 mb-1 sm:mb-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4E9B1F] animate-pulse" />
              <span>NEW ARRIVALS</span>
            </div>

            <h2 className="text-[22px] sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
              New and <span className="text-[#0066FF]">noteworthy</span>
            </h2>

            {/* Subtitle: Hidden on mobile view */}
            <p className="hidden sm:block mt-1.5 text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              {content?.description || "Explore our newly added service packages crafted to deliver the best experience."}
            </p>
          </div>

          {/* Circular Navigation Arrow Buttons: Hidden on mobile view */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              onClick={scrollPrev}
              type="button"
              aria-label="Previous"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow active:scale-95 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6" />
              </svg>
            </button>

            <button
              onClick={scrollNext}
              type="button"
              aria-label="Next"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow active:scale-95 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative mt-3 sm:mt-6"
          onMouseEnter={stopAutoSlide}
          onMouseLeave={startAutoSlide}
          onTouchStart={stopAutoSlide}
          onTouchEnd={startAutoSlide}
        >
          {/* Slider */}
          <div
            ref={scrollRef}
            className="
            flex
            gap-3.5 sm:gap-5 lg:gap-6
            overflow-x-auto
            scroll-smooth
            py-1.5 px-0.5
            snap-x
            snap-mandatory
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
            "
          >
            {displayPackages.map((pkg, index) => {
              const packageImage = pkg.image || pkg.parentService?.image || "/placeholder-service.jpg";
              return (
                <div
                  key={pkg.id || `${pkg.name}-${index}`}
                  data-package-card
                  className="w-[175px] sm:w-[220px] md:w-[245px] lg:w-[calc((100%-72px)/4)] flex-none snap-start"
                >
                  <div
                    onClick={() => handleCardClick(pkg)}
                    className="group flex flex-col cursor-pointer text-left"
                  >
                    {/* Pure Image Container */}
                    <div className="relative aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                      <img
                        src={packageImage}
                        alt={pkg.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                    </div>

                    {/* Image ke just neeche uska naam */}
                    <h3 className="mt-2 text-[14px] sm:text-[15px] lg:text-[16px] font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-[#0066FF] transition-colors">
                      {pkg.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;