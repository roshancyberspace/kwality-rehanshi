import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'

const fallbackTerms = `<h2 class="text-2xl font-bold text-[#003F86] mt-4 mb-3">1. Acceptance of Terms</h2>
<p class="mb-4 text-blue-900 leading-7">By accessing our website, initiating a booking, or engaging with services provided through Rehanshi, you explicitly accept and agree to be bound by these Terms &amp; Conditions. If you do not agree to any clause in this policy, please refrain from using our marketplace platform.</p>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">2. Description of Service</h2>
<p class="mb-4 text-blue-900 leading-7">KwalityCareoperates as a digital service marketplace enabling homeowners and commercial establishments to discover and book verified, background-checked independent service professionals for AC repair, appliance care, salon at home, deep cleaning, electrical works, and everyday repairs.</p>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">3. Transparent Pricing &amp; Payments</h2>
<ul class="list-disc list-inside space-y-2 mb-6 text-blue-900 leading-7">
  <li><strong>Standard Package Rates:</strong> Published prices on our catalog cover defined repair diagnoses, maintenance routines, or fixed-scope installations without hidden surprises.</li>
  <li><strong>Spare Parts &amp; Consumables:</strong> If diagnosis requires replacement components or specialized wiring not covered in standard booking inclusions, technician estimates will be communicated for customer approval prior to installation.</li>
  <li><strong>Payment Settlement:</strong> Payments can be settled via online digital mechanisms, cards, or cash directly upon satisfactory completion of assigned milestones.</li>
</ul>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">4. 30-Day Service Warranty</h2>
<p class="mb-4 text-blue-900 leading-7">Eligible repairs and service interventions include a standard 30-day labor guarantee. Should identical operational issues re-occur within 30 days of completion, a rework technician will be assigned without additional labor service fee charges.</p>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">5. Limitation of Liability &amp; Jurisdiction</h2>
<p class="mb-6 text-blue-900 leading-7">Our liability is limited to professional re-performance of the booked service or refund of verified labor fees. These Terms &amp; Conditions are governed by municipal laws and fall under the exclusive jurisdiction of the courts located in Lucknow, Uttar Pradesh.</p>`

function TermsAndConditionPage({
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
  pages = [],
  searchSuggestions,
  user,
}) {
  const branding = appSettings.branding || {}
  const appName = branding.app_name?.value || 'Rehanshi'
  const pageData = pages.find((p) => p.slug === 'terms-and-condition') || {
    title: 'Terms & Conditions',
    content: fallbackTerms,
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
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider">{appName} Legal &amp; Compliance</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-[#003F86]">{pageData.title || 'Terms & Conditions'}</h1>
          
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-4  lg:px-8">
        {/* Direct page layout without card containers as requested */}
        <div 
          className="prose max-w-none text-base leading-7 text-blue-900 space-y-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-[#003F86] [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-[#003F86] [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-[#003F86] [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:list-inside [&>ul]:space-y-2 [&>ul]:mb-6 [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:space-y-2 [&>ol]:mb-6 [&>a]:text-blue-600 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4 [&>iframe]:w-full [&>iframe]:aspect-video [&>iframe]:rounded-xl [&>iframe]:my-8 [&>iframe]:shadow-lg [&>video]:w-full [&>video]:aspect-video [&>video]:rounded-xl [&>video]:my-8 [&>video]:shadow-lg"
          dangerouslySetInnerHTML={{ __html: pageData.content || fallbackTerms }}
        />
      </section>

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default TermsAndConditionPage
