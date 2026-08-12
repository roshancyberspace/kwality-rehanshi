import { Panel } from '../../../components/admin/AdminUI'
import ReportMetricCard from '../components/ReportMetricCard'

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
const number = (value) => Number(value || 0).toLocaleString('en-IN')

const PALETTE = [
  { face: '#3B82F6', side: '#2563EB', top: '#60A5FA', soft: '#DBEAFE' },
  { face: '#10B981', side: '#059669', top: '#34D399', soft: '#D1FAE5' },
  { face: '#F59E0B', side: '#D97706', top: '#FBBF24', soft: '#FEF3C7' },
  { face: '#EF4444', side: '#DC2626', top: '#F87171', soft: '#FEE2E2' },
  { face: '#8B5CF6', side: '#7C3AED', top: '#A78BFA', soft: '#EDE9FE' },
  { face: '#06B6D4', side: '#0891B2', top: '#22D3EE', soft: '#CFFAFE' },
  { face: '#EC4899', side: '#DB2777', top: '#F472B6', soft: '#FCE7F3' },
  { face: '#64748B', side: '#475569', top: '#94A3B8', soft: '#F1F5F9' },
]

function EmptyState({ label = 'No report data yet' }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80">
      <p className="text-sm font-medium text-slate-400">{label}</p>
    </div>
  )
}

