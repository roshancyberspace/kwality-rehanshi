import { Panel } from '../../../components/admin/AdminUI'
import ReportMetricCard from '../components/ReportMetricCard'

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
const number = (value) => Number(value || 0).toLocaleString('en-IN')

const dateKey = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const groupSum = (rows, labelGetter, valueGetter = () => 1) => Object.values(rows.reduce((groups, row) => {
  const label = labelGetter(row) || 'Unknown'
  groups[label] = groups[label] || { label, value: 0 }
  groups[label].value += Number(valueGetter(row) || 0)
  return groups
}, {}))

const topRows = (rows, limit = 8) => rows.slice().sort((a, b) => b.value - a.value).slice(0, limit)
const latestRows = (rows, limit = 10) => rows.slice(-limit)

function BarChart({ rows, valueFormatter = number }) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div className="grid gap-1" key={row.label}>
          <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-600">
            <span className="min-w-0 truncate">{row.label}</span>
            <span>{valueFormatter(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#67B529]" style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {!rows.length && <p className="text-sm font-semibold text-slate-500">No report data available yet.</p>}
    </div>
  )
}

function DonutChart({ rows, valueFormatter = number }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1
  let offset = 25
  const colors = ['#0054A6', '#67B529', '#f59e0b', '#e11d48', '#0054A6', '#003F86']

  return (
    <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
      <svg className="h-36 w-36" viewBox="0 0 42 42">
        <circle cx="21" cy="21" fill="transparent" r="15.915" stroke="#e2e8f0" strokeWidth="7" />
        {rows.map((row, index) => {
          const dash = (row.value / total) * 100
          const segment = (
            <circle
              cx="21"
              cy="21"
              fill="transparent"
              key={row.label}
              r="15.915"
              stroke={colors[index % colors.length]}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
              strokeWidth="7"
            />
          )
          offset -= dash
          return segment
        })}
        <text className="fill-slate-900 text-[6px] font-black" textAnchor="middle" x="21" y="22">{number(total)}</text>
      </svg>
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div className="flex items-center justify-between gap-3 text-sm font-semibold" key={row.label}>
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="font-black text-slate-900">{valueFormatter(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ rows, valueFormatter = money }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100
    const y = 94 - ((row.value / max) * 82)
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <svg className="h-52 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polyline fill="none" points={points} stroke="#0054A6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {rows.map((row, index) => {
          const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100
          const y = 94 - ((row.value / max) * 82)
          return <circle cx={x} cy={y} fill="#fff" key={row.label} r="2.2" stroke="#0054A6" strokeWidth="1.5" />
        })}
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-black text-slate-400 sm:grid-cols-7">
        {rows.map((row) => <span className="truncate" key={row.label}>{row.label}</span>)}
      </div>
      <p className="mt-2 text-sm font-black text-slate-900">{valueFormatter(rows.reduce((sum, row) => sum + row.value, 0))}</p>
    </div>
  )
}

function ChartPanel({ children, subtitle, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase text-slate-400">{subtitle}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function ReportsView({ analytics, dashboardStats, datasets }) {
  const bookings = datasets.Bookings || []
  const payments = datasets.Payments || []
  const ledgers = datasets['Booking Ledger'] || []
  const wallets = datasets['Vendor Wallet'] || []
  const transactions = datasets['Wallet Transactions'] || []
  const payouts = datasets.Payouts || []
  const revenueTrend = latestRows(groupSum(bookings.filter((booking) => ['Paid', 'Cash'].includes(booking.payment_status) || booking.status === 'Completed'), (booking) => dateKey(booking.updated_at || booking.scheduled_at || booking.created_at), (booking) => booking.amount), 10)
  const bookingTrend = latestRows(groupSum(bookings, (booking) => dateKey(booking.created_at || booking.scheduled_at)), 10)
  const paymentMethods = topRows(groupSum(bookings, (booking) => booking.payment_method || booking.payment_status || 'Pending', (booking) => booking.amount), 6)
  const bookingStatuses = topRows(groupSum(bookings, (booking) => booking.status || 'Pending'), 8)
  const serviceRevenue = topRows(groupSum(bookings, (booking) => booking.service_name, (booking) => booking.amount), 8)
  const vendorRevenue = topRows(groupSum(ledgers, (ledger) => ledger.partner_name, (ledger) => ledger.vendor_amount), 8)
  const commissionByVendor = topRows(groupSum(ledgers, (ledger) => ledger.partner_name, (ledger) => ledger.commission), 8)
  const walletFlow = topRows(groupSum(transactions, (row) => row.type || row.direction, (row) => row.amount), 8)
  const payoutStatus = topRows(groupSum(payouts, (payout) => payout.status || 'Pending', (payout) => Number(payout.pending || 0) + Number(payout.paid || 0)), 6)
  const walletBalances = topRows(groupSum(wallets, (wallet) => wallet.partner_name, (wallet) => wallet.vendor_payable), 8)

  return (
    <div className="grid gap-5">
      <Panel title="Reports" subtitle="Payment, booking, wallet and payout analytics generated from live API records.">
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ...dashboardStats,
            ['Payment Records', payments.length, 'Rows in payments table'],
            ['Ledger Revenue', money(analytics.ledgerRevenue), 'Booking ledger gross'],
            ['Cash Collected', money(analytics.cashCollected), 'Vendor COD collection'],
            ['Pending Withdrawals', money(analytics.withdrawalPending), 'Awaiting admin action'],
          ].map(([label, value, helper], index) => (
            <ReportMetricCard helper={helper} index={index} key={label} label={label} value={value} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel subtitle="Daily gross" title="Revenue Trend">
          <LineChart rows={revenueTrend} />
        </ChartPanel>
        <ChartPanel subtitle="Daily volume" title="Booking Trend">
          <LineChart rows={bookingTrend} valueFormatter={number} />
        </ChartPanel>
        <ChartPanel subtitle="Amount split" title="Payment Methods">
          <DonutChart rows={paymentMethods} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Operational funnel" title="Booking Status">
          <DonutChart rows={bookingStatuses} />
        </ChartPanel>
        <ChartPanel subtitle="Top services" title="Service Revenue">
          <BarChart rows={serviceRevenue} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Vendor share" title="Vendor Earnings">
          <BarChart rows={vendorRevenue} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Platform fee" title="Commission By Vendor">
          <BarChart rows={commissionByVendor} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Wallet ledger" title="Wallet Transaction Flow">
          <BarChart rows={walletFlow} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Withdrawals" title="Payout Status">
          <DonutChart rows={payoutStatus} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Available balance" title="Vendor Wallet Balances">
          <BarChart rows={walletBalances} valueFormatter={money} />
        </ChartPanel>
      </div>
    </div>
  )
}

export default ReportsView
