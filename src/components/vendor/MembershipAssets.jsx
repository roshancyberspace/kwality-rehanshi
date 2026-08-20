const formatDate = (value) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const buildVendorPublicPath = (partnerId) => `/vendors/${partnerId}`

export const defaultMembership = (partner = {}) => {
  partner = partner || {}
  const vendorId = String(partner.id || '').padStart(5, '0')
  const services = Array.isArray(partner.services) && partner.services.length
    ? partner.services
    : String(partner.skill || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  return {
    authorized_services: services,
    certificate_no: vendorId ? `RHC-CERT-${vendorId}` : '',
    designation: partner.skill || 'Certified Service Professional',
    id_card_no: vendorId ? `RHC-ID-${vendorId}` : '',
    member_since: partner.created_at ? String(partner.created_at).slice(0, 10) : '',
    public_note: 'This vendor is authorized to provide listed services under KwalityCareKwalityCarestandards.',
    published: false,
    tier: 'Certified',
    valid_until: '',
    ...(partner.metadata?.membership || {}),
  }
}

export function MembershipCertificate({ membership, partner, publicUrl }) {
  const services = membership?.authorized_services?.length ? membership.authorized_services : defaultMembership(partner).authorized_services

  return (
    <article className="overflow-hidden rounded-lg border border-[#67B529]/35 bg-white shadow-sm">
      <div className="border-b border-[#67B529]/20 bg-[#EEF9E8] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#67B529]">Membership Certificate</p>
        <h3 className="mt-1 text-2xl font-black leading-tight text-slate-900">{partner.business_name || partner.name}</h3>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_180px]">
        <div>
          <p className="text-sm font-bold leading-6 text-slate-600">
            Certified as a {membership.designation || 'Service Professional'} for KwalityCareRehanshi.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Certificate No', membership.certificate_no],
              ['Membership Tier', membership.tier],
              ['Member Since', formatDate(membership.member_since)],
              ['Valid Until', formatDate(membership.valid_until)],
              ['Service Area', [partner.area, partner.city, partner.pincode].filter(Boolean).join(', ')],
              ['KYC Status', partner.kyc_status || 'Pending'],
            ].map(([label, value]) => (
              <div className="rounded-md bg-slate-50 p-3" key={label}>
                <dt className="text-[11px] font-black uppercase text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm font-black text-slate-800">{value || '-'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            <p className="text-[11px] font-black uppercase text-slate-400">Authorized Services</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((service) => (
                <span className="rounded-full bg-[#EEF9E8] px-3 py-1 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20" key={service}>{service}</span>
              ))}
              {!services.length && <span className="text-sm font-bold text-slate-400">No services selected.</span>}
            </div>
          </div>
          {membership.public_note && <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">{membership.public_note}</p>}
        </div>
        <div className="grid content-between rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400">Verification</p>
            <p className="mt-2 break-all text-xs font-bold text-slate-600">{publicUrl || 'Publish to create public view'}</p>
          </div>
          <div className="mt-6 grid aspect-square place-items-center rounded-md border border-slate-300 bg-white text-center">
            <span className="text-xs font-black uppercase leading-5 text-slate-500">Public<br />Verify<br />QR</span>
          </div>
          <p className={`mt-4 text-xs font-black ${membership.published ? 'text-[#67B529]' : 'text-amber-700'}`}>
            {membership.published ? 'Published' : 'Draft'}
          </p>
        </div>
      </div>
    </article>
  )
}

export function IdentityCard({ membership, partner, profilePicture }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-white shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-[#67B529] px-4 py-3 text-slate-950">
        <p className="text-sm font-black">KwalityCareRehanshi</p>
        <p className="text-xs font-black">{membership.id_card_no || '-'}</p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[92px_1fr]">
        <div className="h-24 w-24 overflow-hidden rounded-lg bg-slate-700 ring-2 ring-white/20">
          {profilePicture ? (
            <img alt={partner.name || 'Vendor'} className="h-full w-full object-cover" src={profilePicture} />
          ) : (
            <span className="grid h-full w-full place-items-center text-2xl font-black">{partner.name?.slice(0, 2)?.toUpperCase() || 'VN'}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-xl font-black leading-tight">{partner.name}</h3>
          <p className="mt-1 text-sm font-bold text-[#D9F3C8]">{membership.designation || partner.skill || 'Service Professional'}</p>
          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-200">
            <p>Vendor ID: VEN-{String(partner.id || '').padStart(5, '0')}</p>
            <p>Phone: {partner.phone || '-'}</p>
            <p>Area: {[partner.area, partner.city].filter(Boolean).join(', ') || '-'}</p>
            <p>Valid: {formatDate(membership.valid_until)}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
