import { useEffect, useState } from 'react'
import { InvoiceView } from '../../components/profile/OrderHistorySection'
import { frontendApi } from '../../services/frontendApi'

function InvoicePage({ invoiceId }) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchInvoice = async () => {
      try {
        setLoading(true)
        setError(false)
        const response = await frontendApi.getInvoice(invoiceId)
        if (mounted && response?.data) {
          setPayload(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch invoice:', err)
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    if (invoiceId) {
      fetchInvoice()
    }
    
    return () => {
      mounted = false
    }
  }, [invoiceId])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F6FBFF] p-4 text-[#003F86]">
        <div className="w-full max-w-md rounded-lg border border-blue-100 bg-white p-5 text-center shadow-sm">
          <h1 className="text-2xl font-black">Loading invoice...</h1>
        </div>
      </main>
    )
  }

  if (error || !payload?.order) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F6FBFF] p-4 text-[#003F86]">
        <div className="w-full max-w-md rounded-lg border border-blue-100 bg-white p-5 text-center shadow-sm">
          <h1 className="text-2xl font-black">Invoice not available</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-blue-700">
            Invoice cannot be generated for cancelled or rejected bookings, or this invoice could not be opened.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#003F86]">
      <style>
        {`
          @page { size: A4; margin: 6mm; }
          @media print {
            html, body { width: 210mm; min-height: 297mm; }
            body { margin: 0; background: #ffffff; }
            .invoice-toolbar { display: none !important; }
            .invoice-print-shell { padding: 0 !important; }
            .invoice-sheet { width: 198mm !important; max-width: none !important; }
          }
        `}
      </style>
      <div className="invoice-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-blue-100 bg-white px-4 py-3 print:hidden">
        <p className="font-black">Invoice - {payload.order.id}</p>
        <button className="rounded-md bg-[#003F86] px-4 py-2 text-sm font-bold text-white hover:bg-[#0054A6]" onClick={() => window.print()} type="button">
          Download / Print
        </button>
      </div>
      <InvoiceView invoiceSettings={payload.appSettings || {}} order={payload.order} />
    </main>
  )
}

export default InvoicePage
