import { ActionButton, Modal } from '../../../components/admin/AdminUI'
import { buildBackendUrl } from '../../../config/urls'

function countCard(label, value, tone = 'slate') {
  const tones = {
    slate: 'bg-slate-50 text-slate-800',
    green: 'bg-[#EEF9E8] text-[#2E7D32]',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-800',
  }

  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value ?? 0}</p>
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
    <Modal onClose={onClose} title="Notification send report">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-black text-[#003F86]">{notification.title}</p>
          <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
          {notification.image ? (
            <img
              alt=""
              className="mt-3 max-h-40 rounded-lg object-cover"
              src={/^https?:\/\//i.test(notification.image) ? notification.image : buildBackendUrl(notification.image)}
            />
          ) : null}
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {notification.channel} · {notification.audience}
            {notification.city ? ` · ${notification.city}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {countCard('Targeted', counts.targeted)}
          {countCard('Sent', counts.sent, 'green')}
          {countCard('Failed', counts.failed, 'rose')}
          {countCard('Skipped', counts.skipped, 'amber')}
        </div>

        <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((row) => (
                <tr className="border-t border-slate-100" key={row.id}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.recipient_name || `#${row.recipient_id}`}</td>
                  <td className="px-3 py-2 text-slate-600">{row.contact || '—'}</td>
                  <td className="px-3 py-2 font-bold capitalize">{row.status}</td>
                  <td className="px-3 py-2 text-rose-600">{row.error || ''}</td>
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

        <div className="flex justify-end gap-2">
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
