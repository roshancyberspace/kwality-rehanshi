export const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const resolveServiceBySlug = (services, categories, slug) => {
  const normalizedSlug = slugify(slug)
  const service = services.find((item) => slugify(item.slug || item.name) === normalizedSlug)

  if (service) return service

  const category = categories?.find((item) => slugify(item.slug || item.name) === normalizedSlug)
  if (!category) return null

  return {
    ...category,
    description: category.description || '',
    duration: category.duration || '',
    includes: category.includes || [],
    packages: category.packages || [],
    rating: category.metadata?.rating || category.rating || '',
  }
}
