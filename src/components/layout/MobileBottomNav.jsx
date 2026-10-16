function MobileBottomNav({ activePath, cartCount, isLoggedIn, onOpenAccount, onOpenCart, onOpenServices }) {
  const items = [
    { id: 'services', label: 'Services', onClick: onOpenServices },
    { id: 'cart', label: 'Cart', onClick: onOpenCart },
    { id: 'account', label: 'Account', onClick: onOpenAccount },
  ]

  const isActive = (id) => {
    if (id === 'cart') return activePath === '/cart'
    if (id === 'account') return activePath === '/profile'
    return activePath.startsWith('/services')
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-blue-900/15 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            className={`relative rounded-lg px-2 py-2 text-xs font-black ${
              isActive(item.id) ? 'bg-[#003F86] text-white' : 'text-blue-800 hover:bg-blue-50'
            }`}
            key={item.id}
            onClick={item.onClick}
            type="button"
          >
            <span className="block">{item.label}</span>
            {item.id === 'cart' && cartCount > 0 && (
              <span className="absolute right-3 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#67B529] px-1 text-[10px] font-black text-white ring-2 ring-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
            {item.id === 'account' && !isLoggedIn && (
              <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-blue-300" />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default MobileBottomNav
