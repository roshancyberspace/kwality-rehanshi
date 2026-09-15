import React from 'react'

const getCategoryTheme = (service = {}, index = 0) => {
  const name = (service.name || '').toLowerCase()
  const slug = (service.slug || '').toLowerCase()
  const combined = `${name} ${slug}`

  if (combined.includes('women') || combined.includes('spa') || combined.includes('beauty') || combined.includes('makeup') || combined.includes('facial') || combined.includes('waxing')) {
    return {
      bgGradient: 'from-[#FFF0F4]/90 via-[#FFF6F9]/60 to-white',
      blobColor: 'bg-rose-200/50',
      badgeBg: 'text-rose-500',
      pillBg: 'bg-[#FFE8EF] text-[#D82A5D] border border-rose-200/60',
      checkColor: 'text-[#D82A5D]',
      icon: 'lotus',
      defaultTags: ['Facials', 'Hair Care', 'Spa Treatments'],
    }
  }

  if (combined.includes('men') || combined.includes('groom') || combined.includes('haircut') || combined.includes('shav') || combined.includes('massage')) {
    return {
      bgGradient: 'from-[#EDF6FF]/90 via-[#F4F9FF]/60 to-white',
      blobColor: 'bg-blue-200/50',
      badgeBg: 'text-[#0066FF]',
      pillBg: 'bg-[#E1F0FF] text-[#0066FF] border border-blue-200/60',
      checkColor: 'text-[#0066FF]',
      icon: 'scissors',
      defaultTags: ['Haircut', 'Shaving', 'Massage'],
    }
  }

  if (combined.includes('clean') || combined.includes('wash') || combined.includes('pest') || combined.includes('housekeep') || combined.includes('home')) {
    return {
      bgGradient: 'from-[#EAF9EE]/90 via-[#F3FCF5]/60 to-white',
      blobColor: 'bg-emerald-200/50',
      badgeBg: 'text-[#2E9B44]',
      pillBg: 'bg-[#E0F8E5] text-[#228B37] border border-emerald-200/60',
      checkColor: 'text-[#228B37]',
      icon: 'home',
      defaultTags: ['Home', 'Office', 'Deep Cleaning'],
    }
  }

  if (combined.includes('ac') || combined.includes('appliance') || combined.includes('refrigerat') || combined.includes('cool')) {
    return {
      bgGradient: 'from-[#F4ECFF]/90 via-[#FAF5FF]/60 to-white',
      blobColor: 'bg-purple-200/50',
      badgeBg: 'text-[#8A3FFC]',
      pillBg: 'bg-[#EFE4FF] text-[#7B2CBF] border border-purple-200/60',
      checkColor: 'text-[#7B2CBF]',
      icon: 'snowflake',
      defaultTags: ['Installation', 'Repair', 'Maintenance'],
    }
  }

  if (combined.includes('electr') || combined.includes('plumb') || combined.includes('carpent') || combined.includes('wire')) {
    return {
      bgGradient: 'from-[#FFF6EB]/90 via-[#FFFBF5]/60 to-white',
      blobColor: 'bg-amber-200/50',
      badgeBg: 'text-amber-600',
      pillBg: 'bg-[#FFEED9] text-[#C25E00] border border-amber-200/60',
      checkColor: 'text-[#C25E00]',
      icon: 'bolt',
      defaultTags: ['Wiring', 'Installation', 'Quick Fix'],
    }
  }

  if (combined.includes('interior') || combined.includes('paint') || combined.includes('decor')) {
    return {
      bgGradient: 'from-[#FFF2E8]/90 via-[#FFF8F2]/60 to-white',
      blobColor: 'bg-orange-200/50',
      badgeBg: 'text-orange-600',
      pillBg: 'bg-[#FFE6D5] text-[#C04A00] border border-orange-200/60',
      checkColor: 'text-[#C04A00]',
      icon: 'sparkles',
      defaultTags: ['Color Consult', 'Wall Decor', 'Waterproofing'],
    }
  }

  // Fallback palette cycled by index
  const themes = [
    {
      bgGradient: 'from-[#FFF0F4]/90 via-[#FFF6F9]/60 to-white',
      blobColor: 'bg-rose-200/50',
      badgeBg: 'text-rose-500',
      pillBg: 'bg-[#FFE8EF] text-[#D82A5D] border border-rose-200/60',
      checkColor: 'text-[#D82A5D]',
      icon: 'lotus',
      defaultTags: ['Verified', 'Expert Care', 'Top Rated'],
    },
    {
      bgGradient: 'from-[#EDF6FF]/90 via-[#F4F9FF]/60 to-white',
      blobColor: 'bg-blue-200/50',
      badgeBg: 'text-[#0066FF]',
      pillBg: 'bg-[#E1F0FF] text-[#0066FF] border border-blue-200/60',
      checkColor: 'text-[#0066FF]',
      icon: 'scissors',
      defaultTags: ['Fast Service', 'Certified', 'Affordable'],
    },
    {
      bgGradient: 'from-[#EAF9EE]/90 via-[#F3FCF5]/60 to-white',
      blobColor: 'bg-emerald-200/50',
      badgeBg: 'text-[#2E9B44]',
      pillBg: 'bg-[#E0F8E5] text-[#228B37] border border-emerald-200/60',
      checkColor: 'text-[#228B37]',
      icon: 'home',
      defaultTags: ['Hygienic', 'Guaranteed', 'Doorstep'],
    },
    {
      bgGradient: 'from-[#F4ECFF]/90 via-[#FAF5FF]/60 to-white',
      blobColor: 'bg-purple-200/50',
      badgeBg: 'text-[#8A3FFC]',
      pillBg: 'bg-[#EFE4FF] text-[#7B2CBF] border border-purple-200/60',
      checkColor: 'text-[#7B2CBF]',
      icon: 'snowflake',
      defaultTags: ['Inspection', 'Repair', 'Standard Rate'],
    },
  ]
  return themes[index % themes.length]
}

