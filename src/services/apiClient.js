import axios from 'axios'
import { API_BASE_URL } from '../config/urls'

const createApiClient = (tokenKey, storage = window.localStorage) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  instance.interceptors.request.use((config) => {
    try {
      const token = storage.getItem(tokenKey)
      if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // ignore
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      // If it's a 204 No Content, return null
      if (response.status === 204) return null
      return response.data
    },
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        if (status === 401) {
          storage.removeItem(tokenKey)
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { type: tokenKey } }))
        }
        
        const errorMessage = data?.message || `Request failed with ${status}`
        const err = new Error(errorMessage)
        err.status = status
        err.errors = data?.errors || {}
        return Promise.reject(err)
      } else if (error.request) {
        return Promise.reject(new Error('Network failure. Please check your connection.'))
      }
      return Promise.reject(error)
    }
  )

  return instance
}

export const frontendApiClient = createApiClient('customer_jwt')
export const adminApiClient = createApiClient('admin_jwt')
export const vendorApiClient = createApiClient('vendor_jwt')
