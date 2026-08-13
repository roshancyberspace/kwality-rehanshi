export const readRows = (payload) => payload?.data || payload || []

export const formatValue = (value) => {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string' && /<[a-z][\s\S]*>/i.test(value)) {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  return value
}

export const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatValue(value)

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const recordMatchesSearch = (record, query) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return Object.values(record || {}).some((value) => String(formatValue(value)).toLowerCase().includes(needle))
}

export const normalizeForInput = (value, type) => {
  if (type === 'multiselect') {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (Number.isNaN(Number(item)) ? item : Number(item)))
  }
  if (type === 'select' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (value === null || value === undefined) return ''
  if (type === 'datetime-local') return String(value).slice(0, 16)
  if (type === 'date') return String(value).slice(0, 10)
  if (type === 'tags' && Array.isArray(value)) return value.join(', ')
  return value
}
