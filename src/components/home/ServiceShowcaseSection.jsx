import { useRef } from 'react';

function ServiceShowcaseSection({
  buttonText = 'View All',
  description,
  eyebrow,
  items = [],
  onExplore,
  onItemSelect,
  title,
}) {
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -(clientWidth * 0.75) : (clientWidth * 0.75);
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="bg-white py-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Title & Navigation Arrows */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#1D1D1D] leading-tight">
            {title}
          </h2>

          {items.length > 5 && (
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-neutral-700 transition duration-200 hover:bg-neutral-100 hover:border-neutral-400 focus:outline-none"
                aria-label="Previous"
              >
                <span className="text-base font-medium">
                  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M22 12H3" />
  <path d="M7 9L3 12L7 15" />
</svg>
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-neutral-700 transition duration-200 hover:bg-neutral-100 hover:border-green-400 focus:outline-none"
                aria-label="Next"
              >
                <span className="text-base font-medium">
                  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  
  <path d="M2 12H21" />
  
  <path d="M17 9L21 12L17 15" />
</svg>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Carousel / 5-Column Cards Grid */}
        <div 
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
        >
          {items.map((item, idx) => (
            <article
              onClick={() => onItemSelect?.(item.service)}
              className="group shrink-0 w-[210px] sm:w-[230px] lg:w-[calc((100%-80px)/5)] snap-start flex flex-col cursor-pointer bg-transparent"
              key={`${item.title}-${idx}`}
            >
              {/* Card Image */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                />
              </div>

              {/* Card Details Below Image */}
              <div className="mt-3 flex flex-col gap-1 pr-1">
                <h3 className="text-[15px] sm:text-[16px] font-medium leading-snug text-[#1A1A1A] group-hover:text-blue-600 line-clamp-2 transition-colors duration-200">
                  {item.title}
                </h3>

                {/* Rating & Review Count */}
                <div className="flex items-center gap-1 text-xs sm:text-[13px] text-[#555555]">
                  <span className="text-[#1D1D1D] text-[11px] font-semibold">★</span>
                  <span className="font-medium text-[#222222]">{item.rating || '4.75'}</span>
                  <span>({item.reviews || '204K'})</span>
                </div>

                {/* Price */}
                <div className="mt-0.5 flex items-center gap-2 text-sm sm:text-[15px] text-[#1D1D1D]">
                  <span className="font-medium text-[#1A1A1A]">
                    {item.price || '₹499'}
                  </span>
                  {item.originalPrice && (
                    <span className="text-[13px] font-normal text-[#888888] line-through">
                      {item.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServiceShowcaseSection;
