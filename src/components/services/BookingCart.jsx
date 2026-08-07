function BookingCart({ cart, emptyTitle, emptyText, onContinue, total }) {
  return (
    <aside className="h-fit rounded-lg border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-28">
      <h2 className="text-xl font-bold">Cart</h2>
      {cart.length === 0 ? (
        <div className="mt-5 rounded-lg bg-[#F6FBFF] p-5 text-center">
          <p className="font-semibold">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-blue-700">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {cart.map((item) => (
            <div className="flex items-start justify-between gap-3 text-sm" key={item.name}>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-blue-700">Qty {item.quantity}</p>
              </div>
              <p className="font-bold">{typeof item.lineTotal === 'number' ? `Rs. ${item.lineTotal}` : item.price}</p>
            </div>
          ))}
          <div className="border-t border-blue-100 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rs. {total}</span>
            </div>
            <button
              className="mt-4 w-full rounded-md bg-[#003F86] px-4 py-3 text-sm font-bold text-white hover:bg-[#0054A6]"
              onClick={onContinue}
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default BookingCart
