import { useEffect, useMemo, useRef, useState } from 'react'
import BillSummary from '../../components/checkout/BillSummary'
import SelectedServices from '../../components/checkout/SelectedServices'
import SlotSelectionModal from '../../components/checkout/SlotSelectionModal'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { getCartTotal, getDisplayCart } from '../../components/services/ServiceCartUtils'
import { useCheckoutPricing } from '../../hooks/useCheckoutPricing'

const money = (value) => Math.round((Number(value) || 0) * 100) / 100

function CartPage({
  appSettings,
  cart,
  cartCount,
  coupons = [],
  currentUser,
  isLoggedIn,
  locationLabel,
  onAddSavedAddress,
  onUpdateSavedAddress,
  onDeleteSavedAddress,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onRequireLogin,
  onSearchSuggestionSelect,
  onShowServices,
  onUpdateQuantity,
  savedAddresses = [],
  searchSuggestions,
}) {
  const displayCart = getDisplayCart(cart)
  const {
    appliedCoupon,
    applyCoupon,
    applyingCouponCode,
    isApplyingCoupon,
    isLoading,
    pricing,
    removeCoupon,
    removeTip,
    setTipAmount,
    tipAmount,
  } = useCheckoutPricing(cart, currentUser?.id, coupons)

  const { subtotal, serviceFee, discount, payable, totalToPay } = pricing
  const selectedTip = tipAmount > 0 ? tipAmount : null

  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [couponMessageType, setCouponMessageType] = useState('')
  const [showCouponSuccess, setShowCouponSuccess] = useState(false)
  const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false)
  const [isCustomTipModalOpen, setIsCustomTipModalOpen] = useState(false)
  const [customTipInput, setCustomTipInput] = useState('')
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('rehanshi_selected_slots')) || {}
    } catch {
      return {}
    }
  })

  // Address selection and modal states
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [addressModalStep, setAddressModalStep] = useState('list') // 'list', 'location_search', 'address_form'
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return localStorage.getItem('rehanshi_selected_address_id') || null
  })
  const [newAddressForm, setNewAddressForm] = useState({
    label: 'Home',
    contactName: currentUser?.name || '',
    flat: '',
    street: '',
    pincode: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    mobile: currentUser?.phone || '',
  })
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [activeDropdownId, setActiveDropdownId] = useState(null)

  // Location Search & GPS states
  const [locationSearchQuery, setLocationSearchQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  const currentSelectedAddress = useMemo(() => {
    if (!savedAddresses || savedAddresses.length === 0) return null
    if (selectedAddressId) {
      const found = savedAddresses.find((a) => String(a.id) === String(selectedAddressId))
      if (found) return found
    }
    return savedAddresses[0]
  }, [savedAddresses, selectedAddressId])

  const displayAddressLabel = useMemo(() => {
    if (currentSelectedAddress) {
      const parts = [currentSelectedAddress.flat, currentSelectedAddress.street, currentSelectedAddress.city].filter(Boolean).join(', ')
      return `${currentSelectedAddress.label || 'Home'} - ${parts}`
    }
    return locationLabel || 'Home - 5256, Vibhuti Khand, Gomti Nagar, Lucknow...'
  }, [currentSelectedAddress, locationLabel])

  useEffect(() => {
    if (savedAddresses?.length > 0 && !selectedAddressId) {
      const firstId = savedAddresses[0].id
      setSelectedAddressId(firstId)
      localStorage.setItem('rehanshi_selected_address_id', String(firstId))
    }
  }, [savedAddresses, selectedAddressId])

  // Handle live location searching
  useEffect(() => {
    if (addressModalStep !== 'location_search') return
    if (!locationSearchQuery || locationSearchQuery.trim().length < 2) {
      if (!locationSearchQuery.trim()) {
        // Do not automatically clear if suggestions were populated by GPS detection
      }
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(locationSearchQuery)}`
        )
        const data = await response.json()
        const formatted = data.map((item) => {
          const addr = item.address || {}
          const city = addr.city || addr.town || addr.district || 'Lucknow'
          const state = addr.state || 'Uttar Pradesh'
          const pincode = addr.postcode || ''
          const mainText = item.name || item.display_name.split(',')[0] || locationSearchQuery
          return {
            place_id: item.place_id || String(Math.random()),
            mainText,
            subText: item.display_name,
            city,
            state,
            pincode,
            street: item.display_name.split(',').slice(0, 3).join(', '),
          }
        })
        setLocationSuggestions(formatted)
      } catch (error) {
        console.error('Location search error:', error)
      } finally {
        setIsSearchingLocation(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [locationSearchQuery, addressModalStep])

  const handleOpenAddAddress = () => {
    setEditingAddressId(null)
    setLocationSearchQuery('')
    setLocationSuggestions([])
    setAddressModalStep('location_search')
  }

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setIsDetectingLocation(true)
    setLocationSearchQuery('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.state_district || 'Lucknow'
          const state = addr.state || 'Uttar Pradesh'
          const pincode = addr.postcode || ''
          const exactStreet = [addr.neighbourhood || addr.suburb || addr.road || addr.residential, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(', ')
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

          // Fetch nearby places around the detected area
          let nearbyItems = []
          try {
            const searchQuery = addr.suburb || addr.neighbourhood || addr.road || addr.city || 'area'
            const nearbyRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&viewbox=${longitude - 0.05},${latitude + 0.05},${longitude + 0.05},${latitude - 0.05}&bounded=1&q=${encodeURIComponent(searchQuery)}`
            )
            const nearbyData = await nearbyRes.json()
            nearbyItems = nearbyData
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
          } catch (e) {
            console.error('Failed fetching nearby places', e)
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
            }
          ])
        } finally {
          setIsDetectingLocation(false)
        }
      },
      () => {
        setIsDetectingLocation(false)
        alert('Unable to retrieve your location. Please check browser location permissions or enter manually.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSelectLocationSuggestion = (loc) => {
    setNewAddressForm({
      label: 'Home',
      contactName: currentUser?.name || '',
      flat: '',
      street: loc.street || loc.subText?.split(',').slice(0, 3).join(', ') || loc.mainText,
      city: loc.city || 'Lucknow',
      state: loc.state || 'Uttar Pradesh',
      pincode: loc.pincode || '226010',
      mobile: currentUser?.phone || '',
    })
    setAddressModalStep('address_form')
  }

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id)
    localStorage.setItem('rehanshi_selected_address_id', String(address.id))
    const parts = [address.flat, address.street, address.city, address.pincode].filter(Boolean).join(', ')
    onLocationChange?.(`${address.label || 'Home'} - ${parts}`)
    setIsAddressModalOpen(false)
  }

  const handleEditAddress = (addr) => {
    setEditingAddressId(addr.id)
    setActiveDropdownId(null)
    setNewAddressForm({
      label: addr.label || 'Home',
      contactName: addr.contactName || addr.contact_name || currentUser?.name || '',
      flat: addr.flat || '',
      street: addr.street || '',
      pincode: addr.pincode || '',
      city: addr.city || 'Lucknow',
      state: addr.state || 'Uttar Pradesh',
      mobile: addr.mobile || currentUser?.phone || '',
    })
    setAddressModalStep('address_form')
  }

  const handleDeleteAddress = async (id) => {
    setActiveDropdownId(null)
    try {
      await onDeleteSavedAddress?.(id)
      if (String(selectedAddressId) === String(id)) {
        const remaining = savedAddresses.filter((a) => String(a.id) !== String(id))
        if (remaining.length > 0) {
          handleSelectAddress(remaining[0])
        } else {
          setSelectedAddressId(null)
          localStorage.removeItem('rehanshi_selected_address_id')
          onLocationChange?.(locationLabel?.split(' - ')[0] || '')
        }
      }
    } catch (err) {
      console.error('Failed to delete address:', err)
    }
  }

  const handleSaveNewAddress = async (e) => {
    e.preventDefault()
    if (!newAddressForm.flat.trim() || !newAddressForm.street.trim() || !newAddressForm.mobile.trim() || !newAddressForm.contactName.trim()) {
      return
    }
    setIsSavingAddress(true)
    try {
      let saved = null
      if (editingAddressId) {
        saved = await onUpdateSavedAddress?.(editingAddressId, {
          ...newAddressForm,
          label: newAddressForm.label || 'Home',
        })
      } else {
        saved = await onAddSavedAddress?.({
          ...newAddressForm,
          label: newAddressForm.label || 'Home',
        })
      }
      if (saved && saved.id) {
        setSelectedAddressId(saved.id)
        localStorage.setItem('rehanshi_selected_address_id', String(saved.id))
        const parts = [saved.flat, saved.street, saved.city, saved.state, saved.pincode].filter(Boolean).join(', ')
        onLocationChange?.(`${saved.label || 'Home'} - ${parts}`)
      }
      setEditingAddressId(null)
      setAddressModalStep('list')
      setIsAddressModalOpen(false)
    } catch (error) {
      console.error('Failed to save address:', error)
    } finally {
      setIsSavingAddress(false)
    }
  }

  const didAutoPromptLogin = useRef(false)

  useEffect(() => {
    if (isLoggedIn || displayCart.length === 0 || didAutoPromptLogin.current) return
    didAutoPromptLogin.current = true
    onRequireLogin?.()
  }, [displayCart.length, isLoggedIn, onRequireLogin])

  const handleProceed = () => {
    if (!isLoggedIn) {
      onRequireLogin?.()
      return
    }
    setIsSlotModalOpen(true)
  }

  const handleConfirmSlotsAndCheckout = (newSlots) => {
    setSelectedSlots(newSlots)
    window.localStorage.setItem('rehanshi_selected_slots', JSON.stringify(newSlots))
    window.history.pushState({}, '', '/checkout')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const triggerCouponSuccess = () => {
    setShowCouponSuccess(true)
    window.setTimeout(() => setShowCouponSuccess(false), 2200)
  }

  const handleApplyCoupon = async (codeOverride) => {
    const nextCode = String(codeOverride ?? couponCode).trim()
    if (!nextCode) {
      setCouponMessageType('error')
      setCouponMessage('Enter a coupon code.')
      return false
    }

    setCouponMessage('')
    setCouponMessageType('')

    try {
      const coupon = await applyCoupon(nextCode)
      setCouponCode(coupon.code)
      setCouponMessageType('success')
      setCouponMessage(`Coupon applied! You saved Rs. ${coupon.discount}.`)
      triggerCouponSuccess()
      return true
    } catch (requestError) {
      removeCoupon()
      setCouponMessageType('error')
      setCouponMessage(requestError.message)
      return false
    }
  }

  // Group items by category for mobile view
  const groupedCart = useMemo(() => {
    const groups = {}
    displayCart.forEach((item) => {
      const category = item.serviceName || item.groupName || item.category || 'AC Service and Repair'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(item)
    })
    return groups
  }, [displayCart])

  // Calculate savings for banner
  const totalSavings = useMemo(() => {
    const calc = displayCart.reduce((acc, item) => {
      const orig = Number(item.originalPrice || item.original_price || 0)
      const current = Number(item.price || 0)
      if (orig > current) {
        return acc + (orig - current) * (item.quantity || 1)
      }
      return acc
    }, 0)
    if (calc > 0) return calc
    if (subtotal > 0) return Math.max(160, Math.round(subtotal * 0.15))
    return 160
  }, [displayCart, subtotal])

  const availableCoupons = useMemo(
    () => (coupons || []).filter((coupon) => coupon.status === 'Active'),
    [coupons],
  )

  const formatCouponDescription = (coupon) => {
    const minimumOrder = Number(coupon.minimum_order || 0)
    const minimumText = minimumOrder > 0 ? `Min order Rs. ${minimumOrder}.` : ''
    if (coupon.type === 'Percentage') {
      return `${coupon.value}% off. ${minimumText}`.trim()
    }
    return `Flat Rs. ${coupon.value} off. ${minimumText}`.trim()
  }

  const handleCustomTipSubmit = (e) => {
    e.preventDefault()
    const val = parseInt(customTipInput, 10)
    if (!isNaN(val) && val > 0) {
      setTipAmount(val)
    } else {
      removeTip()
    }
    setIsCustomTipModalOpen(false)
  }

  if (displayCart.length === 0) {
    return (
      <>
        {/* Mobile / Tablet Empty Cart View */}
        <div className="lg:hidden flex flex-col min-h-screen bg-[#FAFAFB] text-slate-800">
          <header className="sticky top-0 z-50 flex items-center gap-4 bg-white px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-100 shadow-2xs">
            <button
              onClick={() => (onShowServices ? onShowServices() : window.history.back())}
              className="p-1 text-slate-800 focus:outline-none"
              type="button"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Your cart</h1>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-[#F3EAFF] border border-[#D5C5FD] flex items-center justify-center text-3xl sm:text-4xl mb-4 shadow-sm">
              🛒
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-xs leading-relaxed">
              Looks like you haven&apos;t added any services yet. Explore our top-rated professionals and book your appointment!
            </p>
            <button
              onClick={onShowServices || (() => window.history.back())}
              className="mt-6 w-full max-w-[240px] sm:max-w-[280px] rounded-xl bg-[#6338E0] hover:bg-[#5229C0] py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-[#6338E0]/25 active:scale-95 transition duration-200"
              type="button"
            >
              Explore services
            </button>
          </div>
        </div>

        {/* Desktop Empty Cart View */}
        <main className="hidden lg:block min-h-screen bg-[#F6FBFF] text-[#003F86]">
          <Navbar
            isLoggedIn={isLoggedIn}
            appSettings={appSettings}
            cartCount={cartCount}
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
            user={currentUser}
          />

          <section className="border-b border-blue-100 bg-white">
            <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cart</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">Nothing here yet</h1>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-4 py-5 lg:px-8 lg:py-5">
            <SelectedServices
              displayCart={displayCart}
              onShowServices={onShowServices}
              onUpdateQuantity={onUpdateQuantity}
            />
          </section>

          <Footer appSettings={appSettings} />
        </main>
      </>
    )
  }

  return (
    <>
      {/* ========================================================= */}
      {/* MOBILE & TABLET FULL PAGE CART VIEW (lg:hidden) */}
      {/* ========================================================= */}
      <div className="lg:hidden flex flex-col min-h-screen bg-[#F2F4F7] pb-36 text-slate-800">
        {/* Top Header */}
        <header className="sticky top-0 z-50 flex items-center gap-4 bg-white px-4 py-3.5 sm:px-6 sm:py-4 border-b border-neutral-100 shadow-2xs">
          <button
            onClick={() => (onShowServices ? onShowServices() : window.history.back())}
            className="p-1 text-slate-800 hover:text-slate-600 transition-colors focus:outline-none"
            type="button"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Your cart</h1>
        </header>

        {/* Savings Alert Banner */}
        <div className="bg-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 border-b border-neutral-100">
          <span className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center text-[#107C41] shrink-0">
            <svg className="w-5 h-5 transform -rotate-45" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-800 tracking-tight">
            Saving Rs.{totalSavings} on this order
          </span>
        </div>

        <div className="h-3 sm:h-4 bg-[#F2F4F7]" />

        {/* Service Categories & Packages */}
        {Object.entries(groupedCart).map(([category, items], catIdx) => (
          <div key={category}>
            <div className="bg-white pt-4 pb-1 px-4 sm:px-6">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-3 sm:mb-4">{category}</h2>
              {items.map((item, itemIdx) => {
                const origPrice = Number(item.originalPrice || item.original_price || 0)
                const currPrice = Number(item.price || 0)
                const showOriginal = origPrice > currPrice
                const totalOriginal = origPrice * (item.quantity || 1)

                return (
                  <div key={`${item.id || item.name}-${itemIdx}`} className="pb-4 sm:pb-5">
                    {item.groupName && item.groupName !== category && (
                      <div className="text-sm sm:text-base font-medium text-slate-700 mb-2">
                        {item.groupName}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 sm:gap-6">
                      <div className="flex items-center border-l-2 border-neutral-300 pl-3 sm:pl-4 py-0.5 flex-1 min-w-0">
                        <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        {/* Quantity Stepper */}
                        <div className="flex h-9 w-22 sm:h-10 sm:w-26 items-center justify-between rounded-xl bg-[#F3EAFF] border border-[#D5C5FD] px-2 text-sm sm:text-base font-bold text-[#6338E0] shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id ?? item.name, item.quantity - 1)}
                            className="h-full px-2 text-base sm:text-lg font-black hover:text-[#5029BB] transition-colors focus:outline-none flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="font-extrabold select-none text-[#6338E0] text-sm sm:text-base">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id ?? item.name, item.quantity + 1)}
                            className="h-full px-2 text-base sm:text-lg font-black hover:text-[#5029BB] transition-colors focus:outline-none flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        {/* Pricing */}
                        <div className="text-right shrink-0 min-w-[60px]">
                          <div className="text-sm sm:text-base font-extrabold text-slate-900">
                            Rs.{item.lineTotal}
                          </div>
                          {showOriginal && (
                            <div className="text-xs sm:text-sm text-neutral-400 line-through font-medium mt-0.5">
                              Rs.{totalOriginal}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="h-3 sm:h-4 bg-[#F2F4F7]" />
          </div>
        ))}

        {/* Coupons and Offers */}
        <div className={`bg-white px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between transition-colors ${showCouponSuccess ? 'coupon-row-success bg-[#F3FBED]' : ''}`}>
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <span className={`grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-sm sm:text-base text-white font-black shadow-xs shrink-0 ${showCouponSuccess ? 'bg-[#67B529]' : 'bg-[#167634]'}`}>
              {showCouponSuccess ? '✓' : '%'}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {appliedCoupon ? `Coupon applied: ${appliedCoupon.code}` : 'Coupons and offers'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCouponsModalOpen(true)}
            className="text-sm sm:text-base font-extrabold text-[#6338E0] hover:text-[#5029C0] flex items-center gap-1 focus:outline-none"
          >
            <span>{appliedCoupon ? 'Change' : 'View all'}</span>
            <span className="text-base sm:text-lg font-extrabold leading-none">&gt;</span>
          </button>
        </div>

        <div className="h-3 sm:h-4 bg-[#F2F4F7]" />

        {/* Payment Summary */}
        <div className="bg-white p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-3.5 sm:mb-4">Payment summary</h2>
          <div className="space-y-3 sm:space-y-3.5">
            {Object.entries(groupedCart).map(([category, items]) => {
              const catTotal = items.reduce((acc, item) => acc + (Number(item.lineTotal) || 0), 0)
              return (
                <div key={category} className="flex items-center justify-between text-sm sm:text-base font-medium text-slate-700">
                  <span>{category}</span>
                  <span className="font-bold text-slate-900">Rs.{catTotal}</span>
                </div>
              )
            })}
            {serviceFee > 0 && (
              <div className="flex items-center justify-between text-sm sm:text-base font-medium text-slate-700">
                <span>Visitation & Service fee</span>
                <span className="font-bold text-slate-900">Rs.{serviceFee}</span>
              </div>
            )}
            {selectedTip > 0 && (
              <div className="flex items-center justify-between text-sm sm:text-base font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  Tip for professional
                  <button
                    onClick={() => removeTip()}
                    type="button"
                    className="text-xs sm:text-sm text-red-500 font-bold ml-1 hover:underline focus:outline-none"
                  >
                    (Remove)
                  </button>
                </span>
                <span className="font-bold text-slate-900">Rs.{selectedTip}</span>
              </div>
            )}
            {discount > 0 && appliedCoupon && (
              <div className="flex items-center justify-between text-sm sm:text-base font-medium text-[#167634]">
                <span className="flex items-center gap-2">
                  Coupon discount ({appliedCoupon.code})
                  <button
                    onClick={removeCoupon}
                    type="button"
                    className="text-xs sm:text-sm text-red-500 font-bold hover:underline focus:outline-none"
                  >
                    (Remove)
                  </button>
                </span>
                <span className="font-extrabold">-Rs.{discount}</span>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200/80 my-3 sm:my-4" />
          
          <div className="flex items-center justify-between text-base sm:text-lg font-black text-slate-900">
            <span>Total amount</span>
            <span>Rs.{totalToPay}</span>
          </div>

          <div className="border-t border-neutral-200/80 my-3 sm:my-4" />

          <div className="flex items-center justify-between text-base sm:text-lg font-black text-slate-900">
            <span>Amount to pay</span>
            <span>Rs.{totalToPay}</span>
          </div>
        </div>

        <div className="h-3 sm:h-4 bg-[#F2F4F7]" />

        {/* Tip Section */}
        <div className="bg-white p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-3.5 sm:mb-4">
            Add a tip to thank your professionals
          </h2>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 pt-1 pb-2">
            {[
              { value: 50, label: 'Rs.50', popular: false },
              { value: 75, label: 'Rs.75', popular: true },
              { value: 100, label: 'Rs.100', popular: false },
              { value: 'custom', label: 'Custom', popular: false },
            ].map((tipOption) => {
              const isSelected = typeof tipOption.value === 'number' && selectedTip === tipOption.value
              return (
                <div key={tipOption.label} className="relative flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (tipOption.value === 'custom') {
                        setIsCustomTipModalOpen(true)
                      } else {
                        selectedTip === tipOption.value ? removeTip() : setTipAmount(tipOption.value)
                      }
                    }}
                    className={`w-full py-3 sm:py-3.5 px-2 sm:px-3 rounded-xl border text-sm sm:text-base font-bold transition-all flex items-center justify-center focus:outline-none ${
                      isSelected
                        ? 'bg-[#F3EAFF] border-[#6338E0] text-[#6338E0] font-extrabold shadow-md'
                        : 'bg-white border-neutral-300 text-slate-800 hover:border-slate-400 shadow-2xs'
                    }`}
                  >
                    {tipOption.label}
                  </button>
                  {tipOption.popular && (
                    <div className="absolute -bottom-2.5 bg-[#E7F7ED] text-[#0A7A43] text-[10px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-0.5 rounded-xs sm:rounded border border-[#D3EEDB] shadow-2xs whitespace-nowrap tracking-wide">
                      POPULAR
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-neutral-600 text-xs sm:text-sm mt-3.5 sm:mt-4 font-medium">
            Tip will be split equally between the professionals.
          </p>
        </div>

        <div className="h-3 sm:h-4 bg-[#F2F4F7]" />

        {/* Cancellation and Reschedule Policy */}
        <div className="bg-white p-4 sm:p-6 pb-12 sm:pb-16">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1.5 sm:mb-2">
            Cancellation & reschedule policy
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base font-medium leading-relaxed mb-3">
            A small fee may apply depending on the service if you cancel or reschedule after a certain time
          </p>
          <button
            type="button"
            onClick={() => setIsPolicyModalOpen(true)}
            className="text-slate-900 text-sm sm:text-base font-extrabold underline underline-offset-4 focus:outline-none hover:text-[#6338E0] transition-colors inline-block"
          >
            Read full policy
          </button>
        </div>

        {/* Fixed Bottom Footer / Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-3 sm:p-4 px-4 sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-800 pb-2.5 sm:pb-3">
            <div 
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer group"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F4EFFF] border border-[#D5C5FD] text-[#6338E0] shrink-0 font-bold shadow-2xs group-hover:bg-[#E8D9FF] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="truncate text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#6338E0] transition-colors">
                {displayAddressLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              aria-label="Change address"
              className="group flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#F3EAFF] hover:bg-[#E8D9FF] text-[#6338E0] shrink-0 border border-[#D5C5FD] transition-all duration-200 shadow-2xs active:scale-95 focus:outline-none"
            >
              <svg className="w-6 h-6 sm:w-6 sm:h-6 stroke-[2.3] transform group-hover:rotate-12 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="w-full rounded-xl bg-[#6338E0] hover:bg-[#5229C0] active:scale-[0.98] text-white py-3 sm:py-3.5 text-sm sm:text-base font-bold shadow-md shadow-[#6338E0]/25 transition duration-200 flex items-center justify-center"
          >
            Select slots
          </button>
        </div>

        {/* Coupons Modal */}
        {isCouponsModalOpen && (
          <div
            className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsCouponsModalOpen(false)}
          >
            <div
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Available Coupons</h3>
                <button
                  onClick={() => setIsCouponsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xl p-1"
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#6338E0] disabled:bg-slate-50"
                  disabled={isApplyingCoupon}
                  onChange={(event) => {
                    setCouponCode(event.target.value)
                    setCouponMessage('')
                    setCouponMessageType('')
                  }}
                  placeholder="Enter coupon code"
                  value={couponCode}
                />
                <button
                  disabled={isApplyingCoupon}
                  onClick={async () => {
                    const applied = await handleApplyCoupon()
                    if (applied) setIsCouponsModalOpen(false)
                  }}
                  type="button"
                  className="min-w-[92px] rounded-xl bg-[#6338E0] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#5229C0] active:scale-95 transition disabled:opacity-70"
                >
                  {isApplyingCoupon ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <span className="coupon-spinner" />
                      <span>...</span>
                    </span>
                  ) : 'Apply'}
                </button>
              </div>
              {couponMessage ? (
                <p className={`mt-2 text-xs font-semibold ${couponMessageType === 'error' ? 'text-red-600' : 'text-[#167634]'}`}>
                  {couponMessage}
                </p>
              ) : null}

              <div className="mt-5 space-y-3">
                {availableCoupons.length === 0 ? (
                  <p className="text-sm text-neutral-500">No active coupons right now. Enter a code above if you have one.</p>
                ) : (
                  availableCoupons.map((coupon) => {
                    const isApplied = appliedCoupon?.code?.toLowerCase() === String(coupon.code).toLowerCase()
                    const isApplyingThis = isApplyingCoupon && applyingCouponCode.toLowerCase() === coupon.code.toLowerCase()
                    return (
                  <button
                    key={coupon.code}
                    type="button"
                    disabled={isApplyingCoupon || isApplied}
                    onClick={async () => {
                      const applied = await handleApplyCoupon(coupon.code)
                      if (applied) setIsCouponsModalOpen(false)
                    }}
                    className={`w-full border border-dashed rounded-2xl p-4 flex items-center justify-between gap-4 text-left transition active:scale-[0.99] disabled:opacity-70 ${
                      isApplied
                        ? 'border-[#67B529]/50 bg-[#F3FBED]'
                        : 'border-[#6338E0]/50 bg-[#F4EFFF]/30 hover:border-[#6338E0]/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-[#F4EFFF] border border-[#D5C5FD] text-[#6338E0] font-black text-xs uppercase tracking-wider">
                        {coupon.code}
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {coupon.type === 'Percentage' ? `${coupon.value}% off` : `Rs. ${coupon.value} off`}
                      </p>
                      <p className="text-xs text-neutral-500">{formatCouponDescription(coupon)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#6338E0]">
                      {isApplied ? (
                        <span className="text-[#167634]">Applied</span>
                      ) : isApplyingThis ? (
                        <span className="inline-flex items-center justify-center">
                          <span className="coupon-spinner" />
                        </span>
                      ) : (
                        <svg className="h-5 w-5 text-[#6338E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                    )
                  })
                )}
              </div>
              {appliedCoupon && (
                <button
                  onClick={() => {
                    removeCoupon()
                    setCouponMessage('Coupon removed.')
                    setIsCouponsModalOpen(false)
                  }}
                  type="button"
                  className="w-full mt-5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
                >
                  Remove Applied Coupon ({appliedCoupon.code})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Tip Modal */}
        {isCustomTipModalOpen && (
          <div
            className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsCustomTipModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-[scaleUp_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Enter Custom Tip</h3>
              <p className="text-xs text-neutral-500 text-center mb-5">
                100% of the tip goes directly to your professional
              </p>
              <form onSubmit={handleCustomTipSubmit}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-500 text-lg">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount (e.g. 150)"
                    value={customTipInput}
                    onChange={(e) => setCustomTipInput(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 pl-9 pr-4 py-3.5 text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 focus:ring-[#6338E0]/20"
                    autoFocus
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCustomTipModalOpen(false)}
                    className="flex-1 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#6338E0] py-3 text-sm font-bold text-white shadow-md shadow-[#6338E0]/25 hover:bg-[#5229C0] transition"
                  >
                    Add Tip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancellation Policy Modal */}
        {isPolicyModalOpen && (
          <div
            className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsPolicyModalOpen(false)}
          >
            <div
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Cancellation & Reschedule Policy</h3>
                <button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xl p-1"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-4 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  We understand that plans can change. Here is our simple policy:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-[#F8FAFC] p-3.5 rounded-2xl border border-neutral-200/60">
                    <span className="text-lg">🕒</span>
                    <div>
                      <p className="font-bold text-slate-900">Up to 3 hours before start time</p>
                      <p className="mt-0.5 text-neutral-500">Free cancellation and rescheduling. No questions asked.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-[#F8FAFC] p-3.5 rounded-2xl border border-neutral-200/60">
                    <span className="text-lg">⚡</span>
                    <div>
                      <p className="font-bold text-slate-900">Within 3 hours of start time</p>
                      <p className="mt-0.5 text-neutral-500">A small fee of Rs.50 may apply to compensate the professional who reserved this time slot for you.</p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                type="button"
                className="w-full mt-6 rounded-xl bg-[#6338E0] hover:bg-[#5229C0] py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-[#6338E0]/20 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* DESKTOP & TABLET VIEW (hidden lg:block / lg:grid) */}
      {/* ========================================================= */}
      <main className="hidden lg:block min-h-screen bg-[#F6FBFF] pb-[450px] text-[#003F86] lg:pb-0">
        <Navbar
          isLoggedIn={isLoggedIn}
          appSettings={appSettings}
          cartCount={cartCount}
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
          user={currentUser}
        />

        <section className="border-b border-blue-100 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-4 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cart</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">Review your cart</h1>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5 lg:px-8 lg:py-5">
          <div className="grid gap-4">
            {/* Desktop & Tablet Delivery Address Selection Banner */}
            <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F4EFFF] border border-[#D5C5FD] text-[#6338E0] text-base">
                  📍
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Delivery Address</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                    {displayAddressLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddressModalStep('list')
                  setIsAddressModalOpen(true)
                }}
                className="shrink-0 rounded-lg bg-[#F3EAFF] hover:bg-[#E8D9FF] border border-[#D5C5FD] px-3.5 py-1.5 text-xs font-bold text-[#6338E0] transition active:scale-95 shadow-2xs flex items-center gap-1.5"
              >
                <span>Change Address</span>
                <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            <SelectedServices
              displayCart={displayCart}
              onShowServices={onShowServices}
              onUpdateQuantity={onUpdateQuantity}
            />
          </div>

          <BillSummary
            appliedCoupon={appliedCoupon}
            applyingCouponCode={applyingCouponCode}
            canPlaceBooking={false}
            canProceedToPayment={true}
            checkoutStep="cart"
            couponCode={couponCode}
            couponMessage={couponMessage}
            couponMessageType={couponMessageType}
            discount={discount}
            errorMessage=""
            isApplyingCoupon={isApplyingCoupon}
            isLoggedIn={isLoggedIn}
            isPlacingBooking={false}
            onApplyCoupon={handleApplyCoupon}
            onCouponChange={(value) => {
              setCouponCode(value)
              setCouponMessage('')
              setCouponMessageType('')
            }}
            onOpenProfile={onOpenProfile}
            onPlaceBooking={() => {}}
            onProceedToPayment={handleProceed}
            onRemoveCoupon={() => {
              removeCoupon()
              setCouponMessage('')
              setCouponMessageType('')
            }}
            onRemoveTip={removeTip}
            onRequireLogin={onRequireLogin}
            payable={payable}
            showCouponSuccess={showCouponSuccess}
            tipAmount={tipAmount}
            serviceFee={serviceFee}
            subtotal={subtotal}
            isLoading={isLoading}
            wallet={{ isVisible: false }}
          />
        </section>

        <Footer appSettings={appSettings} />
      </main>

      {/* ========================================================= */}
      {/* UNIVERSAL ADDRESS MODAL (Mobile, Tablet, Desktop) */}
      {/* ========================================================= */}
      {isAddressModalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/65 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-2xs animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsAddressModalOpen(false)
            setAddressModalStep('list')
          }}
        >
          <div
            className="relative w-full sm:max-w-[540px] h-[93vh] max-h-[720px] sm:h-auto sm:max-h-[calc(100vh-2rem)] animate-[slideUp_0.25s_ease-out] flex flex-col justify-end sm:justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Close Button above top right of modal */}
            <div className="flex justify-end pb-3 pr-4 sm:pr-0 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(false)
                  setAddressModalStep('list')
                }}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white flex items-center justify-center text-slate-800 shadow-xl hover:bg-neutral-100 active:scale-95 transition duration-200 focus:outline-none"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5 font-black stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              onClick={() => setActiveDropdownId(null)}
              className="w-full flex-1 min-h-0 rounded-t-[28px] sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
            >
              {addressModalStep === 'list' && (
                <>
                  {/* Header Section */}
                  <div className="pt-6 px-6 pb-2 shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Saved address
                    </h3>
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="mt-4 inline-flex items-center gap-2 text-[#6338E0] hover:text-[#5229C0] font-bold text-sm sm:text-base transition-colors focus:outline-none"
                    >
                      <span className="text-base sm:text-lg font-normal leading-none">+</span>
                      <span>Add another address</span>
                    </button>
                    <div className="border-t border-neutral-100/90 mt-4 sm:mt-5" />
                  </div>

                  {/* Address List Body */}
                  <div className="overflow-y-auto flex-1 divide-y divide-neutral-100 max-h-[50vh]">
                    {!isLoggedIn && (
                      <div className="py-8 text-center px-6">
                        <p className="text-sm text-neutral-500 mb-4">Please log in to view your saved addresses or to select a delivery location.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddressModalOpen(false)
                            onRequireLogin?.()
                          }}
                          className="px-8 py-3 rounded-xl bg-[#6338E0] text-white font-bold text-sm hover:bg-[#5229C0] transition shadow-md shadow-[#6338E0]/25"
                        >
                          Login / Sign up
                        </button>
                      </div>
                    )}

                    {isLoggedIn && savedAddresses.length === 0 && (
                      <div className="py-10 text-center px-6">
                        <p className="text-sm font-medium text-neutral-500">No saved addresses found.</p>
                        <p className="text-xs text-neutral-400 mt-1">Click on + Add another address above to add your location.</p>
                      </div>
                    )}

                    {isLoggedIn && savedAddresses.map((addr) => {
                      const isSelected = String(addr.id) === String(selectedAddressId || savedAddresses[0]?.id)
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className="relative flex items-start justify-between gap-3 sm:gap-4 px-6 py-4.5 cursor-pointer hover:bg-slate-50/60 transition-colors group"
                        >
                          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                            <span
                              className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
                                isSelected ? 'border-[#6338E0] border-2 bg-white' : 'border-neutral-300 bg-white group-hover:border-[#6338E0]/60'
                              }`}
                            >
                              {isSelected && (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#6338E0]" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                                {addr.label || 'Home'}
                              </p>
                              <p className="mt-1 text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
                                {[addr.flat, addr.street, addr.city, addr.state, addr.pincode, 'India'].filter(Boolean).join(', ')}
                              </p>
                              {(addr.contactName || addr.mobile) && (
                                <p className="mt-1.5 text-xs text-neutral-400 font-medium">
                                  {[addr.contactName, addr.mobile].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdownId((prev) => (String(prev) === String(addr.id) ? null : addr.id))
                              }}
                              className="p-1.5 text-neutral-600 hover:text-slate-900 transition-colors focus:outline-none mt-0.5 rounded-lg hover:bg-neutral-100"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {String(activeDropdownId) === String(addr.id) && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-9 w-36 rounded-2xl bg-white p-1.5 shadow-xl border border-neutral-100 ring-1 ring-black/5 z-[60] animate-[fadeIn_0.15s_ease-out]"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleEditAddress(addr)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition text-left"
                                >
                                  <span className="text-base">✏️</span>
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddress(addr.id)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition text-left mt-0.5"
                                >
                                  <span className="text-base">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Bottom Action Section ("Proceed") */}
                  <div className="p-4 sm:p-5 px-6 border-t border-neutral-100 bg-white shrink-0">
                    <button
                      type="button"
                      disabled={!selectedAddressId && savedAddresses.length === 0}
                      onClick={() => {
                        const selected = savedAddresses.find((a) => String(a.id) === String(selectedAddressId)) || savedAddresses[0]
                        if (selected) {
                          handleSelectAddress(selected)
                        }
                      }}
                      className={`w-full py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition duration-200 flex items-center justify-center ${
                        selectedAddressId || savedAddresses.length > 0
                          ? 'bg-[#6338E0] hover:bg-[#5229C0] text-white shadow-md shadow-[#6338E0]/25 active:scale-[0.98]'
                          : 'bg-[#EDEDEE] text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      Proceed
                    </button>
                  </div>
                </>
              )}

              {addressModalStep === 'location_search' && (
                <div className="flex flex-col h-full flex-1">
                  {/* Search Bar & GPS Button */}
                  <div className="p-5 pb-3 shrink-0">
                    <div className="flex items-center gap-3 rounded-2xl border border-neutral-300 focus-within:border-[#6338E0] px-4 py-3 bg-white shadow-2xs">
                      <svg className="w-5 h-5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search for your location/society/apartment"
                        value={locationSearchQuery}
                        onChange={(e) => setLocationSearchQuery(e.target.value)}
                        className="w-full text-sm sm:text-base font-medium text-slate-900 placeholder:text-neutral-400 focus:outline-none bg-transparent"
                      />
                      {locationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSearchQuery('')
                            setLocationSuggestions([])
                          }}
                          className="p-1 rounded-full text-neutral-400 hover:text-slate-700 transition"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={isDetectingLocation}
                      className="mt-4 sm:mt-5 inline-flex items-center gap-2.5 text-[#6338E0] hover:text-[#5229C0] font-extrabold text-sm sm:text-base transition focus:outline-none"
                    >
                      {isDetectingLocation ? (
                        <span className="h-5 w-5 border-2 border-[#6338E0] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 stroke-current shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414" />
                        </svg>
                      )}
                      <span>{isDetectingLocation ? 'Detecting current location...' : 'Use current location'}</span>
                    </button>
                    <div className="border-t border-neutral-100 mt-4" />
                  </div>

                  {/* Suggestions List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 px-2 sm:px-3 max-h-[50vh]">
                    {isSearchingLocation && (
                      <div className="p-6 text-center text-sm text-neutral-400 font-medium">
                        Searching locations...
                      </div>
                    )}

                    {!isSearchingLocation && !isDetectingLocation && locationSuggestions.length === 0 && (
                      <div className="p-8 py-12 text-center text-neutral-400">
                        <p className="text-3xl mb-2">📍</p>
                        <p className="text-sm sm:text-base font-bold text-slate-700">No location selected yet</p>
                        <p className="text-xs sm:text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                          Search for your society/apartment above or click <span className="text-[#6338E0] font-bold">Use current location</span> to find nearby addresses.
                        </p>
                      </div>
                    )}

                    {!isSearchingLocation && locationSuggestions.length > 0 && (
                      <div className="px-3 pt-2 pb-1.5 text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                        {locationSearchQuery.trim() ? 'Search Results' : 'Nearby Locations Around You'}
                      </div>
                    )}

                    {!isSearchingLocation && locationSuggestions.map((loc) => (
                      <div
                        key={loc.place_id}
                        onClick={() => handleSelectLocationSuggestion(loc)}
                        className={`flex items-start gap-3.5 sm:gap-4 px-3 sm:px-4 py-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer transition ${
                          loc.isCurrent ? 'bg-[#6338E0]/5 border border-[#6338E0]/15' : ''
                        }`}
                      >
                        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold ${
                          loc.isCurrent ? 'bg-[#6338E0]/15 text-[#6338E0] text-base' : 'bg-neutral-100 text-neutral-500 text-sm sm:text-base'
                        }`}>
                          {loc.isCurrent ? '🎯' : '📍'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-base font-bold text-slate-900 truncate flex items-center gap-2">
                            <span>{loc.mainText}</span>
                            {loc.isCurrent && (
                              <span className="text-[10px] font-extrabold uppercase bg-[#6338E0] text-white px-2 py-0.5 rounded-md tracking-wide">
                                GPS
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed line-clamp-2">
                            {loc.subText}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Powered by Google Footer */}
                  <div className="p-3.5 bg-[#F9FAFC] border-t border-neutral-100 text-center shrink-0">
                    <p className="text-xs text-neutral-500 font-normal">
                      powered by <span className="font-bold text-[#4285F4]">G</span><span className="font-bold text-[#EA4335]">o</span><span className="font-bold text-[#FBBC05]">o</span><span className="font-bold text-[#4285F4]">g</span><span className="font-bold text-[#34A853]">l</span><span className="font-bold text-[#EA4335]">e</span>
                    </p>
                  </div>
                </div>
              )}

              {addressModalStep === 'address_form' && (
                <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
                  {/* Top Header */}
                  <div className="flex items-center justify-between p-5 lg:px-5 lg:py-4 border-b border-neutral-200 shrink-0">
                    <h2 className="text-xl sm:text-xl lg:text-xl font-bold text-slate-900 tracking-tight">
                      {editingAddressId ? 'Edit Address' : 'Add new address'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setAddressModalStep('list')}
                      className="text-sm lg:text-xs font-bold text-[#6338E0] hover:underline focus:outline-none"
                    >
                      ← Back to addresses
                    </button>
                  </div>

                  {/* Scrollable Form Content */}
                  <form onSubmit={handleSaveNewAddress} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 lg:px-5 lg:py-5 space-y-4 lg:space-y-5">
                      <div>
                        <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2 lg:mb-2">
                          Address Label / Tag
                        </label>
                        <div className="flex flex-wrap gap-2 lg:gap-2 mb-2.5 lg:mb-2.5">
                          {['Home', 'Work', 'Other'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setNewAddressForm((prev) => ({ ...prev, label: tag }))}
                              className={`px-4 py-2 lg:px-3 lg:py-1 rounded-xl lg:rounded-md border text-xs sm:text-sm lg:text-[11px] font-bold transition-all focus:outline-none ${
                                newAddressForm.label === tag
                                  ? 'bg-[#F3EAFF] border-[#6338E0] text-[#6338E0] shadow-2xs font-extrabold'
                                  : 'bg-white border-neutral-200 text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or enter custom label (e.g. Parents home)"
                          value={newAddressForm.label}
                          onChange={(e) => setNewAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                          required
                          className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                          House / Flat / Floor / Building <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Flat 402, B-Block, Sahara Tower"
                          value={newAddressForm.flat}
                          onChange={(e) => setNewAddressForm((prev) => ({ ...prev, flat: e.target.value }))}
                          className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                          Street / Area / Landmark <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Vibhuti Khand, near Shaheed Path"
                          value={newAddressForm.street}
                          onChange={(e) => setNewAddressForm((prev) => ({ ...prev, street: e.target.value }))}
                          className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 lg:gap-3.5">
                        <div>
                          <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                            Pincode <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength="6"
                            placeholder="e.g. 226010"
                            value={newAddressForm.pincode}
                            onChange={(e) => setNewAddressForm((prev) => ({ ...prev, pincode: e.target.value }))}
                            className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                            City <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newAddressForm.city}
                            onChange={(e) => setNewAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                            className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20 bg-white appearance-auto"
                          >
                            <option value="Lucknow">Lucknow</option>
                            <option value="Kanpur">Kanpur</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Noida">Noida</option>
                            <option value="Gurugram">Gurugram</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Bengaluru">Bengaluru</option>
                            <option value="Hyderabad">Hyderabad</option>
                            <option value="Chennai">Chennai</option>
                            <option value="Kolkata">Kolkata</option>
                            <option value="Pune">Pune</option>
                            <option value="Ahmedabad">Ahmedabad</option>
                            <option value="Jaipur">Jaipur</option>
                            <option value="Varanasi">Varanasi</option>
                            <option value="Agra">Agra</option>
                            <option value="Prayagraj">Prayagraj</option>
                            <option value="Indore">Indore</option>
                            <option value="Patna">Patna</option>
                            <option value="Chandigarh">Chandigarh</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                            State <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newAddressForm.state}
                            onChange={(e) => setNewAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                            className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20 bg-white appearance-auto"
                          >
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Uttam Pradesh">Uttarakhand</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Odisha">Odisha</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-3.5 pt-1 lg:pt-1">
                        <div>
                          <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                            Contact Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Person name"
                            value={newAddressForm.contactName}
                            onChange={(e) => setNewAddressForm((prev) => ({ ...prev, contactName: e.target.value }))}
                            className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs lg:text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 lg:mb-2">
                            Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="10-digit mobile number"
                            value={newAddressForm.mobile}
                            onChange={(e) => setNewAddressForm((prev) => ({ ...prev, mobile: e.target.value }))}
                            className="w-full rounded-2xl lg:rounded-lg border border-neutral-300 px-4 py-3.5 lg:h-9 lg:px-3 lg:py-0 text-sm lg:text-xs font-bold lg:font-medium text-slate-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-[#6338E0] focus:outline-none focus:ring-2 lg:focus:ring-1 focus:ring-[#6338E0]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sticky Bottom Footer */}
                    <div className="p-4 sm:p-5 lg:px-5 lg:py-4 border-t border-neutral-200/80 bg-white flex items-center gap-3 lg:gap-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10">
                      <button
                        type="button"
                        onClick={() => setAddressModalStep(editingAddressId ? 'list' : 'location_search')}
                        className="flex-1 py-3.5 sm:py-4 lg:h-9 lg:py-0 rounded-2xl lg:rounded-lg border border-neutral-300 bg-white text-sm sm:text-base lg:text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingAddress || !newAddressForm.flat.trim() || !newAddressForm.street.trim() || !newAddressForm.pincode.trim() || !newAddressForm.mobile.trim()}
                        className="flex-1 py-3.5 sm:py-4 lg:h-9 lg:py-0 rounded-2xl lg:rounded-lg bg-[#6338E0] hover:bg-[#5229C0] disabled:bg-[#6338E0]/50 text-white text-sm sm:text-base lg:text-xs font-bold shadow-md shadow-[#6338E0]/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {isSavingAddress ? (
                          <>
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>{editingAddressId ? 'Update Address' : 'Save & Proceed'}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* UNIVERSAL SLOT SELECTION MODAL (Mobile, Tablet, Desktop) */}
      {/* ========================================================= */}
      <SlotSelectionModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        displayCart={displayCart}
        groupedCart={groupedCart}
        selectedSlots={selectedSlots}
        onSaveSlots={handleConfirmSlotsAndCheckout}
        confirmText="Confirm & Proceed"
      />
    </>
  )
}

export default CartPage
