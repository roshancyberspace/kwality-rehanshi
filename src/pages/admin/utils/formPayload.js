const CUSTOM_SELECT_VALUE = '__custom__'

const normalizeValue = (field, rawValue) => {
  if (field.type === 'tags') {
    return String(rawValue)
      .split(/[\n,]/)
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

  if (field.type === 'checkbox') {
    return rawValue === true || rawValue === 1 || rawValue === '1' || rawValue === 'true' ? 1 : 0
  }

  if (field.type === 'json') {
    return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
  }

  return rawValue
}

const shouldOmitField = (field, rawValue) => rawValue === CUSTOM_SELECT_VALUE

const attachCustomBookingMetadata = (payload, form) => {
  if (String(form.booking_id) !== CUSTOM_SELECT_VALUE || !form.booking_no) return payload

  if (payload instanceof FormData) {
    let metadata = {}
    const existing = payload.get('metadata')
    if (existing) {
      try { metadata = JSON.parse(existing) } catch { metadata = {} }
    }
    payload.set('metadata', JSON.stringify({ ...metadata, booking_no: form.booking_no }))
    return payload
  }

  payload.metadata = {
    ...(typeof payload.metadata === 'object' && payload.metadata ? payload.metadata : {}),
    booking_no: form.booking_no,
  }
  return payload
}

export const preparePayload = (fields, form) => {
  const hasFile = fields.some((field) => form[field.name] instanceof File)

  if (hasFile) {
    const payload = fields.reduce((next, field) => {
      const rawValue = form[field.name]
      if (rawValue === undefined || rawValue === '') return next
      if (shouldOmitField(field, rawValue)) return next
      if (field.type === 'file' && !(rawValue instanceof File)) return next

      const value = normalizeValue(field, rawValue)
      if (Array.isArray(value)) {
        value.forEach((item) => next.append(`${field.name}[]`, item))
      } else if (typeof value === 'object' && !(value instanceof File)) {
        next.append(field.name, JSON.stringify(value))
      } else {
        next.append(field.name, value)
      }
      return next
    }, new FormData())
    return attachCustomBookingMetadata(payload, form)
  }

  const payload = fields.reduce((next, field) => {
    const rawValue = form[field.name]
    if (rawValue === undefined || field.type === 'file') return next
    if (rawValue === '' && field.type !== 'multiselect' && field.type !== 'checkbox') return next
    if (shouldOmitField(field, rawValue)) return next

    next[field.name] = normalizeValue(field, rawValue)
    return next
  }, {})
  return attachCustomBookingMetadata(payload, form)
}
