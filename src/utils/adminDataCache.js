/** In-memory TTL cache for admin relation options. Not localStorage — RAM only, session lifetime. */

const DEFAULT_TTL_MS = 5 * 60 * 1000

const store = new Map()

export const getAdminCache = (key) => {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

export const setAdminCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  })
  return value
}

export const invalidateAdminCache = (prefix = '') => {
  if (!prefix) {
    store.clear()
    return
  }

  for (const key of store.keys()) {
    if (String(key).startsWith(prefix)) store.delete(key)
  }
}

export const rememberAdminCache = async (key, loader, ttlMs = DEFAULT_TTL_MS) => {
  const cached = getAdminCache(key)
  if (cached !== null) return cached

  const value = await loader()
  return setAdminCache(key, value, ttlMs)
}
