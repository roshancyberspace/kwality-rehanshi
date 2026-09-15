const normalizeText = (value = '') => String(value || '').toLowerCase().trim()

const toNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

// Check word boundary or exact token match (prevents 'ac' from matching 'pack', 'face', 'waxing')
const matchesWord = (text = '', keyword = '') => {
  const cleanKeyword = normalizeText(keyword)
  if (!cleanKeyword) return false
  const cleanText = normalizeText(text)
  
  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(^|[\\s_\\-/,.;:()&+])` + escaped + `([\\s_\\-/,.;:()&+]|$)`, 'i')
  return regex.test(cleanText)
}

const getItemSearchBlob = (item) => {
  return [
    item.category?.slug,
    item.category?.name,
    item.parentService?.category?.slug,
    item.parentService?.category?.name,
    item.parentService?.slug,
    item.parentService?.name,
    item.slug,
    item.name,
    item.description,
    ...(item.includes || item.parentService?.includes || item.included || []),
  ].filter(Boolean).map(normalizeText).join(' ')
}

const getItemCategoryText = (item) => {
  return [
    item.category?.slug,
    item.category?.name,
    item.parentService?.category?.slug,
    item.parentService?.category?.name,
    item.parentService?.slug,
    item.parentService?.name,
  ].filter(Boolean).map(normalizeText).join(' ')
}

export const matchesCategoryOrKeywords = (item, { categorySlugs = [], excludeSlugs = [], keywords = [] }) => {
  const categoryText = getItemCategoryText(item)
  const fullBlob = getItemSearchBlob(item)

  // 1. If item matches any excluded category, reject immediately
  if (excludeSlugs.length > 0) {
    const isExcluded = excludeSlugs.some((ex) => {
      const cleanEx = normalizeText(ex)
      return categoryText.includes(cleanEx) || matchesWord(item.parentService?.name || '', cleanEx)
    })
    if (isExcluded) return false
  }

  // 2. If target category slugs are specified, check if item belongs to that category
  if (categorySlugs.length > 0) {
    const matchesCategory = categorySlugs.some((cat) => {
      const cleanCat = normalizeText(cat)
      return categoryText.includes(cleanCat) || matchesWord(item.parentService?.name || '', cleanCat)
    })
    if (matchesCategory) return true
  }

  // 3. If keywords are specified, check exact word matches in search blob
  if (keywords.length > 0) {
    return keywords.some((kw) => matchesWord(fullBlob, kw))
  }

  return false
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

export const selectSectionServices = ({
  categorySlugs = [],
  content,
  excludeSlugs = [],
  fallbackKeywords = [],
  limit = 10,
  services = [],
}) => {
  const metadata = content?.metadata || {}
  const parsedLimit = toNumber(metadata.limit, limit)
  const sectionLimit = parsedLimit <= 4 ? 8 : parsedLimit
  const manualIds = Array.isArray(metadata.service_ids) ? metadata.service_ids.map(String) : []

  const allPackages = services.flatMap((service) =>
    (service.packages || []).map((pkg) => ({
      ...pkg,
      isPackage: true,
      parentService: service,
    }))
  );

  const filterOptions = {
    categorySlugs: Array.isArray(metadata.category_slugs) && metadata.category_slugs.length ? metadata.category_slugs : categorySlugs,
    excludeSlugs: Array.isArray(metadata.exclude_slugs) && metadata.exclude_slugs.length ? metadata.exclude_slugs : excludeSlugs,
    keywords: Array.isArray(metadata.keywords) && metadata.keywords.length ? metadata.keywords : fallbackKeywords,
  };

  const isMatching = (item) => {
    // If no category/keywords constraints given (e.g. Most Booked), match everything
    if (!filterOptions.categorySlugs.length && !filterOptions.excludeSlugs.length && !filterOptions.keywords.length) {
      return true;
    }
    return matchesCategoryOrKeywords(item, filterOptions);
  };

  // If manual IDs specified from Admin Panel
  if (manualIds.length && metadata.mode !== 'auto') {
    const result = manualIds
      .map((id) => allPackages.find((pkg) => String(pkg.id) === id) || services.find((service) => String(service.id) === id))
      .filter(Boolean)
      .filter(isMatching);

    if (result.length > 0) {
      return result.slice(0, sectionLimit);
    }
  }

  // 1. Filter packages strictly matching category / keywords
  const matchedPackages = allPackages.filter(isMatching);
  let result = sortByBookings(matchedPackages);

  // 2. If needed, fallback to matching parent services (only matching the same category)
  if (result.length < sectionLimit) {
    const matchedServices = services.filter(isMatching);
    const fallbackServices = sortByBookings(matchedServices.filter((s) => !result.some((r) => String(r.id) === String(s.id))));
    result = [...result, ...fallbackServices];
  }

  return result.slice(0, sectionLimit);
}
