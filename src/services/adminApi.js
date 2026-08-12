import { adminApiClient } from './apiClient'

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

  return adminApiClient(config)
}

export const adminApi = {
  login: (body) => request('/admin-users/login', { method: 'POST', body }),
  me: () => request('/admin-users/me', { method: 'GET' }),
  customerOverview: (id) => request(`/customers/${id}/overview`),
  partnerOverview: (id) => request(`/partners/${id}/overview`),
  list: (endpoint, params) => request(endpoint, { params }),
  show: (endpoint, id) => request(`${endpoint}/${id}`),
  create: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  createForm: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  update: (endpoint, id, body) => {
    if (body instanceof FormData) {
      body.set('_method', 'PUT')
      return request(`${endpoint}/${id}`, { method: 'POST', body })
    }

    return request(`${endpoint}/${id}`, { method: 'PUT', body })
  },
  remove: (endpoint, id) => request(`${endpoint}/${id}`, { method: 'DELETE' }),
  changeAdminPassword: (id, body) => request(`/admin-users/${id}/password`, { method: 'PATCH', body }),
  changeCustomerPassword: (id, body) => request(`/customers/${id}/password`, { method: 'PATCH', body }),
  changePartnerPassword: (id, body) => request(`/partners/${id}/password`, { method: 'PATCH', body }),
  acceptBooking: (id) => request(`/bookings/${id}/accept`, { method: 'POST' }),
  cancelBooking: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: { reason } }),
  rejectBooking: (id, reason) => request(`/bookings/${id}/reject`, { method: 'POST', body: { reason } }),
  assignBooking: (id, partnerId) => request(`/bookings/${id}/assign`, { method: 'POST', body: { partner_id: partnerId } }),
  approvePartnerKyc: (id) => request(`/partners/${id}/approve-kyc`, { method: 'POST' }),
  rejectPartnerKyc: (id, reason) => request(`/partners/${id}/reject-kyc`, { method: 'POST', body: { reason } }),
  updatePartnerAvailability: (id, availability) => request(`/partners/${id}/availability`, { method: 'PATCH', body: { availability } }),
  updatePartnerStatus: (id, status) => request(`/partners/${id}/status`, { method: 'PATCH', body: { status } }),
  suspendPartner: (id, reason) => request(`/partners/${id}/suspend`, { method: 'POST', body: { reason } }),
  impersonatePartner: (id) => request(`/partners/${id}/impersonate`, { method: 'POST' }),
  sendPartnerMessage: (id, body) => request(`/partners/${id}/send-message`, { method: 'POST', body }),
  updatePartnerMembership: (id, body) => request(`/partners/${id}/membership`, { method: 'PATCH', body }),
  uploadPartnerProfilePicture: (id, body) => request(`/partners/${id}/profile-picture`, { method: 'POST', body }),
  uploadPartnerDocument: (id, body) => request(`/partners/${id}/documents`, { method: 'POST', body }),
  verifyPartnerDocument: (id, index) => request(`/partners/${id}/documents/${index}/verify`, { method: 'PATCH' }),
  rejectPartnerDocument: (id, index, reason) => request(`/partners/${id}/documents/${index}/reject`, { method: 'PATCH', body: { reason } }),
  notificationSummary: () => request('/notifications-summary'),
  markNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),
  dashboard: (params) => request('/admin/dashboard', { params }),
  reports: () => request('/admin/reports'),
  uploadMedia: (body) => request('/media/upload', { method: 'POST', body }),
}
