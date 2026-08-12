import { useEffect, useMemo, useState } from 'react'
import BillSummary from '../../components/checkout/BillSummary'
import ServiceSlotPayment from '../../components/checkout/ServiceSlotPayment'
import SlotSelectionModal from '../../components/checkout/SlotSelectionModal'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { getDisplayCart } from '../../components/services/ServiceCartUtils'
import { frontendApi } from '../../services/frontendApi'
import { useCheckoutPricing } from '../../hooks/useCheckoutPricing'

const toDateValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDefaultSlot = () => {
  const slotTime = new Date()
  slotTime.setHours(slotTime.getHours() + 2, 0, 0, 0)

  return `${toDateValue(new Date())}, ${String(slotTime.getHours()).padStart(2, '0')}:00`
}

const gatewayPaymentMethods = ['razorpay', 'phonepe', 'paypal', 'online', 'upi']

const money = (value) => Math.round((Number(value) || 0) * 100) / 100

const compactCartItem = (item) => ({
  id: item.id,
  service_package_id: item.id,
  image: item.image || null,
  lineTotal: money(item.lineTotal),
  name: item.name,
  price: money(item.price),
  quantity: Number(item.quantity || 0),
  service_id: item.service_id,
})

const readBrowserLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Location permission is not available in this browser.'))
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      accuracy: position.coords.accuracy,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      capturedAt: new Date().toISOString(),
      source: 'browser',
    }),
    () => reject(new Error('Please allow location access to place this booking.')),
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
  )
})

const getAddressLocation = (address) => address?.location || address?.metadata?.location || null
const formatLocation = (location) => {
  if (!location?.latitude || !location?.longitude) return ''

  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
}

