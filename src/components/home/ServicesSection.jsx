import { useEffect, useRef } from "react";
import SectionHeader from "../common/SectionHeader";
import ServiceCircleCard from "./ServiceCircleCard";

function ServicesSection({
  content,
  services = [],
  onOpenServiceDetails,
  onShowServices,
}) {
  const scrollRef = useRef(null);
  const intervalRef = useRef(null);

  const scrollNext = () => {
    const row = scrollRef.current;

    if (!row) return;

    const card = row.querySelector("[data-service-card]");

    if (!card) return;

    const gap = 24;

    const scrollAmount = card.offsetWidth + gap;

    const maxScroll = row.scrollWidth - row.clientWidth;

    if (row.scrollLeft >= maxScroll - scrollAmount) {
      row.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    } else {
      row.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollPrev = () => {
    const row = scrollRef.current;

    if (!row) return;

    const card = row.querySelector("[data-service-card]");

    if (!card) return;

    const gap = 24;

    const scrollAmount = card.offsetWidth + gap;

    if (row.scrollLeft <= 0) {
      row.scrollTo({
        left: row.scrollWidth,
        behavior: "smooth",
      });
    } else {
      row.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const startAutoSlide = () => {
    stopAutoSlide();

    intervalRef.current = setInterval(() => {
      scrollNext();
    }, 3000);
  };

  const stopAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    startAutoSlide();

    return () => stopAutoSlide();
  }, []);

  return (
    <section
      id="services"
      className="hidden bg-white py-10 lg:block"
    >
      <div className="mx-auto max-w-7xl px-4">

        <SectionHeader
          eyebrow="OUR SERVICES"
          title={
            content?.title ||
            "Professional Healthcare Services"
          }
          description="Choose from our wide range of medical services provided by experienced specialists."
          action={
            <button
              onClick={onShowServices}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#67B529] px-5 py-2 text-xs md:text-sm font-extrabold text-white shadow-md transition duration-200 hover:bg-[#579c21] hover:scale-105 shrink-0"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          }
        />

        <div
          className="relative mt-8"
          onMouseEnter={stopAutoSlide}
          onMouseLeave={startAutoSlide}
        >

          {/* Previous */}

          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition hover:bg-[#67B529] hover:text-white lg:flex"
          >
            ❮
          </button>

          {/* Slider */}

          <div
            ref={scrollRef}
            className="
            flex
            gap-6
            overflow-x-auto
            scroll-smooth
            px-4 py-4 lg:px-16 lg:py-5
            snap-x
            snap-mandatory
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
            "
          >
            {services.map((service) => (
              <div
                key={service.name}
                data-service-card
                className="w-[calc(50%-12px)] sm:w-[calc((100%-48px)/3)] lg:w-[calc((100%-72px)/4)] flex-none snap-start h-full"
              >
                <ServiceCircleCard
                  service={service}
                  onSelect={() =>
                    onOpenServiceDetails(service)
                  }
                />
              </div>
            ))}
          </div>

          {/* Next */}

          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition hover:bg-[#67B529] hover:text-white lg:flex"
          >
            ❯
          </button>
        </div>

        <div className="mt-10 text-center md:hidden">
          <button
            onClick={onShowServices}
            className="rounded-full bg-[#67B529] px-8 py-3 font-semibold text-white"
          >
            View All Services
          </button>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;