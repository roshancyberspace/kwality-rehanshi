const couponToFeature = (coupon) => ({
  title: coupon.type === 'Percentage' ? `${coupon.value} discount` : `${coupon.value} discount`,
  text: coupon.minimum_order ? `Use ${coupon.code} on orders above Rs. ${coupon.minimum_order}` : `Use code ${coupon.code}`,
  image: coupon.metadata?.image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
})

function FeaturedOffers({ coupons }) {
  const offers = coupons?.length ? coupons.slice(0, 2).map(couponToFeature) : []

  if (!offers.length) return null

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 md:grid-cols-2 lg:px-8">
      {offers.map((item) => (
        <article key={item.title} className="grid overflow-hidden rounded-lg bg-[#003F86] text-white sm:grid-cols-2">
          <div className="p-7">
            <p className="text-sm text-white/60">Limited offer</p>
            <h3 className="mt-3 text-2xl font-bold">{item.title}</h3>
            <p className="mt-3 text-white/70">{item.text}</p>
            <button className="mt-6 rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#003F86]">
              Book now
            </button>
          </div>
          <img className="h-64 w-full object-cover sm:h-full" src={item.image} alt={item.title} />
        </article>
      ))}
    </section>
  )
}

export default FeaturedOffers
