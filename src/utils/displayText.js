const preserveUppercaseWords = new Set(['ac', 'cctv', 'tv', 'led', 'lcd', 'ro', 'ui', 'ux', 'otp', 'id'])

export const formatDisplayName = (value = '') => String(value || '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .map((word) => {
    const lower = word.toLowerCase()
    if (preserveUppercaseWords.has(lower)) return lower.toUpperCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
  .join(' ')
