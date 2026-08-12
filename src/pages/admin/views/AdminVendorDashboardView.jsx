import { useEffect, useMemo, useState } from 'react'
import { Panel } from '../../../components/admin/AdminUI'
import VendorDashboardPage from '../../vendor/VendorDashboardPage'
import { adminApi } from '../../../services/adminApi'
import { notify } from '../../../utils/feedback'
import { readRows } from '../utils/formatters'

function AdminVendorDashboardView({ appSettings = {} }) {
  const [partners, setPartners] = useState([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false
    setIsLoading(true)
    adminApi.list('/partners', { per_page: 'all', all: 1, lite: 1, options: 1, limit: 500 })
      .then((response) => {
        if (ignore) return
        const rows = readRows(response)
        setPartners(rows)
        setSelectedPartnerId((current) => current || String(rows[0]?.id || ''))
      })
      .catch((error) => {
        if (!ignore) setMessage(error.message)
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!message) return

    notify(message, { tone: 'error' })
  }, [message])

  const selectedPartner = useMemo(
    () => partners.find((partner) => String(partner.id) === String(selectedPartnerId)) || partners[0],
    [partners, selectedPartnerId],
  )

  return (
    <Panel>
      <div className="grid gap-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block md:min-w-80">
            <span className="text-sm font-semibold text-slate-700">Select vendor</span>
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529]"
              disabled={isLoading || !partners.length}
              onChange={(event) => setSelectedPartnerId(event.target.value)}
              value={selectedPartnerId}
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.business_name || partner.name} - {partner.kyc_status || 'KYC'} - {partner.status || 'Status'}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm font-medium text-slate-500">
            {isLoading ? 'Loading vendors...' : `${partners.length} vendors available`}
          </div>
        </div>

        {selectedPartner ? (
          <VendorDashboardPage
            appSettings={appSettings}
            authenticatedVendor={selectedPartner}
            embedded
            onBackHome={() => {}}
            onOpenAdmin={() => {}}
            onOpenBecomeProvider={() => {}}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
            No vendor found. Add partners first.
          </div>
        )}
      </div>
    </Panel>
  )
}

export default AdminVendorDashboardView
