import { getBrandingDisplay, logoFallbackClass, logoImageClass, readBrandingValue } from '../../utils/branding'

const socialIconPaths = {
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.4l.6-4h-4V7a1 1 0 0 1 1-1h3V2Z',
  instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 6.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm5.2-.9h.01',
  linkedin: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.7h4v11H3v-11Zm6.5 0h3.8v1.5h.05a4.2 4.2 0 0 1 3.8-2.1c4.05 0 4.85 2.65 4.85 6.1v5.5h-4v-4.9c0-1.2-.03-2.7-1.65-2.7-1.65 0-1.9 1.3-1.9 2.65v4.95h-3.95v-11Z',
  youtube: 'M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.5 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.8 31 31 0 0 0-.5-3.8ZM10 15V9l5.2 3L10 15Z',
}

const socialIconColors = {
  facebook: 'border-[#1877f2]/35 bg-[#1877f2]/15 text-[#1877f2] hover:border-[#1877f2] hover:bg-[#1877f2] hover:text-white',
  instagram: 'border-[#e4405f]/35 bg-[#e4405f]/15 text-[#e4405f] hover:border-[#e4405f] hover:bg-[#e4405f] hover:text-white',
  linkedin: 'border-[#0a66c2]/35 bg-[#0a66c2]/15 text-[#0a66c2] hover:border-[#0a66c2] hover:bg-[#0a66c2] hover:text-white',
  youtube: 'border-[#ff0000]/35 bg-[#ff0000]/15 text-[#ff0000] hover:border-[#ff0000] hover:bg-[#ff0000] hover:text-white',
}

const normalizeSocialKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

function SocialIcon({ label }) {
  const normalized = normalizeSocialKey(label)
  const path = socialIconPaths[normalized]

  if (!path) {
    return <span className="text-xs font-black">{String(label || 'S').slice(0, 1).toUpperCase()}</span>
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  )
}

function SocialLinkIcon({ item }) {
  const normalized = normalizeSocialKey(item.label || item.key)

  return (
    <a
      aria-label={item.label}
      className={`grid h-9 w-9 place-items-center rounded-full border transition ${socialIconColors[normalized] || 'border-white/15 bg-white/5 text-white/70 hover:border-white/35 hover:bg-white/10 hover:text-white'}`}
      href={item.url}
      rel="noreferrer"
      target="_blank"
      title={item.label}
    >
      <SocialIcon label={item.label || item.key} />
    </a>
  )
}

function Footer({ appSettings = {} }) {
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
  const { appName, isLogoCircular, logoText, logoUrl, showBrandName, tagline } = getBrandingDisplay(appSettings)
  const footerDescription = readBrandingValue(branding, 'footer_description', 'Verified professionals for repair, cleaning, beauty, appliance care, and everyday home needs in Lucknow.')
  const serviceAreaText = contact.service_area_text?.value || 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.'
  const phone = contact.phone?.value || '+91 98765 43210'
  const email = contact.email?.value || 'support@Rehanshi.com'
  const address = contact.address?.value || 'Lucknow, Uttar Pradesh'
  const copyrightText = legal.copyright_text?.value || `${appName || 'Rehanshi'} services marketplace UI`
  const poweredByText = legal.powered_by_text?.value || ''
  const footerBottomText = legal.footer_bottom_text?.value || 'Transparent pricing | Trained professionals | Quality assured'

  return (
    <footer id="partner" className="border-t border-blue-100 bg-[#003F86] px-4 pb-10 pt-10 text-white lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <img className="h-16 sm:h-20 w-auto max-w-[240px] object-contain" src="/white-logo.png" alt="Rehanshi" />
            {showBrandName && (
              <div>
                <p className="text-lg font-black leading-tight">{appName}</p>
                <p className="text-xs font-semibold text-white/50">{tagline}</p>
              </div>
            )}
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
            {footerDescription}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-bold">
            {['4.8 rating', '12M+ bookings', '30 day warranty'].map((item) => (
              <div className="rounded-md border border-white/10 bg-white/5 px-3 py-3" key={item}>
                {item}
              </div>
            ))}
          </div>
          {socialLinks.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {socialLinks.map((item) => (
                <SocialLinkIcon item={item} key={item.key} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold">Services</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <p>AC repair</p>
            <p>Home cleaning</p>
            <p>Salon at home</p>
            <p>Appliance repair</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold">Support</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <p>Track order</p>
            <p>Saved addresses</p>
            <p>Order history</p>
            <a className="hover:text-white" href="/contact">Contact</a>
            <a className="hover:text-white" href="/privacy-policy">Privacy policy</a>
            <a className="hover:text-white" href="/terms-and-condition">Terms &amp; conditions</a>
            <p>Reviews</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold">Service area</h3>
          <p className="mt-4 text-sm leading-6 text-white/60">
            {serviceAreaText}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-white/60">
            <p>{phone}</p>
            <p>{email}</p>
            <p>{address}</p>
          </div>
          <div className="mt-5 rounded-md border border-[#67B529]/30 bg-[#67B529]/10 px-4 py-3 text-sm font-bold text-[#EEF9E8]">
            Transparent pricing. No surprise charges.
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <p>{copyrightText}</p>
          <a className="hover:text-white" href="/privacy-policy">Privacy policy</a>
          <a className="hover:text-white" href="/terms-and-condition">Terms &amp; conditions</a>
        </div>
        <p>{[footerBottomText, poweredByText].filter(Boolean).join(' | ')}</p>
      </div>
    </footer>
  )
}

export default Footer
