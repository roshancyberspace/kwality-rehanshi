import { useState } from 'react'
import { frontendApi } from '../../services/frontendApi'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildBackendUrl, buildFrontendUrl } from '../../config/urls'
import { getBookedLineItems, getExtraLineItems } from '../../utils/bookingItems'

const closedStatuses = ['Cancelled', 'Rejected', 'Completed', 'Refunded']

const statusTone = (status = '') => {
  const normalized = status.toLowerCase()
  if (normalized.includes('cancel') || normalized.includes('reject')) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (normalized.includes('complete') || normalized.includes('assigned')) return 'border-[#67B529]/35 bg-[#EEF9E8] text-[#67B529]'
  if (normalized.includes('pending')) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-neutral-200 bg-[#F6FBFF] text-blue-900'
}

const canCancelOrder = (status = '') => !closedStatuses.some((closedStatus) => status.toLowerCase().includes(closedStatus.toLowerCase()))
const canReorderOrder = (status = '') => status.toLowerCase().includes('complete')
const publicAssetUrl = (path) => {
  return buildBackendUrl(path)
}

const settingValue = (settings, key, fallback = '') => settings?.invoice?.[key]?.value || fallback
const settingEnabled = (settings, key, fallback = false) => {
  const setting = settings?.invoice?.[key]
  if (!setting) return fallback
  return setting.value === true || setting.value === 1 || ['1', 'true', 'yes', 'on'].includes(String(setting.value).toLowerCase())
}
const money = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const shortDate = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const numberWordsUnder1000 = (number) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (number < 20) return ones[number]
  if (number < 100) return [tens[Math.floor(number / 10)], ones[number % 10]].filter(Boolean).join(' ')
  return [ones[Math.floor(number / 100)], 'Hundred', numberWordsUnder1000(number % 100)].filter(Boolean).join(' ')
}

const amountInWords = (value) => {
  let amount = Math.round(Number(value || 0))
  if (!amount) return 'ZERO RUPEES ONLY'
  const parts = []
  const crore = Math.floor(amount / 10000000)
  amount %= 10000000
  const lakh = Math.floor(amount / 100000)
  amount %= 100000
  const thousand = Math.floor(amount / 1000)
  amount %= 1000
  if (crore) parts.push(`${numberWordsUnder1000(crore)} Crore`)
  if (lakh) parts.push(`${numberWordsUnder1000(lakh)} Lakh`)
  if (thousand) parts.push(`${numberWordsUnder1000(thousand)} Thousand`)
  if (amount) parts.push(numberWordsUnder1000(amount))
  return `${parts.join(' ')} RUPEES ONLY`.toUpperCase()
}

const DownloadIcon = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
)

const StarRatingButton = ({ onClick, rating }) => {
  const value = Math.round(Number(rating) || 0)
  if (!value) return null

  return (
    <button
      aria-label="View feedback"
      className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
      onClick={onClick}
      title="View feedback"
      type="button"
    >
      <span className="text-xs leading-none text-amber-500">{'★'.repeat(Math.min(5, value))}</span>
      <span>{rating}</span>
    </button>
  )
}

const getOrderReview = (order, reviews = []) => {
  const metadataReview = order.metadata?.reviews?.customer_to_vendor
  if (metadataReview) return metadataReview
  return reviews.find((review) => String(review.orderId || '') === String(order.id) || (!review.orderId && review.service === order.service))
}

const reviewText = (review) => {
  if (!review) return ''
  if (typeof review === 'string') return review
  return review.text || review.feedback || review.comment || ''
}

const reviewRating = (review) => {
  if (!review || typeof review !== 'object') return ''
  return review.rating || review.stars || ''
}

const invoiceStorageKey = (orderId) => `customerInvoice:${orderId}`
const invoiceFileName = (order) => `invoice-${String(order.bookingNo || order.id || 'booking').replace(/[^a-z0-9-]/gi, '-')}.html`

