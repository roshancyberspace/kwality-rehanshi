import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import { buildBackendUrl } from '../../../config/urls'
import { StatusBadge } from '../../../components/admin/AdminUI'

function SearchThumbnail({ isPerson = false, name, src }) {
  const [error, setError] = useState(false)
  const imageUrl = src ? buildBackendUrl(src) : null
  const initial = name ? String(name).charAt(0).toUpperCase() : '?'

  if (imageUrl && !error) {
    return (
      <img
        alt={name || 'Thumbnail'}
        className={`h-9 w-9 shrink-0 object-cover border border-slate-200 ${isPerson ? 'rounded-full' : 'rounded-lg'}`}
        onError={() => setError(true)}
        src={imageUrl}
      />
    )
  }

  return (
    <div className={`grid h-9 w-9 shrink-0 place-items-center border border-slate-200 bg-slate-100 font-black text-slate-600 text-xs ${isPerson ? 'rounded-full' : 'rounded-lg'}`}>
      {initial}
    </div>
  )
}

export default function GlobalSearchBar({ globalSearch, onGlobalSearchChange, onSelectRecord }) {
  const [results, setResults] = useState({ Bookings: [], Customers: [], Partners: [], ServicePackages: [], Services: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const query = (globalSearch || '').trim()
    if (query.length < 2) {
      setResults({ Bookings: [], Customers: [], Partners: [], ServicePackages: [], Services: [] })
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsOpen(true)
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const [servicesRes, customersRes, partnersRes, bookingsRes, packagesRes] = await Promise.all([
          adminApi.list('/services', { per_page: 6, q: query }),
          adminApi.list('/customers', { per_page: 6, q: query }),
          adminApi.list('/partners', { per_page: 6, q: query }),
          adminApi.list('/bookings', { per_page: 6, q: query }),
          adminApi.list('/service-packages', { per_page: 6, q: query }),
        ])

        const extractData = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data ? res.data.data : Array.isArray(res) ? res : [])

        setResults({
          Bookings: extractData(bookingsRes),
          Customers: extractData(customersRes),
          Partners: extractData(partnersRes),
          ServicePackages: extractData(packagesRes),
          Services: extractData(servicesRes),
        })
      } catch (err) {
        console.error('Error during global search:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [globalSearch])

  const categories = [
    { icon: '✨', key: 'Services', title: 'Services' },
    { icon: '👤', isPerson: true, key: 'Customers', title: 'Customers' },
    { icon: '🛠️', isPerson: true, key: 'Partners', title: 'Vendors' },
    { icon: '📅', key: 'Bookings', title: 'Orders' },
    { actionCategory: 'Service Packages', icon: '🏷️', key: 'ServicePackages', title: 'Rate List' },
  ]

  const totalMatches = Object.values(results).reduce((acc, arr) => acc + (arr?.length || 0), 0)

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative col-span-4 row-start-2 w-full lg:order-none lg:w-[420px]" ref={searchRef}>
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <input
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-semibold outline-none transition focus:border-[#67B529] focus:bg-white focus:ring-2 focus:ring-[#67B529]/20"
          onChange={(e) => {
            onGlobalSearchChange(e.target.value)
            if (e.target.value.trim().length >= 2) {
              setIsOpen(true)
            } else {
              setIsOpen(false)
            }
          }}
          onFocus={() => {
            if ((globalSearch || '').trim().length >= 2) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search services, customers, vendors, orders, rate list..."
          value={globalSearch || ''}
        />
        {globalSearch && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
            onClick={() => {
              onGlobalSearchChange('')
              setIsOpen(false)
            }}
            title="Clear search"
            type="button"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-300">×</span>
          </button>
        )}
      </div>

      {isOpen && (globalSearch || '').trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-[60] w-full min-w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition sm:w-[480px] lg:w-[540px]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Search Results for "{globalSearch}"
            </span>
            {isLoading ? (
              <span className="animate-pulse text-xs font-black text-[#67B529]">Searching...</span>
            ) : (
              <span className="rounded-full bg-[#EEF9E8] px-2 py-0.5 text-xs font-black text-[#2F6412]">
                {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 p-1.5">
            {!isLoading && totalMatches === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-black text-slate-700">No matching records found</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">We searched Services, Customers, Vendors, Orders, and Rate List.</p>
              </div>
            )}

            {categories.map((cat) => {
              const items = results[cat.key] || []
              if (items.length === 0 && !isLoading) return null

              return (
                <div className="py-1.5 first:pt-0 last:pb-0" key={cat.key}>
                  <div className="flex items-center justify-between px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </span>
                    {items.length > 0 && <span className="text-[11px] font-bold text-slate-400">{items.length}</span>}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {items.map((item, idx) => {
                      const recordId = item.id || item.code || idx
                      const displayName =
                        cat.key === 'Partners'
                          ? item.business_name || item.name || item.contact_name || 'Vendor'
                          : cat.key === 'Bookings'
                          ? `${item.service_name || 'Booking'} #${item.booking_no || item.id}`
                          : item.name || item.title || `Record #${recordId}`

                      const subtext =
                        cat.key === 'Customers' || cat.key === 'Partners'
                          ? [item.phone || item.mobile, item.email || item.city].filter(Boolean).join(' • ') || 'No contact info'
                          : cat.key === 'Bookings'
                          ? `Customer: ${item.customer_name || 'Guest'} • ${item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : 'Date pending'}`
                          : item.category_key || item.description || 'General'

                      const amountText =
                        cat.key === 'ServicePackages'
                          ? `Rs. ${item.price || 0}`
                          : cat.key === 'Bookings'
                          ? `Rs. ${item.amount || item.total_amount || 0}`
                          : null

                      const photoSrc =
                        cat.key === 'Customers' || cat.key === 'Partners'
                          ? item.profile_picture || item.metadata?.profile_picture || item.avatar_url
                          : item.image || item.logo || item.icon || item.metadata?.image

                      const statusText = item.status || (cat.key === 'Bookings' ? 'Pending' : 'Active')

                      return (
                        <div
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition duration-150 hover:bg-[#EEF9E8]/70"
                          key={recordId}
                          onClick={() => {
                            onSelectRecord?.(cat.actionCategory || cat.key, item)
                            setIsOpen(false)
                          }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <SearchThumbnail isPerson={cat.isPerson} name={displayName} src={photoSrc} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-800">{displayName}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{subtext}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {amountText && <span className="text-xs font-black text-slate-900">{amountText}</span>}
                            <StatusBadge>{statusText}</StatusBadge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
