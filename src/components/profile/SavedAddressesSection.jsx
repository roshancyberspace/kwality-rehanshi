import { useState, useEffect, useRef } from 'react'
import { useGooglePlaces } from '../../hooks/useGooglePlaces'
import { askAppConfirmation, notify } from '../../utils/feedback'
import { useBodyScrollLock } from '../../utils/modalScrollLock'

const LABEL_TAGS = ['Home', 'Work', 'Other']
const CITIES = [
  'Lucknow', 'Kanpur', 'Delhi', 'Noida', 'Gurugram', 'Mumbai', 'Bengaluru',
  'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Varanasi',
  'Agra', 'Prayagraj', 'Indore', 'Patna', 'Chandigarh',
]
const STATES = [
  'Uttar Pradesh', 'Delhi', 'Haryana', 'Maharashtra', 'Karnataka', 'Telangana',
  'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Bihar',
  'Punjab', 'Uttarakhand', 'Andhra Pradesh', 'Kerala', 'Odisha',
]

function SavedAddressesSection({
  editingAddressId = null,
  newAddress,
  onDeleteAddress,
  onSaveAddress,
  onStartAddAddress,
  onStartEditAddress,
  onUpdateNewAddress,
  savedAddresses,
}) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  useBodyScrollLock(isAddressModalOpen)
  const [modalStep, setModalStep] = useState('location_search')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [locationSearchQuery, setLocationSearchQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  const isEditing = Boolean(editingAddressId)
  const canSave = Boolean(
    newAddress.flat?.trim()
    && newAddress.street?.trim()
    && newAddress.pincode?.trim()
    && newAddress.mobile?.trim()
    && newAddress.contactName?.trim(),
  )

  const { isReady, getSuggestions, getPlaceDetails } = useGooglePlaces()
  const menuRef = useRef(null)

  const closeModal = () => {
    setIsAddressModalOpen(false)
    setModalStep('location_search')
    setLocationSearchQuery('')
    setLocationSuggestions([])
    setIsDetectingLocation(false)
  }

  const openAddModal = () => {
    onStartAddAddress?.()
    setOpenMenuId(null)
    setLocationSearchQuery('')
    setLocationSuggestions([])
    setModalStep('location_search')
    setIsAddressModalOpen(true)
  }

  const openEditModal = (address) => {
    onStartEditAddress?.(address)
    setOpenMenuId(null)
    setModalStep('address_form')
    setIsAddressModalOpen(true)
  }

  const handleSave = async () => {
    if (!canSave || isSaving) return
    setIsSaving(true)
    try {
      await onSaveAddress()
      closeModal()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (address) => {
    setOpenMenuId(null)
    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Delete',
      text: `Remove “${address.label || 'this address'}” from your saved addresses?`,
      title: 'Delete address?',
    })
    if (!confirmed) return

    try {
      await onDeleteAddress?.(address.id)
      if (String(address.id).startsWith('local-')) {
        notify('Address deleted.', { tone: 'success' })
      }
    } catch (error) {
      notify(error.message || 'Unable to delete address.', { tone: 'error' })
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isAddressModalOpen || modalStep !== 'location_search') return undefined
    if (!locationSearchQuery.trim() || locationSearchQuery.trim().length < 3) {
      setLocationSuggestions((current) => current.filter((item) => item.isCurrent))
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingLocation(true)
      try {
        if (isReady) {
          const results = await getSuggestions(locationSearchQuery)
          setLocationSuggestions(
            results.map((place) => ({
              place_id: place.place_id,
              mainText: place.structured_formatting?.main_text || place.description,
              subText: place.structured_formatting?.secondary_text || place.description,
              description: place.description,
              fromGoogle: true,
            })),
          )
        } else {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=in&q=${encodeURIComponent(locationSearchQuery)}`,
          )
          const data = await res.json()
          setLocationSuggestions(
            (data || []).map((item) => {
              const addr = item.address || {}
              return {
                place_id: item.place_id || String(Math.random()),
                mainText: item.name || item.display_name?.split(',')[0] || 'Location',
                subText: item.display_name,
                city: addr.city || addr.town || addr.state_district || 'Lucknow',
                state: addr.state || 'Uttar Pradesh',
                pincode: addr.postcode || '',
                street: item.display_name?.split(',').slice(0, 3).join(', ') || '',
              }
            }),
          )
        }
      } catch {
        setLocationSuggestions([])
      } finally {
        setIsSearchingLocation(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [locationSearchQuery, modalStep, isAddressModalOpen, isReady, getSuggestions])

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify('Geolocation is not supported by your browser.', { tone: 'error' })
      return
    }

    setIsDetectingLocation(true)
    setLocationSearchQuery('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
          )
          const data = await res.json()
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.state_district || 'Lucknow'
          const state = addr.state || 'Uttar Pradesh'
          const pincode = addr.postcode || ''
          const exactStreet = [addr.neighbourhood || addr.suburb || addr.road || addr.residential, city]
            .filter(Boolean)
            .join(', ') || data.display_name?.split(',').slice(0, 2).join(', ')
          const mainPlaceName = addr.neighbourhood || addr.suburb || addr.road || addr.residential || 'Detected Location'

          const exactItem = {
            place_id: 'gps-exact',
            mainText: `Your Current Location (${mainPlaceName})`,
            subText: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city,
            state,
            pincode,
            street: exactStreet || 'Current Location',
            isCurrent: true,
          }

          let nearbyItems = []
          try {
            const searchQuery = addr.suburb || addr.neighbourhood || addr.road || addr.city || 'area'
            const nearbyRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&viewbox=${longitude - 0.05},${latitude + 0.05},${longitude + 0.05},${latitude - 0.05}&bounded=1&q=${encodeURIComponent(searchQuery)}`,
            )
            const nearbyData = await nearbyRes.json()
            nearbyItems = (nearbyData || [])
              .filter((item) => String(item.place_id) !== String(data.place_id))
              .slice(0, 5)
              .map((item) => {
                const nAddr = item.address || {}
                return {
                  place_id: item.place_id || String(Math.random()),
                  mainText: item.name || item.display_name.split(',')[0] || nAddr.road || nAddr.neighbourhood || 'Nearby Location',
                  subText: item.display_name,
                  city: nAddr.city || nAddr.town || city,
                  state: nAddr.state || state,
                  pincode: nAddr.postcode || pincode,
                  street: item.display_name.split(',').slice(0, 3).join(', '),
                }
              })
          } catch {
            nearbyItems = []
          }

          setLocationSuggestions([exactItem, ...nearbyItems])
        } catch {
          setLocationSuggestions([
            {
              place_id: 'gps-exact',
              mainText: 'Detected GPS Location',
              subText: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
              city: 'Lucknow',
              state: 'Uttar Pradesh',
              pincode: '',
              street: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
              isCurrent: true,
            },
          ])
        } finally {
          setIsDetectingLocation(false)
        }
      },
      () => {
        setIsDetectingLocation(false)
        notify('Unable to retrieve your location. Please check permissions or search manually.', { tone: 'error' })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const applyLocationToForm = (loc) => {
    onUpdateNewAddress?.({
      street: loc.street || loc.subText?.split(',').slice(0, 3).join(', ') || loc.mainText || '',
      city: loc.city || 'Lucknow',
      state: loc.state || 'Uttar Pradesh',
      pincode: loc.pincode || '',
      label: newAddress.label || 'Home',
    })
  }

  const handleSelectLocationSuggestion = async (loc) => {
    if (loc.fromGoogle && loc.place_id) {
      const details = await getPlaceDetails(loc.place_id)
      applyLocationToForm({
        mainText: loc.mainText,
        street: details?.formatted_address?.split(',').slice(0, 3).join(', ') || loc.subText,
        city: details?.city || 'Lucknow',
        state: details?.state || 'Uttar Pradesh',
        pincode: details?.pincode || '',
      })
    } else {
      applyLocationToForm(loc)
    }
    setModalStep('address_form')
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 focus:ring-[#6338E0]/20'
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700'

  return (
    <section className="lg:rounded-lg lg:border lg:border-blue-100 lg:bg-white lg:p-5 lg:shadow-sm">
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-[#003F86] sm:text-2xl">Saved addresses</h2>
          <p className="text-sm text-blue-700">All addresses saved for checkout.</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-blue-50 pt-3 lg:border-0 lg:pt-4">
          <p className="text-sm font-bold text-blue-700">{savedAddresses.length} saved</p>
          <button
            className="bg-transparent p-0 text-sm font-extrabold text-[#003F86] underline-offset-2 hover:underline"
            onClick={openAddModal}
            type="button"
          >
            + Add address
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:mt-5" ref={menuRef}>
        {savedAddresses.length ? savedAddresses.map((address) => (
          <article className="relative rounded-xl border border-blue-100 bg-white p-4 shadow-sm" key={address.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#003F86]">{address.label}</p>
                <p className="mt-1 text-xs font-semibold text-blue-700">{address.city}</p>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  {[address.flat, address.street, address.state, address.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="relative shrink-0">
                <button
                  aria-label="Address options"
                  className="grid h-9 w-9 place-items-center rounded-full text-[#003F86] transition hover:bg-[#F6FBFF]"
                  onClick={() => setOpenMenuId((current) => (String(current) === String(address.id) ? null : address.id))}
                  type="button"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="4" r="1.6" />
                    <circle cx="10" cy="10" r="1.6" />
                    <circle cx="10" cy="16" r="1.6" />
                  </svg>
                </button>

                {String(openMenuId) === String(address.id) ? (
                  <div className="absolute right-0 top-10 z-20 min-w-[132px] overflow-hidden rounded-xl border border-blue-100 bg-white py-1 shadow-lg">
                    <button
                      className="block w-full px-4 py-2.5 text-left text-sm font-bold text-[#003F86] hover:bg-[#F6FBFF]"
                      onClick={() => openEditModal(address)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="block w-full px-4 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDelete(address)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-700">No saved addresses yet.</p>
            <button
              className="mt-2 bg-transparent p-0 text-sm font-extrabold text-[#003F86] underline-offset-2 hover:underline"
              onClick={openAddModal}
              type="button"
            >
              + Add address
            </button>
          </div>
        )}
      </div>

      {isAddressModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="relative flex h-[93vh] max-h-[720px] w-full flex-col justify-end overflow-hidden sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-[540px] sm:justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 justify-end pb-3 pr-4 sm:pr-0">
              <button
                aria-label="Close"
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-800 shadow-xl transition hover:bg-neutral-100"
                onClick={closeModal}
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-3xl">
              {modalStep === 'location_search' && (
                <div className="flex h-full min-h-0 flex-1 flex-col">
                  <div className="shrink-0 p-5 pb-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-4 py-3 focus-within:border-[#6338E0]">
                      <svg className="h-5 w-5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <input
                        className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-neutral-400 focus:outline-none"
                        onChange={(event) => setLocationSearchQuery(event.target.value)}
                        placeholder="Search for your location/society/apartment"
                        type="text"
                        value={locationSearchQuery}
                      />
                      {locationSearchQuery ? (
                        <button
                          className="rounded-full p-1 text-neutral-400 transition hover:text-slate-700"
                          onClick={() => {
                            setLocationSearchQuery('')
                            setLocationSuggestions([])
                          }}
                          type="button"
                        >
                          <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                            <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fillRule="evenodd" />
                          </svg>
                        </button>
                      ) : null}
                    </div>

                    <button
                      className="mt-4 inline-flex items-center gap-2.5 text-sm font-extrabold text-[#6338E0] transition hover:text-[#5229C0] disabled:opacity-60"
                      disabled={isDetectingLocation}
                      onClick={handleDetectCurrentLocation}
                      type="button"
                    >
                      {isDetectingLocation ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#6338E0] border-t-transparent" />
                      ) : (
                        <svg className="h-5 w-5 shrink-0 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" fill="currentColor" r="3" />
                          <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span>{isDetectingLocation ? 'Detecting current location...' : 'Use current location'}</span>
                    </button>
                    <div className="mt-4 border-t border-neutral-100" />
                  </div>

                  <div className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-y-auto px-2">
                    {isSearchingLocation && (
                      <div className="p-6 text-center text-sm font-medium text-neutral-400">Searching locations...</div>
                    )}

                    {!isSearchingLocation && !isDetectingLocation && locationSuggestions.length === 0 && (
                      <div className="px-8 py-12 text-center text-neutral-400">
                        <p className="mb-2 text-3xl">📍</p>
                        <p className="text-sm font-bold text-slate-700">No location selected yet</p>
                        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                          Search for your society/apartment above or click{' '}
                          <span className="font-bold text-[#6338E0]">Use current location</span> to find nearby addresses.
                        </p>
                      </div>
                    )}

                    {!isSearchingLocation && locationSuggestions.length > 0 && (
                      <div className="px-3 pb-1.5 pt-2 text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                        {locationSearchQuery.trim() ? 'Search Results' : 'Nearby Locations Around You'}
                      </div>
                    )}

                    {!isSearchingLocation && locationSuggestions.map((loc) => (
                      <button
                        className={`flex w-full items-start gap-3.5 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 ${
                          loc.isCurrent ? 'border border-[#6338E0]/15 bg-[#6338E0]/5' : ''
                        }`}
                        key={loc.place_id}
                        onClick={() => handleSelectLocationSuggestion(loc)}
                        type="button"
                      >
                        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold ${
                          loc.isCurrent ? 'bg-[#6338E0]/15 text-base text-[#6338E0]' : 'bg-neutral-100 text-sm text-neutral-500'
                        }`}>
                          {loc.isCurrent ? '🎯' : '📍'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <span className="truncate">{loc.mainText}</span>
                            {loc.isCurrent ? (
                              <span className="rounded-md bg-[#6338E0] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">GPS</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-neutral-500">{loc.subText}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="shrink-0 border-t border-neutral-100 bg-[#F9FAFC] p-3.5 text-center">
                    <p className="text-xs font-normal text-neutral-500">
                      powered by <span className="font-bold text-[#4285F4]">G</span><span className="font-bold text-[#EA4335]">o</span><span className="font-bold text-[#FBBC05]">o</span><span className="font-bold text-[#4285F4]">g</span><span className="font-bold text-[#34A853]">l</span><span className="font-bold text-[#EA4335]">e</span>
                    </p>
                  </div>
                </div>
              )}

              {modalStep === 'address_form' && (
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 p-5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      {isEditing ? 'Edit Address' : 'Add new address'}
                    </h2>
                    <button
                      className="text-sm font-bold text-[#6338E0] hover:underline"
                      onClick={() => (isEditing ? closeModal() : setModalStep('location_search'))}
                      type="button"
                    >
                      ← Back to addresses
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                    <div>
                      <label className={labelClass}>Address Label / Tag</label>
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        {LABEL_TAGS.map((tag) => (
                          <button
                            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                              newAddress.label === tag
                                ? 'border-[#6338E0] bg-[#F3EAFF] font-extrabold text-[#6338E0]'
                                : 'border-neutral-200 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                            key={tag}
                            onClick={() => onUpdateNewAddress('label', tag)}
                            type="button"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <input
                        className={inputClass}
                        onChange={(event) => onUpdateNewAddress('label', event.target.value)}
                        placeholder="Or enter custom label (e.g. Parents home)"
                        type="text"
                        value={newAddress.label}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        House / Flat / Floor / Building <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputClass}
                        onChange={(event) => onUpdateNewAddress('flat', event.target.value)}
                        placeholder="e.g. Flat 402, B-Block, Sahara Tower"
                        type="text"
                        value={newAddress.flat}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Street / Area / Landmark <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputClass}
                        onChange={(event) => onUpdateNewAddress('street', event.target.value)}
                        placeholder="e.g. Vibhuti Khand, near Shaheed Path"
                        type="text"
                        value={newAddress.street}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                      <div>
                        <label className={labelClass}>
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          maxLength={6}
                          onChange={(event) => onUpdateNewAddress('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="e.g. 226010"
                          type="text"
                          value={newAddress.pincode || ''}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          City <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`${inputClass} appearance-auto bg-white`}
                          onChange={(event) => onUpdateNewAddress('city', event.target.value)}
                          value={newAddress.city || 'Lucknow'}
                        >
                          {CITIES.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                          {newAddress.city && !CITIES.includes(newAddress.city) ? (
                            <option value={newAddress.city}>{newAddress.city}</option>
                          ) : null}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`${inputClass} appearance-auto bg-white`}
                          onChange={(event) => onUpdateNewAddress('state', event.target.value)}
                          value={newAddress.state || 'Uttar Pradesh'}
                        >
                          {STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                          {newAddress.state && !STATES.includes(newAddress.state) ? (
                            <option value={newAddress.state}>{newAddress.state}</option>
                          ) : null}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          Contact Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          onChange={(event) => onUpdateNewAddress('contactName', event.target.value)}
                          placeholder="Person name"
                          type="text"
                          value={newAddress.contactName}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          maxLength={10}
                          onChange={(event) => onUpdateNewAddress('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          type="tel"
                          value={newAddress.mobile}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 border-t border-neutral-200/80 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                    <button
                      className="flex-1 rounded-2xl border border-neutral-300 bg-white py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => (isEditing ? closeModal() : setModalStep('location_search'))}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6338E0] py-3.5 text-sm font-bold text-white shadow-md shadow-[#6338E0]/25 transition hover:bg-[#5229C0] disabled:bg-[#6338E0]/50"
                      disabled={!canSave || isSaving}
                      onClick={handleSave}
                      type="button"
                    >
                      {isSaving ? 'Saving...' : isEditing ? 'Update Address' : 'Save & Proceed'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default SavedAddressesSection
