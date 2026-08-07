import { useEffect, useMemo, useState } from 'react'
import { ActionButton, Panel, StatusBadge } from '../../components/admin/AdminUI'
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

function MetricCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </article>
  )
}

function EmptyState({ label }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  )
}

function CustomerDetailsPage({ customerId, onBackAdmin, onBackHome }) {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const customer = overview?.customer || {}
  const stats = overview?.stats || {}
  const bookings = overview?.bookings || []
  const payments = overview?.payments || []
  const transactions = overview?.transactions || []
  const addresses = overview?.saved_addresses || []
  const wallet = overview?.wallet || null
  const customerProfilePicture = buildBackendUrl(customer?.metadata?.profile_picture || customer?.metadata?.avatar_url || '')

  const activeBookings = useMemo(() => bookings.filter((booking) => !['Completed', 'Cancelled', 'Canceled', 'Rejected', 'Refunded'].includes(booking.status)), [bookings])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
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
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">{[customer.phone, customer.email].filter(Boolean).join(' | ') || 'Contact details not added'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={onBackAdmin}>Back to admin</ActionButton>
            <ActionButton onClick={onBackHome}>Home</ActionButton>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:px-8">
        {loading ? (
          <Panel title="Loading customer details">
            <div className="grid gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ShimmerBlock className="h-24" key={index} />
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ShimmerBlock className="h-64" />
                <ShimmerBlock className="h-64" />
              </div>
            </div>
          </Panel>
        ) : error ? (
          <Panel title="Unable to load customer">
            <div className="p-5 text-sm font-semibold text-rose-600">{error}</div>
          </Panel>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="Total bookings" value={stats.total_bookings || 0} helper="All bookings linked to this customer" />
              <MetricCard label="Currently active" value={stats.active_bookings || 0} helper="Open service flow" />
              <MetricCard label="Completed" value={stats.completed_bookings || 0} helper="Delivered bookings" />
              <MetricCard label="Cancelled" value={stats.cancelled_bookings || 0} helper="Cancelled, rejected, refunded" />
              <MetricCard label="Total spent" value={money(stats.total_spent)} helper="Booking amount total" />
              <MetricCard label="Wallet balance" value={money(wallet?.balance)} helper={wallet?.status || 'No wallet record'} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <Panel title="Personal Details" subtitle="Live customer record">
                <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
                  {[
                    ['Name', customer.name],
                    ['Phone', customer.phone],
                    ['Email', customer.email],
                    ['Status', customer.status],
                    ['Address', customer.address],
                    ['Last booking', dateTime(customer.last_booking_at)],
                  ].map(([label, value]) => (
                    <div className="min-w-0 bg-white p-4" key={label}>
                      <dt className="text-[11px] font-black uppercase text-slate-400">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-bold text-slate-800">
                        {label === 'Status' && value ? <StatusBadge>{value}</StatusBadge> : value || '-'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel title="Active Bookings" subtitle="Currently open bookings">
                <div className="p-4">
                  {activeBookings.length ? (
                    <div className="grid gap-3">
                      {activeBookings.map((booking) => (
                        <article className="rounded-lg border border-slate-200 bg-white p-4" key={booking.id}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase text-slate-400">{booking.booking_no || `#${booking.id}`}</p>
                              <h3 className="mt-1 text-base font-black text-slate-900">{booking.service_name}</h3>
                              <p className="mt-1 text-sm font-semibold text-slate-500">{dateTime(booking.scheduled_at)}</p>
                            </div>
                            <StatusBadge>{booking.status || 'Pending'}</StatusBadge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-600">{booking.address || 'Address not added'}</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{money(booking.amount)}</p>
                        </article>
                      ))}
                    </div>
                  ) : <EmptyState label="No active bookings for this customer." />}
                </div>
              </Panel>
            </div>

            <Panel title="All Bookings" subtitle="Exact API data, newest first">
              <div className="overflow-x-auto">
                {bookings.length ? (
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500">
                        {['S.No.', 'Booking', 'Service', 'Schedule', 'Status', 'Payment', 'Amount'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking, index) => (
                        <tr className="border-b border-slate-100" key={booking.id}>
                          <td className="px-4 py-3 font-extrabold text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-black">{booking.booking_no || `#${booking.id}`}</td>
                          <td className="px-4 py-3 font-semibold">{booking.service_name}</td>
                          <td className="px-4 py-3 font-semibold text-slate-600">{dateTime(booking.scheduled_at)}</td>
                          <td className="px-4 py-3"><StatusBadge>{booking.status || 'Pending'}</StatusBadge></td>
                          <td className="px-4 py-3 font-semibold">{booking.payment_status || '-'} / {booking.payment_method || '-'}</td>
                          <td className="px-4 py-3 font-black">{money(booking.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState label="No bookings found for this customer." />}
              </div>
            </Panel>

            <div className="grid gap-5 xl:grid-cols-2">
              <Panel title="Payments" subtitle={`${payments.length} payment records`}>
                <div className="divide-y divide-slate-100">
                  {payments.length ? payments.map((payment) => (
                    <article className="grid gap-2 p-4 sm:grid-cols-[1fr_120px_120px] sm:items-center" key={payment.id}>
                      <div>
                        <p className="font-black">{payment.payment_no || `Payment #${payment.id}`}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{dateTime(payment.paid_at)} | {payment.method || '-'}</p>
                      </div>
                      <StatusBadge>{payment.status || 'Pending'}</StatusBadge>
                      <p className="font-black sm:text-right">{money(payment.amount)}</p>
                    </article>
                  )) : <div className="p-4"><EmptyState label="No payment records found." /></div>}
                </div>
              </Panel>

              <Panel title="Wallet Transactions" subtitle={`${transactions.length} transaction records`}>
                <div className="divide-y divide-slate-100">
                  {transactions.length ? transactions.map((transaction) => (
                    <article className="grid gap-2 p-4 sm:grid-cols-[1fr_90px_110px] sm:items-center" key={transaction.id}>
                      <div>
                        <p className="font-black">{transaction.transaction_no || transaction.type}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{transaction.booking_no || 'Wallet'} | Balance {money(transaction.balance_after)}</p>
                      </div>
                      <span className={`text-sm font-black ${transaction.direction === 'Credit' ? 'text-[#67B529]' : 'text-rose-700'}`}>{transaction.direction}</span>
                      <p className="font-black sm:text-right">{money(transaction.amount)}</p>
                    </article>
                  )) : <div className="p-4"><EmptyState label="No wallet transactions found." /></div>}
                </div>
              </Panel>
            </div>

            <Panel title="Saved Addresses" subtitle={`${addresses.length} saved addresses`}>
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {addresses.length ? addresses.map((address) => (
                  <article className="rounded-lg border border-slate-200 bg-white p-4" key={address.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{address.label || 'Address'}</p>
                      <StatusBadge>{address.status || 'Active'}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{[address.flat, address.street, address.city].filter(Boolean).join(', ') || '-'}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{address.contact_name || customer.name} | {address.mobile || customer.phone || '-'}</p>
                  </article>
                )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState label="No saved addresses found." /></div>}
              </div>
            </Panel>
          </>
        )}
      </section>
    </main>
  )
}

export default CustomerDetailsPage
