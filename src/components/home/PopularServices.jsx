function PopularServices({ content, services = [], onSearch }) {
  const popularSearches = services
    .flatMap((service) => [service.name, ...(service.includes || [])])
    .filter(Boolean)
    .slice(0, 8)

  if (!popularSearches.length) return null

  return (
    <section id="popular" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">{content?.subtitle || 'Popular right now'}</p>
            <h2 className="mt-2 text-3xl font-bold">{content?.title || 'Book trusted experts near you'}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {popularSearches.map((item) => (
              <button
                key={item}
                className="rounded-md border border-blue-100 px-4 py-3 text-sm font-semibold hover:bg-blue-50"
                onClick={() => onSearch?.(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default PopularServices