function ChartPanel({ children, subtitle, title }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{subtitle}</p>
        <h3 className="mt-0.5 text-[15px] font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function LegendList({ rows, valueFormatter = number }) {
  return (
    <div className="grid gap-1.5">
      {(rows || []).map((row, index) => {
        const color = PALETTE[index % PALETTE.length]
        return (
          <div className="flex items-center justify-between gap-2 text-[12px]" key={row.label}>
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color.face }} />
              <span className="truncate font-medium">{row.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-700">{valueFormatter(row.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Soft area + thin line; expects chronological left→right */
function AreaTrendChart({ rows, valueFormatter = money, accent = PALETTE[0] }) {
  const chronological = rows || []
  if (!chronological.length) return <EmptyState />

  const max = Math.max(...chronological.map((row) => Number(row.value) || 0), 1)
  const padX = 8
  const padTop = 12
  const padBottom = 28
  const width = 100
  const height = 100
  const plotW = width - padX * 2
  const plotH = height - padTop - padBottom

  const coords = chronological.map((row, index) => {
    const x = chronological.length === 1
      ? width / 2
      : padX + (index / (chronological.length - 1)) * plotW
    const y = padTop + plotH - ((Number(row.value) || 0) / max) * plotH
    return { x, y, ...row }
  })

  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPoints = [
    `${coords[0].x},${padTop + plotH}`,
    ...coords.map((p) => `${p.x},${p.y}`),
    `${coords[coords.length - 1].x},${padTop + plotH}`,
  ].join(' ')

  const total = chronological.reduce((sum, row) => sum + Number(row.value || 0), 0)
  const gradientId = `trend-${accent.face.replace('#', '')}`

  return (
    <div>
      <svg className="h-44 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent.face} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent.face} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padTop + plotH * t}
            y2={padTop + plotH * t}
            stroke="#E2E8F0"
            strokeWidth="0.4"
            strokeDasharray="1.5 1.5"
          />
        ))}
        <polygon fill={`url(#${gradientId})`} points={areaPoints} />
        <polyline
          fill="none"
          points={linePoints}
          stroke={accent.face}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r="1.4"
            fill="#fff"
            stroke={accent.face}
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div
        className="mt-1 grid gap-1 text-[10px] font-medium text-slate-400"
        style={{ gridTemplateColumns: `repeat(${Math.min(chronological.length, 7)}, minmax(0, 1fr))` }}
      >
        {chronological.map((row) => (
          <span className="truncate text-center" key={row.label}>{row.label}</span>
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold tabular-nums text-slate-700">
        Total {valueFormatter(total)}
      </p>
    </div>
  )
}

/** Perspective 3D donut */
function Donut3D({ rows, valueFormatter = number }) {
  const safeRows = (rows || []).filter((row) => Number(row.value) > 0)
  if (!safeRows.length) return <EmptyState />

  const total = safeRows.reduce((sum, row) => sum + Number(row.value || 0), 0)
  const cx = 90
  const cy = 52
  const rx = 58
  const ry = 28
  const depth = 12
  const innerScale = 0.55

  const polar = (angle, radiusX = rx, radiusY = ry, centerY = cy) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: cx + radiusX * Math.cos(rad),
      y: centerY + radiusY * Math.sin(rad),
    }
  }

  const ringPath = (startAngle, endAngle, outer = true) => {
    const orx = outer ? rx : rx * innerScale
    const ory = outer ? ry : ry * innerScale
    const start = polar(startAngle, orx, ory)
    const end = polar(endAngle, orx, ory)
    const large = endAngle - startAngle > 180 ? 1 : 0
    return { start, end, orx, ory, large }
  }

  let cursor = 0
  const segments = safeRows.map((row, index) => {
    const sweep = (Number(row.value) / total) * 360
    const start = cursor
    const end = cursor + Math.max(sweep, 0.8)
    cursor += sweep
    return { ...row, start, end, color: PALETTE[index % PALETTE.length] }
  })

  const segmentPath = (seg) => {
    const outer = ringPath(seg.start, seg.end, true)
    const inner = ringPath(seg.end, seg.start, false)
    return [
      `M ${outer.start.x} ${outer.start.y}`,
      `A ${outer.orx} ${outer.ory} 0 ${outer.large} 1 ${outer.end.x} ${outer.end.y}`,
      `L ${polar(seg.end, rx * innerScale, ry * innerScale).x} ${polar(seg.end, rx * innerScale, ry * innerScale).y}`,
      `A ${inner.orx} ${inner.ory} 0 ${outer.large} 0 ${polar(seg.start, rx * innerScale, ry * innerScale).x} ${polar(seg.start, rx * innerScale, ry * innerScale).y}`,
      'Z',
    ].join(' ')
  }

  const wallPath = (seg) => {
    const a = polar(seg.start)
    const b = polar(seg.end)
    const a2 = polar(seg.start, rx, ry, cy + depth)
    const b2 = polar(seg.end, rx, ry, cy + depth)
    const large = seg.end - seg.start > 180 ? 1 : 0
    // Only draw front-facing wall (lower half of ellipse)
    const mid = (seg.start + seg.end) / 2
    if (mid < 90 || mid > 270) return null
    return [
      `M ${a.x} ${a.y}`,
      `A ${rx} ${ry} 0 ${large} 1 ${b.x} ${b.y}`,
      `L ${b2.x} ${b2.y}`,
      `A ${rx} ${ry} 0 ${large} 0 ${a2.x} ${a2.y}`,
      'Z',
    ].join(' ')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
      <div className="relative mx-auto w-full max-w-[220px]">
        <svg className="h-[150px] w-full" viewBox="0 0 180 100">
          <ellipse cx={cx} cy={cy + depth} fill="#E2E8F0" opacity="0.55" rx={rx} ry={ry} />
          {segments.map((seg) => {
            const wall = wallPath(seg)
            return wall ? (
              <path key={`${seg.label}-wall`} d={wall} fill={seg.color.side} opacity="0.9" />
            ) : null
          })}
          {segments.map((seg) => (
            <path
              key={seg.label}
              d={segmentPath(seg)}
              fill={seg.color.face}
              stroke="#fff"
              strokeWidth="0.8"
            />
          ))}
          <ellipse
            cx={cx}
            cy={cy}
            fill="#fff"
            opacity="0.35"
            rx={rx * innerScale * 0.92}
            ry={ry * innerScale * 0.92}
          />
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            className="fill-slate-700"
            style={{ fontSize: '9px', fontWeight: 600 }}
          >
            {number(total)}
          </text>
        </svg>
      </div>
      <LegendList rows={safeRows} valueFormatter={valueFormatter} />
    </div>
  )
}

/** Isometric 3D column chart */
function Column3DChart({ rows, valueFormatter = money, maxBars = 6 }) {
  const safeRows = (rows || []).slice(0, maxBars).filter((row) => Number(row.value) >= 0)
  if (!safeRows.length) return <EmptyState />

  const max = Math.max(...safeRows.map((row) => Number(row.value) || 0), 1)
  const depthX = 10
  const depthY = 6
  const barW = 22
  const gap = 14
  const baseY = 118
  const chartH = 90
  const startX = 28
  const width = startX + safeRows.length * (barW + gap) + depthX + 20

  return (
    <div>
      <svg className="h-48 w-full" viewBox={`0 0 ${Math.max(width, 220)} 150`}>
        <line x1="18" y1={baseY} x2={width - 8} y2={baseY} stroke="#E2E8F0" strokeWidth="1" />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="18"
            x2={width - 8}
            y1={baseY - chartH * t}
            y2={baseY - chartH * t}
            stroke="#F1F5F9"
            strokeWidth="1"
          />
        ))}

        {safeRows.map((row, index) => {
          const color = PALETTE[index % PALETTE.length]
          const h = Math.max(6, (Number(row.value) / max) * chartH)
          const x = startX + index * (barW + gap)
          const y = baseY - h
          const face = `M ${x} ${y} L ${x + barW} ${y} L ${x + barW} ${baseY} L ${x} ${baseY} Z`
          const top = `M ${x} ${y} L ${x + depthX} ${y - depthY} L ${x + barW + depthX} ${y - depthY} L ${x + barW} ${y} Z`
          const side = `M ${x + barW} ${y} L ${x + barW + depthX} ${y - depthY} L ${x + barW + depthX} ${baseY - depthY} L ${x + barW} ${baseY} Z`

          return (
            <g key={row.label}>
              <path d={side} fill={color.side} />
              <path d={face} fill={color.face} />
              <path d={top} fill={color.top} />
              <text
                x={x + barW / 2}
                y={baseY + 14}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: '8px', fontWeight: 500 }}
              >
                {String(row.label).length > 10 ? `${String(row.label).slice(0, 9)}…` : row.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 grid gap-1">
        {safeRows.map((row, index) => (
          <div className="flex items-center justify-between gap-2 text-[11px]" key={row.label}>
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: PALETTE[index % PALETTE.length].face }} />
              <span className="truncate font-medium">{row.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-slate-700">{valueFormatter(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Soft ranked bars — multi-color, not heavy */
function RankedBarChart({ rows, valueFormatter = money }) {
  const safeRows = rows || []
  if (!safeRows.length) return <EmptyState />
  const max = Math.max(...safeRows.map((row) => Number(row.value) || 0), 1)

  return (
    <div className="grid gap-2.5">
      {safeRows.map((row, index) => {
        const color = PALETTE[index % PALETTE.length]
        const pct = Math.max(4, (Number(row.value) / max) * 100)
        return (
          <div className="grid gap-1" key={row.label}>
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="min-w-0 truncate font-medium text-slate-600">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-700">{valueFormatter(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color.face}, ${color.top})`,
                  boxShadow: `0 1px 0 ${color.side}`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Funnel-style status chart */
function FunnelChart({ rows }) {
  const safeRows = [...(rows || [])].sort((a, b) => Number(b.value) - Number(a.value))
  if (!safeRows.length) return <EmptyState />
  const max = Math.max(...safeRows.map((row) => Number(row.value) || 0), 1)
  const total = safeRows.reduce((sum, row) => sum + Number(row.value || 0), 0)

  return (
    <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
      <div className="flex flex-col items-center gap-1.5 py-1">
        {safeRows.map((row, index) => {
          const color = PALETTE[index % PALETTE.length]
          const width = 40 + (Number(row.value) / max) * 60
          return (
            <div
              key={row.label}
              className="relative flex h-9 items-center justify-center text-[11px] font-semibold text-white"
              style={{
                width: `${width}%`,
                minWidth: '42%',
                background: `linear-gradient(180deg, ${color.top}, ${color.face} 55%, ${color.side})`,
                clipPath: 'polygon(6% 0, 94% 0, 100% 100%, 0 100%)',
                boxShadow: `0 3px 0 ${color.side}`,
              }}
              title={`${row.label}: ${row.value}`}
            >
              <span className="drop-shadow-sm">{number(row.value)}</span>
            </div>
          )
        })}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Total bookings · {number(total)}</p>
        <LegendList rows={safeRows} />
      </div>
    </div>
  )
}

function ReportsView({ analytics, dashboardStats, reportsPayload }) {
  const stats = reportsPayload?.stats || {}
  const charts = reportsPayload?.charts || {}

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ...dashboardStats,
            ['Payment Records', Number(stats.payment_records || 0), 'Rows in payments table'],
            ['Ledger Revenue', money(analytics.ledgerRevenue || stats.ledger_revenue), 'Booking ledger gross'],
            ['Cash Collected', money(analytics.cashCollected || stats.cash_collected), 'Vendor COD collection'],
            ['Pending Withdrawals', money(analytics.withdrawalPending || stats.withdrawal_pending), 'Awaiting admin action'],
          ].map(([label, value, helper], index) => (
            <ReportMetricCard helper={helper} index={index} key={label} label={label} value={value} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel subtitle="Daily gross" title="Revenue Trend">
          <AreaTrendChart rows={charts.revenue_trend} accent={PALETTE[0]} />
        </ChartPanel>
        <ChartPanel subtitle="Daily volume" title="Booking Trend">
          <AreaTrendChart rows={charts.booking_trend} valueFormatter={number} accent={PALETTE[1]} />
        </ChartPanel>

        <ChartPanel subtitle="Amount split" title="Payment Methods">
          <Donut3D rows={charts.payment_methods} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Operational funnel" title="Booking Status">
          <FunnelChart rows={charts.booking_statuses} />
        </ChartPanel>

        <ChartPanel subtitle="Top services" title="Service Revenue">
          <Column3DChart rows={charts.service_revenue} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Vendor share" title="Vendor Earnings">
          <Column3DChart rows={charts.vendor_revenue} valueFormatter={money} />
        </ChartPanel>

        <ChartPanel subtitle="Platform fee" title="Commission By Vendor">
          <RankedBarChart rows={charts.commission_by_vendor} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Wallet ledger" title="Wallet Transaction Flow">
          <Column3DChart rows={charts.wallet_flow} valueFormatter={money} maxBars={5} />
        </ChartPanel>

        <ChartPanel subtitle="Withdrawals" title="Payout Status">
          <Donut3D rows={charts.payout_status} valueFormatter={money} />
        </ChartPanel>
        <ChartPanel subtitle="Available balance" title="Vendor Wallet Balances">
          <RankedBarChart rows={charts.wallet_balances} valueFormatter={money} />
        </ChartPanel>
      </div>
    </div>
  )
}

export default ReportsView
