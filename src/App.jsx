import { useEffect, useState, lazy, Suspense } from 'react'
import Toast from './components/common/Toast'
import AuthModal from './components/auth/AuthModal'
import MobileTabletGuestAuthBottomSheet from './components/auth/MobileTabletGuestAuthBottomSheet'
import FloatingCart from './components/layout/FloatingCart'
import { addPackageToCart, getCartItemKey } from './components/services/ServiceCartUtils'
import { COUPON_STORAGE_KEY, TIP_STORAGE_KEY } from './utils/checkoutPricing'
import { frontendApi } from './services/frontendApi'
import { adminApi } from './services/adminApi'
import { vendorApi } from './services/vendorApi'
import { broadcastRealtimeRefresh } from './utils/realtime'
import CartPage from './pages/checkout/CartPage'
import ContactPage from './pages/contact/ContactPage'
import HomePage from './pages/home/HomePage'
import PlaceBookingPage from './pages/booking/PlaceBookingPage'
import InvoicePage from './pages/profile/InvoicePage'
import ProfilePage from './pages/profile/ProfilePage'
import ServiceDetailPage from './pages/services/ServiceDetailPage'
import ServicesPage from './pages/services/ServicesPage'
import BecomeServiceProviderPage from './pages/vendor/BecomeServiceProviderPage'
import PublicVendorMembershipPage from './pages/vendor/PublicVendorMembershipPage'
import StaffLoginPage from './pages/staff/StaffLoginPage'
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage'
import TermsAndConditionPage from './pages/legal/TermsAndConditionPage'
import ItemRateListPage from './pages/services/ItemRateListPage'
import VendorAccountDeletionPage from './pages/legal/VendorAccountDeletionPage'

const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const CustomerDetailsPage = lazy(() => import('./pages/admin/CustomerDetailsPage'))
const PartnerDetailsPage = lazy(() => import('./pages/admin/PartnerDetailsPage'))
const PartnerEditPage = lazy(() => import('./pages/admin/PartnerEditPage'))
const VendorDashboardPage = lazy(() => import('./pages/vendor/VendorDashboardPage'))
import { toAppRoutePath, toBrowserPath } from './config/urls'
import { askAppConfirmation } from './utils/feedback'
import { resolveServiceBySlug, slugify } from './utils/slugs'

const routes = {
  home: '/',
  services: '/services',
  cart: '/cart',
  checkout: '/checkout',
  contact: '/contact',
  placeBooking: '/place-booking',
  profile: '/profile',
  admin: '/admin',
  staffLogin: '/staff-login',
  becomeProvider: '/become-service-provider',
  vendor: '/vendor',
  privacyPolicy: '/privacy-policy',
  termsAndCondition: '/terms-and-condition',
  rateList: '/rate-list',
  vendorAccountDeletion: '/vendor-account-deletion',
}

const packageGroupLabels = {
  annual: 'Annual plan',
  general: 'Popular packages',
  install: 'Install & uninstall',
  repair: 'Repair & diagnosis',
  service: 'Service',
}

const defaultLocationLabel = 'Detecting location...'

const parseStorageJson = (storage, key, fallback) => {
  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const formatDetectedAddress = (place, fallback) => {
  const address = place?.address || {}
  const area = address.neighbourhood || address.suburb || address.quarter || address.residential || address.road
  const locality = address.city || address.town || address.village || address.municipality || address.city_district
  const district = address.state_district || address.county || address.state
  const parts = [...new Set([area, locality, district].filter(Boolean))]

  return parts.length ? parts.join(', ') : place?.display_name?.split(',').slice(0, 3).join(', ') || fallback
}

const GUEST_CART_SNAPSHOT_KEY = 'rehanshi_guest_cart_snapshot'

const readGuestCartSnapshot = () => {
  try {
    const raw = window.sessionStorage.getItem(GUEST_CART_SNAPSHOT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeGuestCartSnapshot = (items) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      window.sessionStorage.removeItem(GUEST_CART_SNAPSHOT_KEY)
      return
    }
    window.sessionStorage.setItem(GUEST_CART_SNAPSHOT_KEY, JSON.stringify(items))
  } catch {
    // ignore quota / private mode failures
  }
}

const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
)

