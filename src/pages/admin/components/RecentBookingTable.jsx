import { ActionButton, Panel, StatusBadge } from '../../../components/admin/AdminUI'
import { splitBookingDate } from '../config/adminNav'

function RecentBookingTable({ rows, onViewAll }) {
  return (
    <Panel
      action={<ActionButton onClick={onViewAll}>View all bookings</ActionButton>}
      title="Recent Bookings"
      subtitle="Latest booking requests that need quick admin review."
    >
      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <th className="w-16 px-4 py-4 text-center">S.No.</th>
              <th className="px-5 py-4">Booking</th>
              <th className="px-5 py-4">Customer & Service</th>
              <th className="px-5 py-4">Schedule</th>
              <th className="px-5 py-4">Professional</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((booking, index) => (
              <tr className="transition hover:bg-[#EEF9E8]/40" key={booking.id}>
                <td className="px-4 py-4 align-top text-center font-extrabold text-slate-500">{index + 1}</td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-slate-800">{booking.id}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{booking.payment}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-slate-800">{booking.customer}</p>
                  <p className="mt-1 font-semibold text-slate-600">{booking.service}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{booking.address}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-slate-800">{splitBookingDate(booking.date).date}</p>
                  <p className="mt-1 text-xs font-bold text-[#67B529]">{splitBookingDate(booking.date).time}</p>
                </td>
                <td className="px-5 py-4 align-top font-bold text-slate-700">{booking.professional}</td>
                <td className="px-5 py-4 align-top font-black text-slate-800">{booking.amount}</td>
                <td className="px-5 py-4 align-top"><StatusBadge>{booking.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export default RecentBookingTable

