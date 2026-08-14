import { useEffect, useRef, useState } from 'react'
import { getPendingExtraLineItems } from '../../utils/bookingItems'
import CurrentBookingCard from '../../components/profile/CurrentBookingCard'
import OrderHistorySection, { OrderHistoryDetailView } from '../../components/profile/OrderHistorySection'
import ProfileHeader from '../../components/profile/ProfileHeader'
import ProfileSidebar from '../../components/profile/ProfileSidebar'
import RaiseTicketForm from '../../components/profile/RaiseTicketForm'
import SavedAddressesSection from '../../components/profile/SavedAddressesSection'
import WalletSection from '../../components/profile/WalletSection'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { ShimmerBlock } from '../../components/common/Shimmer'
import { frontendApi } from '../../services/frontendApi'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import { askAppTextInput, notify, showAppError } from '../../utils/feedback'
import { broadcastRealtimeRefresh, playRealtimeSound } from '../../utils/realtime'

const emptyAddress = {
  city: 'Lucknow',
  contactName: '',
  flat: '',
  label: '',
  mobile: '',
  pincode: '',
  state: 'Uttar Pradesh',
  street: '',
}

const buildProfileForm = (user, address = '') => {
  const metadata = user?.metadata || {}
  return {
    address: user.address || address || metadata.address || '',
    alternatePhone: metadata.alternate_phone || metadata.alternatePhone || '',
    dateOfBirth: metadata.date_of_birth || metadata.dateOfBirth || '',
    email: user.email || '',
    emergencyContactName: metadata.emergency_contact_name || metadata.emergencyContactName || '',
    emergencyContactPhone: metadata.emergency_contact_phone || metadata.emergencyContactPhone || '',
    gender: metadata.gender || '',
    name: user.name || '',
    phone: user.phone || '',
  }
}

const toProfileOrder = (booking) => ({
  address: booking.address || 'Address not added',
  amount: booking.amount || 0,
  bookingId: booking.id,
  bookingNo: booking.booking_no,
  createdAt: booking.created_at,
  date: booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString('en-IN') : 'Schedule pending',
  id: booking.booking_no || `HC-${booking.id}`,
  items: (booking.metadata?.items || []).map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity || 1,
    service_package_id: item.service_package_id || item.id || null,
    image: item.image || null,
  })),
  metadata: booking.metadata || {},
  extra_items: (booking.extra_items || []).map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity || 1,
    rate_item_id: item.rate_item_id || null,
    image: item.image || null,
  })),
  otp: booking.metadata?.service_otp || '',
  payment: booking.payment_method || 'Payment pending',
  partnerName: booking.professional_name || booking.metadata?.partner_name || '',
  professional: booking.professional_name || 'Assigning soon',
  reorderItems: booking.metadata?.items || [],
  service: booking.service_name,
  status: booking.status || 'Pending',
  statusReason: booking.metadata?.approval?.reason || booking.metadata?.cancellation?.reason || booking.metadata?.reason || '',
  time: booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
  updatedAt: booking.updated_at,
})

const activeBookingStatuses = ['Pending', 'Pending Approval', 'Accepted', 'Professional Assigned', 'Vendor Accepted', 'On The Way', 'On the way', 'Reached - OTP Verified', 'OTP verified', 'Started', 'In progress']

const isCancelledOrRejectedBooking = (order) => /cancel|reject/i.test(String(order?.status || ''))