function App() {
  const [path, setPath] = useState(() => toAppRoutePath())
  const [cart, setCart] = useState(() => readGuestCartSnapshot())
  const [customerSession, setCustomerSession] = useState(() => {
    const token = window.localStorage.getItem('customer_jwt')
    if (token) return { token, user: null }
    return null
  })
  const [currentUser, setCurrentUser] = useState(() => {
    const token = window.localStorage.getItem('customer_jwt')
    const saved = window.localStorage.getItem('customer_user')
    if (token && saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return null
  })
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    const token = window.localStorage.getItem('admin_jwt')
    const saved = window.localStorage.getItem('admin_user')
    if (token && token !== 'undefined' && token !== 'null' && saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return null
  })
  const [currentVendor, setCurrentVendor] = useState(() => {
    const token = window.localStorage.getItem('vendor_jwt')
    const saved = window.localStorage.getItem('vendor_user')
    if (token && token !== 'undefined' && token !== 'null' && saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return null
  })
  const [locationLabel, setLocationLabel] = useState(() => window.sessionStorage.getItem('customerLocationLabel') || defaultLocationLabel)
  const [latestBooking, setLatestBooking] = useState(null)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [selectedSearchPackage, setSelectedSearchPackage] = useState('')
  const [frontendData, setFrontendData] = useState(null)
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [isProtectedLoginOpen, setIsProtectedLoginOpen] = useState(false)
  const [isGuestCartAuthOpen, setIsGuestCartAuthOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const liveServices = frontendData?.services || []
  const liveCategories = frontendData?.categories?.length
    ? frontendData.categories.map((category) => ({
      ...category,
      active: category.metadata?.active,
    }))
    : []
  const livePackageGroups = frontendData?.servicePackages?.length
    ? frontendData.servicePackages.reduce((groups, item) => {
      const key = item.category_key || 'general'
      groups[key] = [...(groups[key] || []), item]
      return groups
    }, {})
    : {}

  const searchSuggestions = Object.entries(livePackageGroups).flatMap(([categoryId, packages]) =>
    packages.map((item) => {
      const parentService = liveServices.find((s) => String(s.id) === String(item.service_id))
      const subServiceList = parentService?.sub_services || parentService?.subServices || []
      const parentSubService = subServiceList.find((sub) => String(sub.id) === String(item.sub_service_id))
      const rawRating = item.rating || parentService?.rating
      const rating = rawRating ? (isNaN(rawRating) ? String(rawRating) : Number(rawRating).toFixed(2)) : ''

      return {
        type: 'service-package',
        categoryId,
        service_id: item.service_id,
        sub_service_id: item.sub_service_id,
        name: item.name,
        image: item.image || parentService?.image,
        rating,
        price: !isNaN(item.price) && item.price !== '' ? 'Rs.' + Number(item.price).toLocaleString('en-IN') : (String(item.price || '').startsWith('Rs.') ? item.price : String(item.price || '').replace('Rs. ', 'Rs.')),
        subServiceName: parentSubService?.name || '',
        serviceName: parentService?.name || '',
        searchText: [
          item.name,
          item.description,
          parentSubService?.name || '',
          parentService?.name || '',
          packageGroupLabels[categoryId] || categoryId,
          ...(item.included || []),
          ...(item.highlights || []),
        ].join(' '),
      }
    }),
  )

  const navigate = (nextPath) => {
    window.history.pushState({}, '', toBrowserPath(nextPath))
    setPath(nextPath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openServiceDetails = (service, subService = null) => {
    const basePath = `/services/${slugify(service.slug || service.name)}`
    const nextPath = subService ? `${basePath}/${slugify(subService.slug || subService.name)}` : basePath
    navigate(nextPath)
  }

  const openPackageDetails = (pkg, parentService = null) => {
    if (!pkg) return

    const service = parentService
      || pkg.parentService
      || liveServices.find((item) => String(item.id) === String(pkg.service_id))

    if (!service) return

    // Reset first so reopening the same package from home still triggers the modal
    setSelectedSearchPackage('')
    window.setTimeout(() => setSelectedSearchPackage(pkg.name), 0)

    const subServiceList = service.sub_services || service.subServices || []
    const matchedSubService = subServiceList.find((sub) => String(sub.id) === String(pkg.sub_service_id))
    openServiceDetails(service, matchedSubService || null)
  }

  const openAdminTab = (tab) => {
    window.sessionStorage.setItem('adminActiveTab', tab)
    navigate(routes.admin)
  }

  const addToCart = (item) => {
    setCart((current) => addPackageToCart(current, item))
    setToast(`${item.name} added to cart`)
  }

  const reorderProfileOrder = (order) => {
    const packageItems = Object.values(livePackageGroups).flat()
    const sourceItems = order.reorderItems?.length
      ? order.reorderItems
      : (order.items?.length ? order.items.map((name) => ({ name })) : [{ name: order.service }])
    const fallbackPrice = Math.max(1, Math.round((Number(order.amount) || 0) / Math.max(1, sourceItems.length)))
    const nextItems = sourceItems.map((sourceItem, index) => {
      const name = sourceItem.name || order.service
      const matchedPackage = packageItems.find((item) => item.name?.toLowerCase() === String(name).toLowerCase())
      return matchedPackage || {
        id: `reorder-${order.id}-${index}`,
        name,
        price: sourceItem.price || fallbackPrice,
        service_id: sourceItem.service_id || order.service,
      }
    })

    setCart((current) => nextItems.reduce((nextCart, item) => addPackageToCart(nextCart, item), current))
    setToast(`${order.service} added to cart`)
    navigate(routes.cart)
  }

  const updateCartQuantity = (itemKey, quantity) => {
    setCart((current) =>
      current
        .map((item) => (getCartItemKey(item) === String(itemKey) ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    )
    setToast(quantity > 0 ? 'Cart updated' : 'Service removed from cart')
  }

  const loginUser = async (payload) => {
    let session
    if (payload?.token && payload?.user) {
      session = { token: payload.token, user: payload.user }
    } else if (payload?.mode === 'signup') {
      session = await frontendApi.customerSignup(payload)
    } else if (payload?.mode === 'login') {
      session = await frontendApi.customerLogin(payload)
    } else {
      session = { token: customerSession?.token || '', user: payload }
    }

    window.localStorage.setItem('customer_jwt', session.token)
    if (session.user) {
      window.localStorage.setItem('customer_user', JSON.stringify(session.user))
    }
    setCustomerSession(session)
    setCurrentUser(session.user)
    setToast('Login successful')
    return session.user
  }

  const logoutUser = async () => {
    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Logout',
      text: 'You will need to login again to access your saved profile and bookings.',
      title: 'Logout?',
      tone: 'question',
    })
    if (!confirmed) return

    const session = customerSession
    window.localStorage.removeItem('customer_jwt')
    window.localStorage.removeItem('customer_user')
    setCustomerSession(null)
    setCurrentUser(null)
    setSavedAddresses([])
    setToast('Logged out successfully')

    try {
      await frontendApi.customerLogout({ customerId: session?.user?.id, token: session?.token })
    } catch {
      return undefined
    }
  }

  const loginAdmin = (payload) => {
    const token = payload?.auth_token || payload?.token || payload?.admin?.auth_token
    const adminObj = payload?.admin || payload
    if (!token || !adminObj) {
      setToast('Login succeeded but session token is missing. Please try again.')
      return
    }

    window.localStorage.setItem('admin_jwt', token)
    window.localStorage.setItem('admin_user', JSON.stringify(adminObj))
    setCurrentAdmin(adminObj)
    setToast('Super admin login successful')
    navigate(routes.admin)
  }

  const updateCurrentAdmin = (admin) => {
    window.localStorage.setItem('admin_user', JSON.stringify(admin))
    setCurrentAdmin(admin)
  }

  const loginVendor = (payload) => {
    const vendorObj = payload?.partner || payload
    const token = vendorObj?.auth_token || payload?.auth_token || payload?.token
    if (!token || !vendorObj) {
      setToast('Login succeeded but session token is missing. Please try again.')
      return
    }

    window.localStorage.setItem('vendor_jwt', token)
    window.localStorage.setItem('vendor_user', JSON.stringify(vendorObj))
    setCurrentVendor(vendorObj)
    setToast('Vendor login successful')
    navigate(routes.vendor)
  }

  const logoutAdmin = async () => {
    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Logout',
      text: 'Your admin session will be closed on this browser.',
      title: 'Logout admin?',
      tone: 'question',
    })
    if (!confirmed) return

    window.localStorage.removeItem('admin_jwt')
    window.localStorage.removeItem('admin_user')
    setCurrentAdmin(null)
    setToast('Super admin logged out')
    navigate(routes.staffLogin)
  }

  const logoutVendor = async () => {
    const confirmed = await askAppConfirmation({
      confirmButtonText: 'Logout',
      text: 'Your vendor dashboard session will be closed.',
      title: 'Logout vendor?',
      tone: 'question',
    })
    if (!confirmed) return

    window.localStorage.removeItem('vendor_jwt')
    window.localStorage.removeItem('vendor_user')
    setCurrentVendor(null)
    setToast('Vendor logged out')
    navigate(routes.staffLogin)
  }

  const placeBooking = async (booking) => {
    const savedBooking = await frontendApi.createBooking(booking.apiPayload)
    const nextBooking = {
      ...booking.summary,
      backendId: savedBooking.id,
      bookingNo: savedBooking.booking_no,
      createdAt: savedBooking.created_at,
      id: savedBooking.booking_no || `HC-${savedBooking.id}`,
      otp: savedBooking.metadata?.service_otp,
      status: savedBooking.status,
      tipAmount: Number(savedBooking.tip_amount || booking.apiPayload.tip_amount || 0),
      timeline: savedBooking.timeline || booking.apiPayload.timeline || [],
      updatedAt: savedBooking.updated_at,
    }

    setLatestBooking(nextBooking)
    setCart([])
    window.localStorage.removeItem(TIP_STORAGE_KEY)
    window.localStorage.removeItem(COUPON_STORAGE_KEY)
    window.localStorage.removeItem('rehanshi_selected_slots')
    setToast('Booking placed successfully')
    broadcastRealtimeRefresh({ bookingId: savedBooking.id, source: 'customer-created-booking', targets: ['admin', 'customer'] })
    navigate(routes.placeBooking)
  }

  const updateLatestBooking = (booking) => {
    setLatestBooking(booking)
    window.sessionStorage.setItem('latestBooking', JSON.stringify(booking))
  }

  const addSavedAddress = async (address) => {
    const savedAddress = await frontendApi.createSavedAddress({
      ...address,
      customerProfileId: currentUser?.id,
    })
    setSavedAddresses((current) => [...current, savedAddress])
    setToast('Address saved')
    return savedAddress
  }

  const updateSavedAddress = async (id, address) => {
    const updatedAddress = await frontendApi.updateSavedAddress(id, {
      ...address,
      customerProfileId: currentUser?.id,
    })
    setSavedAddresses((current) =>
      current.map((item) => (String(item.id) === String(id) ? updatedAddress : item))
    )
    setToast('Address updated')
    return updatedAddress
  }

  const deleteSavedAddress = async (id) => {
    await frontendApi.deleteSavedAddress(id)
    setSavedAddresses((current) => current.filter((item) => String(item.id) !== String(id)))
    setToast('Address deleted')
  }

  const saveReview = async (review) => {
    const savedReview = await frontendApi.saveReview(review)
    if (['Approved', 'Published'].includes(savedReview.status)) {
      setFrontendData((current) => {
        const reviews = current?.reviews || []
        const nextReviews = reviews.some((item) => item.id === savedReview.id)
          ? reviews.map((item) => (item.id === savedReview.id ? savedReview : item))
          : [savedReview, ...reviews]

        return { ...current, reviews: nextReviews }
      })
    }
    setToast(review.id ? 'Review updated and sent for approval' : 'Review added for approval')
    return savedReview
  }

  const handleGlobalSearch = (query) => {
    if (typeof query !== 'string') {
      return
    }
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setToast('Type a service to search')
      return
    }

    const normalizedQuery = trimmedQuery.toLowerCase()
    const packageMatch = Object.values(livePackageGroups).flat().find((item) =>
      [item.name, item.description, ...(item.included || []), ...(item.highlights || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )

    setGlobalSearchQuery(trimmedQuery)
    setSelectedSearchPackage('')

    if (packageMatch) {
      setSelectedSearchPackage(packageMatch.name)
      const packageService = liveServices.find((service) => service.id === packageMatch.service_id)
      if (packageService) {
        openServiceDetails(packageService)
      } else {
        navigate(routes.services)
      }
      return
    }

    const serviceMatch = liveServices.some((service) =>
      [service.name, service.description, ...(service.includes || [])].join(' ').toLowerCase().includes(normalizedQuery),
    )

    if (!serviceMatch) {
      setToast('Showing closest service results')
    }

    const matched = liveServices.find((service) =>
      [service.name, service.description, ...(service.includes || [])].join(' ').toLowerCase().includes(normalizedQuery),
    )
    if (matched) {
      openServiceDetails(matched)
      return
    }

    navigate(routes.services)
  }

  const clearGlobalSearch = () => {
    setGlobalSearchQuery('')
    setSelectedSearchPackage('')
  }

  const showAllServices = () => {
    clearGlobalSearch()
    navigate(routes.services)
  }

  const handleSearchSuggestionSelect = (suggestion) => {
    setGlobalSearchQuery(suggestion.name)

    if (suggestion.type === 'service-package' || suggestion.type === 'sub-service') {
      setSelectedSearchPackage(suggestion.type === 'service-package' ? suggestion.name : '')
      const packageService = liveServices.find((service) => String(service.id) === String(suggestion.service_id))
      if (packageService) {
        const subServiceList = packageService.sub_services || packageService.subServices || []
        const matchedSubService = subServiceList.find((sub) => String(sub.id) === String(suggestion.sub_service_id))
        openServiceDetails(packageService, matchedSubService || null)
      } else {
        navigate(routes.services)
      }
      return
    }

    setSelectedSearchPackage('')
    const service = liveServices.find((item) => item.name === suggestion.name || String(item.id) === String(suggestion.service_id))
    if (service) {
      openServiceDetails(service)
      return
    }

    navigate(routes.services)
  }

  useEffect(() => {
    const handlePopState = () => {
      setPath(toAppRoutePath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const checkModalState = () => {
      const modalElements = document.querySelectorAll(
        '[role="dialog"], [aria-modal="true"], .swal2-shown, .animate-modal-fade, .animate-modal-fade-in, [data-modal-open="true"]'
      )
      const hasModal = modalElements.length > 0 || document.body.classList.contains('swal2-shown')
      if (hasModal) {
        if (!document.body.classList.contains('modal-open')) {
          document.body.classList.add('modal-open')
          document.documentElement.classList.add('modal-open')
        }
      }
    }

    const observer = new MutationObserver(() => {
      checkModalState()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let ignore = false

    const validateAuth = async () => {
      const customerToken = window.localStorage.getItem('customer_jwt')
      if (customerToken) {
        try {
          const session = await frontendApi.me()
          if (!ignore && session.user) {
            window.localStorage.setItem('customer_user', JSON.stringify(session.user))
            setCustomerSession(session)
            setCurrentUser(session.user)
          }
        } catch (err) {
          if (!ignore && err.status === 401) {
            window.localStorage.removeItem('customer_jwt')
            window.localStorage.removeItem('customer_user')
            setCustomerSession(null)
            setCurrentUser(null)
            setToast('Customer session expired. Please login again.')
          }
        }
      }

      const adminToken = window.localStorage.getItem('admin_jwt')
      if (adminToken && adminToken !== 'undefined' && adminToken !== 'null') {
        try {
          const response = await adminApi.me()
          if (!ignore && response.admin) {
            window.localStorage.setItem('admin_user', JSON.stringify(response.admin))
            setCurrentAdmin(response.admin)
          }
        } catch (err) {
          if (!ignore && err.status === 401) {
            window.localStorage.removeItem('admin_jwt')
            window.localStorage.removeItem('admin_user')
            setCurrentAdmin(null)
            if (toAppRoutePath().startsWith(routes.admin)) {
              navigate(routes.staffLogin)
            }
          }
        }
      } else if (adminToken === 'undefined' || adminToken === 'null') {
        window.localStorage.removeItem('admin_jwt')
        window.localStorage.removeItem('admin_user')
        if (!ignore) setCurrentAdmin(null)
      }

      const vendorToken = window.localStorage.getItem('vendor_jwt')
      if (vendorToken && vendorToken !== 'undefined' && vendorToken !== 'null') {
        try {
          const response = await vendorApi.me()
          if (!ignore && response.partner) {
            window.localStorage.setItem('vendor_user', JSON.stringify(response.partner))
            setCurrentVendor(response.partner)
          }
        } catch (err) {
          if (!ignore && err.status === 401) {
            window.localStorage.removeItem('vendor_jwt')
            window.localStorage.removeItem('vendor_user')
            setCurrentVendor(null)
            if (toAppRoutePath().startsWith(routes.vendor)) {
              navigate(routes.staffLogin)
            }
          }
        }
      } else if (vendorToken === 'undefined' || vendorToken === 'null') {
        window.localStorage.removeItem('vendor_jwt')
        window.localStorage.removeItem('vendor_user')
        if (!ignore) setCurrentVendor(null)
      }
    }

    validateAuth()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (window.sessionStorage.getItem('customerLocationLabel')) return undefined
    if (!navigator.geolocation) {
      setLocationLabel('Location not detected')
      return undefined
    }

    let ignore = false

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (ignore) return
        const fallback = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&lat=${coords.latitude}&lon=${coords.longitude}`,
          )
          const data = await response.json()
          const label = formatDetectedAddress(data, fallback)
          window.sessionStorage.setItem('customerLocationLabel', label)
          setLocationLabel(label)
        } catch {
          window.sessionStorage.setItem('customerLocationLabel', fallback)
          setLocationLabel(fallback)
        }
      },
      () => {
        if (!ignore) setLocationLabel('Location not detected')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    )

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    frontendApi.content()
      .then((data) => {
        if (!ignore) setFrontendData(data)
      })
      .catch(() => {
        if (!ignore) setToast('Live content unavailable')
      })
      .finally(() => {
        if (!ignore) setIsContentLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined

    const toastTimer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(toastTimer)
  }, [toast])

  // Persist cart in sessionStorage so guest OTP onboarding / refresh never drops items
  useEffect(() => {
    writeGuestCartSnapshot(cart)
  }, [cart])

  useEffect(() => {
    if (locationLabel && locationLabel !== defaultLocationLabel && locationLabel !== 'Location not detected') {
      window.sessionStorage.setItem('customerLocationLabel', locationLabel)
    }
  }, [locationLabel])

  useEffect(() => {
    let ignore = false

    if (!currentUser?.id) return undefined

    frontendApi.savedAddresses(currentUser.id)
      .then((addresses) => {
        if (!ignore) setSavedAddresses(addresses)
      })
      .catch(() => {
        if (!ignore) setToast('Saved addresses unavailable')
      })

    return () => {
      ignore = true
    }
  }, [currentUser])

  useEffect(() => {
    if ((path === routes.profile || path === routes.cart || path === routes.checkout) && !currentUser) {
      setIsProtectedLoginOpen(true)
    }
  }, [currentUser, path])

  const commonProps = {
    appSettings: frontendData?.settings || {},
    pages: frontendData?.pages || [],
    coupons: frontendData?.coupons || [],
    mobileBanners: frontendData?.mobileBanners || [],
    testimonials: frontendData?.testimonials || [],
    reviews: frontendData?.reviews || [],
    cartCount: cart.reduce((total, item) => total + item.quantity, 0),
    isLoggedIn: Boolean(currentUser),
    locationLabel,
    savedAddresses,
    onAddSavedAddress: addSavedAddress,
    onUpdateSavedAddress: updateSavedAddress,
    onDeleteSavedAddress: deleteSavedAddress,
    onGlobalSearch: handleGlobalSearch,
    onSearchSuggestionSelect: handleSearchSuggestionSelect,
    onLocationChange: setLocationLabel,
    onLogin: loginUser,
    onLogout: logoutUser,
    onOpenBecomeProvider: () => {
      setIsProtectedLoginOpen(false)
      navigate(routes.becomeProvider)
    },
    onOpenCart: () => navigate(routes.cart),
    onShowServices: showAllServices,
    onClearSearch: clearGlobalSearch,
    searchSuggestions,
    user: currentUser,
  }

  const mobileBottomNav = (
    <FloatingCart
      activePath={path}
      cartCount={commonProps.cartCount}
      onOpenCart={() => navigate(routes.cart)}
    />
  )

  if (path === routes.services) {
    return (
      <>
        <ServicesPage
          {...commonProps}
          content={frontendData?.contentByType}
          isContentLoading={isContentLoading}
          services={liveServices}
          cart={cart}
          onAddToCart={addToCart}
          onBackHome={() => navigate(routes.home)}
          onOpenServiceDetails={openServiceDetails}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
          onUpdateQuantity={updateCartQuantity}
          searchQuery={globalSearchQuery}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path.startsWith('/services/') && path !== routes.services) {
    const cleanPath = path.split('?')[0].split('#')[0]
    const queryPart = path.includes('?') ? path.split('?')[1] : (window.location.search.replace('?', '') || '')
    const urlParams = new URLSearchParams(queryPart)
    let filterSubServiceId = urlParams.get('sub_service_id')

    const pathParts = cleanPath.split('/').filter(Boolean)
    const serviceSlug = pathParts[1]
    const subServiceSlug = pathParts[2]

    const selectedService = resolveServiceBySlug(liveServices, liveCategories || frontendData?.categories || [], serviceSlug)

    if (subServiceSlug && selectedService) {
      const subs = selectedService.sub_services || selectedService.subServices || []
      const matchedSub = subs.find((sub) => slugify(sub.slug || sub.name) === slugify(subServiceSlug) || String(sub.id) === subServiceSlug)
      if (matchedSub) {
        filterSubServiceId = matchedSub.id
      }
    }

    return (
      <>
        <ServiceDetailPage
          {...commonProps}
          cart={cart}
          brands={frontendData?.brands}
          content={frontendData?.contentByType}
          coupons={frontendData?.coupons}
          isContentLoading={isContentLoading}
          reviews={frontendData?.reviews}
          service={selectedService}
          selectedSubServiceId={filterSubServiceId}
          onClearSubService={() => navigate(`/services/${slugify(selectedService?.slug || selectedService?.name)}`)}
          onAddToCart={addToCart}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
          onSaveReview={saveReview}

          onUpdateQuantity={updateCartQuantity}
          searchQuery={globalSearchQuery}
          selectedPackageName={selectedSearchPackage}
          onClearSelectedPackage={() => setSelectedSearchPackage('')}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.cart) {
    const requireCartLogin = () => {
      writeGuestCartSnapshot(cart)
      if (isDesktopViewport()) {
        setIsGuestCartAuthOpen(false)
        setIsProtectedLoginOpen(true)
        return
      }
      setIsProtectedLoginOpen(false)
      setIsGuestCartAuthOpen(true)
    }

    return (
      <>
        <CartPage
          {...commonProps}
          cart={cart}
          currentUser={currentUser}
          onBackHome={() => navigate(routes.home)}
          onOpenProfile={() => navigate(routes.profile)}
          onRequireLogin={requireCartLogin}

          onUpdateQuantity={updateCartQuantity}
        />
        {/* Desktop: existing AuthModal only */}
        {isProtectedLoginOpen && !currentUser && isDesktopViewport() && (
          <AuthModal
            defaultMode="login"
            onClose={() => setIsProtectedLoginOpen(false)}
            onLogin={async (payload) => {
              await loginUser(payload)
              setIsProtectedLoginOpen(false)
              navigate(routes.cart)
            }}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
          />
        )}
        {/* Mobile + Tablet: isolated guest OTP bottom sheet */}
        {isGuestCartAuthOpen && !currentUser && !isDesktopViewport() && (
          <MobileTabletGuestAuthBottomSheet
            onClose={() => setIsGuestCartAuthOpen(false)}
            onAuthenticated={async (session) => {
              const preservedCart = cart.length ? cart : readGuestCartSnapshot()
              await loginUser(session)
              if (preservedCart.length) {
                setCart(preservedCart)
                writeGuestCartSnapshot(preservedCart)
              }
              setIsGuestCartAuthOpen(false)
              navigate(routes.cart)
            }}
          />
        )}
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.checkout) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
        <CheckoutPage
          {...commonProps}
          cart={cart}
          coupons={frontendData?.coupons || []}
          currentUser={currentUser}
          onBackHome={() => navigate(routes.home)}
          onOpenProfile={() => navigate(routes.profile)}
          onPlaceBooking={placeBooking}
          onRequireLogin={() => setIsProtectedLoginOpen(true)}

          onUpdateQuantity={updateCartQuantity}
        />
        {isProtectedLoginOpen && !currentUser && (
          <AuthModal
            defaultMode="login"
            onClose={() => setIsProtectedLoginOpen(false)}
            onLogin={async (payload) => {
              await loginUser(payload)
              setIsProtectedLoginOpen(false)
              navigate(routes.checkout)
            }}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
          />
        )}
        <Toast message={toast} />
        {mobileBottomNav}
      </Suspense>
    )
  }

  if (path === routes.contact) {
    return (
      <>
        <ContactPage
          {...commonProps}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.privacyPolicy) {
    return (
      <>
        <PrivacyPolicyPage
          {...commonProps}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.termsAndCondition || path === '/terms-and-conditions') {
    return (
      <>
        <TermsAndConditionPage
          {...commonProps}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.rateList || path.startsWith('/rate-list')) {
    return (
      <>
        <ItemRateListPage
          {...commonProps}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.vendorAccountDeletion || path === '/vendor-account-deletion' || path === '/account-deletion') {
    return (
      <>
        <VendorAccountDeletionPage
          {...commonProps}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.placeBooking) {
    return (
      <>
        <PlaceBookingPage
          {...commonProps}
          booking={latestBooking}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onOpenProfile={() => navigate(routes.profile)}
          onBookingUpdated={updateLatestBooking}

        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path === routes.profile) {
    if (!currentUser) {
      return (
        <>
          <HomePage
            {...commonProps}
            packageGroups={livePackageGroups}
            servicePackages={frontendData?.servicePackages || []}
            categories={liveCategories}
            content={frontendData?.contentByType}
            coupons={frontendData?.coupons}
            isContentLoading={isContentLoading}
            services={liveServices}
            onOpenProfile={() => navigate(routes.profile)}
            onOpenServiceDetails={openServiceDetails}
            onOpenPackageDetails={openPackageDetails}
          />
          {isProtectedLoginOpen && (
            <AuthModal
              defaultMode="login"
              onClose={() => {
                setIsProtectedLoginOpen(false)
                navigate(routes.home)
              }}
              onLogin={async (payload) => {
                await loginUser(payload)
                setIsProtectedLoginOpen(false)
                navigate(routes.profile)
              }}
              onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
            />
          )}
          <Toast message={toast} />
          {mobileBottomNav}
        </>
      )
    }

    return (
      <>
        <ProfilePage
          {...commonProps}
          cart={cart}
          user={currentUser}
          onBackHome={() => navigate(routes.home)}
          onOpenCart={() => navigate(routes.cart)}
          onReorderOrder={reorderProfileOrder}

          onSaveReview={saveReview}
        />
        <Toast message={toast} />
        {mobileBottomNav}
      </>
    )
  }

  if (path.startsWith('/invoice/')) {
    const invoiceId = decodeURIComponent(path.split('/').filter(Boolean).at(-1) || '')

    return <InvoicePage invoiceId={invoiceId} />
  }

  if (path === routes.staffLogin) {
    return (
      <>
        <StaffLoginPage
          defaultMode="admin"
          onAdminLogin={loginAdmin}
          onBackHome={() => navigate(routes.home)}
          onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
          onVendorLogin={loginVendor}
        />
        <Toast message={toast} />
      </>
    )
  }

  if (path === routes.admin) {
    if (!currentAdmin) {
      return (
        <>
          <StaffLoginPage
            defaultMode="admin"
            onAdminLogin={loginAdmin}
            onBackHome={() => navigate(routes.home)}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
            onVendorLogin={loginVendor}
          />
          <Toast message={toast} />
        </>
      )
    }

    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
        <AdminDashboardPage
        appSettings={frontendData?.settings || {}}
        authenticatedAdmin={currentAdmin}
        onAdminProfileUpdated={updateCurrentAdmin}
        onBackHome={() => navigate(routes.home)}
        onLogout={logoutAdmin}
        onOpenCustomerDetails={(customerId) => navigate(`/admin/customers/${customerId}`)}
        onOpenVendor={() => navigate(routes.vendor)}
        onOpenPartnerDetails={(partnerId) => navigate(`/admin/partners/${partnerId}`)}
        onOpenPartnerEdit={(partnerId) => navigate(`/admin/partners/${partnerId}/edit`)}
      />
      </Suspense>
    )
  }

  if (path.startsWith('/admin/customers/')) {
    if (!currentAdmin) {
      return (
        <>
          <StaffLoginPage
            defaultMode="admin"
            onAdminLogin={loginAdmin}
            onBackHome={() => navigate(routes.home)}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
            onVendorLogin={loginVendor}
          />
          <Toast message={toast} />
        </>
      )
    }

    const customerId = path.split('/').filter(Boolean).at(-1)

    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
        <CustomerDetailsPage
          customerId={customerId}
          onBackAdmin={() => navigate(routes.admin)}
          onBackHome={() => navigate(routes.home)}
        />
        <Toast message={toast} />
      </Suspense>
    )
  }

  if (path.startsWith('/admin/partners/')) {
    if (!currentAdmin) {
      return (
        <>
          <StaffLoginPage
            defaultMode="admin"
            onAdminLogin={loginAdmin}
            onBackHome={() => navigate(routes.home)}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
            onVendorLogin={loginVendor}
          />
          <Toast message={toast} />
        </>
      )
    }

    const pathParts = path.split('/').filter(Boolean)
    const isEditRoute = pathParts.at(-1) === 'edit'
    const partnerId = isEditRoute ? pathParts.at(-2) : pathParts.at(-1)

    if (isEditRoute) {
      return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
          <PartnerEditPage
            adminProfile={currentAdmin}
            onBackAdmin={() => {
              window.sessionStorage.setItem('adminActiveTab', 'Partners')
              navigate(routes.admin)
            }}
            onBackHome={() => navigate(routes.home)}
            onLogout={logoutAdmin}
            onOpenPartnerDetails={(id) => navigate(`/admin/partners/${id || partnerId}`)}
            onTabChange={openAdminTab}
            partnerId={partnerId}
          />
          <Toast message={toast} />
        </Suspense>
      )
    }

    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
        <PartnerDetailsPage
          adminProfile={currentAdmin}
          onBackAdmin={() => navigate(routes.admin)}
          onBackHome={() => navigate(routes.home)}
          onOpenPartnerEdit={(id) => navigate(`/admin/partners/${id || partnerId}/edit`)}
          onTabChange={openAdminTab}
          partnerId={partnerId}
        />
        <Toast message={toast} />
      </Suspense>
    )
  }

  if (path === routes.becomeProvider) {
    return (
      <>
        <BecomeServiceProviderPage
          appSettings={frontendData?.settings || {}}
          onBackHome={() => navigate(routes.home)}
          onOpenVendorLogin={() => navigate(routes.vendor)}
        />
        <Toast message={toast} />
      </>
    )
  }

  if (path === routes.vendor) {
    if (!currentVendor) {
      return (
        <>
          <StaffLoginPage
            defaultMode="vendor"
            onAdminLogin={loginAdmin}
            onBackHome={() => navigate(routes.home)}
            onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
            onVendorLogin={loginVendor}
          />
          <Toast message={toast} />
        </>
      )
    }

    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003F86] border-t-transparent" /></div>}>
        <VendorDashboardPage
          appSettings={frontendData?.settings || {}}
          authenticatedVendor={currentVendor}
          onBackHome={() => navigate(routes.home)}
          onLogout={logoutVendor}
          onOpenAdmin={() => navigate(routes.admin)}
          onOpenBecomeProvider={() => navigate(routes.becomeProvider)}
        />
        <Toast message={toast} />
      </Suspense>
    )
  }

  if (path.startsWith('/vendors/')) {
    const partnerId = path.split('/').filter(Boolean).at(-1)

    return (
      <>
        <PublicVendorMembershipPage
          onBackHome={() => navigate(routes.home)}
          partnerId={partnerId}
        />
        <Toast message={toast} />
      </>
    )
  }

  return (
    <>
      <HomePage
        {...commonProps}
        packageGroups={livePackageGroups}
        servicePackages={frontendData?.servicePackages || []}
        categories={liveCategories}
        content={frontendData?.contentByType}
        coupons={frontendData?.coupons}
        isContentLoading={isContentLoading}
        services={liveServices}
        onOpenCart={() => navigate(routes.cart)}
        onOpenProfile={() => navigate(routes.profile)}
        onOpenServiceDetails={openServiceDetails}
        onOpenPackageDetails={openPackageDetails}
      />
      <Toast message={toast} />
      {mobileBottomNav}
    </>
  )
}

export default App
