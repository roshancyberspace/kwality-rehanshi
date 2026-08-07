import { useEffect, useMemo, useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { buildApiUrl, buildStorageUrl } from '../../config/urls'

function ItemRateListPage({
  appSettings = {},
  cartCount,
  isLoggedIn,
  locationLabel,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onSearchSuggestionSelect,
  searchSuggestions,
  services = [],
  user,
}) {
  const [rateItems, setRateItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('all')
  const [urlServiceName, setUrlServiceName] = useState('')
  const [urlPackageName, setUrlPackageName] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const serviceIdParam = params.get('service_id') || params.get('serviceId')
    const serviceNameParam = params.get('service_name') || params.get('serviceName') || ''
    const packageNameParam = params.get('package_name') || params.get('packageName') || ''

    if (serviceIdParam && !Number.isNaN(Number(serviceIdParam))) {
      setSelectedServiceId(String(serviceIdParam))
    }
    if (serviceNameParam) {
      setUrlServiceName(decodeURIComponent(serviceNameParam))
    }
    if (packageNameParam) {
      setUrlPackageName(decodeURIComponent(packageNameParam))
    }

    const fetchRateItems = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(buildApiUrl('rate-items', { status: 'Active', per_page: 200 }))
        if (!response.ok) throw new Error('Failed to fetch rate items')
        const json = await response.json()
        const items = json.data?.items || json.data || []
        setRateItems(Array.isArray(items) ? items : [])
      } catch (error) {
        console.error('Error fetching rate items:', error)
        setRateItems([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRateItems()
  }, [])

  const filteredItems = useMemo(() => {
    return rateItems.filter((item) => {
      const matchesService = selectedServiceId === 'all' || String(item.service_id || item.service?.id) === String(selectedServiceId)
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery = !query || String(item.name || '').toLowerCase().includes(query) || String(item.service?.name || '').toLowerCase().includes(query)
      return matchesService && matchesQuery
    })
  }, [rateItems, selectedServiceId, searchQuery])

  const availableServices = useMemo(() => {
    const serviceMap = new Map()
    services.forEach((s) => {
      if (s?.id) serviceMap.set(String(s.id), s.name || `Service #${s.id}`)
    })
    rateItems.forEach((item) => {
      if (item.service_id && item.service?.name && !serviceMap.has(String(item.service_id))) {
        serviceMap.set(String(item.service_id), item.service.name)
      }
    })
    return Array.from(serviceMap.entries()).map(([id, name]) => ({ id, name }))
  }, [services, rateItems])

  const currentServiceLabel = useMemo(() => {
    if (selectedServiceId === 'all') return 'All Services & Spare Parts'
    const found = availableServices.find((s) => String(s.id) === String(selectedServiceId))
    return found?.name || urlServiceName || `Service #${selectedServiceId}`
  }, [selectedServiceId, availableServices, urlServiceName])

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        appSettings={appSettings}
        cartCount={cartCount}
        isLoggedIn={isLoggedIn}
        locationLabel={locationLabel}
        onBackHome={onBackHome}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={user}
      />

      {/* Header Banner */}
      <section className="relative overflow-hidden bg-[#003F86] py-12 text-white shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block rounded-full bg-[#67B529] px-3 py-1 text-xs font-black uppercase tracking-wider mb-3 shadow">
                Standardized Rate Card
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                {urlPackageName ? `${urlPackageName} - Spare Parts Rate List` : 'Item & Spare Parts Rate List'}
              </h1>
              <p className="mt-2 text-base text-blue-100 max-w-2xl">
                Official transparent rates for repair consumables, extra hardware, and standardized replacement spare parts. No hidden charges.
              </p>
            </div>
            {urlPackageName && (
              <div className="rounded-xl bg-white/10 p-4 border border-white/20 backdrop-blur-sm self-start">
                <p className="text-xs text-blue-200 uppercase font-semibold">Associated Package</p>
                <p className="text-lg font-bold text-white mt-1">{urlPackageName}</p>
                {urlServiceName && <p className="text-xs font-medium text-green-300 mt-0.5">{urlServiceName}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters and Search Bar */}
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-lg border border-blue-100 shadow-xs">
          {/* Top: Service Filters */}
          <div className="border border-blue-200 bg-blue-50/40 p-2.5 rounded-lg">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black text-[#003F86] uppercase tracking-wider mr-1">Filter Service:</span>
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-bold border transition ${selectedServiceId === 'all' ? 'border-[#003F86] bg-[#003F86] text-white shadow-2xs' : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-100/60'}`}
                onClick={() => setSelectedServiceId('all')}
                type="button"
              >
                All Items ({rateItems.length})
              </button>
              {availableServices.map((srv) => (
                <button
                  className={`rounded-md px-2.5 py-1 text-xs font-bold border transition ${String(selectedServiceId) === String(srv.id) ? 'border-[#003F86] bg-[#003F86] text-white shadow-2xs' : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-100/60'}`}
                  key={srv.id}
                  onClick={() => setSelectedServiceId(String(srv.id))}
                  type="button"
                >
                  {srv.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom: Full-Width Search Bar */}
          <div className="w-full">
            <div className="relative w-full">
              <input
                className="w-full rounded-lg border border-blue-200 bg-white py-2 pl-9 pr-3 text-xs md:text-sm font-semibold text-blue-950 placeholder:text-slate-400 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86]"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spare parts by name, hardware type or description..."
                type="text"
                value={searchQuery}
              />
              <span className="absolute left-2.5 top-2 text-sm text-slate-400">🔍</span>
            </div>
          </div>
        </div>

        {/* Current Filter Title & Status */}
        <div className="mt-3 flex items-center justify-between px-1">
          <h2 className="text-base md:text-lg font-bold text-[#003F86]">
            Showing Rates For: <span className="text-blue-600 font-extrabold">{currentServiceLabel}</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-blue-100 shadow-2xs">
            {filteredItems.length} {filteredItems.length === 1 ? 'item found' : 'items found'}
          </span>
        </div>

        {/* Rate Items Table - Bordered with Compact Spacing */}
        <div className="mt-2 overflow-hidden rounded-md border border-slate-300 bg-white shadow-xs">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-[#003F86] border-t-transparent" />
              <p className="mt-2 text-xs font-semibold text-blue-800">Loading verified rate cards...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#003F86] text-white font-extrabold text-[11px] md:text-xs uppercase tracking-wider">
                    <th className="border border-slate-400 py-1.5 px-2 text-center w-10">#</th>
                    <th className="border border-slate-400 py-1.5 px-2 w-14 text-center">Image</th>
                    <th className="border border-slate-400 py-1.5 px-3 min-w-[200px]">Spare Part / Item Name</th>
                    <th className="border border-slate-400 py-1.5 px-3 w-44">Service Category</th>
                    <th className="border border-slate-400 py-1.5 px-3 text-right w-32">Standard Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-blue-950 font-medium">
                  {filteredItems.map((item, idx) => {
                    const itemImg = item.image ? buildStorageUrl(item.image) : null
                    const itemService = item.service?.name || availableServices.find((s) => String(s.id) === String(item.service_id))?.name || 'General Service'
                    return (
                      <tr className="hover:bg-blue-50/70 transition duration-150" key={item.id || idx}>
                        <td className="border border-slate-200 py-1 px-2 text-center text-xs font-bold text-slate-500">{idx + 1}</td>
                        <td className="border border-slate-200 py-1 px-2 text-center">
                          <div className="mx-auto h-7 w-7 overflow-hidden rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {itemImg ? (
                              <img alt={item.name} className="h-full w-full object-cover" src={itemImg} />
                            ) : (
                              <span className="text-sm" title="No picture available">🛠️</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-200 py-1 px-3 font-bold text-xs md:text-sm text-[#003F86]">
                          {item.name}
                          {item.description && <p className="text-[11px] font-normal text-slate-500 leading-none mt-0.5">{item.description}</p>}
                        </td>
                        <td className="border border-slate-200 py-1 px-3">
                          <span className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/80">
                            {itemService}
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1 pl-2 pr-3 text-right font-extrabold text-xs md:text-sm text-green-700 whitespace-nowrap">
                          Rs. {Number(item.price || 0).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 px-4">
              <p className="text-4xl">📭</p>
              <h3 className="mt-3 text-lg font-bold text-[#003F86]">No rate items found</h3>
              <p className="mt-1 text-sm">
                No spare parts or items match your selected service filter or search term.
              </p>
              {selectedServiceId !== 'all' || searchQuery ? (
                <button
                  className="mt-4 inline-flex items-center gap-1 rounded-md bg-[#003F86] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition"
                  onClick={() => {
                    setSelectedServiceId('all')
                    setSearchQuery('')
                  }}
                  type="button"
                >
                  View All Rate Items
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Guidance Notice */}
        <div className="mt-8 rounded-xl border border-blue-100 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-2xl">
            ℹ️
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-sm font-bold text-[#003F86]">Important Information About Spare Parts &amp; Consumables</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              The prices displayed above are official standardized rates approved by Rehanshi. Spare parts and replacement hardware are typically not covered under standard inspection or service labor packages. During a service visit, the verified technician will inspect your equipment, provide a clear repair estimate based on this rate list, and proceed with replacements only after your explicit approval. All genuine replaced parts come with applicable brand or service warranties.
            </p>
          </div>
        </div>
      </section>

      <Footer appSettings={appSettings} />
    </main>
  )
}

export default ItemRateListPage
