const reportCardStyles = [
  { bg: 'bg-[#EEF9E8]', icon: 'text-[#67B529]', value: 'text-[#67B529]', ring: 'ring-[#67B529]/15', path: 'M12 3v18M17 7H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6' },
  { bg: 'bg-sky-50', icon: 'text-sky-600', value: 'text-sky-700', ring: 'ring-sky-100', path: 'M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700', ring: 'ring-amber-100', path: 'M10.3 3.7 2.9 16.5A2 2 0 0 0 4.6 19.5h14.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01' },
  { bg: 'bg-[#EEF9E8]', icon: 'text-[#67B529]', value: 'text-[#67B529]', ring: 'ring-[#67B529]/15', path: 'm20 6-11 11-5-5' },
  { bg: 'bg-[#EEF9E8]', icon: 'text-[#67B529]', value: 'text-[#67B529]', ring: 'ring-[#67B529]/15', path: 'M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z' },
  { bg: 'bg-teal-50', icon: 'text-teal-600', value: 'text-teal-700', ring: 'ring-teal-100', path: 'M9 6V4h6v2M4 8h16v11H4ZM4 12h16M10 12v2h4v-2' },
  { bg: 'bg-rose-50', icon: 'text-rose-600', value: 'text-rose-700', ring: 'ring-rose-100', path: 'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z' },
  { bg: 'bg-cyan-50', icon: 'text-cyan-600', value: 'text-cyan-700', ring: 'ring-cyan-100', path: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h6M9 16h4' },
]

function ReportMetricCard({ helper, index, label, value }) {
  const style = reportCardStyles[index % reportCardStyles.length]

  return (
    <article className={`rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm ring-1 ${style.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-400">{helper}</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-700">{label}</h3>
        </div>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${style.bg} ${style.icon}`}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d={style.path} />
          </svg>
        </span>
      </div>
      <p className={`mt-2.5 text-xl font-semibold tracking-tight tabular-nums ${style.value}`}>{value}</p>
    </article>
  )
}

export default ReportMetricCard
