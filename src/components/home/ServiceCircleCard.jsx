function ServiceCircleCard({ onSelect, service }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group h-full flex flex-col w-full rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#67B529] hover:shadow-xl"
    >
      {/* Image */}
      <div className="flex justify-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#003F86] to-[#0054A6] p-1 transition duration-300 group-hover:scale-105">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-white">
            <img
              src={service.image}
              alt={service.name}
              className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-110"
            />
          </div>
        </div>
      </div>

      {/* Badge */}
      {service.badge && (
        <div className="mt-4 flex justify-center">
          <span className="rounded-full bg-[#67B529] px-3 py-1 text-xs font-semibold text-white">
            {service.badge}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="mt-5 line-clamp-2 text-center text-lg font-bold text-slate-800 transition group-hover:text-[#67B529]">
        {service.name}
      </h3>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-center text-xs sm:text-sm text-slate-500 flex-grow">
        {service.description || "Professional healthcare service by experienced specialists."}
      </p>

      {/* Button */}
      <div className="mt-4 sm:mt-6 flex justify-center">
        <span className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-[#003F86] px-3 py-2 sm:px-5 text-xs sm:text-sm font-semibold text-white transition group-hover:bg-[#67B529] whitespace-nowrap">
          Book Now

          <svg
            className="h-4 w-4 transition group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 12h14"
              strokeLinecap="round"
            />
            <path
              d="M13 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </button>
  );
}

export default ServiceCircleCard;