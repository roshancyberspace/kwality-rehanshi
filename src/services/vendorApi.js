import { vendorApiClient } from './apiClient'
import axios from 'axios'

const request = async (path, options = {}) => {
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

  return vendorApiClient(config)
}

const normalizeVendorLogin = (value) => {
  const login = String(value || '').trim()
  if (login.includes('@')) return login.toLowerCase()

  if (!/^\d+$/.test(login) || login.length !== 10) {
    throw new Error('Mobile number must be exactly 10 digits without country code.')
  }

  return login
}

export const vendorApi = {
  lookupIfsc: async (ifsc) => axios.get(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`).then(r => r.data),
  requirements: async () => request('/partners-kyc/requirements'),
  register: async (formData) => request('/partners/register', {
    body: formData,
    method: 'POST',
  }),
  checkAvailability: async ({ email, phone } = {}) => request('/partners/check-availability', {
    method: 'POST',
    body: {
      ...(email ? { email: String(email).trim() } : {}),
      ...(phone ? { phone: String(phone).trim() } : {}),
    },
  }),
  login: async (body) => request('/partners/login', {
    method: 'POST',
    body: {
      login: normalizeVendorLogin(body?.login),
      password: body?.password,
    },
  }),
  me: () => request('/partners/me', { method: 'GET' }),
  wallet: async (partnerName, partnerId) => request('/vendor-wallets', { params: { q: partnerName, partner_id: partnerId, per_page: 1 } }),
  walletTransactions: async (partnerId) => request('/wallet-transactions', { params: { wallet_type: 'Vendor', partner_id: partnerId, per_page: 100 } }),
  partner: async (partnerId) => request(`/partners/${partnerId}`),
  jobs: async (params = {}) => {
    const { skip_sync: skipSync, ...rest } = params
    return request('/vendor-jobs', {
      params: {
        per_page: 40,
        lite: 1,
        ...(skipSync ? { skip_sync: 1 } : {}),
        ...rest,
      },
    })
  },
  publicProfile: async (partnerId) => request(`/partners/${partnerId}/public-profile`),
  updatePartner: async (partnerId, body) => request(`/partners/${partnerId}`, {
    body,
    method: 'PUT',
  }),
  uploadProfilePicture: async (partnerId, body) => request(`/partners/${partnerId}/profile-picture`, {
    body,
    method: 'POST',
  }),
  updateAvailability: async (partnerId, availability) => request(`/partners/${partnerId}/availability`, {
    body: { availability },
    method: 'PATCH',
  }),
  addBankAccount: async (partnerId, body) => request(`/partners/${partnerId}/bank-accounts`, {
    body,
    method: 'POST',
  }),
  updateBankAccount: async (partnerId, accountId, body) => request(`/partners/${partnerId}/bank-accounts/${accountId}`, {
    body,
    method: 'PUT',
  }),
  activateBankAccount: async (partnerId, accountId) => request(`/partners/${partnerId}/bank-accounts/${accountId}/active`, {
    method: 'PATCH',
  }),
  uploadPartnerDocument: async (partnerId, body) => request(`/partners/${partnerId}/documents`, {
    body,
    method: 'POST',
  }),
  updateJob: async (jobId, body, partnerId) => request(`/vendor-jobs/${jobId}`, { 
    params: { actor_partner_id: partnerId },
    body,
    method: 'PUT',
  }),
  uploadJobPhotos: async (jobId, body, partnerId) => request(`/vendor-jobs/${jobId}/photos`, { 
    params: { actor_partner_id: partnerId },
    body,
    method: 'POST',
  }),
  uploadJobMediaChunk: async (jobId, body, partnerId) => request(`/vendor-jobs/${jobId}/media-chunk`, { 
    params: { actor_partner_id: partnerId },
    body,
    method: 'POST',
  }),
  saveReview: async (body) => request('/reviews', {
    body,
    method: 'POST',
  }),
  requestPayout: async (body) => request('/payouts', {
    body,
    method: 'POST',
  }),
  rateItems: async (params = {}) => request('/rate-items', {
    params: {
      all: true,
      lite: 1,
      ...params,
    },
  }),
}
