import { recordMatchesSearch } from './formatters'

const DATE_FILTER_KEYS = new Set(['from_date', 'to_date'])

const rowDateValue = (row) => {
  const raw = row?.paid_at || row?.created_at || row?.updated_at || row?.createdAt || row?.updatedAt || ''
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const toDayStart = (value) => {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDayEnd = (value) => {
  if (!value) return null
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const getFilterFields = (config) => {
  if (!config?.fields) return []

  if (Array.isArray(config.listFilters) && config.listFilters.length) {
    const byName = Object.fromEntries((config.fields || []).map((field) => [field.name, field]))
    return config.listFilters.map((name) => byName[name]).filter(Boolean)
  }

  const visibleColumnKeys = new Set((config.columns || []).map(([key]) => key))

  return config.fields.filter((field) => field.type === 'select' && visibleColumnKeys.has(field.name) && !field.hideFromFilters)
}

export const applyTableFilters = (rows, query, filters = {}) =>
  rows.filter((row) => {
    if (!recordMatchesSearch(row, query)) return false

    const fromDate = toDayStart(filters.from_date)
    const toDate = toDayEnd(filters.to_date)
    if (fromDate || toDate) {
      const rowDate = rowDateValue(row)
      if (!rowDate) return false
      if (fromDate && rowDate < fromDate) return false
      if (toDate && rowDate > toDate) return false
    }

    return Object.entries(filters).every(([key, value]) => {
      if (!value || DATE_FILTER_KEYS.has(key)) return true
      return String(row[key] || '') === value
    })
  })
