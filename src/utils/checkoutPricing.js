export const DEFAULT_SERVICE_FEE = 49
export const COUPON_STORAGE_KEY = 'rehanshi_applied_coupon'
export const TIP_STORAGE_KEY = 'rehanshi_selected_tip_amount'

export const money = (value) => Math.round((Number(value) || 0) * 100) / 100

export const readStoredCoupon = () => {
  try {
    const saved = window.localStorage.getItem(COUPON_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const writeStoredCoupon = (coupon) => {
  if (coupon) {
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon))
    return
  }
  window.localStorage.removeItem(COUPON_STORAGE_KEY)
}

export const readStoredTipAmount = () => {
  const saved = Number(window.localStorage.getItem(TIP_STORAGE_KEY) || 0)
  return saved > 0 ? money(saved) : 0
}

export const writeStoredTipAmount = (amount) => {
  const value = money(amount)
  if (value > 0) {
    window.localStorage.setItem(TIP_STORAGE_KEY, String(value))
    return
  }
  window.localStorage.removeItem(TIP_STORAGE_KEY)
}

export const buildCheckoutPricing = ({
  subtotal = 0,
  serviceFee = DEFAULT_SERVICE_FEE,
  discount = 0,
  tipAmount = 0,
  walletApplied = 0,
} = {}) => {
  const itemTotal = money(subtotal)
  const fee = itemTotal > 0 ? money(serviceFee) : 0
  const couponDiscount = money(Math.min(discount, itemTotal + fee))
  const wallet = money(walletApplied)
  const bookingPayable = Math.max(0, money(itemTotal + fee - couponDiscount - wallet))
  const tip = money(tipAmount)
  const totalToPay = money(bookingPayable + tip)

  return {
    subtotal: itemTotal,
    serviceFee: fee,
    discount: couponDiscount,
    walletApplied: wallet,
    payable: bookingPayable,
    tipAmount: tip,
    totalToPay,
  }
}

const couponExpiryEnd = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(23, 59, 59, 999)
  return date
}

export const resolveCouponLocally = (code, subtotal, coupons = [], cartItems = []) => {
  const normalizedCode = String(code || '').trim().toLowerCase()
  if (!normalizedCode) return null

  const coupon = (coupons || []).find((item) => (
    item?.status === 'Active'
    && String(item.code || '').trim().toLowerCase() === normalizedCode
  ))

  if (!coupon) return null

  if (coupon.expires_at) {
    const expiry = couponExpiryEnd(coupon.expires_at)
    if (expiry && expiry < new Date()) {
      throw new Error('Coupon has expired.')
    }
  }

  const appliesTo = String(coupon.applies_to || 'all').toLowerCase()
  const eligibleSubtotal = resolveEligibleSubtotal(coupon, subtotal, cartItems)

  if (eligibleSubtotal == null && appliesTo !== 'all') {
    return null
  }

  const orderTotal = money(eligibleSubtotal ?? subtotal)
  if (orderTotal <= 0 && appliesTo !== 'all') {
    throw new Error(scopeMismatchMessage(appliesTo))
  }

  const minimumOrder = money(coupon.minimum_order || 0)
  if (minimumOrder > orderTotal) {
    throw new Error(`Minimum order for this coupon is Rs. ${minimumOrder}.`)
  }

  const rawValue = Number(String(coupon.value || '').replace(/[^\d.]/g, '')) || 0
  const discount = String(coupon.type || '').toLowerCase() === 'percentage'
    ? money((orderTotal * rawValue) / 100)
    : money(rawValue)

  return {
    ...coupon,
    applies_to: appliesTo,
    discount: Math.min(orderTotal, discount),
    eligible_subtotal: orderTotal,
  }
}

const normalizeIdList = (value) => (
  (Array.isArray(value) ? value : [])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
)

const scopeMismatchMessage = (appliesTo) => {
  if (appliesTo === 'category') return 'This coupon is only valid for selected categories.'
  if (appliesTo === 'service') return 'This coupon is only valid for selected services.'
  if (appliesTo === 'package') return 'This coupon is only valid for selected packages.'
  return 'This coupon is not valid for the items in your cart.'
}

const resolveEligibleSubtotal = (coupon, subtotal, cartItems = []) => {
  const appliesTo = String(coupon.applies_to || 'all').toLowerCase()
  if (appliesTo === 'all') return money(subtotal)

  const items = Array.isArray(cartItems) ? cartItems : []
  if (!items.length) return null

  const targetIds = normalizeIdList(
    appliesTo === 'category'
      ? coupon.category_ids
      : appliesTo === 'service'
        ? coupon.service_ids
        : coupon.service_package_ids,
  )

  if (!targetIds.length) {
    throw new Error('This coupon has no valid targets configured.')
  }

  let eligible = 0
  let hadComparableIds = false

  items.forEach((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1)
    const lineTotal = money((Number(String(item.price || '').replace(/[^\d.]/g, '')) || 0) * quantity)
    const packageId = Number(item.id || item.service_package_id || 0)
    const serviceId = Number(item.service_id || 0)
    const categoryId = Number(item.category_id || item.categoryId || 0)

    if (appliesTo === 'package') {
      hadComparableIds = true
      if (targetIds.includes(packageId)) eligible += lineTotal
      return
    }

    if (appliesTo === 'service') {
      if (!serviceId) return
      hadComparableIds = true
      if (targetIds.includes(serviceId)) eligible += lineTotal
      return
    }

    if (appliesTo === 'category') {
      if (!categoryId) return
      hadComparableIds = true
      if (targetIds.includes(categoryId)) eligible += lineTotal
    }
  })

  if (!hadComparableIds) return null
  return money(eligible)
}
