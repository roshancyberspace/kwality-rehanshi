const getPaymentMethodMeta = (key, label, walletBalance = 0) => {
  const k = key.toLowerCase()
  const l = (label || '').toLowerCase()

  if (k === 'razorpay' || k.includes('upi') || l.includes('razorpay') || l.includes('upi')) {
    return {
      labelOverride: 'UPI / QR',
      subtitle: 'Pay instantly via GPay, PhonePe, Paytm or scan QR',
      badge: (
        <span className="font-bold text-[10px] text-[#0A8043] bg-[#E8F8EE] border border-[#A7E7C2]/70 px-1.5 py-0.5 rounded uppercase tracking-wide">
          Most Popular
        </span>
      ),
      icon: (
        <span className="font-black text-[10px] text-[#0A8043] bg-[#E8F8EE] border border-[#A7E7C2]/70 px-1 py-0.5 rounded tracking-tight">
          UPI
        </span>
      ),
    }
  }

  if (k.includes('card') || l.includes('card')) {
    return {
      labelOverride: label || 'Add new card',
      subtitle: 'All Credit and Debit cards accepted',
      icon: <span className="text-lg leading-none">💳</span>,
    }
  }

  if (k.includes('netbanking') || k.includes('nb') || l.includes('netbanking')) {
    return {
      labelOverride: label || 'Netbanking',
      subtitle: 'All major Indian banks supported',
      icon: <span className="text-lg leading-none">🏛️</span>,
    }
  }

  if (k === 'cod' || k.includes('cash') || l.includes('cash') || l.includes('after service')) {
    return {
      labelOverride: label || 'Pay after service',
      subtitle: 'Pay directly to technician upon completion',
      icon: <span className="text-lg leading-none">💵</span>,
    }
  }

  if (k.includes('wallet') || l.includes('wallet')) {
    const balanceValue = Number(walletBalance || 0)
    const balanceText = balanceValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })
    return {
      labelOverride: label || 'Wallet',
      subtitle: 'Pay seamlessly using wallet credit',
      badge: (
        <span className={`font-bold text-[10px] border px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
          balanceValue > 0
            ? 'text-[#0A8043] bg-[#E8F8EE] border-[#A7E7C2]/80'
            : 'text-red-700 bg-red-50 border-red-200'
        }`}>
          Balance: Rs.{balanceText}
        </span>
      ),
      icon: <span className="text-lg leading-none">👛</span>,
    }
  }

  return {
    labelOverride: label || 'Digital Payment',
    subtitle: 'Secure digital payment gateways',
    icon: <span className="text-lg leading-none">🔒</span>,
  }
}

function ServiceSlotPayment({
  appSettings = {},
  onPaymentModeChange,
  paymentMode,
  hasNextDaySlot,
  payableAmount = 0,
  walletBalance = 0,
}) {
  const paymentSettings = appSettings.payment_methods || {}
  const fallbackPaymentMethods = [
    ['razorpay', 'UPI / QR'],
    ['wallet', 'Wallet'],
    ['cod', 'Pay after service'],
  ]

  const configuredPaymentMethods = Object.entries(paymentSettings)
    .map(([key, setting]) => ({
      enabled: setting !== false && setting?.enabled !== false && setting !== '0',
      key,
      label: setting?.label || setting?.value || key.replace(/_/g, ' '),
    }))

  const paymentMethods = (configuredPaymentMethods.length
    ? configuredPaymentMethods
    : fallbackPaymentMethods.map(([key, label]) => ({ enabled: true, key, label })))
    .filter((method) => method.enabled)

  const hasEnoughWalletBalance = Number(walletBalance || 0) >= Number(payableAmount || 0)

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-xs divide-y divide-neutral-100">
      {paymentMethods.map((method) => {
        const meta = getPaymentMethodMeta(method.key, method.label, walletBalance)
        const isCodDisabled = hasNextDaySlot && (method.key === 'cod' || method.key.includes('cash'))
        const isSelected = paymentMode === method.key && !isCodDisabled
        const displayLabel = meta.labelOverride || method.label
        const isWalletMethod = /wallet/i.test(String(method.key || '')) || /wallet/i.test(String(method.label || ''))

        return (
          <div key={method.key} className="px-3 py-1.5 sm:px-3.5">
            <button
              type="button"
              disabled={isCodDisabled}
              onClick={() => !isCodDisabled && onPaymentModeChange(method.key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition duration-150 ${
                isSelected
                  ? 'bg-[#F4EFFF]/50 ring-1 ring-[#6338E0]/45'
                  : isCodDisabled
                    ? 'cursor-not-allowed opacity-45 grayscale-[50%]'
                    : 'hover:bg-neutral-50 active:scale-[0.99]'
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                isSelected ? 'border-[#D5C5FD] bg-white' : 'border-neutral-200/85 bg-[#FAFAFC]'
              }`}>
                {meta.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`truncate text-[13px] font-bold ${
                    isSelected ? 'text-[#6338E0]' : isCodDisabled ? 'text-neutral-400' : 'text-slate-800'
                  }`}>
                    {displayLabel}
                  </p>
                  {meta.badge && !isCodDisabled ? meta.badge : null}
                </div>
                {meta.subtitle ? (
                  <p className={`mt-0.5 truncate text-[11px] font-medium ${
                    isCodDisabled ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
                    {meta.subtitle}
                  </p>
                ) : null}
                {isCodDisabled ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-[#C97B1A]">
                    Unavailable for scheduled future date
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 pl-1">
                {isSelected ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6338E0] text-white">
                    <svg className="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <svg className="h-4 w-4 text-neutral-400 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>

            {isWalletMethod && isSelected && !hasEnoughWalletBalance ? (
              <div className="mb-1 mt-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700">
                <p className="uppercase tracking-wide">Insufficient balance</p>
                <p className="mt-0.5 font-semibold normal-case text-red-600/90">
                  Wallet Rs. {Number(walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} is less than payable Rs. {Number(payableAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}.
                  Please add money or choose another payment method.
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default ServiceSlotPayment
