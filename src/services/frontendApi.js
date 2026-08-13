import { frontendApiClient } from './apiClient'
import { resolveCouponLocally } from '../utils/checkoutPricing'

const requestJson = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData
  const config = {
    method: options.method || 'GET',
    url: path,
    params: options.params,
    headers: options.headers || {},
  }

  if (isFormData) {
    config.headers['Content-Type'] = 'multipart/form-data'
    config.data = options.body
  } else if (options.body) {
    try {
      config.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    } catch {
      config.data = options.body
    }
  }

  return frontendApiClient(config)
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}

const normalizePackage = (item) => ({
  ...item,
  detailSections: item.detail_sections || [],
  originalPrice: toNumber(item.original_price),
  optionCount: item.option_count,
  notIncluded: item.not_included,
  price: toNumber(item.price),
  rating: item.rating ? String(item.rating) : '',
})

const normalizeService = (service) => ({
  ...service,
  rating: service.rating ? String(service.rating) : '',
  packages: (service.packages || []).map(normalizePackage),
})

const normalizeCustomer = (customer) => ({
  ...customer,
  email: customer.email || '',
  metadata: customer.metadata || {},
  name: customer.name || 'Customer',
  phone: customer.phone || '',
})

const normalizeCustomerSession = (customer) => ({
  token: customer.auth_token || '',
  user: normalizeCustomer({
    ...customer,
    auth_token: undefined,
  }),
})

const normalizeSavedAddress = (address) => ({
  ...address,
  contactName: address.contact_name || address.contactName || '',
  customerProfileId: address.customer_profile_id || address.customerProfileId,
  location: address.metadata?.location || address.location || null,
  state: address.state || 'Uttar Pradesh',
  pincode: address.pincode || '',
  metadata: address.metadata || {},
})

const normalizeReview = (review) => ({
  ...review,
  customerName: review.customer_name || review.customerName || review.customer || 'Customer',
  partnerName: review.partner_name || review.partnerName || review.partner,
  reviewedAt: review.reviewed_at || review.reviewedAt || review.date,
  serviceName: review.service_name || review.serviceName || review.service,
  text: review.text || '',
  rating: review.rating ? String(review.rating) : '',
})

const normalizeBrand = (brand) => ({
  ...brand,
  logo: brand.logo || '',
  name: brand.name || '',
})

const normalizeMobileBanner = (banner) => ({
  ...banner,
  bgColor: banner.bg_color || banner.bgColor || '#6D28D9',
  body: banner.body || '',
  bodyColor: banner.body_color || banner.bodyColor || '#FFFFFF',
  buttonColor: banner.button_color || banner.buttonColor || '#FFFFFF',
  buttonText: banner.button_text || banner.buttonText || '',
  buttonUrl: banner.button_url || banner.buttonUrl || '',
  image: banner.image || '',
  subtitle: banner.subtitle || '',
  subtitleColor: banner.subtitle_color || banner.subtitleColor || '#E5E7EB',
  subtitleSize: banner.subtitle_size || banner.subtitleSize || 'sm',
  textAlign: banner.text_align || banner.textAlign || 'left',
  title: banner.title || '',
  titleColor: banner.title_color || banner.titleColor || '#FFFFFF',
  titleSize: banner.title_size || banner.titleSize || '2xl',
  titleWeight: banner.title_weight || banner.titleWeight || 'extrabold',
})

const normalizeAppContent = (items = []) =>
  items.reduce((groups, item) => {
    const normalized = {
      ...item,
      buttonText: item.button_text,
      buttonUrl: item.button_url,
      metadata: item.metadata || {},
    }
    groups[item.type] = [...(groups[item.type] || []), normalized]
    return groups
  }, {})

const normalizeSettings = (groups = {}) =>
  Object.entries(groups || {}).reduce((settings, [group, rows]) => {
    settings[group] = (rows || []).reduce((values, item) => {
      const metadata = item.metadata || {}
      values[item.key] = {
        ...metadata,
        enabled: item.type === 'boolean' ? String(item.value) === '1' || item.value === true : metadata.enabled,
        type: item.type,
        value: item.value,
      }
      return values
    }, {})
    return settings
  }, {})

