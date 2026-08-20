const normalizeText = (value = '') => String(value).toLowerCase()

const toNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const matchesKeywords = (item, keywords = []) => {
  if (!keywords.length) return true

  const haystack = [
    item.name,
    item.description,
    item.category?.name,
    item.parentService?.name,
    item.parentService?.description,
    item.parentService?.category?.name,
    ...(item.includes || item.parentService?.includes || item.included || []),
  ].map(normalizeText).join(' ')

  return keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
}

const sortByBookings = (items) => [...items].sort((first, second) => {
  const bookingDifference = toNumber(second.booking_count) - toNumber(first.booking_count)
  if (bookingDifference !== 0) return bookingDifference

  const orderDifference = toNumber(first.sort_order) - toNumber(second.sort_order)
  if (orderDifference !== 0) return orderDifference

  return toNumber(first.id) - toNumber(second.id)
})

export const serviceToCard = (service) => {
  const priceVal = service.isPackage ? (service.price || '') : (service.price || '');
  const cleanPrice = priceVal ? String(priceVal).replace(/\.00$/, '').replace(/[^\d.]/g, '') : '';
  const origVal = service.originalPrice || service.original_price || '';
  const cleanOrig = origVal ? String(origVal).replace(/\.00$/, '').replace(/[^\d.]/g, '') : '';

  const rawReviews = service.metadata?.reviews || service.parentService?.metadata?.reviews || service.jobs || ''
  const reviews = rawReviews ? String(rawReviews).replace(' bookings', '').replace(/[()]/g, '') : ''

  return {
    image: service.image || service.parentService?.image,
    meta: service.duration || service.parentService?.name || '',
    price: cleanPrice ? `Rs.${cleanPrice}` : '',
    originalPrice: cleanOrig && Number(cleanOrig) > Number(cleanPrice) ? `Rs.${cleanOrig}` : '',
    rating: service.rating || service.parentService?.rating || '',
    reviews,
    packageItem: service.isPackage ? service : null,
    service: service.isPackage ? service.parentService : service,
    title: service.name,
  };
}

export const selectSectionServices = ({ content, fallbackKeywords = [], limit = 10, services = [] }) => {
  const metadata = content?.metadata || {}
  const parsedLimit = toNumber(metadata.limit, limit)
  const sectionLimit = parsedLimit <= 4 ? 10 : parsedLimit
  const manualIds = Array.isArray(metadata.service_ids) ? metadata.service_ids.map(String) : []

  const allPackages = services.flatMap((service) =>
    (service.packages || []).map((pkg) => ({
      ...pkg,
      isPackage: true,
      parentService: service,
    }))
  );

  if (manualIds.length && metadata.mode !== 'auto') {
    let result = manualIds
      .map((id) => allPackages.find((pkg) => String(pkg.id) === id) || services.find((service) => String(service.id) === id))
      .filter(Boolean);
      
    if (result.length < sectionLimit) {
      const extraPackages = sortByBookings(allPackages.filter((p) => !result.some((r) => String(r.id) === String(p.id))));
      result = [...result, ...extraPackages];
    }
      
    return result.slice(0, sectionLimit)
  }

  const keywords = Array.isArray(metadata.keywords) && metadata.keywords.length
    ? metadata.keywords
    : fallbackKeywords

  let result = sortByBookings(allPackages.filter((pkg) => matchesKeywords(pkg, keywords)));
  
  if (result.length < sectionLimit) {
    const fallbackServices = sortByBookings(services.filter((service) => matchesKeywords(service, keywords)));
    result = [...result, ...fallbackServices];
  }
  
  return result.slice(0, sectionLimit)
}
