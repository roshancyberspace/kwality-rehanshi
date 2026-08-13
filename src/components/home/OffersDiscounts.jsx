import { useEffect, useRef } from "react";

const couponToOffer = (coupon) => ({
  code: coupon.code,
  title:
    coupon.type === "Percentage"
      ? `${coupon.value}% OFF`
      : `Rs.${coupon.value} OFF`,
  text: coupon.minimum_order
    ? `Use on orders above Rs.${coupon.minimum_order}.`
    : "Limited period offer.",
  image:
    coupon.metadata?.image ||
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
});

function OffersDiscounts({ content, coupons, onShowServices }) {
  const scrollRef = useRef(null);

  const offers = coupons?.length ? coupons.map(couponToOffer) : [];

  // Manual Scroll
  const scrollOffers = (direction) => {
    const row = scrollRef.current;
    if (!row) return;

    const card = row.firstElementChild;
    if (!card) return;

    const scrollAmount = card.offsetWidth + 16;

    row.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  };

  // Auto Slider
  useEffect(() => {
    const row = scrollRef.current;

    if (!row || offers.length <= 1) return;

    const card = row.firstElementChild;
    if (!card) return;

    const scrollAmount = card.offsetWidth + 16;

    const interval = setInterval(() => {
      const maxScroll = row.scrollWidth - row.clientWidth;

      if (row.scrollLeft + scrollAmount >= maxScroll) {
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
    }, 3500);

    return () => clearInterval(interval);
  }, [offers.length]);

  if (!offers.length) return null;

  return (
    <section className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-5 sm:py-12 lg:px-8">
      {/* Heading */}
      <div className="mb-5 w-full min-w-0 sm:mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#67B529]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#67B529] mb-2 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#67B529]"></span>
          {content?.subtitle || "Exclusive Deals"}
        </span>

        <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-xl font-black leading-tight tracking-tight text-[#003F86] sm:text-2xl lg:text-[26px]">
            {content?.title || "Offers & Discounts"}
          </h2>
          {onShowServices && (
            <button
              onClick={onShowServices}
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#67B529] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md transition duration-200 hover:bg-[#579c21] hover:scale-105 sm:px-5 sm:py-2 md:text-sm"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full min-w-0 max-w-full">
        {/* Left Arrow */}
        {offers.length > 1 && (
          <button
            onClick={() => scrollOffers(-1)}
            aria-label="Previous"
            className="absolute left-0 top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:scale-105 lg:flex"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#003F86"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {offers.map((offer) => (
            <article
              key={offer.code}
              className="group relative h-40 w-[260px] max-w-[78vw] flex-none snap-start overflow-hidden rounded-2xl shadow-xl sm:h-44 sm:w-[340px] sm:max-w-none sm:rounded-3xl lg:h-44 lg:w-[calc((100%-2rem)/3)]"
            >
              {/* Background */}
              <img
                src={offer.image}
                alt={offer.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#003F86]/95 via-[#003F86]/75 to-[#67B529]/55"></div>

              {/* Decorative Circle */}
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"></div>

              <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-[#67B529]/20 blur-2xl"></div>

              {/* Content */}
              <div className="relative flex h-full flex-col justify-end gap-1 p-4 sm:gap-1.5 sm:p-5">
                <div className="inline-flex w-fit max-w-full truncate rounded-full bg-[#67B529] px-3 py-0.5 text-[10px] font-bold tracking-wider text-white shadow sm:px-3.5 sm:text-xs">
                  {offer.code}
                </div>

                <h3 className="truncate text-xl font-bold text-white sm:text-2xl">
                  {offer.title}
                </h3>

                <p className="line-clamp-2 text-xs leading-5 text-white/90 sm:text-sm sm:leading-5">
                  {offer.text}
                </p>

                <button className="mt-1 w-fit rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-[#003F86] transition hover:bg-[#67B529] hover:text-white sm:px-4 sm:py-1.5 sm:text-sm">
                  Redeem Offer
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Right Arrow */}
        {offers.length > 1 && (
          <button
            onClick={() => scrollOffers(1)}
            aria-label="Next"
            className="absolute right-0 top-1/2 z-20 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:scale-105 lg:flex"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#003F86"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}

export default OffersDiscounts;