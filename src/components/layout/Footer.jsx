import { getBrandingDisplay, readBrandingValue } from '../../utils/branding'
import { slugify } from '../../utils/slugs'

const normalizeSocialKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const socialLinkStyles = {
  facebook: 'bg-[#1877F2] hover:bg-[#166fe5] shadow-md shadow-[#1877F2]/30',
  instagram: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:brightness-110 shadow-md shadow-[#dc2743]/30',
  linkedin: 'bg-[#0A66C2] hover:bg-[#095196] shadow-md shadow-[#0A66C2]/30',
  youtube: 'bg-[#FF0000] hover:bg-[#cc0000] shadow-md shadow-[#FF0000]/30',
  twitter: 'bg-black hover:bg-neutral-900 shadow-md shadow-black/30',
  x: 'bg-black hover:bg-neutral-900 shadow-md shadow-black/30',
  whatsapp: 'bg-[#25D366] hover:bg-[#20ba5a] shadow-md shadow-[#25D366]/30',
}

function renderBrandSocialIcon(normalized) {
  switch (normalized) {
    case 'facebook':
      return (
        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )
    case 'twitter':
    case 'x':
      return (
        <svg className="h-3.5 w-3.5 fill-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      )
    default:
      return <span className="text-xs font-black text-white">{String(normalized || 'S').slice(0, 1).toUpperCase()}</span>
  }
}

function SocialLinkIcon({ item }) {
  const normalized = normalizeSocialKey(item.label || item.key)
  const bgClass = socialLinkStyles[normalized] || 'bg-white/20 hover:bg-white/30 text-white'

  return (
    <a
      aria-label={item.label}
      className={`grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${bgClass}`}
      href={item.url}
      rel="noreferrer"
      target="_blank"
      title={item.label}
    >
      {renderBrandSocialIcon(normalized)}
    </a>
  )
}

function Footer({ appSettings = {}, services = [] }) {
  const branding = appSettings.branding || {}
  const contact = appSettings.contact || {}
  const legal = appSettings.legal || {}
  const socialLinks = Object.entries(appSettings.social_links || {})
    .map(([key, item]) => ({
      key,
      label: item.label || key,
      url: String(item.value || '').trim(),
    }))
    .filter((item) => item.url)

  const footerServices = (services || []).filter((item) => item?.name).slice(0, 7)
  const { appName, showBrandName, tagline } = getBrandingDisplay(appSettings)
  const footerDescription = readBrandingValue(branding, 'footer_description', 'Verified professionals for repair, cleaning, beauty, appliance care, and everyday home needs in Lucknow.')
  const serviceAreaText = contact.service_area_text?.value || 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.'
  const phone = contact.phone?.value || ''
  const email = contact.email?.value || ''
  const address = contact.address?.value || ''
  const copyrightText = legal.copyright_text?.value || `© ${new Date().getFullYear()} ${appName || 'KwalityCare'}. All rights reserved.`
  const poweredByText = legal.powered_by_text?.value || ''
  const footerBottomText = legal.footer_bottom_text?.value || 'Transparent pricing | Trained professionals | Quality assured'

  return (
    <footer id="partner" className="hidden md:block border-t border-blue-900/40 bg-[#003F86] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1.2fr]">
          {/* Brand Info */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <a href="/" className="inline-block transition-opacity hover:opacity-90">
                  <img className="h-14 sm:h-16 w-auto max-w-[220px] object-contain" src="/white-logo.png" alt={appName || "KwalityCare"} />
                </a>
                {showBrandName && (
                  <div>
                    <p className="text-lg font-black leading-tight text-white">{appName}</p>
                    <p className="text-xs font-medium text-white/60">{tagline}</p>
                  </div>
                )}
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100/75">
                {footerDescription}
              </p>
            </div>

            {socialLinks.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200/60 mb-2.5">Follow Us</p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {socialLinks.map((item) => (
                    <SocialLinkIcon item={item} key={item.key} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-2 text-xs text-blue-200/60">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Verified & Certified Home Services</span>
              </div>
            )}
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Services</h3>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-blue-100/75">
              {footerServices.length ? (
                <>
                  {footerServices.map((item) => (
                    <a
                      key={item.id || item.name}
                      href={`/services?category=${slugify(item.name)}`}
                      className="transition-colors hover:text-white hover:translate-x-0.5 transform inline-block"
                    >
                      {item.name}
                    </a>
                  ))}
                  <a
                    href="/services"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-200 hover:text-white transition-colors"
                  >
                    View all services <span>&rarr;</span>
                  </a>
                </>
              ) : (
                <p className="text-sm text-blue-100/50">No services available</p>
              )}
            </div>
          </div>

          {/* Quick Links & Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Support & Links</h3>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-blue-100/75">
              <a className="transition-colors hover:text-white" href="/place-booking">Track order</a>
              <a className="transition-colors hover:text-white" href="/profile">Saved addresses</a>
              <a className="transition-colors hover:text-white" href="/place-booking">Order history</a>
              <a className="transition-colors hover:text-white" href="/rate-list">Rate list</a>
              <a className="transition-colors hover:text-white" href="/become-service-provider">Become a partner</a>
              <a className="transition-colors hover:text-white" href="/contact">Contact us</a>
              <a className="transition-colors hover:text-white" href="/privacy-policy">Privacy policy</a>
              <a className="transition-colors hover:text-white" href="/terms-and-condition">Terms &amp; conditions</a>
            </div>
          </div>

          {/* Service Area & Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Service Area</h3>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/75">
              {serviceAreaText}
            </p>
            
            {(phone || email || address) && (
              <div className="mt-4 flex flex-col gap-2 text-sm text-blue-100/75">
                {phone && (
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <svg className="h-4 w-4 shrink-0 text-blue-300" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{phone}</span>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <svg className="h-4 w-4 shrink-0 text-blue-300" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <span>{email}</span>
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 shrink-0 text-blue-300 mt-0.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{address}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-[#67B529]/40 bg-[#67B529]/15 px-4 py-3 text-xs font-semibold text-[#EEF9E8] shadow-sm">
              <svg className="h-4 w-4 shrink-0 text-[#67B529]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              <span>Transparent pricing. No surprise charges.</span>
            </div>

            {/* Download Our App Section */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-200">Download Our App</h4>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                {/* Google Play Store */}
                <a
                  href="https://play.google.com/store"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-left transition-all duration-200 hover:scale-[1.02] hover:border-white/35 hover:bg-slate-900/90 shadow-sm"
                >
                  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186A2.22 2.22 0 0 1 3 20.615V3.385c0-.6.22-1.168.609-1.571z" fill="#00C1A6"/>
                    <path d="M17.202 8.59L4.773 1.41a2.235 2.235 0 0 0-1.164-.404L13.792 12l3.41-3.41z" fill="#00E676"/>
                    <path d="M17.202 15.41L13.792 12 3.609 22.186c.35.093.73.067 1.164-.176l12.429-7.18 0 0z" fill="#FF3D00"/>
                    <path d="M21.57 11.085l-4.368-2.495L13.792 12l3.41 3.41 4.368-2.495a1.054 1.054 0 0 0 0-1.83z" fill="#FFC107"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-semibold uppercase leading-none tracking-wider text-white/60">Get it on</p>
                    <p className="text-xs font-bold leading-tight text-white mt-0.5">Google Play</p>
                  </div>
                </a>

                {/* Apple App Store */}
                <a
                  href="https://www.apple.com/app-store/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-left transition-all duration-200 hover:scale-[1.02] hover:border-white/35 hover:bg-slate-900/90 shadow-sm"
                >
                  <svg className="h-6 w-6 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-.99 1.73-.87 2.76 1.01.08 2.01-.51 2.6-1.26z"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-semibold uppercase leading-none tracking-wider text-white/60">Download on the</p>
                    <p className="text-xs font-bold leading-tight text-white mt-0.5">App Store</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-blue-200/60 md:flex-row">
          <p>{copyrightText}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a className="transition-colors hover:text-white" href="/privacy-policy">Privacy policy</a>
            <span className="text-white/20">•</span>
            <a className="transition-colors hover:text-white" href="/terms-and-condition">Terms &amp; conditions</a>
            <span className="text-white/20">•</span>
            <a className="transition-colors hover:text-white" href="/contact">Contact us</a>
          </div>
          <p>{[footerBottomText, poweredByText].filter(Boolean).join(' | ')}</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
