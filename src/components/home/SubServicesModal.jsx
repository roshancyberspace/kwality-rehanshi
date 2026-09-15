import React from 'react';
import { useBodyScrollLock } from '../../utils/modalScrollLock';

export default function SubServicesModal({ onClose, onSelectSubService, service }) {
  useBodyScrollLock(Boolean(service));
  if (!service) return null;

  const subServices = service.sub_services || service.subServices || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs animate-modal-fade lg:items-center lg:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full flex-col justify-end animate-modal-slide lg:max-w-[540px] lg:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-end pb-3 pr-4 lg:absolute lg:-top-11 lg:right-0 lg:pb-0 lg:pr-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg transition duration-200 hover:bg-slate-100 hover:scale-105 focus:outline-none z-10"
          >
            <svg className="h-5 w-5 font-extrabold text-slate-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative max-h-[85vh] w-full overflow-y-auto custom-thin-scrollbar rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-all lg:rounded-xl lg:pb-6">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-4 sm:mb-5">
            {service.name}
          </h2>

          {subServices.length === 0 ? (
            <div className="my-6 text-center text-slate-500">
              <p className="text-sm font-semibold">No sub-services available.</p>
              <button
                type="button"
                onClick={() => onSelectSubService(null, service)}
                className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all"
              >
                View Packages Directly
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5">
              {subServices.map((subService) => (
                <button
                  key={subService.id}
                  type="button"
                  onClick={() => onSelectSubService(subService, service)}
                  className="group flex flex-col items-center focus:outline-none cursor-pointer transition duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex h-14 sm:h-16 w-full items-center justify-center p-1 transition-transform duration-200">
                    {subService.icon && (subService.icon.startsWith('http') || subService.icon.startsWith('/') || subService.icon.endsWith('.png') || subService.icon.endsWith('.svg') || subService.icon.endsWith('.webp')) ? (
                      <img
                        src={subService.icon}
                        alt={subService.name}
                        className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-300 group-hover:scale-115 drop-shadow-sm"
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl transition-transform duration-300 group-hover:scale-115 select-none drop-shadow-sm">
                        {subService.icon || '✨'}
                      </span>
                    )}
                  </div>
                  <span className="relative mt-1.5 w-full max-w-[165px] px-1 pb-1 text-center text-xs sm:text-[13px] font-bold text-slate-800 leading-snug transition-colors duration-200 group-hover:text-[#003F86]">
                    {subService.name}
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#003F86] transition-all duration-300 ease-out group-hover:w-full"></span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
