import { DataTable, Panel, StatsCard, StatusBadge } from '../../../components/admin/AdminUI'
import { bookingStatusSummary } from '../config/adminNav'
import { moduleConfigs } from '../config/adminModules'
import { recordMatchesSearch } from '../utils/formatters'

function DashboardView({ dashboardStats, datasets, globalSearch, makeColumns }) {
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
          rows={(datasets.Bookings || []).filter((booking) => recordMatchesSearch(booking, globalSearch)).slice(0, 6)}
        />
      </Panel>
      <Panel title="Booking Status Summary">
        <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:gap-3 sm:p-5 xl:grid-cols-3">
          {bookingStatusSummary.map(([status]) => {
            const count = (datasets.Bookings || []).filter((booking) => booking.status === status).length
            return (
              <div className="rounded-xl border border-[#67B529]/20 bg-[#F6FBFF] p-4" key={status}>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge>{status}</StatusBadge>
                  <span className="text-2xl font-black text-slate-800">{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

export default DashboardView

