function ProfileHeader({ cartCount, orderCount, reviewCount, savedAddressCount }) {
  const stats = [
    { label: 'Total orders', value: orderCount },
    { label: 'Saved addresses', value: savedAddressCount },
    { label: 'Reviews', value: reviewCount },
    { label: 'Cart items', value: cartCount },
  ]

  return (
    <section className="border-b border-blue-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8 lg:py-4">
        <p className="text-[13px] font-semibold text-blue-700">Account dashboard</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Profile</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-blue-800">
              Manage personal details, saved addresses, bookings, wallet, service history, and reviews in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-blue-100 sm:grid-cols-4">
            {stats.map((stat) => (
              <div className="min-w-0 border-r border-blue-100 px-2 py-2 text-center last:border-r-0 sm:px-4 lg:min-w-36" key={stat.label}>
                <p className="text-lg font-semibold leading-tight">{stat.value}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-blue-700">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProfileHeader
