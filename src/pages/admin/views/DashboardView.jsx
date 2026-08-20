import { DataTable, Panel, StatsCard, StatusBadge } from '../../../components/admin/AdminUI'
import { moduleConfigs } from '../config/adminModules'
import { recordMatchesSearch } from '../utils/formatters'

function DashboardView({ dashboardPayload, dashboardStats, datasets, globalSearch, makeColumns }) {
  const statusCounts = dashboardPayload?.status_counts || {}
  const statusEntries = Object.entries(statusCounts)
  const recentBookings = dashboardPayload?.recent_bookings || datasets.Bookings || []

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {dashboardStats.map(([label, value, helper], index) => (
          <StatsCard
            accent={index % 2 === 0 ? 'from-[#003F86] to-[#67B529]' : 'from-[#67B529] to-[#5CA827]'}
            helper={helper}
            key={label}
            label={label}
            value={value}
          />
        ))}
      </section>
      <Panel title="Recent Bookings" subtitle="Latest booking records from database.">
        <DataTable
          columns={makeColumns(moduleConfigs.Bookings).slice(0, 7)}
          rows={recentBookings.filter((booking) => recordMatchesSearch(booking, globalSearch)).slice(0, 6)}
        />
      </Panel>
      <Panel title="Booking Status Summary">
        <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:gap-3 sm:p-5 xl:grid-cols-3">
          {statusEntries.length ? statusEntries.map(([status, count]) => (
            <div className="rounded-xl border border-[#67B529]/20 bg-[#F6FBFF] p-4" key={status}>
              <div className="flex items-center justify-between gap-3">
                <StatusBadge>{status || 'Unknown'}</StatusBadge>
                <span className="text-2xl font-black text-slate-800">{Number(count || 0)}</span>
              </div>
            </div>
          )) : (
            <p className="col-span-full text-sm font-semibold text-slate-500">No bookings yet.</p>
          )}
        </div>
      </Panel>
    </>
  )
}

export default DashboardView