const buildInvoiceDocument = (markup, title = 'Invoice') => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @page { size: A4; margin: 6mm; }
      .invoice-print-shell { padding: 8px 10px; }
      .invoice-sheet { max-width: 794px; }
      @media print {
        html, body { width: 210mm; min-height: 297mm; }
        body { margin: 0; }
        .invoice-toolbar { display: none !important; }
        .invoice-print-shell { padding: 0 !important; }
        .invoice-sheet { width: 198mm !important; max-width: none !important; }
      }
    </style>
  </head>
  <body class="bg-white">
    ${markup}
  </body>
</html>`

export const downloadInvoiceFile = async (bookingId) => {
  try {
    const response = await frontendApi.getInvoice(bookingId)
    const payload = response?.data?.data || response?.data
    if (!payload?.order) throw new Error('Invoice not found')
    
    const markup = renderToStaticMarkup(<InvoiceView invoiceSettings={payload.appSettings || {}} order={payload.order} />)
    const blob = new Blob([buildInvoiceDocument(markup, `Invoice - ${payload.order.id}`)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = invoiceFileName(payload.order)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download invoice:', error)
    alert('Failed to download invoice. Please try again.')
  }
}

const formatKolkataTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

const timelineItems = (order) => {
  const metadata = order.metadata || {}
  const times = metadata.status_times || {}
  const work = metadata.work || {}
  return [
    ['Booking placed', times.pending_approval || order.createdAt],
    ['Accepted', times.accepted],
    ['Professional assigned', times.professional_assigned],
    ['Vendor accepted', times.vendor_accepted],
    ['OTP verified', times.otp_verified || work.otp_verified_at],
    ['Service started', times.started || work.started_at],
    ['Completed', times.completed || work.completed_at],
  ].filter(([label, time]) => time || label === 'Booking placed')
}

const DetailTile = ({ label, value, helper }) => (
  <div className="rounded-md border border-blue-100 bg-white p-4">
    <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">{label}</p>
    <p className="mt-2 break-words font-black text-[#003F86]">{value || 'Not available'}</p>
    {helper ? <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">{helper}</p> : null}
  </div>
)

export function InvoiceView({ invoiceSettings, order }) {
  const bookedItems = getBookedLineItems(order)
  const extraItems = getExtraLineItems(order)
  const extraTotal = extraItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)

  if (bookedItems.length === 0) {
    const serviceName = order.service_name || order.service || 'Service'
    bookedItems.push({
      name: serviceName,
      price: Math.max(0, Number(order.amount || 0) - extraTotal),
      quantity: 1,
      hsn: '-',
    })
  }

  const subtotal = bookedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + extraTotal
  const serviceFee = Number(order.metadata?.service_fee || 0)
  const discount = Number(order.metadata?.coupon?.discount || order.metadata?.discount || 0)
  const discountLabel = order.metadata?.coupon?.code ? `Discount (${order.metadata.coupon.code})` : 'Discount'
  const taxable = Math.max(0, subtotal + serviceFee - discount)
  const hasCustomerGstin = Boolean(order.metadata?.gstin)
  const sellerGstEnabled = settingEnabled(invoiceSettings, 'show_gst_on_invoice', false)
  // Customer GSTIN is billing identity only — do not invent 18% tax unless seller GST invoice is enabled
  // or the paid amount already includes a tax delta.
  const existingTax = Math.max(0, Number(order.amount || 0) - taxable)
  const showGstTax = sellerGstEnabled || existingTax > 0
  const tax = showGstTax ? (existingTax > 0 ? existingTax : taxable * 0.18) : 0
  const total = taxable + tax
  const showTaxInvoice = showGstTax || hasCustomerGstin
  const prefix = settingValue(invoiceSettings, 'invoice_prefix', 'INV')
  const qrImage = publicAssetUrl(settingValue(invoiceSettings, 'qr_image'))
  const signatureImage = publicAssetUrl(settingValue(invoiceSettings, 'signature_image'))
  const itemColumnCount = showGstTax ? 8 : 7

  const renderRow = (item, index, startIndex) => {
    const quantity = item.quantity
    const rate = item.price || taxable || 0
    const itemTaxable = rate * quantity
    const isFirst = index === 0 && startIndex === 0
    return (
      <tr className="align-top" key={`${item.name}-${index}`}>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-center">{startIndex + index + 1}</td>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 font-semibold">{item.name}</td>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-center">{item.hsn || '-'}</td>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-center">{quantity} NOS</td>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-right">{money(rate)}</td>
        <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-right">{money(itemTaxable)}</td>
        {showGstTax ? <td className="border-r-2 border-[#003F86] px-1.5 py-1 text-right">{money(isFirst ? tax : 0)}</td> : null}
        <td className="px-1.5 py-1 text-right">{money(itemTaxable + (showGstTax && isFirst ? tax : 0))}</td>
      </tr>
    )
  }

  return (
    <div className="invoice-print-shell bg-white px-3 py-2 text-[#003F86]">
      <div className="invoice-sheet mx-auto w-full max-w-[794px] border-2 border-[#003F86] bg-white text-[10.5px] leading-[1.18]">
        <div className="grid grid-cols-[1fr_310px] gap-4 border-b-2 border-[#003F86] p-3">
          <div>
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-blue-950">{settingValue(invoiceSettings, 'business_name', 'KwalityCareServices')}</h2>
            <p className="mt-1 inline-block bg-[#67B529] px-3 py-1 text-sm font-semibold text-white">{settingValue(invoiceSettings, 'tagline', 'Home services and professional care')}</p>
            <p className="mt-2 max-w-md text-xs font-medium leading-4">{settingValue(invoiceSettings, 'address', 'Business address not configured')}</p>
          </div>
          <div className="grid content-start gap-1 text-[11px] leading-4">
            {[
              ['Mobile', settingValue(invoiceSettings, 'phone', '-')],
              ['Web', settingValue(invoiceSettings, 'website', '-')],
              ['Email', settingValue(invoiceSettings, 'email', '-')],
            ].map(([label, value]) => (
              <p className="flex justify-end gap-1 whitespace-nowrap" key={label}>
                <span className="font-semibold">{label} :</span>
                <span className="font-medium">{value}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b-2 border-[#003F86] text-sm font-semibold">
          <p className="p-1.5">PAN : <span className="font-medium">{settingValue(invoiceSettings, 'pan_number', '-')}</span></p>
          <p className="border-x-2 border-[#003F86] p-1.5 text-center text-lg font-semibold">{showTaxInvoice ? 'TAX INVOICE' : 'INVOICE'}</p>
          <p className="p-1.5 text-right text-xs">ORIGINAL FOR RECIPIENT</p>
        </div>
        <div className="grid grid-cols-[1.1fr_1.4fr] border-b-2 border-[#003F86]">
          <div className="border-r-2 border-[#003F86]">
            <p className="border-b border-[#003F86] py-1 text-center font-bold">Customer Detail</p>
            {[
              ['M/S', order.metadata?.company_name || order.customer_name || order.customerName || order.metadata?.customer_name || 'Customer'],
              ['Address', order.address],
              ['Phone', order.customer_phone || order.customerPhone || order.metadata?.customer_phone || '-'],
              ...(hasCustomerGstin ? [['GSTIN', order.metadata?.gstin || '-']] : []),
              ['Place of Supply', order.metadata?.place_of_supply || '-'],
            ].map(([label, value]) => (
              <div className="grid grid-cols-[88px_1fr] px-2 py-0.5" key={label}>
                <span className="font-semibold">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-5 p-2 text-[10.5px]">
            {[
              ['Invoice No.', `${prefix}-${order.bookingNo || order.id}`],
              ['Invoice Date', shortDate(order.updatedAt || order.createdAt)],
              ['Booking No', order.bookingNo || order.id],
              ['Booking Date', shortDate(order.createdAt)],
              ['Payment', order.payment || 'Paid'],
              ...(sellerGstEnabled ? [['GST No.', settingValue(invoiceSettings, 'gst_number', '-')]] : []),
            ].map(([label, value]) => (
              <div className="grid grid-cols-[78px_1fr] py-0.5" key={label}>
                <span>{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b-2 border-[#003F86]">
              {['Sr. No.', 'Name of Product / Service', 'HSN / SAC', 'Qty', 'Rate', 'Taxable Value', ...(showGstTax ? ['Tax'] : []), 'Total'].map((head) => (
                <th className="border-r-2 border-[#003F86] px-1.5 py-1.5 font-semibold last:border-r-0" key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookedItems.map((item, index) => renderRow(item, index, 0))}
            
            {extraItems.length > 0 && (
              <>
                {extraItems.map((item, index) => renderRow(item, index, bookedItems.length))}
              </>
            )}
            <tr>{Array.from({ length: itemColumnCount }).map((_, index) => <td className={`${index === 0 ? 'h-20 ' : ''}${index < itemColumnCount - 1 ? 'border-r-2 border-[#003F86]' : ''}`} key={index} />)}</tr>
            <tr className="border-y-2 border-[#003F86] font-semibold">
              <td className="px-1.5 py-1.5 text-right" colSpan="5">Total</td>
              <td className="border-x-2 border-[#003F86] px-1.5 py-1.5 text-right">{money(subtotal)}</td>
              {showGstTax ? <td className="border-r-2 border-[#003F86] px-1.5 py-1.5 text-right">{money(tax)}</td> : null}
              <td className="px-1.5 py-1.5 text-right">{money(subtotal + (showGstTax ? tax : 0))}</td>
            </tr>
          </tbody>
        </table>
        <div className="grid grid-cols-[1.35fr_0.85fr] border-b-2 border-[#003F86]">
          <div className="border-r-2 border-[#003F86]">
            <p className="border-b-2 border-[#003F86] py-1.5 text-center font-semibold">Total in words</p>
            <p className="p-2 text-center text-xs font-medium">{amountInWords(total)}</p>
            <p className="border-y-2 border-[#003F86] py-1.5 text-center font-semibold">Bank Details</p>
            <div className="grid grid-cols-[1fr_120px] gap-3 p-2">
              <div className="grid gap-1 text-xs">
                {[
                  ['Name', settingValue(invoiceSettings, 'bank_name', '-')],
                  ['Branch', settingValue(invoiceSettings, 'bank_branch', '-')],
                  ['Acc. Number', settingValue(invoiceSettings, 'account_number', '-')],
                  ['IFSC', settingValue(invoiceSettings, 'ifsc', '-')],
                  ['UPI ID', settingValue(invoiceSettings, 'upi_id', '-')],
                ].map(([label, value]) => <p className="grid grid-cols-[100px_1fr]" key={label}><span>{label}</span><span>{value}</span></p>)}
              </div>
              <div className="text-center">{qrImage ? <img alt="Payment QR" className="mx-auto h-24 w-24 object-contain" src={qrImage} /> : <div className="grid h-24 w-24 place-items-center border border-[#003F86] text-xs">QR</div>}<p className="mt-1 font-semibold">Pay using UPI</p></div>
            </div>
            <p className="border-y-2 border-[#003F86] py-1.5 text-center font-semibold">Terms and Conditions</p>
            <p className="whitespace-pre-line p-2 text-[10.5px] leading-[1.2]">{settingValue(invoiceSettings, 'terms', '')}</p>
          </div>
          <div>
            <div className="grid border-b-2 border-[#003F86] text-xs font-semibold">
              <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5"><span>Subtotal</span><span className="text-right">{money(subtotal)}</span></p>
              {serviceFee > 0 ? <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5"><span>Service Fee</span><span className="text-right">{money(serviceFee)}</span></p> : null}
              {discount > 0 ? <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5 text-[#67B529]"><span>{discountLabel}</span><span className="text-right">- {money(discount)}</span></p> : null}
              <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5"><span>Payable Amount</span><span className="text-right">{money(taxable)}</span></p>
              {showGstTax ? <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5"><span>Add : GST</span><span className="text-right">{money(tax)}</span></p> : null}
              {showGstTax ? <p className="grid grid-cols-[1fr_92px] border-b border-[#003F86] px-2 py-1.5"><span>Total Tax</span><span className="text-right">{money(tax)}</span></p> : null}
              <p className="grid grid-cols-[1fr_92px] px-2 py-1.5 text-sm font-bold"><span>{showGstTax ? 'Total Amount After Tax' : 'Total Amount'}</span><span className="text-right">Rs. {money(total)}</span></p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] font-semibold">Certified that the particulars given above are true and correct.</p>
              <p className="mt-3 text-sm font-semibold">For {settingValue(invoiceSettings, 'business_name', 'KwalityCareServices')}</p>
              <div className="mt-5 grid min-h-24 place-items-center">
                {signatureImage ? <img alt="Signature" className="max-h-20 object-contain" src={signatureImage} /> : <p className="-rotate-12 text-xs font-medium text-blue-700">This is a computer generated invoice.</p>}
              </div>
              <p className="border-t-2 border-[#003F86] pt-1.5 text-[10px] font-semibold">Authorised Signatory</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t-2 border-[#003F86] px-3 py-2 text-[10.5px] font-semibold leading-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[430px]">{settingValue(invoiceSettings, 'footer_note', 'Thank you for shopping with us!')}</p>
          <p className="shrink-0 text-right">{settingValue(invoiceSettings, 'footer_note2', 'Power By-BrainTech Info Solutions')}</p>
        </div>
      </div>
    </div>
  )
}

export function OrderHistoryDetailView({
  order,
  onClose,
  onCancel,
  onReorder,
  onViewInvoice,
  canCancel,
  canReorder,
  canReview,
  reviewForm,
  setReviewForm,
  submitReview,
  canSubmitReview,
  hideCloseButton = false
}) {
  const bookedItems = getBookedLineItems(order)
  const extraItems = getExtraLineItems(order)
  const extraTotal = extraItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  const subtotal = bookedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + extraTotal
  const serviceFee = Number(order.metadata?.service_fee || 0)
  const discount = Number(order.metadata?.coupon?.discount || order.metadata?.discount || 0)
  const taxable = Math.max(0, subtotal + serviceFee - discount)
  
  const existingTax = Math.max(0, Number(order.amount || 0) - taxable)
  const total = taxable + existingTax

  return (
    <div className="w-full bg-white shadow-sm md:shadow-2xl md:rounded-lg flex flex-col max-h-[92vh] md:max-h-[85vh]">
      <div className="border-b border-slate-100 bg-white px-4 py-3 md:rounded-t-lg shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${statusTone(order.status)}`}>{order.status}</span>
            <h3 className="mt-2 break-words text-lg font-bold leading-snug text-[#003F86]">{order.service}</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{order.id} | {[order.date, order.time].filter(Boolean).join(' | ') || 'Schedule pending'}</p>
          </div>
          {!hideCloseButton && (
            <button className="px-2 py-0.5 text-base font-bold hover:bg-slate-50 text-slate-400" onClick={onClose} type="button">
              x
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Included Work & Items</p>
          <div className="flex flex-col">
            {[...bookedItems, ...extraItems].map((item, index) => (
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0" key={`${item.name}-${index}`}>
                <div className="flex gap-3 items-center min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                     {item.image ? <img alt={item.name} src={item.image} className="w-full h-full object-cover" /> : (
                       <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                     )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-[#003F86] block leading-snug truncate">{item.name}</span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5 block">Rs. {money(item.price)} × {item.quantity}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#003F86] whitespace-nowrap pl-2">Rs. {money(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Summary</p>
          <div className="grid gap-1.5 text-sm font-medium text-slate-600 bg-slate-50/70 rounded-lg px-3.5 py-3 border border-slate-100">
            <div className="flex justify-between items-center">
              <span>Item Total</span>
              <span className="text-slate-800 font-semibold">Rs. {money(subtotal)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between items-center">
                <span>Service Fee</span>
                <span className="text-slate-800 font-semibold">Rs. {money(serviceFee)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center text-[#67B529]">
                <span>Discount</span>
                <span className="font-semibold">- Rs. {money(discount)}</span>
              </div>
            )}
            {Number(order.tip_amount || order.metadata?.tip_amount || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span>Tip Amount</span>
                <span className="text-slate-800 font-semibold">Rs. {money(Number(order.tip_amount || order.metadata?.tip_amount || 0))}</span>
              </div>
            )}
            {existingTax > 0 && (
              <div className="flex justify-between items-center">
                <span>Taxes & Fees</span>
                <span className="text-slate-800 font-semibold">Rs. {money(existingTax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 text-sm font-bold text-[#003F86]">
              <span>Net Payable</span>
              <span>Rs. {money(total)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Payment Status</span>
              {order.payment?.toLowerCase().includes('paid') || order.payment?.toLowerCase().includes('online') ? (
                <span className="uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md tracking-wider text-[11px]">PAID</span>
              ) : (
                <span className="uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md tracking-wider text-[11px]">{order.payment || 'PENDING'}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Service Address</p>
          <p className="text-sm font-medium leading-relaxed text-slate-700">{order.address}</p>
        </div>

        {order.professional && !['Assigning soon', 'Pending'].includes(order.professional) && (
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
             <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm">
                {order.professional.charAt(0)}
             </div>
             <div>
               <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Professional</p>
               <p className="mt-0.5 text-sm font-semibold text-[#003F86]">{order.professional}</p>
             </div>
          </div>
        )}

        {canReview ? (
          <div className="rounded-lg border border-[#67B529]/20 bg-[#EEF9E8]/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-sm font-bold text-[#003F86]">Rate this service</p>
              <div className="ml-auto flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    aria-label={`${rating} star rating`}
                    className={`transition hover:scale-110 ${
                      rating <= Number(reviewForm.rating) ? 'text-amber-500' : 'text-blue-200'
                    }`}
                    key={rating}
                    onClick={() => setReviewForm((current) => ({ ...current, rating }))}
                    type="button"
                  >
                      <span className="text-xl">★</span>
                  </button>
                ))}
                <span className="text-sm font-bold text-[#67B529]">{reviewForm.rating} star</span>
              </div>
            </div>
            <textarea
              className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[#67B529]"
              onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
              placeholder="Write your feedback..."
              value={reviewForm.text}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-lg bg-[#003F86] px-4 py-2 text-xs font-bold text-white hover:bg-[#0054A6] disabled:bg-blue-100 transition-colors"
                disabled={!canSubmitReview}
                onClick={submitReview}
                type="button"
              >
                Submit Rating
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          {!hideCloseButton && (
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-slate-700" onClick={onClose} type="button">
              Close
            </button>
          )}
          {canCancel ? (
            <button
              className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
              onClick={onCancel}
              type="button"
            >
              Cancel Booking
            </button>
          ) : null}
          {canReorder ? (
            <button className="rounded-lg bg-[#003F86] px-4 py-2 text-xs font-bold text-white hover:bg-[#0054A6] transition-colors" onClick={onReorder} type="button">
              Reorder Service
            </button>
          ) : null}
          <button className="rounded-lg bg-[#67B529] px-4 py-2 text-xs font-bold text-white hover:bg-[#5CA827] transition-colors" onClick={onViewInvoice} type="button">
            View Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderHistorySection({ appSettings = {}, onCancelBooking, onReorder, onSubmitReview, orders, reviews = [], onSelectOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
  const getOrderItems = (order) => {
    if (order.items?.length) {
      return order.items.map((item) => {
        if (typeof item === 'string') return item
        return item?.name || item?.title || item?.service || ''
      }).filter(Boolean)
    }
    return order.service ? [order.service] : []
  }
  const displayOrders = orders
  const selectedDisplayOrder = selectedOrder
    ? displayOrders.find((order) => order.id === selectedOrder.id) || selectedOrder
    : null
  const recentOrders = displayOrders.slice(0, 2)
  const previousOrders = displayOrders

  const openInvoicePage = (order) => {
    window.open(buildFrontendUrl(`/invoice/${encodeURIComponent(order.id)}`), '_blank')
  }

  const cancelOrder = async () => {
    if (!selectedDisplayOrder || !canCancelOrder(selectedDisplayOrder.status)) return
    await onCancelBooking?.(selectedDisplayOrder)
    setSelectedOrder(null)
  }

  const reorder = (order) => {
    onReorder?.(order)
    setSelectedOrder(null)
  }

  const canReviewSelected = String(selectedDisplayOrder?.status || '').toLowerCase().includes('complete') && !getOrderReview(selectedDisplayOrder, reviews)
  const canSubmitReview = canReviewSelected && reviewForm.text.trim()

  const submitReview = async () => {
    if (!canSubmitReview) return
    await onSubmitReview?.({
      orderId: selectedDisplayOrder.id,
      rating: reviewForm.rating,
      text: reviewForm.text.trim(),
    }, selectedDisplayOrder)
    setReviewForm({ rating: 5, text: '' })
  }

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders and bookings</h2>
          <p className="mt-1 text-sm text-blue-700">Recent booking, booking details, and previous orders list.</p>
        </div>
        <p className="text-sm font-bold text-blue-700">{orders.length} total</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {recentOrders.map((order) => (
          <article className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={order.id}>
            <div className="h-1 bg-gradient-to-r from-emerald-600 via-[#003F86] to-neutral-300" />
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#67B529]">Recent booking</p>
                  <h3 className="mt-1 break-words text-base font-bold leading-snug text-[#003F86]">{order.service}</h3>
                  <p className="mt-1 text-sm font-medium text-blue-700">{order.id}</p>
                </div>
                <div className="grid shrink-0 justify-items-end gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusTone(order.status)}`}>{order.status}</span>
                  <button
                    aria-label="Download invoice"
                    className="grid h-8 w-8 place-items-center rounded-md border border-blue-200 text-blue-900 hover:bg-blue-50"
                    onClick={() => downloadInvoiceFile(order.id)}
                    title="Download invoice"
                    type="button"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                  <StarRatingButton onClick={() => setSelectedReview({ order, review: getOrderReview(order, reviews) })} rating={reviewRating(getOrderReview(order, reviews))} />
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-300">Schedule</p>
                  <p className="mt-0.5 font-semibold text-[#003F86]">{[order.date, order.time].filter(Boolean).join(' | ') || 'Schedule pending'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-blue-300">Amount</p>
                  <p className="mt-0.5 font-bold text-[#003F86]">Rs. {order.amount}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold uppercase text-blue-300">Address</p>
                  <p className="mt-0.5 line-clamp-2 font-medium leading-5 text-blue-900">{order.address}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="rounded-md bg-[#003F86] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0054A6]"
                  onClick={() => onSelectOrder ? onSelectOrder(order) : setSelectedOrder(order)}
                  type="button"
                >
                  View details
                </button>
                {order.status === 'Completed' && !getOrderReview(order, reviews) ? (
                  <button
                    className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                    onClick={() => onSelectOrder ? onSelectOrder(order) : setSelectedOrder(order)}
                    type="button"
                  >
                    Rate now
                  </button>
                ) : null}
                {canReorderOrder(order.status) ? (
                  <button
                    className="rounded-md border border-blue-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50"
                    onClick={() => reorder(order)}
                    type="button"
                  >
                    Reorder
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h3 className="text-base font-bold text-[#003F86]">All orders</h3>
          <p className="text-sm font-semibold text-slate-500">{previousOrders.length} orders</p>
        </div>

        <div className="grid gap-2.5">
          {previousOrders.map((order) => {
            const itemLabels = getOrderItems(order)
            const orderReview = getOrderReview(order, reviews)
            const rating = reviewRating(orderReview)
            const isCompleted = String(order.status || '').toLowerCase().includes('complete')
            const isCancelled = /cancel|reject/i.test(String(order.status || ''))

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex">
                  <div
                    className={`w-1 shrink-0 ${
                      isCompleted ? 'bg-[#67B529]' : isCancelled ? 'bg-rose-400' : 'bg-amber-400'
                    }`}
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-0">
                    <div className="min-w-0 flex-1 sm:pr-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusTone(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {order.date}{order.time ? ` · ${order.time}` : ''}
                        </span>
                        {rating ? (
                          <StarRatingButton
                            onClick={() => setSelectedReview({ order, review: orderReview })}
                            rating={rating}
                          />
                        ) : null}
                      </div>

                      <h4 className="mt-1.5 text-sm font-bold leading-snug text-[#003F86]">
                        {order.service}
                      </h4>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Booking ID: {order.id}
                      </p>

                      {itemLabels.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {itemLabels.slice(0, 3).map((label) => (
                            <span
                              key={label}
                              className="inline-flex max-w-[200px] truncate rounded-md border border-blue-100 bg-[#F6FBFF] px-2 py-0.5 text-[11px] font-semibold text-blue-800"
                              title={label}
                            >
                              {label}
                            </span>
                          ))}
                          {itemLabels.length > 3 ? (
                            <span className="inline-flex items-center rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              +{itemLabels.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 sm:w-[210px] sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-[#003F86]">
                          Rs. {order.amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:mt-2 sm:w-full sm:flex-col sm:items-stretch">
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-[#003F86] sm:text-center"
                          onClick={() => (onSelectOrder ? onSelectOrder(order) : setSelectedOrder(order))}
                          type="button"
                        >
                          View details
                        </button>
                        {isCompleted && !orderReview ? (
                          <button
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 sm:text-center"
                            onClick={() => (onSelectOrder ? onSelectOrder(order) : setSelectedOrder(order))}
                            type="button"
                          >
                            Rate now
                          </button>
                        ) : null}
                        {canReorderOrder(order.status) ? (
                          <button
                            className="rounded-lg bg-[#003F86] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0054A6] sm:text-center"
                            onClick={() => reorder(order)}
                            type="button"
                          >
                            Reorder
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {selectedDisplayOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#003F86]/45 p-4 animate-modal-fade">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg shadow-2xl animate-modal-slide">
            <OrderHistoryDetailView
              order={selectedDisplayOrder}
              onClose={() => setSelectedOrder(null)}
              onCancel={cancelOrder}
              onReorder={() => reorder(selectedDisplayOrder)}
              onViewInvoice={() => openInvoicePage(selectedDisplayOrder)}
              canCancel={canCancelOrder(selectedDisplayOrder.status)}
              canReorder={canReorderOrder(selectedDisplayOrder.status)}
              canReview={canReviewSelected}
              reviewForm={reviewForm}
              setReviewForm={setReviewForm}
              submitReview={submitReview}
              canSubmitReview={canSubmitReview}
            />
          </div>
        </div>
      ) : null}
      {selectedReview ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#003F86]/45 p-4 animate-modal-fade">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-2xl animate-modal-slide lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Customer feedback</h3>
                <p className="mt-1 text-sm font-semibold text-blue-700">{selectedReview.order.service} | {selectedReview.order.id}</p>
              </div>
              <button className="rounded-full border border-blue-200 px-3 py-1 text-lg font-black hover:bg-blue-50" onClick={() => setSelectedReview(null)} type="button">
                x
              </button>
            </div>
            <div className="mt-5 rounded-lg bg-[#F6FBFF] p-4">
              <p className="text-sm font-black text-amber-600">{'★'.repeat(Math.min(5, Math.round(Number(reviewRating(selectedReview.review)) || 0)))} <span className="text-[#003F86]">{reviewRating(selectedReview.review) || 'Submitted'} star</span></p>
              <p className="mt-3 text-sm font-semibold leading-6 text-blue-900">{reviewText(selectedReview.review) || 'Feedback text not available.'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default OrderHistorySection
