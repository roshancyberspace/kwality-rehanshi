import { useEffect, useRef, useState } from "react";
import ServiceCircleCard from "./ServiceCircleCard";

function ServicesSection({
  content,
  services = [],
  onOpenServiceDetails,
  onShowServices,
}) {
  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);

  const totalPages = Math.max(1, services.length > 4 ? services.length - 3 : 1);

  const updateActiveDot = () => {
    const row = scrollRef.current;
    if (!row) return;
    const card = row.querySelector("[data-service-card]");
    if (!card) return;
    const gap = 24;
    const cardWidth = card.offsetWidth + gap;
    const currentIdx = Math.round(row.scrollLeft / cardWidth);
    setActiveDot(Math.min(totalPages - 1, Math.max(0, currentIdx)));
  };

  const scrollToPage = (pageIndex) => {
    const row = scrollRef.current;
    if (!row) return;
    const card = row.querySelector("[data-service-card]");
    if (!card) return;
    const gap = 24;
    const cardWidth = card.offsetWidth + gap;
    row.scrollTo({
      left: pageIndex * cardWidth,
      behavior: "smooth",
    });
    setActiveDot(pageIndex);
  };

  const scrollNext = () => {
    const row = scrollRef.current;
    if (!row) return;
    const card = row.querySelector("[data-service-card]");
    if (!card) return;
    const gap = 24;
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
    const card = row.querySelector("[data-service-card]");
    if (!card) return;
    const gap = 24;
    const scrollAmount = card.offsetWidth + gap;

    if (row.scrollLeft <= 10) {
      row.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
    } else {
      row.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    intervalRef.current = setInterval(() => {
      scrollNext();
    }, 4000);
  };

  const stopAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [services.length]);

  return (
    <section id="services" className="hidden bg-white py-12 lg:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Custom Reference Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF9E8] px-3 py-1 text-xs font-bold text-[#4E9B1F] border border-[#67B529]/25 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4E9B1F]" />
              <span>OUR SERVICES</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
              What are you <span className="text-[#0066FF]">looking for?</span>
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              {content?.description || "Choose from our wide range of medical services provided by experienced specialists."}
            </p>
          </div>

          <button
            onClick={onShowServices}
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#4E9B1F] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-md transition duration-200 hover:bg-[#43871b] hover:scale-105 shrink-0 cursor-pointer"
          >
            <span>View All Services</span>
            <span>→</span>
          </button>
        </div>

        {/* Carousel Container */}
        <div
          className="relative mt-8"
          onMouseEnter={stopAutoSlide}
          onMouseLeave={startAutoSlide}
        >
          {/* Previous Button - Green and positioned far outside */}
          <button
            onClick={scrollPrev}
            aria-label="Previous services"
            className="absolute -left-6 lg:-left-10 xl:-left-12 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#4E9B1F] text-white shadow-lg shadow-[#4E9B1F]/30 transition-all duration-200 hover:bg-[#3f8018] hover:scale-110 active:scale-95 lg:flex cursor-pointer border border-white/20"
            type="button"
          >
            <svg className="h-5 w-5 stroke-[2.5]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Slider - Exactly 4 cards visible without cutting */}
          <div
            ref={scrollRef}
            onScroll={updateActiveDot}
            className="
            flex
            gap-6
            overflow-x-auto
            scroll-smooth
            py-4 px-0.5
            snap-x
            snap-mandatory
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
            "
          >
            {services.map((service, index) => (
              <div
                key={service.name || index}
                data-service-card
                className="w-[calc(50%-12px)] sm:w-[calc((100%-48px)/3)] lg:w-[calc((100%-72px)/4)] flex-none snap-start h-full"
              >
                <ServiceCircleCard
                  index={index}
                  service={service}
                  onSelect={() =>
                    onOpenServiceDetails(service)
                  }
                />
              </div>
            ))}
          </div>

          {/* Next Button - Green and positioned far outside */}
          <button
            onClick={scrollNext}
            aria-label="Next services"
            className="absolute -right-6 lg:-right-10 xl:-right-12 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#4E9B1F] text-white shadow-lg shadow-[#4E9B1F]/30 transition-all duration-200 hover:bg-[#3f8018] hover:scale-110 active:scale-95 lg:flex cursor-pointer border border-white/20"
            type="button"
          >
            <svg className="h-5 w-5 stroke-[2.5]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Carousel Pagination Dots */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center items-center gap-2">
            {Array.from({ length: totalPages }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => scrollToPage(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  dotIdx === activeDot
                    ? "w-6 h-2 bg-[#0066FF]"
                    : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                }`}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ServicesSection;