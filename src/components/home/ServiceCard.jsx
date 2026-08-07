function ServiceCard({ onSelect, service }) {
  return (
    <button
      className="group overflow-hidden rounded-xl border border-blue-100 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#67B529] hover:shadow-lg"
      onClick={onSelect}
      type="button"
    >
      <img className="h-40 w-full object-contain p-2 transition duration-300 group-hover:scale-105" src={service.image} alt={service.name} />
      <div className="flex items-center justify-between p-4">
        <span className="font-semibold transition duration-200 group-hover:text-[#67B529]">{service.name}</span>
        <span className="text-xl text-blue-300 transition duration-200 group-hover:translate-x-1 group-hover:text-[#67B529]">-&gt;</span>
      </div>
    </button>
  )
}

export default ServiceCard
