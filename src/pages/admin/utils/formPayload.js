const normalizeValue = (field, rawValue) => {
  if (field.type === 'tags') {
    return String(rawValue)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (field.type === 'multiselect') {
    const values = Array.isArray(rawValue)
      ? rawValue
      : String(rawValue || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  }

  if (field.type === 'number') return Number(rawValue)

  if (field.name === 'rating' && rawValue !== '' && rawValue !== null && rawValue !== undefined) {
    const numericRating = Number(rawValue)
    return Number.isFinite(numericRating) ? numericRating : rawValue
  }

  if (field.type === 'json') {
    return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
  }

  return rawValue
}

export const preparePayload = (fields, form) => {
  const hasFile = fields.some((field) => form[field.name] instanceof File)

  if (hasFile) {
    return fields.reduce((payload, field) => {
      const rawValue = form[field.name]
      if (rawValue === undefined || rawValue === '') return payload
      if (field.type === 'file' && !(rawValue instanceof File)) return payload

      const value = normalizeValue(field, rawValue)
      if (Array.isArray(value)) {
        value.forEach((item) => payload.append(`${field.name}[]`, item))
      } else if (typeof value === 'object' && !(value instanceof File)) {
        payload.append(field.name, JSON.stringify(value))
      } else {
        payload.append(field.name, value)
      }
      return payload
    }, new FormData())
  }

  return fields.reduce((payload, field) => {
    const rawValue = form[field.name]
    if (rawValue === undefined || field.type === 'file') return payload
    if (rawValue === '' && field.type !== 'multiselect') return payload

    payload[field.name] = normalizeValue(field, rawValue)
    return payload
  }, {})
}
