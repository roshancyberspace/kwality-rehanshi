function ServiceQuickCard({ onSelect, service }) {
  return (
    <button
      className="group flex flex-col items-center text-center transition duration-200 hover:-translate-y-0.5 focus:outline-none"
      onClick={onSelect}
      type="button"
    >
      <span className="flex h-15 w-15 sm:h-16 sm:w-16 items-center justify-center overflow-hidden p-2 transition-transform duration-200">
        <img
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
          src={service.image}
          alt={service.name}
        />
      </span>
      <span className="relative mt-2 max-w-[125px] pb-1 text-[13px] sm:text-sm font-normal sm:font-medium text-slate-700 leading-tight transition-colors duration-200 group-hover:text-[#003F86]">
        {service.name}
        <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#003F86] transition-all duration-300 ease-out group-hover:w-full"></span>
      </span>
    </button>
  )
}

export default ServiceQuickCard
