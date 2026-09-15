import { useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { frontendApi } from '../../services/frontendApi'

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
  const appName = branding.app_name?.value || 'REHANSHI'

  const defaults = {
    address: 'Lucknow, Uttar Pradesh',
    email: 'support@Rehanshi.com',
    phone: '+91 98765 43210',
    service_area_text: 'Currently serving Lucknow. Choose a Lucknow service address during checkout even if your browser location is outside the city.',
    whatsapp: '+91 98765 43210',
  }

  const phone = contact.phone?.value || defaults.phone
  const email = contact.email?.value || defaults.email
  const whatsapp = contact.whatsapp?.value || defaults.whatsapp
  const address = contact.address?.value || defaults.address
  const serviceAreaText = contact.service_area_text?.value || defaults.service_area_text
  const cleanPhone = phone.replace(/[^\d+]/g, '')
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, '')

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    queryType: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState(null)
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (submitError) setSubmitError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim() || !formData.queryType || !formData.message.trim()) {
      setSubmitError('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await frontendApi.submitContactInquiry({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        query_type: formData.queryType,
        message: formData.message.trim(),
      })

      setSubmittedTicket({
        ticketNo: response.ticket_no || response.ticket?.ticket_no || 'TIC-' + Math.floor(10000 + Math.random() * 90000),
        customerEmailSent: response.customer_email_sent,
        hasEmail: Boolean(formData.email.trim()),
      })

      setFormData({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        queryType: '',
        message: '',
      })
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to submit inquiry. Please try again or reach out via WhatsApp/Phone.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickHelpClick = (type) => {
    setFormData((prev) => ({ ...prev, queryType: type }))
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] text-slate-800 font-sans">
      {/* Sticky Top Navbar */}
      <div className="sticky top-0 z-40 bg-white shadow-2xs">
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
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6 py-3.5 sm:py-5 space-y-4 sm:space-y-4.5">
        
        {/* Top Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left Title & Intro */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-[#16A34A] rounded-full" />
              <span className="text-[10.5px] font-black tracking-widest text-[#16A34A] uppercase">
                {appName.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-[#0B2545] tracking-tight leading-none">
              Contact <span className="text-[#16A34A]">us</span>
            </h1>

            <p className="text-[11.5px] sm:text-xs leading-relaxed text-slate-600 max-w-xl">
              Reach the support team for bookings, service questions, partner onboarding and payments. We&apos;re here to help!
            </p>

            {/* 4 Trust Badges */}
            <div className="pt-0.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Quick Response */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 shadow-2xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E8F8EE] text-[#16A34A]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Quick</p>
                  <p className="text-[9.5px] text-slate-500 font-medium">Response</p>
                </div>
              </div>

              {/* Dedicated Support Team */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 shadow-2xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EBF5FF] text-[#1877F2]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Dedicated</p>
                  <p className="text-[9.5px] text-slate-500 font-medium truncate">Support Team</p>
                </div>
              </div>

              {/* Mon - Sun */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 shadow-2xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EBF5FF] text-[#1877F2]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Mon – Sun</p>
                  <p className="text-[9.5px] text-slate-500 font-medium truncate">9:00 AM – 9:00 PM</p>
                </div>
              </div>

              {/* Trusted by Thousands */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 shadow-2xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EBF5FF] text-[#1877F2]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Trusted by</p>
                  <p className="text-[9.5px] text-slate-500 font-medium">Thousands</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Card: Support Partner */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[24px] bg-[#E8F3FD] border border-blue-100/90 px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5 shadow-2xs min-h-[148px] sm:min-h-[156px] flex items-center justify-between">
              {/* Organic Soft Wave Background on Right */}
              <div className="absolute right-0 top-0 bottom-0 w-[48%] bg-gradient-to-l from-[#D0E7FC] to-transparent rounded-r-[24px] pointer-events-none" />
              <div className="absolute -right-4 -top-8 w-44 h-44 rounded-full bg-[#CCE4FC]/60 blur-xl pointer-events-none" />

              {/* Left Content */}
              <div className="relative z-10 min-w-0 max-w-[62%] sm:max-w-[60%]">
                <p className="text-lg sm:text-xl font-bold text-[#0B2545] leading-none">Your</p>
                <p className="text-xl sm:text-2xl font-black text-[#0B2545] leading-tight mt-0.5">Support Partner</p>
                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Professional. Reliable. Always Here.</p>
                
                <div className="h-0.5 w-8 bg-[#16A34A] rounded-full mt-1.5 mb-2.5" />

                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">10K+</p>
                    <p className="text-[9px] font-semibold text-slate-600 mt-0.5 leading-tight">Happy Customers</p>
                  </div>
                  <div className="h-5 w-px bg-slate-300" />
                  <div>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">4.8★</p>
                    <p className="text-[9px] font-semibold text-slate-600 mt-0.5 leading-tight">Service Rating</p>
                  </div>
                  <div className="h-5 w-px bg-slate-300" />
                  <div>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">24/7</p>
                    <p className="text-[9px] font-semibold text-slate-600 mt-0.5 leading-tight">Customer Support</p>
                  </div>
                </div>
              </div>

              {/* Right Support Agent Image Emerging From Bottom Right */}
              <div className="absolute right-1 sm:right-3 -bottom-1 z-10 w-32 sm:w-36 md:w-40 h-[145px] sm:h-[155px] pointer-events-none flex items-end justify-end">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                  alt="Support Representative"
                  className="h-full w-auto object-cover object-top drop-shadow-sm"
                  style={{
                    maskImage: 'linear-gradient(to top, black 85%, transparent 100%), linear-gradient(to right, transparent 0%, black 20%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%)'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main 2-Column Content Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Channels & Service Area */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Get in touch instantly */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Get in touch instantly</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Choose your preferred way to contact us</p>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Call Us */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 flex flex-col justify-between hover:border-green-300 transition-colors shadow-2xs">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#E8F8EE] text-[#16A34A] shadow-xs">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 mt-2">Call Us</p>
                    <p className="text-[11px] font-black text-slate-900 mt-0.5 truncate">{phone}</p>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">Tap to call now</p>
                  </div>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="mt-2.5 flex items-center justify-center gap-1 rounded-md bg-[#16A34A] hover:bg-[#15803D] py-1.5 px-2 text-[11px] font-bold text-white shadow-xs transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Now
                  </a>
                </div>

                {/* 2. WhatsApp */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 flex flex-col justify-between hover:border-green-300 transition-colors shadow-2xs">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#E8F8EE] text-[#16A34A] shadow-xs">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 mt-2">WhatsApp</p>
                    <p className="text-[11px] font-black text-slate-900 mt-0.5 truncate">{whatsapp}</p>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">Chat with us</p>
                  </div>
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 flex items-center justify-center gap-1 rounded-md border border-[#16A34A]/40 bg-[#F0FDF4] hover:bg-[#DCFCE7] py-1.5 px-2 text-[11px] font-bold text-[#16A34A] transition-colors"
                  >
                    <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    Chat on WhatsApp
                  </a>
                </div>

                {/* 3. Email Us */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-2xs">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#EBF5FF] text-[#1877F2] shadow-xs">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 mt-2">Email Us</p>
                    <p className="text-[11px] font-black text-slate-900 mt-0.5 truncate">{email}</p>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">Drop us an email</p>
                  </div>
                  <a
                    href={`mailto:${email}`}
                    className="mt-2.5 flex items-center justify-center gap-1 rounded-md border border-blue-200 bg-[#F0F7FF] hover:bg-[#E0EFFF] py-1.5 px-2 text-[11px] font-bold text-[#1877F2] transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
                  </a>
                </div>

                {/* 4. Our Location */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 flex flex-col justify-between hover:border-purple-300 transition-colors shadow-2xs">
                  <div>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#F3E8FF] text-[#8B5CF6] shadow-xs">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 mt-2">Our Location</p>
                    <p className="text-[11px] font-black text-slate-900 mt-0.5 truncate">{address}</p>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">Visit our office</p>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 flex items-center justify-center gap-1 rounded-md border border-purple-200 bg-[#FAF5FF] hover:bg-[#F3E8FF] py-1.5 px-2 text-[11px] font-bold text-[#8B5CF6] transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    View on Maps
                  </a>
                </div>
              </div>
            </div>

            {/* Service Area Card */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              {/* Decorative Subtle Background Map/Grid */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none">
                <svg className="w-full h-full text-blue-400" viewBox="0 0 300 200" fill="none" stroke="currentColor">
                  <path d="M0 50 Q100 20 200 80 T300 120" strokeWidth="1.5" />
                  <path d="M0 120 Q80 160 180 110 T300 170" strokeWidth="1.5" />
                  <path d="M120 0 L150 200" strokeWidth="1" strokeDasharray="4 4" />
                  <path d="M220 0 L240 200" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EBF5FF] text-[#1877F2]">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Service area</h3>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 max-w-md">
                    {serviceAreaText}
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#E8F8EE] border border-green-200 px-2.5 py-1 text-[11px] font-bold text-[#16A34A]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Service City: Lucknow, Uttar Pradesh</span>
                  </div>
                </div>

                {/* Right Lucknow Landmark Card with Architectural Sketch */}
                <div className="shrink-0 w-full sm:w-auto flex sm:flex-col items-center justify-between gap-2">
                  <div className="rounded-lg border border-blue-200/80 bg-[#F4F9FF] px-3 py-1.5 shadow-2xs flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1877F2] text-white shadow-xs">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-tight">Lucknow</p>
                      <p className="text-[9.5px] font-medium text-slate-500">Our Service City</p>
                    </div>
                  </div>

                  {/* Lucknow Rumi Darwaza / City Skyline Line Art */}
                  <div className="text-blue-400 opacity-80 hidden sm:block">
                    <svg className="w-28 h-8" viewBox="0 0 144 48" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M4 44 H140" />
                      <path d="M16 44 V20 L20 16 L24 20 V44" />
                      <path d="M18 16 V10 L20 8 L22 10 V16" />
                      <path d="M120 44 V20 L124 16 L128 20 V44" />
                      <path d="M122 16 V10 L124 8 L126 10 V16" />
                      <path d="M36 44 V24 Q72 6 108 24 V44" />
                      <path d="M50 44 V30 Q72 16 94 30 V44" />
                      <path d="M60 44 V34 Q72 26 84 34 V44" />
                      <path d="M72 11 V4" />
                      <circle cx="72" cy="3" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Send Us A Message Form */}
          <div className="lg:col-span-5" id="contact-form">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Send us a message</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Fill out the form and our team will get back to you shortly.</p>
              </div>

              {submittedTicket ? (
                <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 p-4 text-center space-y-2.5 shadow-2xs">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800 text-[10.5px] font-extrabold tracking-wide">
                      Ticket #{submittedTicket.ticketNo}
                    </span>
                    <h3 className="text-sm font-bold text-emerald-950 mt-1">Inquiry Submitted Successfully!</h3>
                    <p className="text-[11px] text-emerald-700 mt-1 max-w-sm mx-auto leading-relaxed">
                      Thank you for contacting us. A notification has been sent to our support team and an acknowledgement email has been dispatched.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSubmittedTicket(null)}
                      className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-center gap-2">
                      <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{submitError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Your Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full rounded-lg border border-slate-300/90 bg-white pl-8 pr-2.5 py-1.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86] transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Your Phone Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Your Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </span>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-lg border border-slate-300/90 bg-white pl-8 pr-2.5 py-1.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86] transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Your Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Your Email (optional)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="yourname@example.com"
                          className="w-full rounded-lg border border-slate-300/90 bg-white pl-8 pr-2.5 py-1.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86] transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Select Query Type */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Select Query Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </span>
                        <select
                          required
                          value={formData.queryType}
                          onChange={(e) => handleInputChange('queryType', e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-300/90 bg-white pl-8 pr-7 py-1.5 text-[11.5px] text-slate-800 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86] transition-all font-medium cursor-pointer"
                        >
                          <option value="" disabled>Choose a query Type</option>
                          <option value="General Inquiry">General Inquiry</option>
                          <option value="Booking Issue">Booking Issue</option>
                          <option value="Payment & Refund">Payment & Refund</option>
                          <option value="Partner Onboarding">Partner Onboarding</option>
                          <option value="Feedback & Suggestions">Feedback & Suggestions</option>
                          <option value="Complaint">Complaint</option>
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Your Message */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute top-2.5 left-2.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </span>
                      <textarea
                        required
                        rows={3}
                        maxLength={500}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Tell us how we can help you..."
                        className="w-full rounded-lg border border-slate-300/90 bg-white pl-8 pr-2.5 pt-2 pb-5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86] transition-all font-medium resize-none"
                      />
                      <div className="absolute bottom-1.5 right-2.5 text-[9.5px] font-semibold text-slate-400">
                        {formData.message.length}/500
                      </div>
                    </div>
                  </div>

                  {/* Send Message Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-[#0052CC] hover:bg-[#0047B3] active:scale-[0.99] py-2.5 px-4 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5 fill-current -rotate-45" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                        <span>Send Message</span>
                      </>
                    )}
                  </button>

                  {/* Security Note */}
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500 text-center pt-0.5 font-medium">
                    <svg className="h-3 w-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Your information is safe with us. We typically respond within a few hours.</span>
                  </p>
                </form>
              )}
            </div>
          </div>

        </section>

        {/* Need Help With? Quick Categories Section */}
        <section className="pt-1 pb-4">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-[#1877F2] rounded-full" />
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">Need help with?</h3>
          </div>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Bookings */}
            <button
              type="button"
              onClick={() => handleQuickHelpClick('Booking Issue')}
              className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EBF5FF] text-[#1877F2]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-900 group-hover:text-[#1877F2] transition-colors">Bookings</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Modify or cancel booking</p>
                </div>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#1877F2] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Payments */}
            <button
              type="button"
              onClick={() => handleQuickHelpClick('Payment & Refund')}
              className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs hover:border-green-300 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E8F8EE] text-[#16A34A]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-900 group-hover:text-[#16A34A] transition-colors">Payments</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Refunds and transactions</p>
                </div>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Partner Onboarding */}
            <button
              type="button"
              onClick={() => handleQuickHelpClick('Partner Onboarding')}
              className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F3E8FF] text-[#8B5CF6]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-900 group-hover:text-[#8B5CF6] transition-colors">Partner Onboarding</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Join as a service partner</p>
                </div>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* General Support */}
            <button
              type="button"
              onClick={() => handleQuickHelpClick('General Inquiry')}
              className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EBF5FF] text-[#1877F2]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-slate-900 group-hover:text-[#1877F2] transition-colors">General Support</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Get answers to common questions</p>
                </div>
              </div>
              <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#1877F2] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

      </div>

      {/* Floating Green WhatsApp Button */}
      <a
        href={`https://wa.me/${cleanWhatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer"
      >
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        <span>Chat with us</span>
      </a>

      {/* Footer */}
      <Footer appSettings={appSettings} />
    </main>
  )
}

export default ContactPage
