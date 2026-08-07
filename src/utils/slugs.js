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
    description: category.description || `Book trusted ${category.name} professionals at your doorstep.`,
    duration: '30-120 mins',
    includes: ['Inspection visit', `${category.name} service`, 'Final quality check'],
    packages: [],
    rating: category.metadata?.rating || '4.8',
  }
}
