const getPaymentMethodMeta = (key, label, walletBalance = 0) => {
  const k = key.toLowerCase()
  const l = (label || '').toLowerCase()

  if (k === 'razorpay' || k.includes('upi') || l.includes('razorpay') || l.includes('upi')) {
    return {
      category: 'UPI',
      labelOverride: 'UPI / QR',
      subtitle: 'Pay instantly via GPay, PhonePe, Paytm or scan QR',
      badge: (
        <span className="font-bold text-[11px] text-[#0A8043] bg-[#E8F8EE] border border-[#A7E7C2]/70 px-2.5 py-1 rounded-md uppercase tracking-wide shadow-2xs">
          Most Popular
        </span>
      ),
      icon: (
        <span className="font-black text-xs text-[#0A8043] bg-[#E8F8EE] border border-[#A7E7C2]/70 px-1.5 py-0.5 rounded shadow-2xs tracking-tight">
          UPI
        </span>
      ),
    }
  }

  if (k.includes('card') || l.includes('card')) {
    return {
      category: 'Cards',
      labelOverride: label || 'Add new card',
      subtitle: 'All Credit and Debit cards accepted',
      icon: <span className="text-xl leading-none">💳</span>,
    }
  }

  if (k.includes('netbanking') || k.includes('nb') || l.includes('netbanking')) {
    return {
      category: 'Netbanking',
      labelOverride: label || 'Netbanking',
      subtitle: 'All major Indian banks supported',
      icon: <span className="text-xl leading-none">🏛️</span>,
    }
  }

  if (k === 'cod' || k.includes('cash') || l.includes('cash') || l.includes('after service')) {
    return {
      category: 'Pay after service',
      labelOverride: label || 'Pay after service with cash / online',
      subtitle: 'Pay directly to technician upon completion',
      icon: <span className="text-xl leading-none">💵</span>,
    }
  }

  if (k.includes('wallet') || l.includes('wallet')) {
    const balanceValue = Number(walletBalance || 0)
    return {
      category: 'Wallet',
      labelOverride: label || 'Rehanshi Wallet',
      subtitle: 'Pay seamlessly using wallet credit',
      badge: (
        <span className={`font-extrabold text-xs border px-2.5 py-1 rounded-lg shadow-2xs inline-flex items-center gap-1.5 ${
          balanceValue > 0
            ? 'text-[#0A8043] bg-[#E8F8EE] border-[#A7E7C2]/80'
            : 'text-red-700 bg-red-50 border-red-200'
        }`}>
          <span>👛 Balance: ₹{balanceValue.toLocaleString('en-IN')}</span>
        </span>
      ),
      icon: <span className="text-xl leading-none">👛</span>,
    }
  }

  return {
    category: label || 'Online Payment',
    labelOverride: label || 'Digital Payment',
    subtitle: 'Secure digital payment gateways',
    icon: <span className="text-xl leading-none">🔒</span>,
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
    <div className="bg-[#F4F5F8] border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs divide-y-[10px] sm:divide-y-[12px] divide-[#F4F5F8]">
      {paymentMethods.map((method) => {
        const meta = getPaymentMethodMeta(method.key, method.label, walletBalance)
        const isCodDisabled = hasNextDaySlot && (method.key === 'cod' || method.key.includes('cash'))
        const isSelected = paymentMode === method.key && !isCodDisabled
        const displayLabel = meta.labelOverride || method.label
        const isWalletMethod = /wallet/i.test(String(method.key || '')) || /wallet/i.test(String(method.label || ''))

        return (
          <div key={method.key} className="bg-white px-4 py-4 sm:px-5 sm:py-5 lg:px-4 lg:py-4 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3 lg:mb-2">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg lg:text-[15px] text-slate-900 tracking-tight">
                  {meta.category}
                </h3>
                {isCodDisabled && (
                  <p className="text-xs font-semibold text-[#C97B1A] mt-0.5">
                    Unavailable due to scheduled future date
                  </p>
                )}
              </div>
              {meta.badge && !isCodDisabled && (
                <div className="shrink-0 self-center">
                  {meta.badge}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isCodDisabled}
              onClick={() => !isCodDisabled && onPaymentModeChange(method.key)}
              className={`w-full text-left py-2 sm:py-2.5 rounded-xl transition duration-150 flex items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-[#F4EFFF]/40 px-3 -mx-3 rounded-2xl ring-1 ring-[#6338E0]/40 my-0.5'
                  : isCodDisabled
                    ? 'opacity-45 cursor-not-allowed grayscale-[50%]'
                    : 'hover:bg-neutral-50 active:scale-[0.99] px-2 -mx-2'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                  isSelected ? 'border-[#D5C5FD] bg-white' : 'border-neutral-200/85 bg-[#FAFAFC]'
                }`}>
                  {meta.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm sm:text-base font-bold truncate ${
                    isSelected ? 'text-[#6338E0]' : isCodDisabled ? 'text-neutral-400' : 'text-slate-800'
                  }`}>
                    {displayLabel}
                  </p>
                  {meta.subtitle && (
                    <p className={`text-xs font-medium truncate mt-0.5 ${
                      isCodDisabled ? 'text-neutral-400' : 'text-neutral-500'
                    }`}>
                      {meta.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center pl-2">
                {isSelected ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6338E0] text-white shadow-xs">
                    <svg className="h-3.5 w-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <svg className="w-5 h-5 text-neutral-400 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>

            {isWalletMethod && isSelected && !hasEnoughWalletBalance ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700">
                <p className="uppercase tracking-wide">Insufficient balance</p>
                <p className="mt-1 font-semibold normal-case text-red-600/90">
                  Wallet Rs. {Number(walletBalance || 0).toLocaleString('en-IN')} is less than payable Rs. {Number(payableAmount || 0).toLocaleString('en-IN')}.
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