export const frontendApi = {
  content: async () => {
    const body = await requestJson('/frontend-content')

    return {
      ...body,
      categories: body.categories || [],
      services: (body.services || []).map(normalizeService),
      servicePackages: (body.service_packages || []).map(normalizePackage),
      brands: (body.brands || []).map(normalizeBrand),
      mobileBanners: (body.mobile_banners || []).map(normalizeMobileBanner),
      coupons: body.coupons || [],
      reviews: (body.reviews || []).map(normalizeReview),
      appContent: body.app_content || [],
      contentByType: normalizeAppContent(body.app_content || []),
      settings: normalizeSettings(body.settings || {}),
      pages: body.pages || [],
    }
  },
  getPageBySlug: async (slug) => requestJson(`/pages/slug/${slug}`),
  applyCoupon: async (code, subtotal, knownCoupons = [], cartItems = []) => {
    try {
      const localCoupon = resolveCouponLocally(code, subtotal, knownCoupons, cartItems)
      if (localCoupon) return localCoupon

      return await requestJson('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: String(code || '').trim(),
          subtotal: Number(subtotal) || 0,
          items: (cartItems || [])
            .map((item) => ({
              id: Number(item.id || item.service_package_id),
              quantity: Math.max(1, Number(item.quantity) || 1),
            }))
            .filter((item) => Number.isFinite(item.id) && item.id > 0),
        }),
      })
    } catch (error) {
      const fieldMessage = error.errors?.code?.[0]
        || error.errors?.coupon_code?.[0]
      throw new Error(fieldMessage || error.message || 'Could not apply coupon.')
    }
  },
  getInvoice: async (bookingId) => requestJson(`/bookings/${bookingId}/invoice`),
  cancelBooking: async (id, reason) => requestJson(`/bookings/${id}/cancel`, {
    body: JSON.stringify({ cancelled_by: 'customer', reason }),
    method: 'POST',
  }),
  approveExtraItems: async (bookingId) => requestJson(`/bookings/${bookingId}/extra-items/approve`, {
    method: 'POST',
  }),
  rejectExtraItems: async (bookingId) => requestJson(`/bookings/${bookingId}/extra-items/reject`, {
    method: 'POST',
  }),
  createBooking: async (booking) => requestJson('/bookings', {
    body: JSON.stringify(booking),
    method: 'POST',
  }),
  bookingDetail: async (bookingId) => {
    if (!bookingId) return null

    return requestJson(`/bookings/${bookingId}`)
  },
  createPayment: async (payment) => requestJson('/payments', {
    body: JSON.stringify(payment),
    method: 'POST',
  }),
  createSavedAddress: async (address) => {
    const saved = await requestJson('/saved-addresses', {
      body: JSON.stringify({
        city: address.city,
        state: address.state || 'Uttar Pradesh',
        pincode: address.pincode || '',
        contact_name: address.contactName,
        customer_profile_id: address.customerProfileId,
        flat: address.flat,
        label: address.label,
        metadata: {
          ...(address.metadata || {}),
          location: address.location || address.metadata?.location || null,
        },
        mobile: address.mobile,
        status: 'Active',
        street: address.street,
      }),
      method: 'POST',
    })

    return normalizeSavedAddress(saved)
  },
  updateSavedAddress: async (id, address) => {
    const saved = await requestJson(`/saved-addresses/${id}`, {
      body: JSON.stringify({
        city: address.city,
        state: address.state || 'Uttar Pradesh',
        pincode: address.pincode || '',
        contact_name: address.contactName,
        flat: address.flat,
        label: address.label,
        metadata: {
          ...(address.metadata || {}),
          location: address.location || address.metadata?.location || null,
        },
        mobile: address.mobile,
        status: 'Active',
        street: address.street,
      }),
      method: 'PUT',
    })

    return normalizeSavedAddress(saved)
  },
  deleteSavedAddress: async (id) => {
    await requestJson(`/saved-addresses/${id}`, {
      method: 'DELETE',
    })
    return id
  },
  customerLogin: async ({ login, password, phone, email }) => {
    const customer = await requestJson('/customers/login', {
      body: JSON.stringify({
        login: login || phone || email || '',
        phone: phone || undefined,
        email: email || undefined,
        password,
      }),
      method: 'POST',
    })

    return normalizeCustomerSession(customer)
  },
  sendCustomerLoginOtp: async ({ login }) => requestJson('/customers/login/send-otp', {
    body: JSON.stringify({ login: String(login || '').trim() }),
    method: 'POST',
  }),
  verifyCustomerLoginOtp: async ({ login, otp }) => {
    const customer = await requestJson('/customers/login/verify-otp', {
      body: JSON.stringify({
        login: String(login || '').trim(),
        otp: String(otp || '').trim(),
      }),
      method: 'POST',
    })

    return normalizeCustomerSession(customer)
  },
  customerSignup: async ({ email, name, password, phone }) => {
    const customer = await requestJson('/customers/register', {
      body: JSON.stringify({ email, name, password, phone }),
      method: 'POST',
    })

    return normalizeCustomerSession(customer)
  },
  checkCustomerAvailability: async ({ email, phone } = {}) => requestJson('/customers/check-availability', {
    body: JSON.stringify({
      ...(email ? { email: String(email).trim() } : {}),
      ...(phone ? { phone: String(phone).trim() } : {}),
    }),
    method: 'POST',
  }),
  guestCartCheckIdentifier: async ({ login }) => requestJson('/customers/guest-cart/check', {
    body: JSON.stringify({ login: String(login || '').trim() }),
    method: 'POST',
  }),
  guestCartSendOtp: async ({ login }) => requestJson('/customers/guest-cart/send-otp', {
    body: JSON.stringify({ login: String(login || '').trim() }),
    method: 'POST',
  }),
  guestCartVerifyOtp: async ({ login, otp }) => {
    const response = await requestJson('/customers/guest-cart/verify-otp', {
      body: JSON.stringify({
        login: String(login || '').trim(),
        otp: String(otp || '').trim(),
      }),
      method: 'POST',
    })

    if (response?.auth_status === 'authenticated' || response?.auth_token) {
      return {
        ...response,
        session: normalizeCustomerSession(response),
      }
    }

    return response
  },
  guestCartCompleteRegistration: async ({ verificationToken, name, email, phone }) => {
    const response = await requestJson('/customers/guest-cart/complete-registration', {
      body: JSON.stringify({
        verification_token: verificationToken,
        name,
        email: email || undefined,
        phone: phone || undefined,
      }),
      method: 'POST',
    })

    return {
      ...response,
      session: normalizeCustomerSession(response),
    }
  },
  me: async () => {
    const customer = await requestJson('/customers/me')
    return normalizeCustomerSession(customer)
  },
  customerSession: async ({ customerId, token }) => {
    const customer = await requestJson('/customers/session', {
      body: JSON.stringify({ customer_id: customerId, token }),
      method: 'POST',
    })

    return normalizeCustomerSession(customer)
  },
  customerLogout: async ({ customerId, token }) => {
    if (!customerId || !token) return { message: 'Logged out' }

    return requestJson('/customers/logout', {
      body: JSON.stringify({ customer_id: customerId, token }),
      method: 'POST',
    })
  },
  sendCustomerPasswordOtp: async ({ email }) => requestJson('/customers/password/send-otp', {
    body: JSON.stringify({ email }),
    method: 'POST',
  }),
  verifyCustomerPasswordOtp: async ({ email, otp }) => requestJson('/customers/password/verify-otp', {
    body: JSON.stringify({ email, otp }),
    method: 'POST',
  }),
  calculateCheckout: async (payload) => requestJson('/checkout/calculate', {
    body: JSON.stringify(payload),
    method: 'POST',
  }),
  resetCustomerPassword: async ({ email, password, passwordConfirmation, resetToken }) => requestJson('/customers/password/reset', {
    body: JSON.stringify({
      email,
      password,
      password_confirmation: passwordConfirmation,
      reset_token: resetToken,
    }),
    method: 'POST',
  }),
  updateCustomer: async (customerId, customer) => {
    if (!customerId) return normalizeCustomer(customer)

    const updatedCustomer = await requestJson(`/customers/${customerId}`, {
      body: JSON.stringify({
        address: customer.address,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        status: customer.status || 'Active',
        metadata: customer.metadata || {},
      }),
      method: 'PUT',
    })

    return normalizeCustomer(updatedCustomer)
  },
  uploadCustomerProfilePicture: async (customerId, body) => {
    const response = await requestJson(`/customers/${customerId}/profile-picture`, {
      body,
      method: 'POST',
    })

    return normalizeCustomer(response.customer || response)
  },
  savedAddresses: async (customerId) => {
    if (!customerId) return []

    try {
      const body = await requestJson('/customers/me/saved-addresses')
      return (body.data || [])
        .filter((item) => String(item.customer_profile_id || '') === String(customerId))
        .map(normalizeSavedAddress)
    } catch {
      // Fallback for older backends — still ID-scoped only (never by name)
      const body = await requestJson('/saved-addresses', { params: { customer_id: customerId, customer_profile_id: customerId, per_page: 100 } })
      return (body.data || [])
        .filter((item) => String(item.customer_profile_id || '') === String(customerId))
        .map(normalizeSavedAddress)
    }
  },
  customerBookings: async (customerId) => {
    if (!customerId) return []

    try {
      const body = await requestJson('/customers/me/bookings')
      return (body.data || []).filter((booking) => {
        const metadataCustomerId = booking.metadata?.customer_id
        // Prefer strict customer_id match; allow phone-matched rows only when metadata has no other owner
        if (metadataCustomerId !== undefined && metadataCustomerId !== null && metadataCustomerId !== '') {
          return String(metadataCustomerId) === String(customerId)
        }
        return true
      })
    } catch {
      const body = await requestJson('/bookings', { params: { per_page: 100 } })
      return (body.data || []).filter((booking) => {
        const metadataCustomerId = booking.metadata?.customer_id
        return String(metadataCustomerId || '') === String(customerId || '')
      })
    }
  },
  saveReview: async (review) => {
    const payload = {
      customer_name: review.customerName,
      partner_name: review.partnerName || '',
      service_name: review.serviceName,
      rating: review.rating,
      text: review.text,
      reviewed_at: review.reviewedAt || new Date().toISOString().slice(0, 10),
      status: review.status || 'Pending',
      metadata: review.metadata || {},
    }
    const savedReview = await requestJson(review.id ? `/reviews/${review.id}` : '/reviews', {
      body: JSON.stringify(payload),
      method: review.id ? 'PUT' : 'POST',
    })

    return normalizeReview(savedReview)
  },
  customerWallet: async (customerName, customerId) => {
    if (!customerId) return null

    try {
      return await requestJson('/customers/me/wallet')
    } catch {
      const body = await requestJson('/customer-wallets', { params: { per_page: 100 } })
      const wallets = body.data || []
      return wallets.find((wallet) => String(wallet.customer_profile_id || '') === String(customerId)) || {
        balance: 0,
        customer_name: customerName,
        customer_profile_id: customerId,
        status: 'Active',
      }
    }
  },
  customerWalletTransactions: async (customerId) => {
    if (!customerId) return []

    try {
      const body = await requestJson('/customers/me/wallet-transactions')
      return body.data || []
    } catch {
      const body = await requestJson('/wallet-transactions', { params: { per_page: 100 } })
      return (body.data || [])
        .filter((transaction) => transaction.wallet_type === 'Customer' && String(transaction.customer_profile_id || '') === String(customerId))
    }
  },
  customerReviews: async (customerId) => {
    if (!customerId) return []

    try {
      const body = await requestJson('/customers/me/reviews')
      return (body.data || [])
        .filter((review) => String(review.metadata?.customer_id || '') === String(customerId))
        .map(normalizeReview)
    } catch {
      const body = await requestJson('/reviews', { params: { per_page: 100 } })
      return (body.data || [])
        .filter((review) => String(review.metadata?.customer_id || '') === String(customerId || ''))
        .map(normalizeReview)
    }
  },
  raiseSupportTicket: async ({ subject, description, type, image }) => {
    const body = new FormData()
    body.append('subject', subject)
    body.append('description', description)
    body.append('type', type)
    if (image instanceof File) {
      body.append('image', image)
    }

    return requestJson('/customers/me/support-tickets', {
      body,
      method: 'POST',
    })
  },
}
