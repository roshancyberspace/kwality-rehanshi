const trimTrailingSlash = (value = '') => String(value).trim().replace(/\/+$/, '')
const trimSlashes = (value = '') => String(value).trim().replace(/^\/+|\/+$/g, '')
const isAbsoluteUrl = (value = '') => /^(https?:)?\/\//i.test(String(value)) || String(value).startsWith('blob:')
const requiredEnvUrl = (key) => {
  const value = trimTrailingSlash(import.meta.env[key] || '')
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

export const APP_BASE_PATH = (() => {
  const basePath = import.meta.env.VITE_PUBLIC_BASE_PATH || import.meta.env.BASE_URL || '/'
  const cleanPath = `/${trimSlashes(basePath)}`
  return cleanPath === '/' ? '' : cleanPath
})()

export const FRONTEND_BASE_URL = requiredEnvUrl('VITE_FRONTEND_BASE_URL')
export const BACKEND_BASE_URL = requiredEnvUrl('VITE_BACKEND_BASE_URL')
export const API_BASE_URL = requiredEnvUrl('VITE_API_BASE_URL')

export const buildApiUrl = (path, params = {}) => {
  const url = new URL(`${API_BASE_URL}/${trimSlashes(path)}`, window.location.origin)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export const buildFrontendUrl = (path = '') => {
  const cleanPath = trimSlashes(path)
  return cleanPath ? `${FRONTEND_BASE_URL}/${cleanPath}` : FRONTEND_BASE_URL
}

export const toAppRoutePath = (pathname = window.location.pathname) => {
  const normalizedPath = `/${trimSlashes(pathname)}`
  if (!APP_BASE_PATH) return normalizedPath

  return normalizedPath === APP_BASE_PATH || normalizedPath.startsWith(`${APP_BASE_PATH}/`)
    ? normalizedPath.slice(APP_BASE_PATH.length) || '/'
    : normalizedPath
}

export const toBrowserPath = (path = '/') => {
  const routePath = `/${trimSlashes(path)}`
  return APP_BASE_PATH ? `${APP_BASE_PATH}${routePath === '/' ? '' : routePath}` : routePath
}

export const buildBackendUrl = (path = '') => {
  const value = String(path || '')
  if (!value || isAbsoluteUrl(value)) return value

  const cleanPath = trimSlashes(value)
  return cleanPath ? `${BACKEND_BASE_URL}/${cleanPath}` : BACKEND_BASE_URL
}

export const buildStorageUrl = (path = '') => {
  const value = String(path || '')
  if (!value || isAbsoluteUrl(value)) return value
  if (value.replace(/^\/+/, '').startsWith('storage/')) return buildBackendUrl(value)

  return buildBackendUrl(`storage/${value}`)
}

/**
 * Resolve vendor/admin document paths to a publicly reachable backend URL.
 * Newer uploads live under public/documents/...; legacy KYC paths were stored as
 * vendor-kyc/... (and briefly under storage/app/public) — normalize those too.
 */
export const buildDocumentUrl = (path = '') => {
  const value = String(path || '')
  if (!value || isAbsoluteUrl(value)) return value

  let cleanPath = trimSlashes(value)

  if (cleanPath.startsWith('storage/')) {
    cleanPath = cleanPath.slice('storage/'.length)
  }

  if (cleanPath.startsWith('vendor-kyc/')) {
    cleanPath = `documents/${cleanPath}`
  }

  if (
    cleanPath.startsWith('documents/') ||
    cleanPath.startsWith('banners/') ||
    cleanPath.startsWith('settings-images/')
  ) {
    return buildBackendUrl(cleanPath)
  }

  return buildStorageUrl(cleanPath)
}