const statusTone = (status = '') => {
  const normalized = status.toLowerCase()
  if (normalized.includes('cancel') || normalized.includes('reject')) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (normalized.includes('pending')) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (normalized.includes('progress') || normalized.includes('started') || normalized.includes('way')) return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-[#67B529]/35 bg-[#EEF9E8] text-[#67B529]'
}

function ActiveServicesPanel({
  activeBookings,
  eyebrow = 'Active services',
  heading,
  helper = 'Tap a service to open its tracking card.',
  onSelect,
  selectedBookingId,
  isMobileList = false,
}) {
  if (!isMobileList && activeBookings.length <= 1) return null
  if (activeBookings.length === 0) {
    return isMobileList ? (
      <p className="rounded-xl border border-slate-100 bg-white p-5 text-sm font-medium text-slate-500">No bookings here right now.</p>
    ) : null
  }

  return (
    <section className={`rounded-lg border border-blue-100 bg-white p-4 shadow-sm lg:p-5 ${isMobileList ? 'border-none shadow-none p-0 bg-transparent' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#67B529]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-[#003F86]">
            {heading || `${activeBookings.length} currently active`}
          </h2>
        </div>
        <p className="text-sm font-semibold text-blue-700">{helper}</p>
      </div>
      <div className={`mt-4 grid gap-3 ${isMobileList ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {activeBookings.map((booking) => {
          const isSelected = String(selectedBookingId || '') === String(booking.id)

          return (
            <button
              className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                isSelected ? 'border-emerald-500 bg-[#EEF9E8] shadow-sm ring-2 ring-[#67B529]/20' : 'border-blue-100 bg-white'
              }`}
              key={booking.id}
              onClick={() => onSelect(booking.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#003F86]">{booking.service}</p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">{booking.id}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <p className="mt-3 line-clamp-1 text-xs font-semibold text-blue-700">
                {[booking.date, booking.time].filter(Boolean).join(' | ') || 'Schedule pending'}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ProfilePage({
  appSettings,
  cart,
  cartCount,
  isLoggedIn,
  locationLabel,
  onAddSavedAddress,
  onBackHome,
  onDeleteSavedAddress,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onReorderOrder,
  onSaveReview,
  onSearchSuggestionSelect,
  onUpdateSavedAddress,
  user,
  savedAddresses,
  searchSuggestions,
}) {
  const displayUser = user || { email: 'guest@example.com', name: 'Guest User', phone: '+91 98765 43210' }
  const [localAddresses, setLocalAddresses] = useState([])
  const [profileOverride, setProfileOverride] = useState(null)
  const [newAddress, setNewAddress] = useState(emptyAddress)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(displayUser))
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isProfilePictureUploading, setIsProfilePictureUploading] = useState(false)
  const [reviews, setReviews] = useState([])
  const [liveOrders, setLiveOrders] = useState([])
  const [selectedActiveBookingId, setSelectedActiveBookingId] = useState('')
  const [walletTransactions, setWalletTransactions] = useState([])
  const [wallet, setWallet] = useState(null)
  const [isProfileDataLoading, setIsProfileDataLoading] = useState(true)
  const [activeMobileTab, setActiveMobileTab] = useState('menu')
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null)
  const [selectedCancelledOrder, setSelectedCancelledOrder] = useState(null)
  const [historyReviewForm, setHistoryReviewForm] = useState({ rating: 5, text: '' })
  const [selectedPendingReviewId, setSelectedPendingReviewId] = useState('')
  
  const mobileTitles = {
    menu: 'My Account',
    bookings: 'My bookings',
    active_bookings: 'Active bookings',
    pending_reviews: 'Rate services',
    booking_history: 'Booking history',
    cancelled_bookings: 'Cancelled bookings',
    active_booking_detail: 'Booking details',
    pending_review_detail: 'Rate service',
    history_booking_detail: 'Booking details',
    cancelled_booking_detail: 'Booking details',
    help: 'Help center',
    passes: 'Passes & membership',
    ratings: 'My rating',
    addresses: 'Manage addresses',
    settings: 'Settings',
    raise_ticket: 'Raise a Ticket',
    about: 'About UC',
  }
  const orderStatusRef = useRef(new Map())
  const ordersLoadedRef = useRef(false)
  const profilePictureInputRef = useRef(null)
  const displayOrders = liveOrders
  const hasCustomerReview = (order) => Boolean(
    order?.metadata?.reviews?.customer_to_vendor
    || reviews.some((review) => String(review.orderId || '') === String(order?.id)),
  )
  const activeBookings = displayOrders.filter((order) => activeBookingStatuses.includes(order.status))
  const pendingReviewBookings = displayOrders.filter((order) =>
    String(order.status || '').toLowerCase().includes('complete') && !hasCustomerReview(order),
  )
  const cancelledBookings = displayOrders.filter((order) => isCancelledOrRejectedBooking(order))
  const historyOrders = displayOrders.filter((order) =>
    !activeBookingStatuses.includes(order.status) && !isCancelledOrRejectedBooking(order),
  )
  const activeCurrentBooking = activeBookings.find((order) => String(order.id) === String(selectedActiveBookingId)) || activeBookings[0]
  const pendingReviewBooking = pendingReviewBookings.find((order) => String(order.id) === String(selectedPendingReviewId)) || pendingReviewBookings[0] || null
  const topBookingCard = activeCurrentBooking
  const canReviewHistoryOrder = selectedHistoryOrder
    ? String(selectedHistoryOrder.status || '').toLowerCase().includes('complete') && !hasCustomerReview(selectedHistoryOrder)
    : false
  const canSubmitHistoryReview = canReviewHistoryOrder && historyReviewForm.text.trim()
  const visibleSavedAddresses = [
    ...savedAddresses,
    ...localAddresses,
  ]
  const firstAddressLine = visibleSavedAddresses.length
    ? [visibleSavedAddresses[0].flat, visibleSavedAddresses[0].street, visibleSavedAddresses[0].city].filter(Boolean).join(', ')
    : ''
  const profileUser = {
    ...displayUser,
    ...(profileOverride || {}),
    address: profileOverride?.address || displayUser.address || firstAddressLine,
  }
  const profileStats = {
    addresses: visibleSavedAddresses.length,
    cart: cartCount,
    orders: displayOrders.length,
    reviews: reviews.length,
  }

  const loadCustomerOrders = async () => {
    if (!profileUser?.id) return

    const bookings = await frontendApi.customerBookings(profileUser.id)
    const nextOrders = bookings.map(toProfileOrder)

    if (ordersLoadedRef.current) {
      const changedOrder = nextOrders.find((order) => {
        const key = String(order.bookingId || order.id)
        const previousStatus = orderStatusRef.current.get(key)
        return previousStatus && previousStatus !== order.status
      })

      if (changedOrder) {
        playRealtimeSound()
        if (String(changedOrder.status || '').toLowerCase().includes('complete')) {
          notify(`${changedOrder.id} is completed. Please rate your service.`, { tone: 'success' })
        } else {
          notify(`${changedOrder.id} status updated to ${changedOrder.status}.`, { tone: 'info' })
        }
      }

      const pendingExtrasOrder = nextOrders.find((order) => {
        const key = String(order.bookingId || order.id)
        const previousPending = orderStatusRef.current.get(`${key}:pending_extras`) || 0
        const nextPending = getPendingExtraLineItems(order).length
        return nextPending > previousPending
      })

      if (pendingExtrasOrder) {
        playRealtimeSound()
        notify(`${pendingExtrasOrder.id}: vendor added extra items. Please review and approve.`, { tone: 'info' })
      }
    }

    orderStatusRef.current = new Map(nextOrders.flatMap((order) => {
      const key = String(order.bookingId || order.id)
      return [
        [key, order.status],
        [`${key}:pending_extras`, getPendingExtraLineItems(order).length],
      ]
    }))
    ordersLoadedRef.current = true
    setLiveOrders(nextOrders)
  }

  const handleApproveExtraItems = async (order) => {
    if (!order?.bookingId) return
    await frontendApi.approveExtraItems(order.bookingId)
    await loadCustomerOrders()
    notify('Extra items approved. Booking amount has been updated.', { tone: 'success' })
  }

  const handleRejectExtraItems = async (order) => {
    if (!order?.bookingId) return
    await frontendApi.rejectExtraItems(order.bookingId)
    await loadCustomerOrders()
    notify('Extra items rejected.', { tone: 'info' })
  }

  const handleCancelBooking = async (order) => {
    if (!order?.bookingId) {
      showAppError('Cancel failed', 'Booking ID is missing.')
      return
    }

    if (['Cancelled', 'Canceled', 'Completed', 'Rejected', 'Refunded'].some((status) =>
      String(order.status || '').toLowerCase().includes(status.toLowerCase()),
    )) {
      showAppError('Cancel failed', 'Only active bookings can be cancelled.')
      return
    }

    const reason = await askAppTextInput({
      confirmButtonText: 'Cancel booking',
      inputLabel: 'Cancellation reason',
      inputPlaceholder: 'Example: Plans changed / booked by mistake.',
      requiredMessage: 'Please enter a cancellation reason.',
      text: `${order.id || order.service} will be cancelled. This cannot be undone from here.`,
      title: 'Cancel this booking?',
      tone: 'danger',
    })
    if (!reason) return

    try {
      await frontendApi.cancelBooking(order.bookingId, reason)
      await loadCustomerOrders()
      broadcastRealtimeRefresh({
        bookingId: order.bookingId,
        source: 'customer-cancelled-booking',
        targets: ['admin', 'customer', 'vendor'],
      })
      notify('Booking cancelled successfully.', { tone: 'success' })
      if (String(selectedActiveBookingId) === String(order.id)) {
        setSelectedActiveBookingId('')
      }
      if (selectedHistoryOrder && String(selectedHistoryOrder.id) === String(order.id)) {
        setSelectedHistoryOrder(null)
      }
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
        setActiveMobileTab('cancelled_bookings')
      }
    } catch (error) {
      showAppError('Cancel failed', error.message || 'Could not cancel this booking.')
    }
  }

  useEffect(() => {
    let isMounted = true
    if (!profileUser?.id) return undefined

    frontendApi.customerWallet(profileUser.name, profileUser.id)
      .then((data) => {
        if (isMounted) setWallet(data)
      })
      .catch(() => {
        if (isMounted) setWallet(null)
      })

    return () => {
      isMounted = false
    }
  }, [profileUser.id, profileUser.name])

  useEffect(() => {
    let isMounted = true
    if (!profileUser?.id) return undefined

    Promise.all([
      frontendApi.customerWalletTransactions(profileUser.id),
      frontendApi.customerReviews(profileUser.id),
    ])
      .then(([transactions, customerReviews]) => {
        if (!isMounted) return
        setWalletTransactions(transactions.map((transaction) => ({
          amount: transaction.amount,
          date: transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('en-IN') : '',
          id: transaction.transaction_no || `WT-${transaction.id}`,
          title: transaction.description || transaction.type,
          type: transaction.direction,
        })))
        setReviews(customerReviews.map((review) => ({
          orderId: review.metadata?.booking_no || review.metadata?.booking_id,
          rating: review.rating,
          service: review.serviceName,
          text: review.text,
        })))
      })
      .catch(() => {
        if (!isMounted) return
        setWalletTransactions([])
        setReviews([])
      })

    return () => {
      isMounted = false
    }
  }, [profileUser.id, profileUser.name])

  useEffect(() => {
    let isMounted = true
    if (!profileUser?.id) return undefined

    setIsProfileDataLoading(true)
    loadCustomerOrders()
      .catch(() => {
        if (isMounted) setLiveOrders([])
      })
      .finally(() => {
        if (isMounted) setIsProfileDataLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [profileUser.id, profileUser.name])

  useRealtimeRefresh({
    enabled: Boolean(profileUser?.id),
    intervalMs: 6000,
    onRefresh: loadCustomerOrders,
    target: 'customer',
  })

  useEffect(() => {
    if (activeMobileTab !== 'pending_review_detail') return
    if (pendingReviewBooking) return
    setActiveMobileTab(pendingReviewBookings.length > 0 ? 'pending_reviews' : 'bookings')
  }, [activeMobileTab, pendingReviewBooking, pendingReviewBookings.length])

  const updateNewAddress = (field, value) => {
    if (typeof field === 'object' && field !== null) {
      setNewAddress((current) => ({ ...current, ...field }))
      return
    }
    setNewAddress((current) => ({ ...current, [field]: value }))
  }

  const updateProfileForm = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const openProfileEditor = () => {
    setProfileForm(buildProfileForm(profileUser, firstAddressLine))
    setIsProfileModalOpen(true)
  }

  const chooseProfilePicture = () => {
    profilePictureInputRef.current?.click()
  }

  const updateProfilePicture = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profileUser?.id) return

    setIsProfilePictureUploading(true)
    try {
      const body = new FormData()
      body.append('profile_picture', file)
      const savedUser = await frontendApi.uploadCustomerProfilePicture(profileUser.id, body)
      setProfileOverride(savedUser)
      await onLogin?.(savedUser)
      notify('Profile picture updated.', { tone: 'success' })
    } catch (error) {
      notify(error.message || 'Unable to update profile picture.', { tone: 'error' })
    } finally {
      setIsProfilePictureUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!profileForm.name.trim()) return

    const nextUser = {
      ...profileUser,
      address: profileForm.address.trim(),
      email: profileUser.email,
      name: profileForm.name.trim(),
      phone: profileUser.phone,
      status: profileUser.status || 'Active',
      metadata: {
        ...(profileUser.metadata || {}),
        alternate_phone: profileForm.alternatePhone.trim(),
        date_of_birth: profileForm.dateOfBirth,
        emergency_contact_name: profileForm.emergencyContactName.trim(),
        emergency_contact_phone: profileForm.emergencyContactPhone.trim(),
        gender: profileForm.gender,
      },
    }

    try {
      const savedUser = await frontendApi.updateCustomer(profileUser.id, nextUser)
      setProfileOverride(savedUser)
      await onLogin?.(savedUser)
      notify('Profile updated successfully.', { tone: 'success' })
    } catch {
      setProfileOverride(nextUser)
      await onLogin?.(nextUser)
      notify('Profile saved locally. Sync may be pending.', { tone: 'info' })
    }

    setIsProfileModalOpen(false)
  }

  const saveAddress = async () => {
    if (!newAddress.flat.trim() || !newAddress.street.trim() || !newAddress.mobile.trim() || !String(newAddress.pincode || '').trim()) return
    const addressPayload = {
      ...newAddress,
      label: newAddress.label || 'Saved address',
    }

    try {
      if (editingAddressId) {
        if (String(editingAddressId).startsWith('local-')) {
          setLocalAddresses((current) =>
            current.map((item) => (String(item.id) === String(editingAddressId) ? { ...item, ...addressPayload } : item)),
          )
        } else {
          const updated = await onUpdateSavedAddress?.(editingAddressId, addressPayload)
          if (!updated) {
            setLocalAddresses((current) =>
              current.map((item) => (String(item.id) === String(editingAddressId) ? { ...item, ...addressPayload } : item)),
            )
          }
        }
      } else {
        const savedAddress = await onAddSavedAddress?.(addressPayload)
        if (!savedAddress) {
          setLocalAddresses((current) => [...current, { ...addressPayload, id: `local-${Date.now()}` }])
        }
      }
    } catch {
      if (editingAddressId) {
        setLocalAddresses((current) =>
          current.map((item) => (String(item.id) === String(editingAddressId) ? { ...item, ...addressPayload } : item)),
        )
      } else {
        setLocalAddresses((current) => [...current, { ...addressPayload, id: `local-${Date.now()}` }])
      }
    }

    setEditingAddressId(null)
    setNewAddress(emptyAddress)
  }

  const startAddAddress = () => {
    setEditingAddressId(null)
    setNewAddress({
      ...emptyAddress,
      label: 'Home',
      contactName: displayUser.name || '',
      mobile: String(displayUser.phone || '').replace(/\D/g, '').slice(-10),
    })
  }

  const startEditAddress = (address) => {
    setEditingAddressId(address.id)
    setNewAddress({
      city: address.city || 'Lucknow',
      contactName: address.contactName || displayUser.name || '',
      flat: address.flat || '',
      label: address.label || '',
      mobile: address.mobile || '',
      pincode: address.pincode || '',
      state: address.state || 'Uttar Pradesh',
      street: address.street || '',
    })
  }

  const deleteAddress = async (addressId) => {
    if (String(addressId).startsWith('local-')) {
      setLocalAddresses((current) => current.filter((item) => String(item.id) !== String(addressId)))
      return
    }

    try {
      await onDeleteSavedAddress?.(addressId)
    } catch {
      setLocalAddresses((current) => current.filter((item) => String(item.id) !== String(addressId)))
    }
  }

  const submitHistoryReview = async () => {
    if (!canSubmitHistoryReview || !selectedHistoryOrder) return
    const saved = await addReview({
      orderId: selectedHistoryOrder.id,
      rating: historyReviewForm.rating,
      text: historyReviewForm.text.trim(),
    })
    if (saved) {
      setHistoryReviewForm({ rating: 5, text: '' })
      setSelectedHistoryOrder((current) => current ? {
        ...current,
        metadata: {
          ...(current.metadata || {}),
          reviews: {
            ...(current.metadata?.reviews || {}),
            customer_to_vendor: {
              rating: saved.rating,
              text: saved.text,
            },
          },
        },
      } : current)
    }
  }

  const addReview = async (review) => {
    const reviewedOrder = displayOrders.find((order) => String(order.id) === String(review.orderId)) || null
    if (hasCustomerReview(reviewedOrder)) return undefined

    const nextReview = {
      orderId: reviewedOrder?.id || review.orderId,
      service: reviewedOrder?.service || review.service || 'Recent service',
      rating: review.rating,
      text: review.text,
    }

    try {
      await onSaveReview?.({
        customerName: profileUser.name,
        partnerName: reviewedOrder?.partnerName || reviewedOrder?.professional || '',
        rating: Number(review.rating),
        serviceName: nextReview.service,
        text: nextReview.text,
        metadata: {
          booking_id: reviewedOrder?.bookingId,
          booking_no: reviewedOrder?.bookingNo || reviewedOrder?.id,
          customer_id: profileUser.id,
          direction: 'customer_to_vendor',
        },
      })
      setReviews((current) => [nextReview, ...current.filter((item) => String(item.orderId) !== String(nextReview.orderId))])
      await loadCustomerOrders()
      broadcastRealtimeRefresh({
        bookingId: reviewedOrder?.bookingId,
        source: 'customer-submitted-review',
        targets: ['admin', 'customer', 'vendor'],
      })
      notify('Thanks! Your review has been submitted.', { tone: 'success' })
      return nextReview
    } catch (error) {
      showAppError('Review failed', error.message || 'Could not submit your review.')
      return undefined
    }
  }

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        isLoggedIn={isLoggedIn}
        appSettings={appSettings}
        cartCount={cartCount}
        locationLabel={locationLabel}
        mobileNavTitle={mobileTitles[activeMobileTab] || 'My Account'}
        onMobileBack={() => {
          if (activeMobileTab === 'menu') {
            onBackHome?.()
          } else if (activeMobileTab === 'active_booking_detail') {
            setActiveMobileTab('active_bookings')
          } else if (activeMobileTab === 'pending_review_detail') {
            setActiveMobileTab('pending_reviews')
          } else if (activeMobileTab === 'history_booking_detail') {
            setActiveMobileTab('booking_history')
          } else if (activeMobileTab === 'cancelled_booking_detail') {
            setActiveMobileTab('cancelled_bookings')
          } else if (
            activeMobileTab === 'active_bookings'
            || activeMobileTab === 'booking_history'
            || activeMobileTab === 'pending_reviews'
            || activeMobileTab === 'cancelled_bookings'
          ) {
            setActiveMobileTab('bookings')
          } else {
            setActiveMobileTab('menu')
          }
        }}
        onBackHome={onBackHome}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenCart={onOpenCart}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={profileUser}
      />

      <div className="hidden lg:block">
        <ProfileHeader
          cartCount={cart.length}
          orderCount={displayOrders.length}
          reviewCount={reviews.length}
          savedAddressCount={visibleSavedAddresses.length}
        />
      </div>

      <section className="mx-auto grid max-w-7xl gap-0 lg:gap-5 px-0 lg:px-8 py-0 lg:py-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <input accept="image/*" className="hidden" onChange={updateProfilePicture} ref={profilePictureInputRef} type="file" />
          
          <div className={`${activeMobileTab === 'menu' ? 'block' : 'hidden'} lg:block w-full`}>
            <ProfileSidebar
              isProfilePictureUploading={isProfilePictureUploading}
              locationLabel={locationLabel}
              onChangeProfilePicture={chooseProfilePicture}
              onEditProfile={openProfileEditor}
              onLogout={onLogout}
              onRaiseTicket={() => setActiveMobileTab('raise_ticket')}
              onOpenCart={onOpenCart}
              onMenuSelect={setActiveMobileTab}
              stats={profileStats}
              user={profileUser}
            />
          </div>

        <div className={`${activeMobileTab !== 'menu' ? 'block' : 'hidden'} lg:block grid gap-6 p-4 lg:p-0 w-full`}>
          {activeMobileTab === 'raise_ticket' ? (
            <RaiseTicketForm user={profileUser} variant="page" />
          ) : activeMobileTab === 'settings' ? (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-4">Settings</h3>
              <div className="max-w-md">
                <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Change Password</p>
                <div className="flex flex-col gap-3">
                  <input type="password" placeholder="Current password" className="rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-blue-600" />
                  <input type="password" placeholder="New password" className="rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-blue-600" />
                  <button className="rounded-md bg-blue-600 text-white font-bold py-3 px-6 hover:bg-blue-700 w-fit mt-1">Update Password</button>
                </div>
              </div>
            </div>
          ) : activeMobileTab === 'ratings' ? (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-4">My Ratings</h3>
              {reviews.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No ratings given yet.</p>
              ) : (
                <div className="grid gap-4">
                  {reviews.map((review, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded text-xs">{review.rating} ★</span>
                        <span className="font-bold text-slate-800">{review.service}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{review.text || 'No comment provided.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeMobileTab === 'addresses' ? (
            <SavedAddressesSection
              editingAddressId={editingAddressId}
              newAddress={newAddress}
              onDeleteAddress={deleteAddress}
              onSaveAddress={saveAddress}
              onStartAddAddress={startAddAddress}
              onStartEditAddress={startEditAddress}
              onUpdateNewAddress={updateNewAddress}
              savedAddresses={visibleSavedAddresses}
            />
          ) : activeMobileTab === 'bookings' || true ? (
            isProfileDataLoading ? (
              <>
                <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
                  <ShimmerBlock className="h-7 w-56" />
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <ShimmerBlock className="h-28" />
                    <ShimmerBlock className="h-28" />
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
                  <ShimmerBlock className="h-7 w-40" />
                  <ShimmerBlock className="mt-5 h-24 w-full" />
                </div>
                <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
                  <ShimmerBlock className="h-7 w-48" />
                  <ShimmerBlock className="mt-5 h-16 w-full" />
                  <ShimmerBlock className="mt-3 h-16 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="block lg:hidden">
                  {/* MOBILE DRILL-DOWN VIEWS */}
                  {activeMobileTab === 'bookings' && (
                    <div className="flex flex-col gap-2">
                      <button className="flex items-center justify-between rounded-lg bg-white px-3.5 py-3 shadow-sm border border-slate-100" onClick={() => setActiveMobileTab('active_bookings')}>
                        <div className="text-left">
                          <p className="font-bold text-[#003F86] text-base">Active bookings</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{activeBookings.length} ongoing service{activeBookings.length !== 1 && 's'}</p>
                        </div>
                        <span className="text-blue-600 text-lg">›</span>
                      </button>
                      {pendingReviewBookings.length > 0 ? (
                        <button className="flex items-center justify-between rounded-lg bg-white px-3.5 py-3 shadow-sm border border-amber-100" onClick={() => setActiveMobileTab('pending_reviews')}>
                          <div className="text-left">
                            <p className="font-bold text-[#003F86] text-base">Rate your services</p>
                            <p className="text-xs font-medium text-amber-700 mt-0.5">{pendingReviewBookings.length} completed booking{pendingReviewBookings.length !== 1 && 's'} waiting for review</p>
                          </div>
                          <span className="text-amber-600 text-lg">›</span>
                        </button>
                      ) : null}
                      <button className="flex items-center justify-between rounded-lg bg-white px-3.5 py-3 shadow-sm border border-slate-100" onClick={() => setActiveMobileTab('booking_history')}>
                        <div className="text-left">
                          <p className="font-bold text-[#003F86] text-base">Booking history</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{historyOrders.length} previous order{historyOrders.length !== 1 && 's'}</p>
                        </div>
                        <span className="text-blue-600 text-lg">›</span>
                      </button>
                      <button className="flex items-center justify-between rounded-lg bg-white px-3.5 py-3 shadow-sm border border-rose-100" onClick={() => setActiveMobileTab('cancelled_bookings')}>
                        <div className="text-left">
                          <p className="font-bold text-[#003F86] text-base">Cancelled bookings</p>
                          <p className="text-xs font-medium text-rose-700 mt-0.5">{cancelledBookings.length} cancelled or rejected booking{cancelledBookings.length !== 1 && 's'}</p>
                        </div>
                        <span className="text-rose-600 text-lg">›</span>
                      </button>
                    </div>
                  )}
                  {activeMobileTab === 'active_bookings' && (
                    <ActiveServicesPanel 
                      activeBookings={activeBookings} 
                      onSelect={(id) => { setSelectedActiveBookingId(id); setActiveMobileTab('active_booking_detail'); }} 
                      selectedBookingId={activeCurrentBooking?.id} 
                      isMobileList={true} 
                    />
                  )}
                  {activeMobileTab === 'pending_reviews' && (
                    <ActiveServicesPanel
                      activeBookings={pendingReviewBookings}
                      eyebrow="Pending review"
                      heading={`${pendingReviewBookings.length} waiting for your rating`}
                      helper="Tap a completed booking to rate the service."
                      onSelect={(id) => { setSelectedPendingReviewId(id); setActiveMobileTab('pending_review_detail'); }}
                      selectedBookingId={pendingReviewBooking?.id}
                      isMobileList={true}
                    />
                  )}
                  {activeMobileTab === 'active_booking_detail' && (
                    topBookingCard ? (
                      <CurrentBookingCard
                        alreadyReviewed={hasCustomerReview(topBookingCard)}
                        booking={topBookingCard}
                        onApproveExtraItems={handleApproveExtraItems}
                        onCancelBooking={handleCancelBooking}
                        onRejectExtraItems={handleRejectExtraItems}
                        onSubmitReview={addReview}
                      />
                    ) : null
                  )}
                  {activeMobileTab === 'pending_review_detail' && pendingReviewBooking ? (
                    <CurrentBookingCard
                      alreadyReviewed={hasCustomerReview(pendingReviewBooking)}
                      booking={pendingReviewBooking}
                      onApproveExtraItems={handleApproveExtraItems}
                      onCancelBooking={handleCancelBooking}
                      onRejectExtraItems={handleRejectExtraItems}
                      onSubmitReview={addReview}
                    />
                  ) : null}
                  {activeMobileTab === 'booking_history' && (
                    <OrderHistorySection 
                      appSettings={appSettings} 
                      onCancelBooking={handleCancelBooking}
                      onReorder={onReorderOrder} 
                      onSubmitReview={addReview} 
                      orders={historyOrders} 
                      reviews={reviews} 
                      onSelectOrder={(order) => { setSelectedHistoryOrder(order); setHistoryReviewForm({ rating: 5, text: '' }); setActiveMobileTab('history_booking_detail'); }} 
                    />
                  )}
                  {activeMobileTab === 'cancelled_bookings' && (
                    <ActiveServicesPanel
                      activeBookings={cancelledBookings}
                      eyebrow="Cancelled"
                      heading={`${cancelledBookings.length} cancelled booking${cancelledBookings.length !== 1 ? 's' : ''}`}
                      helper="Cancelled and rejected bookings appear here. Invoice is not available for these."
                      onSelect={(id) => {
                        const order = cancelledBookings.find((entry) => String(entry.id) === String(id))
                        setSelectedCancelledOrder(order || null)
                        setActiveMobileTab('cancelled_booking_detail')
                      }}
                      selectedBookingId={selectedCancelledOrder?.id}
                      isMobileList={true}
                    />
                  )}
                  {activeMobileTab === 'history_booking_detail' && selectedHistoryOrder && (
                    <OrderHistoryDetailView 
                      order={selectedHistoryOrder}
                      onClose={() => setActiveMobileTab('booking_history')}
                      hideCloseButton={true}
                      onCancel={() => handleCancelBooking(selectedHistoryOrder)}
                      onReorder={() => { onReorderOrder?.(selectedHistoryOrder); setActiveMobileTab('booking_history'); }}
                      onViewInvoice={() => { window.open(`/invoice/${encodeURIComponent(selectedHistoryOrder.id)}`, '_blank') }}
                      canCancel={!['Cancelled', 'Rejected', 'Completed', 'Refunded'].some(s => selectedHistoryOrder.status?.toLowerCase().includes(s.toLowerCase()))}
                      canReorder={selectedHistoryOrder.status?.toLowerCase().includes('complete')}
                      canReview={canReviewHistoryOrder}
                      canViewInvoice={!isCancelledOrRejectedBooking(selectedHistoryOrder)}
                      reviewForm={historyReviewForm}
                      setReviewForm={setHistoryReviewForm}
                      submitReview={submitHistoryReview}
                      canSubmitReview={canSubmitHistoryReview}
                    />
                  )}
                  {activeMobileTab === 'cancelled_booking_detail' && selectedCancelledOrder ? (
                    <OrderHistoryDetailView
                      order={selectedCancelledOrder}
                      onClose={() => setActiveMobileTab('cancelled_bookings')}
                      hideCloseButton={true}
                      canCancel={false}
                      canReorder={false}
                      canReview={false}
                      canViewInvoice={false}
                      canSubmitReview={false}
                    />
                  ) : null}
                </div>

                <div className="hidden lg:flex lg:flex-col lg:gap-6">
                  {/* DESKTOP VIEW */}
                  <ActiveServicesPanel activeBookings={activeBookings} onSelect={setSelectedActiveBookingId} selectedBookingId={activeCurrentBooking?.id} />
                  {topBookingCard ? (
                    <CurrentBookingCard
                      alreadyReviewed={hasCustomerReview(topBookingCard)}
                      booking={topBookingCard}
                      onApproveExtraItems={handleApproveExtraItems}
                      onCancelBooking={handleCancelBooking}
                      onRejectExtraItems={handleRejectExtraItems}
                      onSubmitReview={addReview}
                    />
                  ) : null}
                  {pendingReviewBookings.length > 0 ? (
                    <section className="grid gap-4">
                      <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending review</p>
                        <h2 className="mt-1 text-lg font-bold text-[#003F86]">
                          Rate your completed service{pendingReviewBookings.length > 1 ? 's' : ''}
                        </h2>
                        <p className="mt-1 text-sm text-amber-800/80">
                          Vendor marked {pendingReviewBookings.length} booking{pendingReviewBookings.length > 1 ? 's' : ''} complete. Share your feedback below.
                        </p>
                      </div>
                      {pendingReviewBookings.map((booking) => (
                        <CurrentBookingCard
                          alreadyReviewed={hasCustomerReview(booking)}
                          booking={booking}
                          key={`review-${booking.id}`}
                          onApproveExtraItems={handleApproveExtraItems}
                          onCancelBooking={handleCancelBooking}
                          onRejectExtraItems={handleRejectExtraItems}
                          onSubmitReview={addReview}
                        />
                      ))}
                    </section>
                  ) : null}
                  <WalletSection transactions={walletTransactions} wallet={wallet} />
                  <OrderHistorySection appSettings={appSettings} onCancelBooking={handleCancelBooking} onReorder={onReorderOrder} onSubmitReview={addReview} orders={historyOrders} reviews={reviews} />
                  {cancelledBookings.length > 0 ? (
                    <OrderHistorySection
                      appSettings={appSettings}
                      heading="Cancelled bookings"
                      helper="Cancelled and rejected bookings. Invoice is not available for these orders."
                      onCancelBooking={handleCancelBooking}
                      onReorder={onReorderOrder}
                      onSubmitReview={addReview}
                      orders={cancelledBookings}
                      reviews={reviews}
                    />
                  ) : null}
                </div>
              </>
            )
          ) : null}
        </div>
      </section>

      {isProfileModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#003F86]/45 p-4 animate-modal-fade">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 shadow-2xl animate-modal-slide lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#003F86]">Edit profile</h3>
                <p className="mt-1 text-xs text-blue-700">Update your personal details. Email and phone stay locked for security.</p>
              </div>
              <button className="rounded-full border border-blue-200 px-3 py-1 text-lg font-bold text-slate-500 hover:bg-slate-50" onClick={() => setIsProfileModalOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Full name</span>
                <input
                  className="w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('name', event.target.value)}
                  placeholder="Your full name"
                  value={profileForm.name}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Email
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-slate-500">Read only</span>
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed"
                  readOnly
                  type="email"
                  value={profileForm.email}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Phone number
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-slate-500">Read only</span>
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500 outline-none cursor-not-allowed"
                  readOnly
                  type="tel"
                  value={profileForm.phone}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Alternate phone</span>
                <input
                  className="w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('alternatePhone', event.target.value)}
                  placeholder="Optional second number"
                  type="tel"
                  value={profileForm.alternatePhone}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</span>
                <select
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('gender', event.target.value)}
                  value={profileForm.gender}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of birth</span>
                <input
                  className="w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('dateOfBirth', event.target.value)}
                  type="date"
                  value={profileForm.dateOfBirth}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary address</span>
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86] resize-y"
                  onChange={(event) => updateProfileForm('address', event.target.value)}
                  placeholder="Flat, street, landmark, city"
                  value={profileForm.address}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Emergency contact name</span>
                <input
                  className="w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('emergencyContactName', event.target.value)}
                  placeholder="Contact person name"
                  value={profileForm.emergencyContactName}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Emergency contact phone</span>
                <input
                  className="w-full rounded-lg border border-blue-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#003F86]"
                  onChange={(event) => updateProfileForm('emergencyContactPhone', event.target.value)}
                  placeholder="10-digit mobile number"
                  type="tel"
                  value={profileForm.emergencyContactPhone}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50" onClick={() => setIsProfileModalOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#003F86] px-4 py-2 text-sm font-bold text-white disabled:bg-blue-100"
                disabled={!profileForm.name.trim()}
                onClick={saveProfile}
                type="button"
              >
                Save profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  )
}

export default ProfilePage
