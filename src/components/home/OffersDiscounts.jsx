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
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      {/* Heading */}
      <div className="mb-6 w-full">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#67B529]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#67B529] mb-2 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#67B529]"></span>
          {content?.subtitle || "Exclusive Deals"}
        </span>

        <div className="flex flex-row items-center justify-between gap-4 w-full">
          <h2 className="text-2xl font-black text-[#003F86] sm:text-3xl md:text-4xl tracking-tight leading-tight">
            {content?.title || "Offers & Discounts"}
          </h2>
          {onShowServices && (
            <button
              onClick={onShowServices}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#67B529] px-5 py-2 text-xs md:text-sm font-extrabold text-white shadow-md transition duration-200 hover:bg-[#579c21] hover:scale-105 shrink-0"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
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
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {offers.map((offer) => (
            <article
              key={offer.code}
              className="group relative h-60 w-[75%] flex-none snap-start overflow-hidden rounded-3xl shadow-xl sm:w-[420px] lg:w-[calc((100%-2rem)/3)]"
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
              <div className="relative flex h-full flex-col justify-end p-6">
                <div className="mb-3 inline-flex w-fit rounded-full bg-[#67B529] px-4 py-1 text-xs font-bold tracking-wider text-white shadow">
                  {offer.code}
                </div>

                <h3 className="text-3xl font-bold text-white">
                  {offer.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/90">
                  {offer.text}
                </p>

                <button className="mt-5 w-fit rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[#003F86] transition hover:bg-[#67B529] hover:text-white">
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