function CheckoutPage({
  appSettings,
  cart,
  cartCount,
  coupons = [],
  currentUser,
  isLoggedIn,
  locationLabel,
  onAddSavedAddress,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onPlaceBooking,
  onRequireLogin,
  onSearchSuggestionSelect,
  savedAddresses,
  searchSuggestions,
}) {
  const [checkoutStep, setCheckoutStep] = useState('payment')
  const [checkoutError, setCheckoutError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [couponMessageType, setCouponMessageType] = useState('')
  const [showCouponSuccess, setShowCouponSuccess] = useState(false)
  const [isPlacingBooking, setIsPlacingBooking] = useState(false)
  const [paymentMode, setPaymentMode] = useState('cod')
  const [wallet, setWallet] = useState(null)
  const [walletMessage, setWalletMessage] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return localStorage.getItem('rehanshi_selected_address_id') || 'new'
  })
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  
  // GST State
  const [hasGst, setHasGst] = useState(false)
  const [gstin, setGstin] = useState('')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    const meta = currentUser?.metadata || {}
    const savedGstin = String(meta.gstin || meta.gst_number || '').trim()
    const savedCompany = String(meta.company_name || meta.business_name || '').trim()
    if (savedGstin || savedCompany) {
      setHasGst(true)
      if (savedGstin) setGstin(savedGstin.toUpperCase())
      if (savedCompany) setCompanyName(savedCompany)
    }
  }, [currentUser?.id])

  const [address, setAddress] = useState({
    city: 'Lucknow',
    contactName: '',
    flat: '',
    location: null,
    mobile: '',
    street: '',
  })
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [slot, setSlot] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('rehanshi_selected_slots'))
      if (saved) {
        const firstKey = Object.keys(saved)[0]
        if (firstKey && saved[firstKey]?.fullSlot) {
          return saved[firstKey].fullSlot
        }
      }
    } catch {
      // fallback to getDefaultSlot
    }
    return getDefaultSlot()
  })
  const [selectedSlotsMap, setSelectedSlotsMap] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('rehanshi_selected_slots')) || null
    } catch {
      return null
    }
  })
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)

  const hasNextDaySlot = useMemo(() => {
    if (!selectedSlotsMap) return false
    return Object.values(selectedSlotsMap).some((s) => s?.isNextDay)
  }, [selectedSlotsMap])
  const enabledPaymentMethods = useMemo(() => {
    const paymentSettings = appSettings?.payment_methods || {}
    const fallbackPaymentMethods = [
      ['cod', 'Pay after service'],
      ['online', 'Pay online'],
    ]
    const configuredPaymentMethods = Object.entries(paymentSettings)
      .filter(([key, setting]) => key !== 'online' && key !== 'upi' && (['cod', 'wallet'].includes(key) || setting.provider))
      .map(([key, setting]) => ({
        enabled: setting.enabled,
        key,
        label: setting.label || setting.value || key.replace(/_/g, ' '),
      }))

    return (configuredPaymentMethods.length
      ? configuredPaymentMethods
      : fallbackPaymentMethods.map(([key, label]) => ({ enabled: true, key, label })))
      .filter((method) => method.enabled)
  }, [appSettings])

  // Enforce Online Payment if future slot is selected
  useEffect(() => {
    if (hasNextDaySlot && paymentMode === 'cod') {
      const nextMode = enabledPaymentMethods.find((m) => m.key !== 'cod')?.key || 'online'
      setPaymentMode(nextMode)
    }
  }, [hasNextDaySlot, paymentMode, enabledPaymentMethods])

  const effectivePaymentMode = enabledPaymentMethods.some((method) => method.key === paymentMode)
    ? paymentMode
    : enabledPaymentMethods[0]?.key || paymentMode
  const selectedSavedAddress = savedAddresses.find((savedAddress) => savedAddress.id === selectedAddressId) || savedAddresses[0]
  const shouldShowNewAddressForm = isLoggedIn && (showNewAddressForm || savedAddresses.length === 0)
  const serviceAddress = shouldShowNewAddressForm ? address : selectedSavedAddress || address
  const displayCart = getDisplayCart(cart)
  const {
    appliedCoupon,
    applyCoupon,
    applyingCouponCode,
    calculation,
    isApplyingCoupon,
    isLoading,
    pricing,
    removeCoupon,
    removeTip,
    tipAmount,
  } = useCheckoutPricing(cart, currentUser?.id, coupons)

  const { subtotal, serviceFee, discount, payable, totalToPay } = pricing
  const totalAmountToPay = totalToPay

  const availableCoupons = useMemo(
    () => (coupons || []).filter((coupon) => coupon.status === 'Active'),
    [coupons],
  )
  const walletBalance = money(wallet?.balance)
  const isWalletPayment = /wallet/i.test(String(effectivePaymentMode || ''))
  const isGatewayPayment = gatewayPaymentMethods.includes(effectivePaymentMode)
  const isRazorpayPayment = effectivePaymentMode === 'razorpay'
  const hasEnoughWalletBalance = !isWalletPayment || walletBalance >= totalAmountToPay
  const insufficientWalletMessage = 'Insufficient balance'
  const isServiceCityLucknow = serviceAddress.city.trim().toLowerCase() === 'lucknow'
  const isBrowserOutsideLucknow = locationLabel && !locationLabel.toLowerCase().includes('lucknow')
  const hasServiceAddress = isLoggedIn && (selectedSavedAddress || (showNewAddressForm && address.flat && address.street && address.contactName && address.mobile))
  
  // GST validation
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i
  const isGstValid = !hasGst || (gstRegex.test(gstin.trim()) && companyName.trim() !== '')
  
  const canProceedToPayment = displayCart.length > 0 && isLoggedIn && hasServiceAddress && isServiceCityLucknow && Boolean(slot) && isGstValid
  // Wallet insufficient only blocks booking when Wallet is selected; COD / UPI stay enabled
  const canPlaceBooking = canProceedToPayment && checkoutStep === 'payment' && hasEnoughWalletBalance && !isPlacingBooking

  useEffect(() => {
    if (!isLoggedIn) {
       onRequireLogin?.()
    }
  }, [isLoggedIn, onRequireLogin])

  useEffect(() => {
    if (displayCart.length === 0) {
       window.history.pushState({}, '', '/cart')
       window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [displayCart.length])

  useEffect(() => {
    setCheckoutError('')
    setCouponMessage('')
  }, [selectedAddressId, showNewAddressForm, address.city, address.flat, address.mobile, address.street, slot, hasGst, gstin, companyName])

  useEffect(() => {
    if (!savedAddresses.length) return
    const storedId = localStorage.getItem('rehanshi_selected_address_id')
    if (storedId && savedAddresses.some((savedAddress) => String(savedAddress.id) === String(storedId))) {
      if (String(selectedAddressId) !== String(storedId)) {
        setSelectedAddressId(storedId)
      }
      return
    }
    if (savedAddresses.some((savedAddress) => String(savedAddress.id) === String(selectedAddressId))) return

    const defaultId = savedAddresses[0].id
    setSelectedAddressId(defaultId)
    localStorage.setItem('rehanshi_selected_address_id', String(defaultId))
  }, [savedAddresses, selectedAddressId])

  useEffect(() => {
    let ignore = false

    if (!isLoggedIn || !currentUser?.name) {
      setWallet(null)
      setWalletMessage('')
      return undefined
    }

    frontendApi.customerWallet(currentUser.name, currentUser.id)
      .then((customerWallet) => {
        if (ignore) return
        setWallet(customerWallet)
        setWalletMessage(customerWallet ? '' : 'Wallet is active, but no wallet balance was found for this account.')
      })
      .catch(() => {
        if (ignore) return
        setWallet(null)
        setWalletMessage('Wallet balance could not be loaded.')
      })

    return () => {
      ignore = true
    }
  }, [currentUser, isLoggedIn])

  useEffect(() => {
    if (checkoutStep !== 'payment') return undefined

    const clearInsufficientWalletError = (current) => (
      current === insufficientWalletMessage
      || current === 'Wallet balance is lower than payable amount.'
        ? ''
        : current
    )

    // Wallet check only applies when Wallet is the selected method
    if (!isWalletPayment) {
      setCheckoutError(clearInsufficientWalletError)
      return undefined
    }

    if (!hasEnoughWalletBalance) {
      setCheckoutError(insufficientWalletMessage)
      return undefined
    }

    setCheckoutError(clearInsufficientWalletError)
    return undefined
  }, [checkoutStep, hasEnoughWalletBalance, insufficientWalletMessage, isWalletPayment])

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode)
    const nextIsWallet = /wallet/i.test(String(mode || ''))
    if (!nextIsWallet) {
      setCheckoutError((current) => (
        current === insufficientWalletMessage
        || current === 'Wallet balance is lower than payable amount.'
          ? ''
          : current
      ))
      return
    }
    if (walletBalance < totalAmountToPay) {
      setCheckoutError(insufficientWalletMessage)
    }
  }

  const updateAddress = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }))
  }

  const saveCheckoutAddress = async () => {
    setCheckoutError('')
    try {
      let location = getAddressLocation(address)
      if (!location) {
        setIsCapturingLocation(true)
        try {
          location = await readBrowserLocation()
        } finally {
          setIsCapturingLocation(false)
        }
      }

      const savedAddress = await onAddSavedAddress?.({
        ...address,
        label: address.label || 'New address',
        location,
      })
      if (savedAddress?.id) {
        setSelectedAddressId(savedAddress.id)
        localStorage.setItem('rehanshi_selected_address_id', String(savedAddress.id))
        setShowNewAddressForm(false)
        setAddress({ city: 'Lucknow', contactName: '', flat: '', label: '', location: null, mobile: '', street: '' })
      }
    } catch (error) {
      setCheckoutError(error.message)
    } finally {
      setIsCapturingLocation(false)
    }
  }

  const captureAddressLocation = async () => {
    setCheckoutError('')
    setIsCapturingLocation(true)
    try {
      const location = await readBrowserLocation()
      setAddress((current) => ({ ...current, location }))
      setCheckoutError('')
    } catch (error) {
      setCheckoutError(error.message)
    } finally {
      setIsCapturingLocation(false)
    }
  }

  const applyCouponHandler = async (codeOverride) => {
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
      setShowCouponSuccess(true)
      window.setTimeout(() => setShowCouponSuccess(false), 2200)
      return true
    } catch (requestError) {
      removeCoupon()
      setCouponMessageType('error')
      setCouponMessage(requestError.message)
      return false
    }
  }

  const proceedToPayment = () => {
    setCheckoutError('')

    if (!isLoggedIn) {
      setCheckoutError('Please login to continue checkout.')
      onRequireLogin?.()
      return
    }

    if (!hasServiceAddress) {
      setCheckoutError('Please select or save a service address.')
      return
    }

    if (!isServiceCityLucknow) {
      setCheckoutError('Service is currently available only in Lucknow.')
      return
    }

    if (!slot) {
      setCheckoutError('Please choose a service slot.')
      return
    }

    if (hasGst) {
      if (!gstin.trim() || !companyName.trim()) {
        setCheckoutError('Please provide both GSTIN and Company Name for GST claim.')
        return
      }
      if (!gstRegex.test(gstin.trim())) {
        setCheckoutError('Please enter a valid 15-character GSTIN.')
        return
      }
    }

    setCheckoutStep('payment')
  }

  const validateCheckoutTotals = () => {
    if (!displayCart.length) return 'Your cart is empty.'
    if (displayCart.some((item) => !item.id || Number(item.quantity || 0) < 1 || money(item.price) <= 0)) {
      return 'Cart has an invalid service item. Please refresh the cart and try again.'
    }
    if (discount > subtotal) return 'Coupon discount cannot be higher than item total.'
    if (isWalletPayment && !hasEnoughWalletBalance) return insufficientWalletMessage

    return ''
  }

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded. Please try another payment method.'))
    document.body.appendChild(script)
  })

  const processGatewayPayment = async ({ amount, customerName, customerPhone }) => {
    if (!isGatewayPayment) return null

    if (!isRazorpayPayment) {
      return {
        id: `${effectivePaymentMode}_${Date.now()}`,
        method: effectivePaymentMode,
        status: 'paid',
      }
    }

    const razorpayKey = appSettings?.payment_methods?.razorpay?.public_key
    if (!razorpayKey) {
      throw new Error('Razorpay is enabled but Key ID is missing in payment settings.')
    }

    await loadRazorpayScript()

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        amount: Math.round(amount * 100),
        contact: customerPhone,
        currency: 'INR',
        description: 'KwalityCareservice booking payment',
        handler: (response) => resolve({
          id: response.razorpay_payment_id,
          method: 'razorpay',
          status: 'paid',
        }),
        key: razorpayKey,
        modal: {
          ondismiss: () => reject(new Error('Payment was cancelled. Please complete payment to place booking.')),
        },
        name: 'Rehanshi',
        prefill: {
          contact: customerPhone,
          name: customerName,
        },
        theme: {
          color: '#003F86',
        },
      })
      checkout.open()
    })
  }

  const placeBooking = async () => {
    if (hasGst) {
      if (!gstin.trim() || !companyName.trim()) {
        setCheckoutError('Please provide both GSTIN and Company Name for GST claim.')
        return
      }
      if (!gstRegex.test(gstin.trim())) {
        setCheckoutError('Please enter a valid 15-character GSTIN.')
        return
      }
    }

    if (isWalletPayment && !hasEnoughWalletBalance) {
      setCheckoutError(insufficientWalletMessage)
      return
    }
    if (!canPlaceBooking) return
    setIsPlacingBooking(true)
    setCheckoutError('')

    const addressText = [serviceAddress.flat, serviceAddress.street, serviceAddress.city].filter(Boolean).join(', ')
    const customerName = serviceAddress.contactName || currentUser?.name || 'Customer'
    const customerPhone = serviceAddress.mobile || currentUser?.phone || ''
    const primaryItem = displayCart[0]

    try {
      const validationError = validateCheckoutTotals()
      if (validationError) throw new Error(validationError)

      const paymentReceipt = await processGatewayPayment({
        amount: totalAmountToPay,
        customerName,
        customerPhone,
      })
      const paymentStatus = effectivePaymentMode === 'cod' ? 'Cash' : 'Paid'
      const serviceLocation = getAddressLocation(serviceAddress) || await readBrowserLocation()
      const serviceAddressWithLocation = {
        ...serviceAddress,
        location: serviceLocation,
        metadata: {
          ...(serviceAddress.metadata || {}),
          location: serviceLocation,
        },
      }

      await onPlaceBooking?.({
        apiPayload: {
          address: addressText,
          amount: totalAmountToPay,
          tip_amount: tipAmount,
          customer_name: customerName,
          customer_phone: customerPhone,
          metadata: {
            coupon: appliedCoupon ? { code: appliedCoupon.code, discount } : null,
            customer_id: currentUser?.id,
            items: displayCart.map(compactCartItem),
            payment: {
              method: effectivePaymentMode,
              payable: totalAmountToPay,
              service_payable: payable,
              tip_amount: tipAmount,
              receipt: paymentReceipt,
              status: effectivePaymentMode === 'cod' ? 'cash_on_service' : 'paid_before_booking',
            },
            service_address: serviceAddressWithLocation,
            service_location: serviceLocation,
            service_fee: serviceFee,
            subtotal,
            tip_amount: tipAmount,
            user_location: locationLabel,
            ...(hasGst && gstin.trim() ? {
              gstin: gstin.trim().toUpperCase(),
              company_name: companyName.trim(),
              has_gst: true,
              place_of_supply: 'Uttar Pradesh (09)',
            } : {}),
            ...(selectedSlotsMap ? { selected_slots: selectedSlotsMap } : {}),
          },
          payment_method: effectivePaymentMode,
          payment_status: paymentStatus,
          priority: 'Normal',
          scheduled_at: slot.replace(', ', ' '),
          service_name: displayCart.length > 1 ? `${primaryItem.name} + ${displayCart.length - 1} more` : primaryItem.name,
          status: 'Pending Approval',
          timeline: [
            effectivePaymentMode === 'cod' ? 'Cash payment selected' : 'Payment successful before booking',
            'Booking placed',
          ],
        },
        summary: {
          address: serviceAddress,
          amount: payable,
          tipAmount,
          totalPayable: totalAmountToPay,
          items: displayCart,
          paymentMode: effectivePaymentMode,
          paymentModeLabel: enabledPaymentMethods.find((method) => method.key === effectivePaymentMode)?.label || effectivePaymentMode,
          slot,
          selectedSlotsMap,
          serviceLocation,
          userLocation: locationLabel,
        },
      })
    } catch (requestError) {
      setCheckoutStep('payment')
      const fieldMessage = requestError.errors?.payment_method?.[0]
        || requestError.errors?.amount?.[0]
      setCheckoutError(fieldMessage || requestError.message || 'Payment failed. Please try again from checkout.')
    } finally {
      setIsPlacingBooking(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFB] pb-28 text-slate-800 lg:pb-0">
      <div className="hidden lg:block">
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
      </div>

      {/* Sleek Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-white px-4 py-3.5 sm:px-6 border-b border-neutral-200 shadow-2xs lg:hidden">
        <button
          onClick={() => {
            if (onOpenCart) onOpenCart()
            else {
              window.history.pushState({}, '', '/cart')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
          className="p-1 text-slate-800 hover:bg-neutral-100 rounded-xl focus:outline-none transition active:scale-95 shrink-0"
          type="button"
          aria-label="Back to Cart"
        >
          <svg className="w-6 h-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
            Select payment method
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#6338E0] mt-0.5">
            Amount to pay: Rs.{totalAmountToPay}
          </p>
        </div>
      </header>

      <section className="border-b border-neutral-200 bg-white hidden lg:block">
        <div className="mx-auto max-w-7xl px-5 py-2.5 lg:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6338E0]">Checkout</p>
          <h1 className="mt-0.5 text-xl font-bold leading-tight text-slate-900">Complete your booking</h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-3.5 lg:px-5 lg:py-3.5">
        <div className="min-w-0 grid gap-3">
          <ServiceSlotPayment
            appSettings={appSettings}
            onPaymentModeChange={handlePaymentModeChange}
            paymentMode={effectivePaymentMode}
            hasNextDaySlot={hasNextDaySlot}
            payableAmount={totalAmountToPay}
            walletBalance={walletBalance}
          />

          <section className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-xs">
            <div className="border-b border-neutral-100 px-3.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    GST details
                  </h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Optional — add GSTIN for a GST tax invoice.
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-slate-50 px-2 py-1">
                  <input
                    checked={hasGst}
                    className="h-3.5 w-3.5 accent-[#6338E0]"
                    onChange={(event) => {
                      const enabled = event.target.checked
                      setHasGst(enabled)
                      if (!enabled) {
                        setGstin('')
                        setCompanyName('')
                        setCheckoutError('')
                      }
                    }}
                    type="checkbox"
                  />
                  <span className="text-[11px] font-bold text-slate-700">I have GST</span>
                </label>
              </div>
            </div>

            {hasGst ? (
              <div className="grid gap-1.5 px-3.5 py-2.5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Company / business name</span>
                  <input
                    className="mt-0.5 h-8 w-full rounded-md border border-neutral-200 bg-slate-50 px-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#6338E0] focus:bg-white"
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Registered business name"
                    value={companyName}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">GSTIN</span>
                  <input
                    className="mt-0.5 h-8 w-full rounded-md border border-neutral-200 bg-slate-50 px-2.5 text-sm font-semibold uppercase tracking-wide text-slate-800 outline-none transition focus:border-[#6338E0] focus:bg-white"
                    maxLength={15}
                    onChange={(event) => setGstin(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                    placeholder="22AAAAA0000A1Z5"
                    value={gstin}
                  />
                  <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                    15-character GSTIN for invoice claim.
                  </span>
                </label>
                {gstin && !gstRegex.test(gstin.trim()) ? (
                  <p className="sm:col-span-2 text-[11px] font-semibold text-rose-600">
                    Enter a valid GSTIN (e.g. 09ABCDE1234F1Z5).
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="px-3.5 py-2 text-[11px] font-medium text-slate-500">
                Turn this on only if your business needs GST billing on the invoice.
              </div>
            )}
          </section>
        </div>

        <BillSummary
          appliedCoupon={appliedCoupon}
          applyingCouponCode={applyingCouponCode}
          availableCoupons={availableCoupons}
          canPlaceBooking={canPlaceBooking}
          canProceedToPayment={canProceedToPayment}
          checkoutStep={checkoutStep}
          couponCode={couponCode}
          couponMessage={couponMessage}
          couponMessageType={couponMessageType}
          discount={discount}
          errorMessage={
            checkoutError === insufficientWalletMessage && !isWalletPayment
              ? ''
              : checkoutError
          }
          gstClaim={hasGst ? { companyName: companyName.trim(), gstin: gstin.trim().toUpperCase() } : null}
          isApplyingCoupon={isApplyingCoupon}
          isLoggedIn={isLoggedIn}
          isPlacingBooking={isPlacingBooking}
          onApplyCoupon={applyCouponHandler}
          onCouponChange={(value) => {
            setCouponCode(value)
            setCouponMessage('')
            setCouponMessageType('')
          }}
          onOpenProfile={onOpenProfile}
          onPlaceBooking={placeBooking}
          onProceedToPayment={proceedToPayment}
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
          wallet={{
            applied: calculation?.wallet_applied || 0,
            balance: walletBalance,
            hasEnoughBalance: hasEnoughWalletBalance,
            isVisible: checkoutStep === 'payment' && isWalletPayment,
            message: !hasEnoughWalletBalance
              ? insufficientWalletMessage
              : walletMessage,
            payable: totalAmountToPay,
          }}
        />
      </section>

      <div className="hidden lg:block">
        <Footer appSettings={appSettings} />
      </div>

      <SlotSelectionModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        displayCart={displayCart}
        selectedSlots={selectedSlotsMap || {}}
        onSaveSlots={(newSlots) => {
          setSelectedSlotsMap(newSlots)
          window.localStorage.setItem('rehanshi_selected_slots', JSON.stringify(newSlots))
          const firstKey = Object.keys(newSlots)[0]
          if (firstKey && newSlots[firstKey]?.fullSlot) {
            setSlot(newSlots[firstKey].fullSlot)
          }
        }}
        confirmText="Update Slots"
      />
    </main>
  )
}

export default CheckoutPage
