import { recordMatchesSearch } from './formatters'

export const getFilterFields = (config) => {
  if (!config?.fields) return []
  const visibleColumnKeys = new Set((config.columns || []).map(([key]) => key))

  return config.fields.filter((field) => field.type === 'select' && visibleColumnKeys.has(field.name))
}

export const applyTableFilters = (rows, query, filters) =>
  rows.filter((row) => {
    if (!recordMatchesSearch(row, query)) return false

    return Object.entries(filters).every(([key, value]) => !value || String(row[key] || '') === value)
  })
