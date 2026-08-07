import { buildBackendUrl, buildStorageUrl } from '../config/urls'

const cartItemKey = (item) => String(item?.id ?? item?.name ?? '')

export const getCartItemKey = cartItemKey

export const resolveBookingItemImage = (image) => {
  if (!image) return ''

  const value = String(image).trim()
  if (!value) return ''
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) {
    return value
  }

  if (value.replace(/^\/+/, '').startsWith('storage/')) {
    return buildStorageUrl(value)
  }

  return buildBackendUrl(value)
}

const mapLineItem = (item) => ({
  name: item.name || item.service_name || 'Item',
  price: Number(item.price || 0),
  quantity: Number(item.quantity || 1),
  hsn: item.hsn || '-',
  service_package_id: item.service_package_id || item.id || null,
  rate_item_id: item.rate_item_id || null,
  image: resolveBookingItemImage(item.image || item.service_image || null),
})

const groupLineItems = (rawItems) => {
  const grouped = new Map()

  rawItems.forEach((item) => {
    const name = item.name || item.service_name || 'Extra item'
    const price = Number(item.price || 0)
    const quantity = Number(item.quantity || 1)
    const key = `${item.rate_item_id || item.service_package_id || item.id || name}-${price}`

    if (grouped.has(key)) {
      const existing = grouped.get(key)
      existing.quantity += quantity
    } else {
      grouped.set(key, mapLineItem({ ...item, name, price, quantity }))
    }
  })

  return Array.from(grouped.values())
}

export const getBookedLineItems = (booking) => {
  const rawItems = booking?.metadata?.items?.length
    ? booking.metadata.items
    : (booking?.reorderItems?.length ? booking.reorderItems : [])

  return rawItems.map((item) => {
    if (typeof item === 'string') {
      return { name: item, price: 0, quantity: 1, image: '', hsn: '-' }
    }

    return mapLineItem(item)
  })
}

export const getPendingExtraLineItems = (booking) => {
  const rawItems = Array.isArray(booking?.metadata?.pending_vendor_extra_items)
    ? booking.metadata.pending_vendor_extra_items
    : []

  return groupLineItems(rawItems)
}

export const getExtraLineItems = (booking) => {
  const vendorExtras = Array.isArray(booking?.metadata?.vendor_extra_items)
    ? booking.metadata.vendor_extra_items
    : []
  const relationExtras = Array.isArray(booking?.extra_items) ? booking.extra_items : []
  const rawItems = vendorExtras.length ? vendorExtras : relationExtras

  return groupLineItems(rawItems)
}

export const getPendingExtraTotal = (booking) =>
  getPendingExtraLineItems(booking).reduce((sum, item) => sum + (item.price * item.quantity), 0)

export const getApprovedExtraTotal = (booking) =>
  getExtraLineItems(booking).reduce((sum, item) => sum + (item.price * item.quantity), 0)
