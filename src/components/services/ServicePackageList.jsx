import { getCartItemQuantity } from './ServiceCartUtils'

function QuantityStepper({ item, onAdd, onUpdateQuantity, quantity }) {
  const itemKey = item.id ?? item.name

  if (!quantity) {
    return (
      <button
        className="h-10 rounded-md border border-[#003F86] px-5 text-sm font-bold hover:bg-[#003F86] hover:text-white"
        onClick={() => onAdd(item)}
        type="button"
      >
        Add
      </button>
    )
  }

  return (
    <div className="grid h-10 grid-cols-3 items-center overflow-hidden rounded-md border border-[#003F86] text-sm font-bold">
      <button
        aria-label={`Remove one ${item.name}`}
        className="h-full px-3 text-lg hover:bg-[#003F86] hover:text-white"
        onClick={() => onUpdateQuantity(itemKey, quantity - 1)}
        type="button"
      >
        -
      </button>
      <span className="min-w-9 text-center">{quantity}</span>
      <button
        aria-label={`Add one more ${item.name}`}
        className="h-full px-3 text-lg hover:bg-[#003F86] hover:text-white"
        onClick={() => onAdd(item)}
        type="button"
      >
        +
      </button>
    </div>
  )
}

function ServicePackageList({ cart = [], packages, title, subtitle, onAdd, onUpdateQuantity }) {
  const getPackageQuantity = (item) => getCartItemQuantity(cart, item)

  return (
    <div className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 p-5">
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-blue-700">{subtitle}</p>}
      </div>

      <div className="divide-y divide-black/10">
        {packages.map((item) => (
          <article className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]" key={item.name}>
            <div>
              <h3 className="text-lg font-bold">{item.name}</h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-blue-800">
                <span>{item.rating} rated</span>
                <span>{item.jobs}</span>
                <span>{item.duration}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-base font-bold">{typeof item.price === 'number' ? `Rs. ${item.price}` : item.price}</p>
                {item.originalPrice && (
                  <p className="text-sm text-blue-300 line-through">Rs. {item.originalPrice}</p>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-800">{item.description}</p>
              {item.highlights && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.highlights.map((highlight) => (
                    <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800" key={highlight}>
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <QuantityStepper
              item={item}
              onAdd={onAdd}
              onUpdateQuantity={onUpdateQuantity}
              quantity={getPackageQuantity(item)}
            />
          </article>
        ))}
      </div>
    </div>
  )
}

export default ServicePackageList
