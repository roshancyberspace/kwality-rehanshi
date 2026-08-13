function PopularServices({ content, services = [], onSearch }) {
  const popularSearches = services
    .flatMap((service) => [service.name, ...(service.includes || [])])
    .filter(Boolean)
    .slice(0, 8)

  if (!popularSearches.length) return null

  return (
    <section id="popular" className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 sm:text-sm">
        {content?.subtitle || 'Popular right now'}
      </p>
      <h2 className="mt-1.5 text-2xl font-bold text-[#003F86] sm:text-3xl">
        {content?.title || 'Book trusted experts near you'}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-2.5">
        {popularSearches.map((item) => (
          <button
            key={item}
            className="whitespace-nowrap rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#003F86] transition hover:border-[#67B529] hover:bg-[#EEF9E8] sm:px-3.5 sm:py-2 sm:text-sm"
            onClick={() => onSearch?.(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  )
}

export default PopularServices
