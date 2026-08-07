import { useEffect, useMemo, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import Toast from '../../components/common/Toast'
import { Panel } from '../../components/admin/AdminUI'
import { adminApi } from '../../services/adminApi'
import { notify } from '../../utils/feedback'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import AdminLayout from './components/AdminLayout'
import ProcessingOverlay from './components/ProcessingOverlay'
import { AdminPageSkeleton } from '../../components/common/Shimmer'
import RecordModal from './components/RecordModal'
import AppContentMetadataModal from './components/AppContentMetadataModal'
import { moduleConfigs } from './config/adminModules'
import { buildBackendUrl, buildStorageUrl } from '../../config/urls'
import AssignProfessionalView from './views/AssignProfessionalView'
import AdminUserPermissionsView from './views/AdminUserPermissionsView'
import AdminVendorDashboardView from './views/AdminVendorDashboardView'
import CrudModuleView from './views/CrudModuleView'
import DashboardView from './views/DashboardView'
import InvoiceSettingsView from './views/InvoiceSettingsView'
import PackageDetailSectionsView from './views/PackageDetailSectionsView'
import PagesView from './views/PagesView'
import ProfilesView from './views/ProfilesView'
import ReportsView from './views/ReportsView'
import RolesPermissionsView from './views/RolesPermissionsView'
import SettingsView from './views/SettingsView'
import { makeColumns as buildColumns } from './utils/adminColumns'
import { askConfirmation, askTextInput, showErrorAlert, showSuccessAlert } from './utils/confirmations'
import { preparePayload } from './utils/formPayload'
import { normalizeForInput, readRows } from './utils/formatters'
import { playOrderAlertSound } from './utils/notifications'
import { broadcastRealtimeRefresh } from '../../utils/realtime'
import { canAccessModule, filterNavSectionsByPermissions, isSuperAdminProfile, normalizePermissions } from './utils/permissions'
import { slugify } from '../../utils/slugs'
import { adminNavSections } from './config/adminNav'

const shouldPlayAdminNotificationSound = (notification) => {
  const title = String(notification?.title || '').toLowerCase()
  return title === 'new booking received' || title === 'booking assigned' || title === 'booking auto assigned'
}

const readPagination = (payload) => {
  if (!payload || !Array.isArray(payload.data)) return null

  return {
    current_page: payload.current_page,
    from: payload.from,
    last_page: payload.last_page,
    per_page: payload.per_page,
    to: payload.to,
    total: payload.total,
  }
}

const SERVER_PAGINATED_TABS = ['Service Packages', 'Rate List']

function AdminDashboardPage({ appSettings = {}, authenticatedAdmin, onAdminProfileUpdated, onBackHome, onLogout, onOpenCustomerDetails, onOpenPartnerDetails }) {
  const [activeTab, setActiveTab] = useState(() => window.sessionStorage.getItem('adminActiveTab') || 'Dashboard')
  const [datasets, setDatasets] = useState({})
  const [isFetching, setIsFetching] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [error, setError] = useState('')
  const [modalState, setModalState] = useState(null)
  const [form, setForm] = useState({})
  const [tableSearch, setTableSearch] = useState('')
  const [tableFilters, setTableFilters] = useState({})
  const [serverPagination, setServerPagination] = useState({})
  const [globalSearch, setGlobalSearch] = useState('')
  const [notificationSummary, setNotificationSummary] = useState({ unread_count: 0, notifications: [] })
  const [roleViewMode, setRoleViewMode] = useState('list')
  const [permissionViewerAdmin, setPermissionViewerAdmin] = useState(null)
  const [appContentMetadataRecord, setAppContentMetadataRecord] = useState(null)
  const [bookingDetailsRecord, setBookingDetailsRecord] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [profileSaveMessage, setProfileSaveMessage] = useState('')
  const [passwordSaveMessage, setPasswordSaveMessage] = useState('')
  const [notificationState, setNotificationState] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const latestNotificationIdRef = useRef(null)

  const activeConfig = useMemo(() => {
    const config = moduleConfigs[activeTab]
    if (!config) return config

    return {
      ...config,
      fields: config.fields.map((field) => {
        if (!field.optionsFrom) return field

        return {
          ...field,
          options: (datasets[field.optionsFrom] || []).map((record) => {
            const value = Number(record[field.optionValue] ?? record.id)
            const baseLabel = [
              record[field.optionLabel],
              record.name && field.optionLabel !== 'name' ? record.name : '',
              record.customer_name && field.optionLabel !== 'customer_name' ? record.customer_name : '',
              record.service_name && field.optionLabel !== 'service_name' ? record.service_name : '',
            ].filter(Boolean).join(' - ') || `#${record.id}`

            return {
              label: field.type === 'multiselect' ? `${baseLabel} (ID: ${value})` : baseLabel,
              value,
            }
          }),
        }
      }),
    }
  }, [activeTab, datasets])
  const currentAdminProfile = useMemo(() => {
    const adminUsers = datasets['Admin Users'] || []
    const roles = datasets.Roles || []
    const storedProfile = authenticatedAdmin?.id
      ? adminUsers.find((adminUser) => String(adminUser.id) === String(authenticatedAdmin.id))
      : null
    const profile = storedProfile
      || authenticatedAdmin
      || adminUsers.find((adminUser) => `${adminUser.role_name || ''} ${adminUser.name || ''}`.toLowerCase().includes('super admin'))
      || adminUsers.find((adminUser) => `${adminUser.role_name || ''} ${adminUser.name || ''}`.toLowerCase().includes('admin'))
      || adminUsers[0]
    if (!profile) return profile

    const role = roles.find((item) => item.id === profile.role_id || item.name === profile.role_name)
    return {
      ...profile,
      permissions: normalizePermissions(role?.permissions).length ? normalizePermissions(role.permissions) : normalizePermissions(profile.permissions),
    }
  }, [authenticatedAdmin, datasets])

  const visibleNavSections = useMemo(() => filterNavSectionsByPermissions(adminNavSections, currentAdminProfile), [currentAdminProfile])

  const loadModule = async (tab = activeTab, params = {}, options = {}) => {
    const config = moduleConfigs[tab]
    if (!config) return

    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      const payload = await adminApi.list(config.endpoint, {
        per_page: 20,
        ...params,
      })
      setDatasets((current) => ({ ...current, [tab]: readRows(payload) }))
      if (readPagination(payload)) {
        setServerPagination((current) => ({ ...current, [tab]: readPagination(payload) }))
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadDashboardData = async (options = {}) => {
    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      const entries = await Promise.all(
        ['Customers', 'Partners', 'Bookings', 'Payments', 'Booking Ledger', 'Vendor Wallet', 'Wallet Transactions'].map(async (tab) => {
          const payload = await adminApi.list(moduleConfigs[tab].endpoint, { per_page: 100 })
          return [tab, readRows(payload)]
        }),
      )
      setDatasets((current) => ({ ...current, ...Object.fromEntries(entries) }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadReportsData = async (options = {}) => {
    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      const entries = await Promise.all(
        ['Customers', 'Partners', 'Bookings', 'Payments', 'Booking Ledger', 'Vendor Wallet', 'Wallet Transactions', 'Payouts'].map(async (tab) => {
          const payload = await adminApi.list(moduleConfigs[tab].endpoint, { per_page: 100 })
          return [tab, readRows(payload)]
        }),
      )
      setDatasets((current) => ({ ...current, ...Object.fromEntries(entries) }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadProfileData = async (options = {}) => {
    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      const tabs = ['Admin Users', 'Roles']
      const entries = await Promise.all(tabs.map(async (tab) => {
        const payload = await adminApi.list(moduleConfigs[tab].endpoint, { per_page: 100 })
        return [tab, readRows(payload)]
      }))
      setDatasets((current) => ({ ...current, ...Object.fromEntries(entries) }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadNotificationSummary = async () => {
    try {
      const summary = await adminApi.notificationSummary()
      const latestId = summary.notifications?.[0]?.id || null
      const previousLatestId = latestNotificationIdRef.current

      if (previousLatestId && latestId && latestId !== previousLatestId && shouldPlayAdminNotificationSound(summary.notifications?.[0])) {
        playOrderAlertSound()
        setToastMessage(summary.notifications?.[0]?.title || 'New admin notification')
      }

      latestNotificationIdRef.current = latestId
      setNotificationSummary(summary)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const loadActiveTabWithDependencies = async (tab, options = {}) => {
    const config = moduleConfigs[tab]
    const dependencyTabs = [
      ...new Set((config?.fields || [])
        .map((field) => field.optionsFrom)
        .filter(Boolean)),
    ].filter((dependencyTab) => dependencyTab !== tab)

    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      await Promise.all([
        loadModule(tab, {}, { ...options, silent: true }),
        ...dependencyTabs.map(async (dependencyTab) => {
          const dependencyConfig = moduleConfigs[dependencyTab]
          if (!dependencyConfig) return

          // Always load full option lists for relation/multiselect fields,
          // even when the source module normally uses server pagination.
          const payload = await adminApi.list(dependencyConfig.endpoint, {
            per_page: 'all',
            all: 1,
          })
          setDatasets((current) => ({ ...current, [dependencyTab]: readRows(payload) }))
        }),
      ])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadPaginatedModulePage = async (tab, page = 1, options = {}) => {
    const config = moduleConfigs[tab]
    if (!config) return

    const status = tableFilters.status || ''
    const search = tableSearch.trim()

    if (!options.silent) setIsFetching(true)
    setError('')
    try {
      const payload = await adminApi.list(config.endpoint, {
        page,
        per_page: 10,
        ...(search ? { q: search } : {}),
        ...(status ? { status } : {}),
      })
      setDatasets((current) => ({ ...current, [tab]: readRows(payload) }))
      setServerPagination((current) => ({ ...current, [tab]: readPagination(payload) }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!options.silent) setIsFetching(false)
    }
  }

  const loadWorkspaceForTab = async (tab = activeTab, options = {}) => {
    const silent = options.silent || false
    if (options.skipNotifications !== true) {
      loadNotificationSummary().catch(() => {})
    }

    if (['Settings', 'Invoice Setting', 'Vendor Dashboard', 'Package Detail Sections'].includes(tab)) {
      return
    }

    if (tab === 'Dashboard') {
      await loadDashboardData({ silent })
      return
    }

    if (tab === 'Reports') {
      await loadReportsData({ silent })
      return
    }

    if (tab === 'Profiles') {
      await loadProfileData({ silent })
      return
    }

    if (tab === 'Assign Professional') {
      await Promise.all([loadModule('Bookings', {}, { silent }), loadModule('Partners', {}, { silent })])
      return
    }

    if (tab === 'Service Packages') {
      const page = serverPagination['Service Packages']?.current_page || 1
      await Promise.all([
        loadPaginatedModulePage('Service Packages', page, { silent }),
        loadModule('Services', { per_page: 100 }, { silent }),
        loadModule('Sub-Services', { per_page: 100 }, { silent }),
      ])
      return
    }

    if (tab === 'Rate List') {
      const page = serverPagination['Rate List']?.current_page || 1
      await Promise.all([
        loadPaginatedModulePage('Rate List', page, { silent }),
        loadModule('Services', { per_page: 100 }, { silent }),
      ])
      return
    }

    await loadActiveTabWithDependencies(tab, { silent })
  }

  const refreshActiveWorkspace = async ({ source } = {}) => {
    const silent = source === 'poll' || source === 'broadcast'
    await loadWorkspaceForTab(activeTab, { silent })
  }

  useRealtimeRefresh({
    enabled: true,
    intervalMs: 5000,
    onRefresh: refreshActiveWorkspace,
    target: 'admin',
  })

  useEffect(() => {
    loadWorkspaceForTab(activeTab, { silent: false })
  }, [activeTab])

  useEffect(() => {
    if (!SERVER_PAGINATED_TABS.includes(activeTab)) return undefined

    const timer = window.setTimeout(() => {
      loadPaginatedModulePage(activeTab, 1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [tableFilters.status, tableSearch])

  useEffect(() => {
    if (!visibleNavSections.length || isSuperAdminProfile(currentAdminProfile)) return
    if (visibleNavSections.some((section) => section.items.some(([item]) => item === activeTab))) return

    const nextTab = visibleNavSections[0]?.items[0]?.[0] || 'Profiles'
    window.sessionStorage.setItem('adminActiveTab', nextTab)
    resetTableControls()
    setActiveTab(nextTab)
  }, [activeTab, currentAdminProfile, visibleNavSections])

  useEffect(() => {
    if (!toastMessage) return undefined

    const timer = window.setTimeout(() => setToastMessage(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!error) return

    notify(error, { tone: 'error' })
  }, [error])

  const analytics = useMemo(() => {
    const bookings = datasets.Bookings || []
    const payments = datasets.Payments || []
    const ledgers = datasets['Booking Ledger'] || []
    const wallets = datasets['Vendor Wallet'] || []
    const walletTransactions = datasets['Wallet Transactions'] || []
    const payouts = datasets.Payouts || []
    const isPaidPayment = (payment) => ['paid', 'cash', 'success', 'successful', 'completed'].includes(String(payment.status || '').toLowerCase())
    const isPaidBooking = (booking) => {
      const paymentStatus = String(booking.payment_status || '').toLowerCase()
      const status = String(booking.status || '').toLowerCase()
      return ['paid', 'cash'].includes(paymentStatus) || status === 'completed'
    }
    const paymentRevenue = payments.filter(isPaidPayment).reduce((total, payment) => total + Number(payment.amount || 0), 0)
    const bookingRevenue = bookings.filter(isPaidBooking).reduce((total, booking) => total + Number(booking.amount || 0), 0)
    const ledgerRevenue = ledgers.reduce((total, ledger) => total + Number(ledger.gross || 0), 0)
    const totalRevenue = Math.max(paymentRevenue, bookingRevenue, ledgerRevenue)
    const platformFees = ledgers.reduce((total, ledger) => total + Number(ledger.commission || 0), 0)
      || walletTransactions.filter((row) => row.type === 'Company Commission').reduce((total, row) => total + Number(row.amount || 0), 0)
    const vendorPayable = wallets.reduce((total, wallet) => total + Number(wallet.vendor_payable || 0), 0)
    const cashCollected = wallets.reduce((total, wallet) => total + Number(wallet.cash_collected || 0), 0)
    const withdrawalPending = payouts.filter((payout) => !['Paid', 'Rejected'].includes(payout.status)).reduce((total, payout) => total + Number(payout.pending || 0), 0)
    const paidOut = payouts.reduce((total, payout) => total + Number(payout.paid || 0), 0)
    const completedBookings = bookings.filter((booking) => booking.status === 'Completed').length
    const pendingBookings = bookings.filter((booking) => ['Pending', 'Pending Approval'].includes(booking.status)).length

    return {
      bookingRevenue,
      bookings,
      cashCollected,
      completedBookings,
      ledgerRevenue,
      ledgers,
      paidOut,
      paymentRevenue,
      payments,
      pendingBookings,
      platformFees,
      totalRevenue,
      vendorPayable,
      walletTransactions,
      wallets,
      withdrawalPending,
    }
  }, [datasets])

  const dashboardStats = useMemo(() => {
    const bookings = analytics.bookings || []

    return [
      ['Total Revenue', `Rs. ${analytics.totalRevenue.toLocaleString('en-IN')}`, 'Paid bookings + posted payment records'],
      ['Total Bookings', bookings.length, 'All service bookings'],
      ['Pending Bookings', analytics.pendingBookings, 'Needs action'],
      ['Completed Bookings', analytics.completedBookings, 'Successfully delivered'],
      ['Customers', (datasets.Customers || []).length, 'Registered customer profiles'],
      ['Active Professionals', (datasets.Partners || []).filter((partner) => partner.status !== 'Inactive').length, 'Available partner records'],
      ['Platform Fees', `Rs. ${analytics.platformFees.toLocaleString('en-IN')}`, 'Commission earned'],
      ['Vendor Payable', `Rs. ${analytics.vendorPayable.toLocaleString('en-IN')}`, 'Available vendor wallet balance'],
    ]
  }, [analytics, datasets])

  const openEditor = async (record = null) => {
    if (!activeConfig) return
    if (!canAccessModule(currentAdminProfile, activeTab, record ? 'edit' : 'create')) {
      showErrorAlert('Permission denied', 'This role does not have permission for this action.')
      return
    }
    if (record) {
      const confirmed = await askConfirmation({
        confirmButtonText: 'Edit record',
        text: 'Do you want to open this record for editing?',
        title: 'Edit confirmation',
      })
      if (!confirmed) return
    }

    setForm(
      activeConfig.fields.reduce((values, field) => {
        let initialValue = normalizeForInput(record?.[field.name], field.type)
        if (!record && field.autoGeneratePrefix) {
          initialValue = `${field.autoGeneratePrefix}${Math.floor(10000 + Math.random() * 90000)}`
        }
        if (!record && field.name === 'applies_to' && !initialValue) {
          initialValue = 'all'
        }
        if (field.name === 'applies_to' && !initialValue) {
          initialValue = 'all'
        }
        if (field.type === 'multiselect' && !Array.isArray(initialValue)) {
          initialValue = []
        }
        values[field.name] = initialValue
        return values
      }, {}),
    )
    setModalState({ mode: record ? 'edit' : 'add', record })
  }

  const closeModal = () => {
    setModalState(null)
    setForm({})
  }

  const updateFormField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value }
      const slugField = activeConfig?.fields.find((field) => field.autoSlugFrom === name)

      if (slugField) {
        next[slugField.name] = slugify(value)
      }

      if (name === 'applies_to') {
        if (value !== 'category') next.category_ids = []
        if (value !== 'service') next.service_ids = []
        if (value !== 'package') next.service_package_ids = []
      }

      return next
    })
  }

  const saveRecord = async (event) => {
    event.preventDefault()
    const isEditing = Boolean(modalState.record?.id)

    if (activeConfig.fields.some((f) => f.type === 'password')) {
      if (!isEditing || form.password || form.password_confirmation) {
        if (String(form.password || '').length < 8) {
          showErrorAlert('Validation Error', 'Password must be at least 8 characters long.')
          return
        }
        if (form.password !== form.password_confirmation) {
          showErrorAlert('Validation Error', 'Password and confirm password do not match.')
          return
        }
      }
    }

    const payload = preparePayload(activeConfig.fields, form)
    const confirmed = await askConfirmation({
      confirmButtonText: isEditing ? 'Update record' : 'Create record',
      text: isEditing ? 'Do you want to save these changes?' : 'Do you want to create this record?',
      title: isEditing ? 'Update confirmation' : 'Create confirmation',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      if (modalState.record?.id) {
        await adminApi.update(activeConfig.endpoint, modalState.record.id, payload)
        setToastMessage('Record updated')
      } else {
        await adminApi.create(activeConfig.endpoint, payload)
        setToastMessage('Record created')
      }
      showSuccessAlert(isEditing ? 'Record updated' : 'Record created')
      closeModal()
      if (SERVER_PAGINATED_TABS.includes(activeTab)) {
        await loadPaginatedModulePage(activeTab, serverPagination[activeTab]?.current_page || 1)
      } else {
        await loadModule(activeTab)
      }
      broadcastRealtimeRefresh({ source: 'admin-record-save', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Action failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteRecord = async (record) => {
    if (!activeConfig) return
    if (!canAccessModule(currentAdminProfile, activeTab, 'delete')) {
      showErrorAlert('Permission denied', 'This role does not have permission for this action.')
      return
    }
    const confirmed = await askConfirmation({
      confirmButtonText: 'Delete record',
      text: 'This record will be permanently deleted.',
      title: 'Delete confirmation',
      tone: 'danger',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      await adminApi.remove(activeConfig.endpoint, record.id)
      setToastMessage('Record deleted')
      showSuccessAlert('Record deleted')
      if (SERVER_PAGINATED_TABS.includes(activeTab)) {
        await loadPaginatedModulePage(activeTab, serverPagination[activeTab]?.current_page || 1)
      } else {
        await loadModule(activeTab)
      }
      broadcastRealtimeRefresh({ source: 'admin-record-delete', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Delete failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const assignPartner = async (booking, partner) => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Assign professional',
      text: `Assign ${partner.name} to ${booking.booking_no || booking.service_name}?`,
      title: 'Assignment confirmation',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      await adminApi.assignBooking(booking.id, partner.id)
      setToastMessage(`${partner.name} assigned to ${booking.booking_no || booking.id}`)
      showSuccessAlert('Professional assigned')
      await Promise.all([loadModule('Bookings'), loadModule('Vendor Jobs'), loadNotificationSummary()])
      broadcastRealtimeRefresh({ bookingId: booking.id, source: 'admin-assigned-booking', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Assignment failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const acceptBooking = async (booking) => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Accept booking',
      text: `${booking.booking_no || booking.service_name} will move to vendor assignment.`,
      title: 'Accept booking?',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      await adminApi.acceptBooking(booking.id)
      setToastMessage('Booking accepted')
      showSuccessAlert('Booking accepted')
      await loadModule('Bookings')
      broadcastRealtimeRefresh({ bookingId: booking.id, source: 'admin-accepted-booking', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Accept failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const rejectBooking = async (booking) => {
    const reason = await askTextInput({
      confirmButtonText: 'Reject booking',
      inputLabel: 'Rejection reason',
      inputPlaceholder: 'Example: Slot unavailable, customer asked to reschedule.',
      requiredMessage: 'Please enter a rejection reason.',
      text: `${booking.booking_no || booking.service_name} will be rejected with this reason.`,
      title: 'Reject booking?',
      tone: 'danger',
    })
    if (!reason) return

    setActionLoadingId('action')
    try {
      await adminApi.rejectBooking(booking.id, reason)
      setToastMessage('Booking rejected')
      showSuccessAlert('Booking rejected')
      await loadModule('Bookings')
      broadcastRealtimeRefresh({ bookingId: booking.id, source: 'admin-rejected-booking', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Reject failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const cancelBooking = async (booking) => {
    const reason = await askTextInput({
      confirmButtonText: 'Cancel booking',
      inputLabel: 'Cancellation reason',
      inputPlaceholder: 'Example: Customer requested cancellation.',
      requiredMessage: 'Please enter a cancellation reason.',
      text: `${booking.booking_no || booking.service_name} will be cancelled and removed from active work.`,
      title: 'Cancel booking?',
      tone: 'danger',
    })
    if (!reason) return

    setActionLoadingId('action')
    try {
      await adminApi.cancelBooking(booking.id, reason)
      setToastMessage('Booking cancelled')
      showSuccessAlert('Booking cancelled')
      await Promise.all([loadModule('Bookings'), loadModule('Vendor Jobs'), loadNotificationSummary()])
      broadcastRealtimeRefresh({ bookingId: booking.id, source: 'admin-cancelled-booking', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Cancel failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const saveProfile = async (endpoint, id, payload) => {
    if (!endpoint || !id) {
      showErrorAlert('Profile update failed', 'Profile ID is missing.')
      return
    }

    setActionLoadingId('action')
    setProfileSaveMessage('')
    try {
      const updatedProfile = await adminApi.update(endpoint, id, payload)
      onAdminProfileUpdated?.(updatedProfile)
      setDatasets((current) => ({
        ...current,
        'Admin Users': (current['Admin Users'] || []).map((u) => String(u.id) === String(id) ? { ...u, ...updatedProfile } : u),
      }))
      setToastMessage('Profile updated')
      setProfileSaveMessage('Profile updated successfully.')
      showSuccessAlert('Profile updated')
      await loadProfileData()
    } catch (requestError) {
      setError(requestError.message)
      setProfileSaveMessage(requestError.message)
      showErrorAlert('Profile update failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const changeProfilePassword = async (id, payload) => {
    if (!id) {
      showErrorAlert('Password update failed', 'Profile ID is missing.')
      return
    }

    setActionLoadingId('action')
    setPasswordSaveMessage('')
    try {
      await adminApi.changeAdminPassword(id, payload)
      setToastMessage('Password updated')
      setPasswordSaveMessage('Password updated successfully.')
      showSuccessAlert('Password updated')
    } catch (requestError) {
      setError(requestError.message)
      setPasswordSaveMessage(requestError.message)
      showErrorAlert('Password update failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const approvePartnerKyc = async (partner) => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Approve KYC',
      text: `${partner.name} will be able to login to the vendor panel after approval.`,
      title: 'Approve vendor KYC?',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      await adminApi.approvePartnerKyc(partner.id)
      setToastMessage('Vendor KYC approved')
      showSuccessAlert('Vendor KYC approved')
      await loadModule('Partners')
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('KYC approval failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const rejectPartnerKyc = async (partner) => {
    const rejectionReason = await askTextInput({
      confirmButtonText: 'Reject KYC',
      inputLabel: 'Rejection reason',
      inputPlaceholder: 'Example: Aadhaar image is unclear, please upload again.',
      requiredMessage: 'Please enter a rejection reason.',
      text: `${partner.name} will not be able to login until KYC is approved.`,
      title: 'Reject vendor KYC?',
      tone: 'danger',
    })
    if (!rejectionReason) return

    setActionLoadingId('action')
    try {
      await adminApi.rejectPartnerKyc(partner.id, rejectionReason)
      setToastMessage('Vendor KYC rejected')
      showSuccessAlert('Vendor KYC rejected')
      await loadModule('Partners')
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('KYC rejection failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const updatePartnerRecord = async (partner, action, successMessage) => {
    if (!partner?.id) {
      showErrorAlert('Partner update failed', 'Partner ID is missing.')
      return
    }

    setActionLoadingId('action')
    try {
      await action(partner.id)
      setToastMessage(successMessage)
      showSuccessAlert(successMessage)
      await loadModule('Partners')
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Partner update failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const changePartnerAvailability = async (partner, availability) => {
    if (!canAccessModule(currentAdminProfile, 'Partners', 'edit')) {
      showErrorAlert('Permission denied', 'This role does not have permission for this action.')
      return
    }
    const confirmed = await askConfirmation({
      confirmButtonText: `Set ${availability}`,
      text: `${partner.name} availability will be changed to ${availability}.`,
      title: 'Update availability?',
      tone: availability === 'Unavailable' ? 'danger' : 'question',
    })
    if (!confirmed) return

    await updatePartnerRecord(
      partner,
      (partnerId) => adminApi.updatePartnerAvailability(partnerId, availability),
      `Partner marked ${availability}`,
    )
  }

  const changePartnerStatus = async (partner, status) => {
    if (!canAccessModule(currentAdminProfile, 'Partners', 'edit')) {
      showErrorAlert('Permission denied', 'This role does not have permission for this action.')
      return
    }
    const confirmed = await askConfirmation({
      confirmButtonText: status === 'Active' ? 'Activate partner' : 'Deactivate partner',
      text: `${partner.name} account status will be changed to ${status}.`,
      title: 'Update partner status?',
      tone: status === 'Inactive' ? 'danger' : 'question',
    })
    if (!confirmed) return

    await updatePartnerRecord(
      partner,
      (partnerId) => adminApi.updatePartnerStatus(partnerId, status),
      `Partner status changed to ${status}`,
    )
  }

  const changeUserPassword = async (config, record) => {
    if (!isSuperAdminProfile(currentAdminProfile)) {
      showErrorAlert('Permission denied', 'Only Super Admin can change customer and partner passwords.')
      return
    }

    const targetType = config.endpoint === '/partners' ? 'partner' : 'customer'
    const targetName = record.name || record.business_name || record.email || `#${record.id}`
    const result = await Swal.fire({
      cancelButtonColor: '#64748b',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0054A6',
      confirmButtonText: 'Change Password',
      customClass: {
        actions: 'admin-swal-actions',
        cancelButton: 'admin-swal-button admin-swal-cancel',
        confirmButton: 'admin-swal-button',
        htmlContainer: 'admin-swal-text',
        icon: 'admin-swal-icon',
        popup: 'admin-swal-popup',
        title: 'admin-swal-title',
      },
      focusConfirm: false,
      html: `
        <div class="grid gap-4 text-left">
          <label class="block">
            <span class="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">New password</span>
            <input id="admin-user-password" style="box-sizing:border-box;width:100%;margin:0;" class="h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none" type="password" minlength="8" autocomplete="new-password" />
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Confirm password</span>
            <input id="admin-user-password-confirm" style="box-sizing:border-box;width:100%;margin:0;" class="h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold outline-none" type="password" minlength="8" autocomplete="new-password" />
          </label>
        </div>
      `,
      icon: 'question',
      preConfirm: () => {
        const password = document.getElementById('admin-user-password')?.value || ''
        const passwordConfirmation = document.getElementById('admin-user-password-confirm')?.value || ''
        if (password.length < 8) {
          Swal.showValidationMessage('Password must be at least 8 characters.')
          return false
        }
        if (password !== passwordConfirmation) {
          Swal.showValidationMessage('Password and confirmation do not match.')
          return false
        }
        return { password, password_confirmation: passwordConfirmation }
      },
      reverseButtons: true,
      showCancelButton: true,
      title: `Change password for ${targetName}?`,
    })

    if (!result.isConfirmed) return

    setActionLoadingId('action')
    try {
      if (targetType === 'partner') {
        await adminApi.changePartnerPassword(record.id, { ...result.value, admin_user_id: currentAdminProfile.id })
      } else {
        await adminApi.changeCustomerPassword(record.id, { ...result.value, admin_user_id: currentAdminProfile.id })
      }
      setToastMessage('Password updated')
      showSuccessAlert('Password updated')
      await loadModule(targetType === 'partner' ? 'Partners' : 'Customers')
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Password update failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleNotificationClick = async () => {
    if (typeof Notification === 'undefined') {
      setToastMessage('Browser notifications are not supported in this browser.')
    } else if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationState(permission)
    }

    if ((notificationSummary.unread_count || 0) > 0) {
      await adminApi.markNotificationsRead()
      await loadNotificationSummary()
      setToastMessage('Notifications marked as read')
    }
  }

  const openAuthenticatedProfileSettings = () => {
    window.sessionStorage.setItem('adminActiveTab', 'Profiles')
    resetTableControls()
    setActiveTab('Profiles')
  }
  const openInvoicePage = (order) => {
    const booking = order.metadata?.booking || order
    const id = booking.booking_no || booking.id || order.booking_no || order.id
    window.open(`/invoice/${encodeURIComponent(id)}`, '_blank')
  }

  const makeColumns = (config) => buildColumns(config, {
    onInvoice: openInvoicePage,
    actionLoadingId,
    appSettings,
    canChangeUserPasswords: isSuperAdminProfile(currentAdminProfile),
    onApproveKyc: approvePartnerKyc,
    onBookingCancel: cancelBooking,
    onBookingDetails: setBookingDetailsRecord,
    onChangeUserPassword: changeUserPassword,
    onCustomerDetails: (customer) => {
      if (!customer?.id) {
        showErrorAlert('Unable to open customer', 'Customer ID is missing.')
        return
      }

      onOpenCustomerDetails(customer.id)
    },
    onDelete: deleteRecord,
    onEdit: openEditor,
    onPartnerAvailabilityChange: changePartnerAvailability,
    onPartnerStatusChange: changePartnerStatus,
    onRejectKyc: rejectPartnerKyc,
    onView: (partner) => {
      if (!partner?.id) {
        showErrorAlert('Unable to open partner', 'Partner ID is missing.')
        return
      }

      onOpenPartnerDetails(partner.id)
    },
    onViewPermissions: (adminUser) => setPermissionViewerAdmin(adminUser),
    onViewMetadata: (record) => setAppContentMetadataRecord(record),
  })

  const resetTableControls = () => {
    setTableSearch('')
    setTableFilters({})
    setServerPagination((current) => ({ ...current, [activeTab]: null }))
    setRoleViewMode('list')
    setPermissionViewerAdmin(null)
    setAppContentMetadataRecord(null)
  }

  const saveAppContentMetadata = async (record, updatedMetadata) => {
    setActionLoadingId('action')
    try {
      const payload = {
        type: record.type,
        title: record.title,
        subtitle: record.subtitle || '',
        body: record.body || '',
        image: record.image || '',
        button_text: record.button_text || '',
        button_url: record.button_url || '',
        sort_order: record.sort_order ?? null,
        status: record.status || 'Active',
        metadata: updatedMetadata,
      }
      await adminApi.update('/app-content', record.id, payload)
      showSuccessAlert('Metadata updated', 'App content metadata has been successfully updated.')
      setAppContentMetadataRecord(null)
      await loadModule('App Content')
      broadcastRealtimeRefresh({ source: 'admin-record-save', targets: ['admin', 'customer', 'vendor'] })
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Update failed', requestError.message)
    } finally {
      setActionLoadingId('')
    }
  }

  const saveRole = async (role) => {
    const isEditing = Boolean(role.id)
    const confirmed = await askConfirmation({
      confirmButtonText: isEditing ? 'Update role' : 'Create role',
      text: isEditing ? 'Do you want to save this role permission setup?' : 'Do you want to create this role?',
      title: isEditing ? 'Update role?' : 'Create role?',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      const payload = {
        name: role.name,
        permissions: role.permissions || [],
        slug: role.slug || slugify(role.name),
        status: role.status || 'Active',
      }
      if (isEditing) {
        await adminApi.update('/roles', role.id, payload)
      } else {
        await adminApi.create('/roles', payload)
      }
      setToastMessage(isEditing ? 'Role updated' : 'Role created')
      showSuccessAlert(isEditing ? 'Role updated' : 'Role created')
      setRoleViewMode('list')
      await Promise.all([loadModule('Roles'), loadModule('Admin Users')])
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Role save failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteRole = async (role) => {
    const confirmed = await askConfirmation({
      confirmButtonText: 'Delete role',
      text: `${role.name} will be deleted permanently.`,
      title: 'Delete role?',
      tone: 'danger',
    })
    if (!confirmed) return

    setActionLoadingId('action')
    try {
      await adminApi.remove('/roles', role.id)
      setToastMessage('Role deleted')
      showSuccessAlert('Role deleted')
      await loadModule('Roles')
    } catch (requestError) {
      setError(requestError.message)
      showErrorAlert('Role delete failed', requestError.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderContent = () => {
    if (isFetching) return <AdminPageSkeleton />
    if (activeTab === 'Profiles') {
      return (
        <ProfilesView
          adminProfile={currentAdminProfile}
          isSaving={actionLoadingId === 'action'}
          onChangePassword={changeProfilePassword}
          onSaveProfile={saveProfile}
          passwordMessage={passwordSaveMessage}
          roles={datasets.Roles || []}
          saveMessage={profileSaveMessage}
        />
      )
    }

    if (activeTab === 'Dashboard') {
      return <DashboardView analytics={analytics} dashboardStats={dashboardStats} datasets={datasets} globalSearch={globalSearch} makeColumns={makeColumns} />
    }

    if (activeTab === 'Reports') {
      return <ReportsView analytics={analytics} dashboardStats={dashboardStats} datasets={datasets} />
    }

    if (activeTab === 'Assign Professional') {
      return (
        <AssignProfessionalView
          bookings={(datasets.Bookings || []).filter((booking) => !['Rejected', 'Completed', 'Cancelled'].includes(booking.status))}
          onAcceptBooking={acceptBooking}
          onAssignPartner={assignPartner}
          onRejectBooking={rejectBooking}
          partners={(datasets.Partners || []).filter((partner) => partner.availability !== 'Unavailable')}
        />
      )
    }

    if (activeTab === 'Vendor Dashboard') {
      return <AdminVendorDashboardView appSettings={appSettings} />
    }

    if (activeTab === 'Package Detail Sections') {
      return <PackageDetailSectionsView onRefresh={() => {}} />
    }

    if (activeTab === 'Roles') {
      return (
        <RolesPermissionsView
          globalSearch={globalSearch}
          isSaving={actionLoadingId === 'action'}
          onBackToList={setRoleViewMode}
          onDelete={deleteRole}
          onSave={saveRole}
          roles={datasets.Roles || []}
          viewMode={roleViewMode}
        />
      )
    }

    if (activeTab === 'Settings') {
      return <SettingsView />
    }

    if (activeTab === 'Pages') {
      return <PagesView />
    }

    if (activeTab === 'Invoice Setting') {
      return <InvoiceSettingsView />
    }

    if (activeConfig) {
      if (activeTab === 'Admin Users' && permissionViewerAdmin) {
        return (
          <AdminUserPermissionsView
            adminUser={permissionViewerAdmin}
            onBack={() => setPermissionViewerAdmin(null)}
          />
        )
      }

      return (
        <CrudModuleView
          activeTab={activeTab}
          config={activeConfig}
          globalSearch={globalSearch}
          makeColumns={makeColumns}
          onAdd={() => openEditor()}
          onClearFilters={resetTableControls}
          onFilterChange={(name, value) => setTableFilters((current) => ({ ...current, [name]: value }))}
          onPageChange={(page) => SERVER_PAGINATED_TABS.includes(activeTab) && loadPaginatedModulePage(activeTab, page)}
          onTableSearchChange={setTableSearch}
          pagination={SERVER_PAGINATED_TABS.includes(activeTab) ? serverPagination[activeTab] : undefined}
          rows={datasets[activeTab] || []}
          serverPaginated={SERVER_PAGINATED_TABS.includes(activeTab)}
          tableFilters={tableFilters}
          tableSearch={tableSearch}
        />
      )
    }

    return <Panel title={activeTab}><div className="p-5 text-sm font-semibold text-slate-500">Module API configuration pending.</div></Panel>
  }

  const handleSelectSearchRecord = (category, record) => {
    if (category === 'Customers') {
      onOpenCustomerDetails(record.id)
    } else if (category === 'Partners') {
      onOpenPartnerDetails(record.id)
    } else if (category === 'Bookings') {
      setBookingDetailsRecord(record)
    } else if (category === 'Services' || category === 'Service Packages') {
      const tabName = category
      window.sessionStorage.setItem('adminActiveTab', tabName)
      resetTableControls()
      setActiveTab(tabName)
      setGlobalSearch(record.name || '')
    }
  }

  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        adminProfile={currentAdminProfile}
        appSettings={appSettings}
        globalSearch={globalSearch}
        navSections={visibleNavSections}
        notificationUnreadCount={notificationSummary.unread_count || 0}
        notifications={notificationSummary.notifications || []}
        notificationState={notificationState}
        onBackHome={onBackHome}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={onLogout}
        onNotificationClick={handleNotificationClick}
        onOpenProfileSettings={openAuthenticatedProfileSettings}
        onSelectSearchRecord={handleSelectSearchRecord}
        onTabChange={(tab) => {
          window.sessionStorage.setItem('adminActiveTab', tab)
          resetTableControls()
          setActiveTab(tab)
        }}
      >
        {renderContent()}
      </AdminLayout>

      

      <RecordModal
        actionLoadingId={actionLoadingId}
        activeTab={activeTab}
        config={activeConfig}
        form={form}
        modalState={activeTab === 'Package Detail Sections' || activeTab === 'Roles' ? null : modalState}
        onChange={updateFormField}
        onClose={closeModal}
        onSubmit={saveRecord}
      />

      {bookingDetailsRecord && (
        <BookingDetailsModal
          record={bookingDetailsRecord}
          onClose={() => setBookingDetailsRecord(null)}
          onInvoice={() => openInvoicePage(bookingDetailsRecord)}
        />
      )}

      {appContentMetadataRecord && (
        <AppContentMetadataModal
          isSaving={actionLoadingId === 'action'}
          onClose={() => setAppContentMetadataRecord(null)}
          onSave={saveAppContentMetadata}
          record={appContentMetadataRecord}
        />
      )}

      <Toast message={toastMessage} />
    </>
  )
}

function BookingDetailsModal({ onClose, onInvoice, record }) {
  const metadata = record.metadata || {}
  const items = Array.isArray(metadata.items) ? metadata.items : []
  const work = metadata.work || {}
  const bookingId = record.booking_no || metadata.booking_no || record.job_no || `#${record.id}`
  const paymentMethod = record.payment_method || metadata.payment_method || metadata.payment || record.payment_status || '-'
  const paymentStatus = record.payment_status || metadata.payment_status || '-'
  const schedule = formatBookingModalDate(record.scheduled_at || record.slot)
  const customerDetails = [
    ['Name', record.customer_name || record.customer || metadata.customer_name],
    ['Phone', record.customer_phone || metadata.customer_phone || metadata.phone],
    ['Customer ID', metadata.customer_id],
    ['Address', record.address || metadata.service_address?.street || metadata.service_address?.flat],
    ['City', metadata.service_address?.city],
    ['Location', formatModalLocation(metadata.service_location || metadata.customer_location || metadata.service_address?.location)],
  ].filter(([, value]) => value)
  const partnerDetails = [
    ['Service', record.service_name || record.service],
    ['Professional', record.professional_name || record.partner_name || metadata.partner_name || metadata.assigned_partner?.name],
    ['Partner ID', record.partner_id || metadata.assigned_partner?.id],
    ['Status', record.status],
    ['Schedule', schedule],
    ['Priority', record.priority],
  ].filter(([, value]) => value)
  const mainServiceName = record.service_name || record.service
  let normalizedItems = items.map(item => {
    if (typeof item === 'string') return { name: item, price: 0, quantity: 1, amount: 0 };
    const price = Number(item.price || item.sale_price || item.amount || 0);
    const quantity = Number(item.quantity || 1);
    return {
      name: item.name || item.service_name || item.title || 'Item',
      price: price,
      quantity: quantity,
      amount: Number(item.lineTotal || item.total) || (price * quantity)
    };
  });

  if (normalizedItems.length === 0) {
    normalizedItems = [{ name: mainServiceName || '-', price: record.amount || 0, quantity: 1, amount: record.amount || 0 }];
  }

  const serviceRows = normalizedItems.map((item, index) => ({
    amount: item.amount,
    name: item.name,
    paymentMethod,
    paymentStatus,
    quantity: item.quantity,
    rate: item.price,
    serial: index + 1,
  }));
  const beforeMedia = [
    ...normalizeBookingMedia(work.before_photos, 'photo'),
    ...normalizeBookingMedia(work.before_videos, 'video'),
  ]
  const afterMedia = [
    ...normalizeBookingMedia(work.after_photos, 'photo'),
    ...normalizeBookingMedia(work.after_videos, 'video'),
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase text-[#67B529]">Complete booking details</p>
            <h2 className="mt-1 text-base font-medium text-slate-900">{bookingId}</h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={onInvoice} type="button">
              View official invoice
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5 text-sm text-slate-700">
          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection rows={customerDetails} title="Customer details" />
            <DetailSection rows={partnerDetails} title="Service partner details" />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase text-slate-500">Services and payment</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-2">S.No.</th>
                    <th className="border-b border-slate-200 px-4 py-2">Service</th>
                    <th className="border-b border-slate-200 px-4 py-2">Qty</th>
                    <th className="border-b border-slate-200 px-4 py-2">Price</th>
                    <th className="border-b border-slate-200 px-4 py-2">Amount</th>
                    <th className="border-b border-slate-200 px-4 py-2">Payment method</th>
                    <th className="border-b border-slate-200 px-4 py-2">Payment status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRows.map((item) => (
                    <tr key={`${item.serial}-${item.name}`}>
                      <td className="border-b border-slate-100 px-4 py-2">{item.serial}</td>
                      <td className="border-b border-slate-100 px-4 py-2">{item.name}</td>
                      <td className="border-b border-slate-100 px-4 py-2">{item.quantity}</td>
                      <td className="border-b border-slate-100 px-4 py-2">Rs. {item.rate}</td>
                      <td className="border-b border-slate-100 px-4 py-2">Rs. {item.amount}</td>
                      <td className="border-b border-slate-100 px-4 py-2">{item.paymentMethod}</td>
                      <td className="border-b border-slate-100 px-4 py-2">{item.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 bg-slate-50/75 p-4 flex flex-col items-end text-sm">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Booking Base Amount:</span>
                  <span>Rs. {record.amount || 0}</span>
                </div>
                <div className="flex justify-between font-bold text-[#6338E0]">
                  <span>Professional Tip Amount (Separate):</span>
                  <span>Rs. {record.tip_amount || metadata.tip_amount || 0}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-base">
                  <span>Total Amount (Booking + Tip):</span>
                  <span>Rs. {Number(record.amount || 0) + Number(record.tip_amount || metadata.tip_amount || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MediaSection items={beforeMedia} title="Before media" />
            <MediaSection items={afterMedia} title="After media" />
          </div>
        </div>
      </section>
    </div>
  )
}

function DetailSection({ rows, title }) {
  return (
    <section className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase text-slate-500">{title}</div>
      <div className="divide-y divide-slate-100">
        {rows.length ? rows.map(([label, value]) => (
          <div className="grid gap-2 px-4 py-1 sm:grid-cols-[140px_minmax(0,1fr)]" key={label}>
            <span className="text-slate-500">{label}</span>
            <span className="break-words text-slate-800">{value || '-'}</span>
          </div>
        )) : (
          <p className="px-4 py-3 text-slate-500">No details available.</p>
        )}
      </div>
    </section>
  )
}

function MediaSection({ items, title }) {
  return (
    <section className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase text-slate-500">{title}</div>
      {items.length ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {items.map((item, index) => (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white" key={`${item.src || item.name}-${index}`}>
              {item.kind === 'video' ? (
                <video className="h-40 w-full bg-slate-100 object-contain" controls src={item.src} />
              ) : (
                <a href={item.src} rel="noreferrer" target="_blank">
                  <img alt={item.name || `${title} ${index + 1}`} className="h-40 w-full bg-slate-100 object-cover" src={item.src} />
                </a>
              )}
              <div className="px-3 py-2 text-xs text-slate-500">
                <p className="truncate">{item.name || `${item.kind} ${index + 1}`}</p>
                {item.uploaded_at && <p>{formatBookingModalDate(item.uploaded_at)}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">No media uploaded.</p>
      )}
    </section>
  )
}

const normalizeBookingMedia = (items, fallbackKind) => {
  if (!Array.isArray(items)) return []

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        kind: fallbackKind,
        name: `${fallbackKind} ${index + 1}`,
        src: resolveBookingMediaUrl(item),
      }
    }

    return {
      kind: item.kind || (String(item.type || '').startsWith('video/') ? 'video' : fallbackKind),
      name: item.name,
      src: resolveBookingMediaUrl(item.preview || item.url || item.path),
      uploaded_at: item.uploaded_at,
    }
  }).filter((item) => item.src)
}

const resolveBookingMediaUrl = (value) => {
  if (!value) return ''
  const source = String(value)
  if (source.startsWith('data:') || source.startsWith('blob:') || /^https?:\/\//i.test(source)) return source
  const cleanSource = source.replace(/^\/+/, '')
  if (cleanSource.startsWith('storage/')) return buildStorageUrl(cleanSource)
  return buildBackendUrl(cleanSource)
}

const formatBookingModalDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatModalLocation = (location) => {
  if (!location?.latitude || !location?.longitude) return ''
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
}

export default AdminDashboardPage
