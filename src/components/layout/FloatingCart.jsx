function FloatingCart({ activePath = '', cartCount = 0, onOpenCart }) {
  const hiddenPaths = [
    '/cart',
    '/checkout',
    '/place-booking',
    '/admin',
    '/vendor',
    '/staff-login',
    '/become-service-provider',
    '/terms',
    '/privacy',
  ]

  if (!cartCount || cartCount <= 0) return null

  if (activePath && hiddenPaths.some((path) => activePath === path || activePath.startsWith(path))) {
    return null
  }

  if (activePath && activePath.startsWith('/services/') && activePath !== '/services') {
    return null
  }

  return (
    <div className="fixed bottom-6 right-5 z-50 flex items-center lg:hidden transition-all duration-300 ease-out animate-[fadeIn_0.3s_ease-out]">
      <button
        aria-label="Open cart"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#003F86] via-[#004A9E] to-[#005BBE] text-white shadow-2xl shadow-[#003F86]/45 ring-4 ring-white/90 transition-all duration-300 hover:scale-105 active:scale-95"
        onClick={onOpenCart}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-0.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 7H6" />
        </svg>
        <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#67B529] px-1.5 text-xs font-black leading-none text-white shadow-md ring-2 ring-white transition-transform duration-300 group-hover:scale-110">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      </button>
    </div>
  )
}

export default FloatingCart