function renderCategoryBadgeIcon(iconName) {
  switch (iconName) {
    case 'lotus':
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21c-4.418 0-8-5-8-9 0-3 2-6 8-10 6 4 8 7 8 10 0 4-3.582 9-8 9z" />
          <path d="M12 21c-2-3-3-6-3-9 0-3 1.5-6 3-8 1.5 2 3 5 3 8 0 3-1 6-3 9z" />
        </svg>
      )
    case 'scissors':
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      )
    case 'home':
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'snowflake':
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="m20 16-4-4 4-4" />
          <path d="m4 8 4 4-4 4" />
          <path d="m16 4-4 4-4-4" />
          <path d="m8 20 4-4 4 4" />
        </svg>
      )
    case 'bolt':
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    default:
      return (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      )
  }
}

function ServiceCircleCard({ index = 0, onSelect, service }) {
  const theme = getCategoryTheme(service, index)

  return (
    <div
      onClick={onSelect}
      className={`group relative h-full flex flex-col justify-between w-full rounded-[28px] border border-slate-200/70 bg-gradient-to-br ${theme.bgGradient} p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:border-slate-300 cursor-pointer overflow-hidden text-left`}
    >
      {/* Soft fluid background decorative blobs */}
      <div className={`absolute -top-12 -left-12 h-44 w-44 rounded-full ${theme.blobColor} blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-110`} />
      <div className={`absolute -bottom-12 -right-12 h-36 w-36 rounded-full ${theme.blobColor} blur-2xl pointer-events-none opacity-50`} />

      <div>
        {/* Top Row: Illustration & Floating Category Badge */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="relative">
            {/* Glowing Backdrop Ring on Hover */}
            <div className={`absolute -inset-1 rounded-full ${theme.blobColor} opacity-0 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:scale-110`} />
            
            <div
              style={{ animationDelay: `${(index % 4) * 0.4}s` }}
              className="animate-float-icon relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden flex items-center justify-center bg-white/95 p-4 sm:p-4.5 shadow-sm border border-white transition-all duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md"
            >
              <img
                src={service.image}
                alt={service.name}
                className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-115"
              />
            </div>
          </div>

          {/* Floating Category Icon Badge */}
          <div className={`h-10 w-10 rounded-full bg-white/95 border border-slate-100 shadow-sm flex items-center justify-center ${theme.badgeBg} transition-all duration-300 group-hover:scale-115 group-hover:rotate-12`}>
            {renderCategoryBadgeIcon(theme.icon)}
          </div>
        </div>

        {/* Content: Title and Description */}
        <div className="relative z-10 mt-5">
          <h3 className="text-lg sm:text-[19px] font-extrabold text-slate-900 leading-tight group-hover:text-[#003F86] transition-colors line-clamp-1">
            {service.name}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">
            {service.description || 'Professional care and services provided by experienced specialists at your doorstep.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ServiceCircleCard