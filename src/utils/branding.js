import { buildBackendUrl } from '../config/urls'

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key)

export const readBrandingValue = (branding = {}, key, fallback = '') => {
  if (!hasOwn(branding, key)) return fallback
  return branding[key]?.value ?? ''
}

export const getBrandingDisplay = (appSettings = {}) => {
  const branding = appSettings.branding || {}
  const appName = String(readBrandingValue(branding, 'app_name', 'Rehanshi')).trim()
  const tagline = String(readBrandingValue(branding, 'tagline', 'Home services, simplified')).trim()
  const logoText = String(readBrandingValue(branding, 'logo_text', 'HC')).trim() || 'HC'
  const logoUrl = buildBackendUrl(String(readBrandingValue(branding, 'logo_url', './public/logo2.png')).trim())
  const isLogoCircular = String(readBrandingValue(branding, 'logo_is_circular', '0')) === '1'

  return {
    appName,
    isLogoCircular,
    logoText,
    logoUrl,
    showBrandName: Boolean(appName),
    tagline,
  }
}

export const logoImageClass = (isLogoCircular, size = 'md') => {
  const sizes = {
    sm: isLogoCircular ? 'h-9 w-9' : 'h-9 w-auto max-w-[155px]',
    md: isLogoCircular ? 'h-11 w-11' : 'h-20 w-auto',
  }

  return `${sizes[size] || sizes.md} shrink-0 ${isLogoCircular ? 'rounded-full object-cover' : 'rounded-md object-contain'}`
}

export const logoFallbackClass = (isLogoCircular, size = 'md', tone = 'dark') => {
  const sizes = {
    sm: isLogoCircular ? 'h-9 w-9' : 'h-9 min-w-16 px-3',
    md: isLogoCircular ? 'h-11 w-11' : 'h-10 min-w-20 px-3',
  }
  const colors = {
    dark: 'bg-[#003F86] text-white',
    light: 'bg-white text-[#003F86]',
    primary: 'bg-blue-600 text-white',
    neutral: 'bg-slate-900 text-white',
  }

  return `grid ${sizes[size] || sizes.md} shrink-0 place-items-center ${isLogoCircular ? 'rounded-full' : 'rounded-md'} ${colors[tone] || colors.dark}`
}
