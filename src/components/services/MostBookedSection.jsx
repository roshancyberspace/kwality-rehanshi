import React from 'react'

const defaultMostBooked = [
  {
    name: 'AC Service',
    rating: '4.8',
    price: 'Rs.499',
    image: '/acservices.png',
    bgClass: 'bg-[#F2F8FF] border-blue-100 hover:border-blue-300',
    btnHover: 'hover:bg-[#003F86] hover:text-white',
  },
  {
    name: 'Cleaning',
    rating: '4.8',
    price: 'Rs.399',
    image: '/cleaning.png',
    bgClass: 'bg-[#F0FDF4] border-emerald-100 hover:border-emerald-300',
    btnHover: 'hover:bg-[#003F86] hover:text-white',
  },
  {
    name: 'Salon & Spa',
    rating: '4.8',
    price: 'Rs.299',
    image: '/facel.png',
    bgClass: 'bg-[#FFF1F2] border-rose-100 hover:border-rose-300',
    btnHover: 'hover:bg-[#003F86] hover:text-white',
  },
  {
    name: 'Appliance Repair',
    rating: '4.8',
    price: 'Rs.249',
    image: '/sofacleing.png',
    bgClass: 'bg-[#FFFBEB] border-amber-100 hover:border-amber-300',
    btnHover: 'hover:bg-[#003F86] hover:text-white',
  },
]

function MostBookedSection({ onServiceSelect, services = [] }) {
  const handleClick = (item) => {
    const found = services.find((s) => s.name?.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]))
    if (found) {
      onServiceSelect?.(found)
    } else {
      onServiceSelect?.({
        name: item.name,
        price: item.price,
        rating: item.rating,
        image: item.image,
        description: `Top rated ${item.name} performed by background-verified professionals.`,
      })
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#1D1D1D] tracking-tight">
          <span>🔥</span>
          <span>Most Booked Services</span>
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
          Top rated and most booked services by our customers
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {defaultMostBooked.map((item, index) => (
          <button
            key={item.name + index}
            type="button"
            onClick={() => handleClick(item)}
            className={`text-left rounded-xl p-3 ${item.bgClass} border flex flex-col justify-between cursor-pointer focus:outline-none transition-colors duration-200`}
          >
            <div>
              <div className="aspect-16/10 w-full overflow-hidden rounded-lg mb-3 bg-white p-1.5 flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {item.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] mt-1.5 mb-3 gap-1">
                  <span className="inline-flex items-center gap-0.5 font-bold text-slate-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">
                    <span className="text-amber-500">★</span>
                    <span>{item.rating}</span>
                  </span>
                  <span className="text-slate-500">
                    Starting at <span className="font-bold text-slate-800">{item.price}</span>
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`w-full py-2 bg-white rounded-lg text-[11px] font-bold text-[#003F86] border border-slate-200 flex items-center justify-center gap-1.5 transition-colors duration-200 ${item.btnHover}`}
            >
              <span>Book Now</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default MostBookedSection
