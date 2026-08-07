import React from 'react'

function SupportHelpBanner({ onContactSupport }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
      <div className="relative overflow-hidden rounded-2xl bg-[#003F86] p-5 sm:p-6 shadow-sm text-white flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Info Area */}
        <div className="flex items-center gap-4 w-full md:w-auto text-center md:text-left flex-col sm:flex-row">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shrink-0">
            📱
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Need help choosing?
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">
              Our support team is here for you!
            </p>
          </div>
        </div>

        {/* Action Button & Decor */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-end">
          <button
            type="button"
            onClick={onContactSupport || (() => window.location.href = '/contact')}
            className="group inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-[#003F86] hover:bg-white hover:text-[#003F86] px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-blue-200 group-hover:text-[#003F86] transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default SupportHelpBanner
