import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'

const fallbackContent = `<h2 class="text-2xl font-bold text-[#003F86] mt-4 mb-3">1. Overview</h2>
<p class="mb-4 text-blue-900 leading-7">At Rehanshi, protecting your privacy and personal information is one of our core commitments. This Privacy Policy outlines our practices regarding data gathering, utilization, retention, and sharing when you visit our marketplace website, request home services, or communicate with our customer support and service partners.</p>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">2. Information We Collect</h2>
<p class="mb-3 text-blue-900 leading-7">We collect information to deliver reliable, safe, and transparent home services. The types of data we collect include:</p>
<ul class="list-disc list-inside space-y-2 mb-6 text-blue-900 leading-7">
  <li><strong>Account &amp; Profile Data:</strong> Name, phone number, email address, and saved address locations provided during sign-up or booking.</li>
  <li><strong>Service &amp; Booking Details:</strong> Service schedules, repair notes, chosen packages, instructions for service technicians, and transaction history.</li>
  <li><strong>Location Information:</strong> Service delivery addresses and geolocation data needed to connect you with verified professionals in operational zones.</li>
  <li><strong>Communication Records:</strong> Customer support messages, ratings, reviews, feedback, and telephone interactions regarding ongoing jobs.</li>
</ul>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">3. How We Use Your Information</h2>
<p class="mb-3 text-blue-900 leading-7">We leverage your collected personal information strictly to operate and enhance our service delivery:</p>
<ul class="list-disc list-inside space-y-2 mb-6 text-blue-900 leading-7">
  <li>To match your booking requests with verified, trained background-checked professionals in your area.</li>
  <li>To facilitate service notifications, order status tracking, invoice generation, and real-time alerts.</li>
  <li>To continuously optimize pricing transparency, service quality assurances, and user experience across our digital platforms.</li>
  <li>To prevent fraudulent activities, investigate safety grievances, and enforce user compliance agreements.</li>
</ul>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">4. Data Sharing &amp; Disclosure</h2>
<p class="mb-4 text-blue-900 leading-7">We respect your privacy and never sell or monetize your individual profile information to advertisers. Relevant contact numbers and address details are shared exclusively with the assigned background-checked technician to fulfill your booking.</p>
<h2 class="text-2xl font-bold text-[#003F86] mt-8 mb-3">5. Data Security &amp; Retention</h2>
<p class="mb-6 text-blue-900 leading-7">We enforce administrative, logical, and technical infrastructure protocols designed to safeguard personal information from unauthorized access, breaches, or disclosure. Personal account profile history and transaction logs are preserved for as long as your profile remains active.</p>`

function PrivacyPolicyPage({
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
  const pageData = pages.find((p) => p.slug === 'privacy-policy') || {
    title: 'Privacy Policy',
    content: fallbackContent,
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
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider">{appName} Legal &amp; Compliance</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-[#003F86]">{pageData.title || 'Privacy Policy'}</h1>
          
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-4  lg:px-8">
        {/* Direct page layout without card containers as requested */}
        <div 
          className="prose max-w-none text-base leading-7 text-blue-900 space-y-6 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-[#003F86] [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-[#003F86] [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-[#003F86] [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:list-inside [&>ul]:space-y-2 [&>ul]:mb-6 [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:space-y-2 [&>ol]:mb-6 [&>a]:text-blue-600 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4 [&>iframe]:w-full [&>iframe]:aspect-video [&>iframe]:rounded-xl [&>iframe]:my-8 [&>iframe]:shadow-lg [&>video]:w-full [&>video]:aspect-video [&>video]:rounded-xl [&>video]:my-8 [&>video]:shadow-lg"
          dangerouslySetInnerHTML={{ __html: pageData.content || fallbackContent }}
        />
      </section>

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default PrivacyPolicyPage
