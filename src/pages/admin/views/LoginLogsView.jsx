import { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { Panel } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { notify } from '../../../utils/feedback'

const formatTimestamp = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return String(dateString)

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds || 1}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return formatTimestamp(dateString)
}

const copyToClipboard = async (text, label = 'Copied') => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    notify(`${label} copied to clipboard!`, { tone: 'success' })
  } catch {
    notify('Failed to copy to clipboard', { tone: 'error' })
  }
}

export default function LoginLogsView({ authenticatedAdmin }) {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 25 })
  const [activeTypeTab, setActiveTypeTab] = useState('All')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeLog, setActiveLog] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const fetchLogs = useCallback((page = 1, type = activeTypeTab, searchQuery = search) => {
    setIsLoading(true)
    const params = { page, per_page: 25 }

    if (type === 'Blocked') {
      params.is_blocked = 1
    } else if (type !== 'All') {
      params.user_type = type
    }

    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }

    adminApi.list('/login-logs', params)
      .then((response) => {
        const payload = response?.data || response
        if (Array.isArray(payload)) {
          setLogs(payload)
          setPagination({ current_page: 1, last_page: 1, total: payload.length, per_page: payload.length })
        } else if (payload && Array.isArray(payload.data)) {
          setLogs(payload.data)
          setPagination({
            current_page: payload.current_page || 1,
            last_page: payload.last_page || 1,
            total: payload.total || 0,
            per_page: payload.per_page || 25,
          })
        }
      })
      .catch((error) => {
        notify(error.message || 'Failed to load login logs', { tone: 'error' })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [activeTypeTab, search])

  useEffect(() => {
    fetchLogs(1, activeTypeTab, search)
  }, [activeTypeTab, fetchLogs])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    fetchLogs(1, activeTypeTab, search)
  }

  const handleToggleBlock = async (log) => {
    const isCurrentlyBlocked = Boolean(log.is_blocked || log.status === 'Blocked')
    const actionName = isCurrentlyBlocked ? 'Unblock' : 'Block'
    const confirmButtonColor = isCurrentlyBlocked ? '#16a34a' : '#dc2626'

    const result = await Swal.fire({
      title: `${actionName} User Access?`,
      text: isCurrentlyBlocked
        ? `Are you sure you want to unblock ${log.user_name || 'this user'}? They will be able to log in again.`
        : `Are you sure you want to block ${log.user_name || 'this user'}? This will immediately terminate all their active sessions and prevent further logins.`,
      icon: isCurrentlyBlocked ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, ${actionName} User`,
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    setActionLoadingId(log.id)
    try {
      if (isCurrentlyBlocked) {
        await adminApi.unblockLoginUser(log.id)
        notify(`User ${log.user_name} has been unblocked successfully.`, { tone: 'success' })
      } else {
        await adminApi.blockLoginUser(log.id)
        notify(`User ${log.user_name} has been blocked and sessions revoked.`, { tone: 'success' })
      }

      if (activeLog && activeLog.id === log.id) {
        setActiveLog((prev) => prev ? { ...prev, is_blocked: !isCurrentlyBlocked, status: !isCurrentlyBlocked ? 'Blocked' : 'Success' } : null)
      }

      fetchLogs(pagination.current_page, activeTypeTab, search)
    } catch (error) {
      notify(error.message || `Failed to ${actionName.toLowerCase()} user`, { tone: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const stats = useMemo(() => {
    return {
      total: pagination.total,
      customers: logs.filter((l) => l.user_type === 'Customer').length,
      partners: logs.filter((l) => l.user_type === 'Partner').length,
      blocked: logs.filter((l) => l.is_blocked || l.status === 'Blocked').length,
    }
  }, [logs, pagination.total])

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Login Logs & Device Activity</h1>
          <p className="text-sm text-slate-500">Track real-time logins, FCM/APNS tokens, device IDs, GPS locations, and block malicious access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs(pagination.current_page, activeTypeTab, search)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Logins Tracked</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{pagination.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Vendor / Partner Logins</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{stats.partners} on page</div>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-600">Customer Logins</div>
          <div className="mt-1 text-2xl font-bold text-sky-700">{stats.customers} on page</div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">Blocked Access</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{stats.blocked} on page</div>
        </div>
      </div>

      <Panel>
        {/* Filters and Search Bar */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {['All', 'Customer', 'Partner', 'Admin', 'Blocked'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTypeTab(tab)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    activeTypeTab === tab
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'Partner' ? 'Vendors / Partners' : tab === 'Customer' ? 'Customers' : tab === 'Admin' ? 'Admin Users' : tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex max-w-md items-center gap-2">
              <div className="relative w-full">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone, IP, device..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#67B529] focus:ring-1 focus:ring-[#67B529]"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#67B529] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#589d23]"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Device & Platform</th>
                <th className="px-4 py-3.5">IP & Location</th>
                <th className="px-4 py-3.5">Login Time</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-[#67B529]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Loading login logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No login logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isBlocked = Boolean(log.is_blocked || log.status === 'Blocked')
                  const hasCoordinates = Boolean(log.latitude && log.longitude)

                  return (
                    <tr key={log.id} className="transition hover:bg-slate-50/80">
                      {/* User Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs ${
                            log.user_type === 'Admin'
                              ? 'bg-purple-600'
                              : log.user_type === 'Partner'
                              ? 'bg-emerald-600'
                              : 'bg-sky-600'
                          }`}>
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{log.user_name || 'Anonymous User'}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                log.user_type === 'Admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : log.user_type === 'Partner'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}>
                                {log.user_type === 'Partner' ? 'Vendor / Partner' : log.user_type}
                              </span>
                              <span className="text-[11px] text-slate-400">ID #{log.user_id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-medium text-slate-700">{log.email || '—'}</div>
                        <div className="text-slate-400 mt-0.5">{log.phone || '—'}</div>
                      </td>

                      {/* Device & Platform Column */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            log.platform === 'android'
                              ? 'bg-lime-100 text-lime-800'
                              : log.platform === 'ios'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.platform || 'web'}
                          </span>
                          <span className="font-medium text-slate-700 truncate max-w-[140px]" title={log.device_name || 'Unknown'}>
                            {log.device_name || 'Web Browser'}
                          </span>
                        </div>
                        {log.device_id && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={log.device_id}>
                            ID: {log.device_id}
                          </div>
                        )}
                      </td>

                      {/* IP & Location Column */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-mono text-[11px] font-semibold text-slate-700">{log.ip_address || '—'}</div>
                        {hasCoordinates ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-0.5">
                            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{Number(log.latitude).toFixed(4)}, {Number(log.longitude).toFixed(4)}</span>
                          </div>
                        ) : log.location_name ? (
                          <div className="text-[11px] text-slate-400 mt-0.5">{log.location_name}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">No GPS</div>
                        )}
                      </td>

                      {/* Login Time Column */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-semibold text-slate-700">{formatRelativeTime(log.created_at)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatTimestamp(log.created_at)}</div>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3.5">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#67B529] hover:text-[#67B529]"
                            title="View Full Details, Tokens & Map"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(log)}
                            disabled={actionLoadingId === log.id}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
                              isBlocked
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                            title={isBlocked ? 'Unblock user login' : 'Block user and revoke access'}
                          >
                            {actionLoadingId === log.id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            ) : isBlocked ? (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            )}
                            {isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <div>
              Showing page <span className="font-bold">{pagination.current_page}</span> of{' '}
              <span className="font-bold">{pagination.last_page}</span> ({pagination.total} total logs)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.current_page <= 1 || isLoading}
                onClick={() => fetchLogs(pagination.current_page - 1, activeTypeTab, search)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page || isLoading}
                onClick={() => fetchLogs(pagination.current_page + 1, activeTypeTab, search)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* DETAIL, TOKENS & MAP MODAL (MEDIUM SIZE & COMPACT) */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Modal Header with User Details */}
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white text-sm ${
                    activeLog.user_type === 'Admin'
                      ? 'bg-purple-600'
                      : activeLog.user_type === 'Partner'
                      ? 'bg-emerald-600'
                      : 'bg-sky-600'
                  }`}>
                    {activeLog.user_name ? activeLog.user_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-base font-bold text-slate-800 leading-none">{activeLog.user_name || 'Anonymous User'}</h3>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        activeLog.user_type === 'Admin'
                          ? 'bg-purple-100 text-purple-700'
                          : activeLog.user_type === 'Partner'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}>
                        {activeLog.user_type === 'Partner' ? 'Vendor' : activeLog.user_type}
                      </span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        #{activeLog.user_id}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        activeLog.is_blocked || activeLog.status === 'Blocked'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {activeLog.is_blocked || activeLog.status === 'Blocked' ? 'BLOCKED' : 'ACTIVE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                      {activeLog.email && <span>{activeLog.email}</span>}
                      {activeLog.email && activeLog.phone && <span>•</span>}
                      {activeLog.phone && <span>{activeLog.phone}</span>}
                      {(activeLog.email || activeLog.phone) && <span>•</span>}
                      <span className="text-slate-400">{formatTimestamp(activeLog.created_at)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLog(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body (Compact Content) */}
            <div className="max-h-[70vh] space-y-3.5 overflow-y-auto p-5 text-xs">
              {/* Compact Device & Network Info Strip */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                        activeLog.platform === 'android'
                          ? 'bg-lime-100 text-lime-800'
                          : activeLog.platform === 'ios'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {activeLog.platform || 'web'}
                      </span>
                      <span className="font-semibold text-slate-700 truncate" title={activeLog.device_name || 'Web Browser'}>
                        {activeLog.device_name || 'Web Browser'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IP Address</div>
                    <div className="mt-0.5 font-mono font-semibold text-slate-800 truncate" title={activeLog.ip_address || '—'}>
                      {activeLog.ip_address || '—'}
                    </div>
                  </div>

                  {activeLog.device_id && (
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device ID</div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-700 truncate" title={activeLog.device_id}>
                        {activeLog.device_id}
                      </div>
                    </div>
                  )}
                </div>

                {activeLog.user_agent && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-[10px] text-slate-500">
                    <span className="shrink-0 font-semibold text-slate-400">Agent:</span>
                    <span className="font-mono truncate leading-tight" title={activeLog.user_agent}>
                      {activeLog.user_agent}
                    </span>
                  </div>
                )}
              </div>

              {/* Push Notification Tokens Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Push Tokens</div>

                {/* FCM Token */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                        FCM
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">Firebase Token</span>
                    </div>
                    {activeLog.fcm_token && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeLog.fcm_token, 'FCM Token')}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    )}
                  </div>
                  {activeLog.fcm_token ? (
                    <div className="mt-1.5 rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-700 break-all select-all border border-slate-100 max-h-16 overflow-y-auto">
                      {activeLog.fcm_token}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] italic text-slate-400">No FCM token registered.</div>
                  )}
                </div>

                {/* APNS Token */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-800">
                        APNS
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">Apple Push Token</span>
                    </div>
                    {activeLog.apns_token && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeLog.apns_token, 'APNS Token')}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    )}
                  </div>
                  {activeLog.apns_token ? (
                    <div className="mt-1.5 rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-700 break-all select-all border border-slate-100 max-h-16 overflow-y-auto">
                      {activeLog.apns_token}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] italic text-slate-400">No APNS token registered.</div>
                  )}
                </div>
              </div>

              {/* Map & Coordinates Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location</div>
                  {activeLog.latitude && activeLog.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${activeLog.latitude},${activeLog.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#67B529] hover:underline"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Google Maps
                    </a>
                  )}
                </div>

                {activeLog.latitude && activeLog.longitude ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px]">
                      <span className="font-medium text-slate-700">
                        Lat: <strong className="text-slate-900">{activeLog.latitude}</strong> • Lng: <strong className="text-slate-900">{activeLog.longitude}</strong>
                      </span>
                      {activeLog.location_name && (
                        <span className="text-slate-500 font-medium">{activeLog.location_name}</span>
                      )}
                    </div>
                    <div className="relative h-44 w-full bg-slate-100">
                      <iframe
                        title="Login Location Map"
                        className="h-full w-full border-0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(activeLog.longitude) - 0.01}%2C${Number(activeLog.latitude) - 0.01}%2C${Number(activeLog.longitude) + 0.01}%2C${Number(activeLog.latitude) + 0.01}&layer=mapnik&marker=${activeLog.latitude}%2C${activeLog.longitude}`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5 text-center">
                    <div className="text-[11px] font-semibold text-slate-600">No GPS Coordinates Recorded</div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {activeLog.ip_address ? (
                        <>Approximate IP lookup available at <a href={`https://ipinfo.io/${activeLog.ip_address}`} target="_blank" rel="noreferrer" className="text-[#67B529] underline">ipinfo.io/{activeLog.ip_address}</a>.</>
                      ) : (
                        'Coordinates were not provided by the client device.'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <button
                type="button"
                onClick={() => handleToggleBlock(activeLog)}
                disabled={actionLoadingId === activeLog.id}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition disabled:opacity-50 ${
                  activeLog.is_blocked || activeLog.status === 'Blocked'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                {activeLog.is_blocked || activeLog.status === 'Blocked' ? (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Unblock Access
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Block User & Revoke Access
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
