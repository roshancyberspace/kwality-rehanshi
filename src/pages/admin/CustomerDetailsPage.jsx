import { useEffect, useMemo, useState } from 'react'
import { ActionButton, StatusBadge } from '../../components/admin/AdminUI'
import { ShimmerBlock } from '../../components/common/Shimmer'
import { buildBackendUrl } from '../../config/urls'
import { adminApi } from '../../services/adminApi'
import { formatValue } from './utils/formatters'

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
const dateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatValue(value)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const customerTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'payments', label: 'Payments' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'addresses', label: 'Addresses' },
]

function MetricCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3.5">
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-black text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{helper}</p> : null}
    </article>
  )
}

function EmptyState({ label }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  )
}

function DetailGrid({ rows }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div className="min-w-0 bg-white p-3.5" key={label}>
          <dt className="text-[11px] font-black uppercase text-slate-400">{label}</dt>
          <dd className="mt-1 break-words text-sm font-bold text-slate-800">
            {label === 'Status' && value ? <StatusBadge>{value}</StatusBadge> : (value || '-')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function BookingCard({ booking }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase text-slate-400">{booking.booking_no || `#${booking.id}`}</p>
          <h3 className="mt-1 text-sm font-black text-slate-900">{booking.service_name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{dateTime(booking.scheduled_at)}</p>
        </div>
        <StatusBadge>{booking.status || 'Pending'}</StatusBadge>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-600">{booking.address || 'Address not added'}</p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{money(booking.amount)}</p>
    </article>
  )
}

function CustomerDetailsPage({ customerId, onBackAdmin, onBackHome }) {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const customer = overview?.customer || {}
  const stats = overview?.stats || {}
  const bookings = overview?.bookings || []
  const payments = overview?.payments || []
  const transactions = overview?.transactions || []
  const addresses = overview?.saved_addresses || []
  const wallet = overview?.wallet || null
  const customerProfilePicture = buildBackendUrl(customer?.metadata?.profile_picture || customer?.metadata?.avatar_url || '')

  const activeBookings = useMemo(
    () => bookings.filter((booking) => !['Completed', 'Cancelled', 'Canceled', 'Rejected', 'Refunded'].includes(booking.status)),
    [bookings],
  )

  const tabCounts = {
    overview: null,
    bookings: bookings.length,
    payments: payments.length,
    wallet: transactions.length,
    addresses: addresses.length,
  }

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')
    setActiveTab('overview')

    adminApi.customerOverview(customerId)
      .then((data) => {
        if (!ignore) setOverview(data)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [customerId])

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h3 className="mb-3 text-sm font-black text-slate-800">Personal details</h3>
            <DetailGrid
              rows={[
                ['Name', customer.name],
                ['Phone', customer.phone],
                ['Email', customer.email],
                ['Status', customer.status],
                ['Address', customer.address],
                ['Last booking', dateTime(customer.last_booking_at)],
                ['Joined', dateTime(customer.created_at)],
                ['Customer ID', customer.id ? `#${customer.id}` : '-'],
              ]}
            />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-800">Active bookings</h3>
              <button
                className="text-xs font-black text-[#67B529] hover:underline"
                onClick={() => setActiveTab('bookings')}
                type="button"
              >
                View all
              </button>
            </div>
            {activeBookings.length ? (
              <div className="grid gap-3">
                {activeBookings.slice(0, 4).map((booking) => (
                  <BookingCard booking={booking} key={booking.id} />
                ))}
              </div>
            ) : (
              <EmptyState label="No active bookings for this customer." />
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'bookings') {
      return (
        <div className="grid gap-5">
          <div>
            <h3 className="mb-3 text-sm font-black text-slate-800">Active ({activeBookings.length})</h3>
            {activeBookings.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {activeBookings.map((booking) => (
                  <BookingCard booking={booking} key={booking.id} />
                ))}
              </div>
            ) : (
              <EmptyState label="No active bookings for this customer." />
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-black text-slate-800">All bookings ({bookings.length})</h3>
            {bookings.length ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                      {['S.No.', 'Booking', 'Service', 'Schedule', 'Status', 'Payment', 'Amount'].map((head) => (
                        <th className="px-3 py-2.5" key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr className="border-b border-slate-100" key={booking.id}>
                        <td className="px-3 py-2.5 font-extrabold text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2.5 font-black">{booking.booking_no || `#${booking.id}`}</td>
                        <td className="px-3 py-2.5 font-semibold">{booking.service_name}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-600">{dateTime(booking.scheduled_at)}</td>
                        <td className="px-3 py-2.5"><StatusBadge>{booking.status || 'Pending'}</StatusBadge></td>
                        <td className="px-3 py-2.5 font-semibold">{booking.payment_status || '-'} / {booking.payment_method || '-'}</td>
                        <td className="px-3 py-2.5 font-black">{money(booking.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No bookings found for this customer." />
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'payments') {
      return payments.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                {['S.No.', 'Payment ID', 'Date & Time', 'Method', 'Status', 'Amount'].map((head) => (
                  <th className="px-3 py-2.5" key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr className="border-b border-slate-100" key={payment.id}>
                  <td className="px-3 py-2.5 font-extrabold text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2.5 font-black">{payment.payment_no || `Payment #${payment.id}`}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-600">{dateTime(payment.paid_at)}</td>
                  <td className="px-3 py-2.5 font-semibold">{payment.method || '-'}</td>
                  <td className="px-3 py-2.5"><StatusBadge>{payment.status || 'Pending'}</StatusBadge></td>
                  <td className="px-3 py-2.5 font-black">{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState label="No payment records found." />
      )
    }

    if (activeTab === 'wallet') {
      return (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Wallet balance" value={money(wallet?.balance)} helper={wallet?.status || 'No wallet record'} />
            <MetricCard label="Transactions" value={transactions.length} helper="Credit + debit history" />
            <MetricCard label="Paid amount" value={money(stats.paid_amount)} helper="Successful payments" />
          </div>
          {transactions.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                    {['S.No.', 'Transaction', 'Booking', 'Direction', 'Amount', 'Balance after'].map((head) => (
                      <th className="px-3 py-2.5" key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr className="border-b border-slate-100" key={transaction.id}>
                      <td className="px-3 py-2.5 font-extrabold text-slate-500">{index + 1}</td>
                      <td className="px-3 py-2.5 font-black">{transaction.transaction_no || transaction.type || `#${transaction.id}`}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600">{transaction.booking_no || '-'}</td>
                      <td className={`px-3 py-2.5 text-sm font-black ${transaction.direction === 'Credit' ? 'text-[#67B529]' : 'text-rose-700'}`}>
                        {transaction.direction || '-'}
                      </td>
                      <td className="px-3 py-2.5 font-black">{money(transaction.amount)}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600">{money(transaction.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="No wallet transactions found." />
          )}
        </div>
      )
    }

    return addresses.length ? (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {addresses.map((address) => (
          <article className="rounded-lg border border-slate-200 bg-white p-3.5" key={address.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-black">{address.label || 'Address'}</p>
              <StatusBadge>{address.status || 'Active'}</StatusBadge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {[address.flat, address.street, address.city, address.state, address.pincode].filter(Boolean).join(', ') || '-'}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {address.contact_name || customer.name} | {address.mobile || customer.phone || '-'}
            </p>
          </article>
        ))}
      </div>
    ) : (
      <EmptyState label="No saved addresses found." />
    )
  }

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF9E8] text-xl font-black text-[#67B529] ring-1 ring-[#67B529]/20">
              {customerProfilePicture ? (
                <img alt="" className="h-full w-full object-cover" src={customerProfilePicture} />
              ) : (
                <span>{customer.name?.slice(0, 2)?.toUpperCase() || 'CU'}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#67B529]">Customer profile</p>
              <h1 className="mt-1 truncate text-2xl font-black">{customer.name || `Customer #${customerId}`}</h1>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                {[customer.phone, customer.email].filter(Boolean).join(' | ') || 'Contact details not added'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={onBackAdmin}>Back to admin</ActionButton>
            <ActionButton onClick={onBackHome}>Home</ActionButton>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:px-8">
        {loading ? (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <ShimmerBlock className="h-24" key={index} />
              ))}
            </div>
            <ShimmerBlock className="h-12" />
            <ShimmerBlock className="h-64" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-white p-5 text-sm font-semibold text-rose-600">{error}</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="Total bookings" value={stats.total_bookings || 0} helper="All bookings linked" />
              <MetricCard label="Currently active" value={stats.active_bookings || 0} helper="Open service flow" />
              <MetricCard label="Completed" value={stats.completed_bookings || 0} helper="Delivered bookings" />
              <MetricCard label="Cancelled" value={stats.cancelled_bookings || 0} helper="Cancelled / rejected" />
              <MetricCard label="Total spent" value={money(stats.total_spent)} helper="Booking amount total" />
              <MetricCard label="Wallet balance" value={money(wallet?.balance)} helper={wallet?.status || 'No wallet'} />
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 pt-2">
                {customerTabs.map((tab) => {
                  const count = tabCounts[tab.key]
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-black transition ${
                        isActive
                          ? 'border-[#67B529] text-[#67B529]'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      type="button"
                    >
                      {tab.label}
                      {count !== null && count !== undefined ? (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          isActive ? 'bg-[#EEF9E8] text-[#67B529]' : 'bg-slate-100 text-slate-500'
                        }`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <div className="p-4 sm:p-5">{renderTabContent()}</div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default CustomerDetailsPage
