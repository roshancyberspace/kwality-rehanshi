import { ActionButton, Modal } from '../../../components/admin/AdminUI'
import { buildBackendUrl } from '../../../config/urls'
import { formatDateTime } from '../utils/formatters'

function countCard(label, value, tone = 'slate') {
  const tones = {
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    green: 'bg-[#EEF9E8] text-[#2E7D32] border-[#2E7D32]/20',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  }

  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${tones[tone]}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-0.5 text-xl font-black">{value ?? 0}</p>
    </div>
  )
}

function NotificationReportModal({ isResending, onClose, onResend, report }) {
  if (!report) return null

  const notification = report.notification || {}
  const counts = report.counts || {}
  const remaining = report.remaining || 0
  const deliveries = report.deliveries || []

  return (
    <Modal maxWidth="max-w-2xl" onClose={onClose} title="Notification send report">
      <div className="flex flex-col gap-3.5">
        {/* Header Info */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <p className="text-sm font-black text-[#003F86]">{notification.title}</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notification.message}</p>
          
          {notification.image ? (
            <div className="mt-2.5">
              <img
                alt="Notification media"
                className="max-h-20 w-auto max-w-[200px] rounded-md border border-slate-200 bg-white object-contain p-1 shadow-2xs"
                src={/^https?:\/\//i.test(notification.image) ? notification.image : buildBackendUrl(notification.image)}
              />
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5">
              {notification.channel}
            </span>
            <span>·</span>
            <span>{notification.audience}</span>
            {notification.city && (
              <>
                <span>·</span>
                <span>{notification.city}</span>
              </>
            )}
            {notification.metadata?.screen && (
              <>
                <span>·</span>
                <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5">
                  Route: {notification.metadata.screen}
                  {notification.metadata.action_type ? ` (${notification.metadata.action_type})` : ''}
                </span>
              </>
            )}
            {notification.sent_at && (
              <>
                <span>·</span>
                <span className="text-slate-500 font-medium">
                  Sent: {formatDateTime(notification.sent_at)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats Count Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {countCard('Targeted', counts.targeted)}
          {countCard('Sent', counts.sent, 'green')}
          {countCard('Failed', counts.failed, 'rose')}
          {countCard('Skipped', counts.skipped, 'amber')}
        </div>

        {/* Deliveries Table with Scroll */}
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-700">Delivery Recipients ({deliveries.length})</p>
          <div className="max-h-52 overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 font-black text-slate-600 shadow-2xs">
                <tr>
                  <th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Error / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((row) => (
                  <tr className="hover:bg-slate-50/60 transition-colors" key={row.id}>
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.recipient_name || `#${row.recipient_id}`}</td>
                    <td className="px-3 py-2 text-slate-600">{row.contact || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize ${
                        row.status === 'Sent' || row.status === 'sent'
                          ? 'bg-[#EEF9E8] text-[#2E7D32]'
                          : row.status === 'Failed' || row.status === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-rose-600">{row.error || '—'}</td>
                  </tr>
                ))}
                {!deliveries.length && (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                      No delivery rows yet. Save with status Sent to deliver.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <ActionButton onClick={onClose} type="button">Close</ActionButton>
          <ActionButton
            disabled={!remaining || isResending}
            isLoading={isResending}
            onClick={onResend}
            tone="primary"
            type="button"
          >
            Resend remaining ({remaining})
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}

export default NotificationReportModal
