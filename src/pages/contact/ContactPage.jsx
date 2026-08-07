import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'

function ContactPage({
  appSettings = {},
  cartCount,
  isLoggedIn,
  locationLabel,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onSearchSuggestionSelect,
  searchSuggestions,
  user,
}) {
  const branding = appSettings.branding || {}
  const contact = appSettings.contact || {}
  const appName = branding.app_name?.value || 'Rehanshi'
  const defaults = {
    address: 'Lucknow, Uttar Pradesh',
    email: 'support@Rehanshi.com',
    phone: '+91 98765 43210',
    service_area_text: 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.',
    whatsapp: '+91 98765 43210',
  }

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        appSettings={appSettings}
        cartCount={cartCount}
        isLoggedIn={isLoggedIn}
        locationLabel={locationLabel}
        onBackHome={onBackHome}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={user}
      />

      <section className="border-b border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <p className="text-sm font-semibold text-blue-700">{appName}</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight">Contact us</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-800">
            Reach the support team for bookings, service questions, partner onboarding and payments.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 md:grid-cols-2 lg:px-8">
        {[
          ['Phone', contact.phone?.value || defaults.phone],
          ['Email', contact.email?.value || defaults.email],
          ['WhatsApp', contact.whatsapp?.value || defaults.whatsapp],
          ['Address', contact.address?.value || defaults.address],
        ].map(([label, value]) => (
          <article className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm" key={label}>
            <p className="text-sm font-semibold text-blue-700">{label}</p>
            <p className="mt-2 text-xl font-bold">{value || 'Update from admin settings'}</p>
          </article>
        ))}
        <article className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-sm font-semibold text-blue-700">Service area</p>
          <p className="mt-2 text-base leading-7 text-blue-900">
            {contact.service_area_text?.value || defaults.service_area_text}
          </p>
        </article>
      </section>

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default ContactPage
