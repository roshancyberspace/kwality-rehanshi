import CouponSuccessBurst from './CouponSuccessBurst'

function formatCouponDescription(coupon) {
  const minimumOrder = Number(coupon.minimum_order || 0)
  const minimumText = minimumOrder > 0 ? `Min order Rs. ${minimumOrder}` : ''
  if (coupon.type === 'Percentage') {
    return `${coupon.value}% off${minimumText ? `. ${minimumText}` : ''}`
  }
  return `Flat Rs. ${coupon.value} off${minimumText ? `. ${minimumText}` : ''}`
}

function BillSummary({
  appliedCoupon,
  applyingCouponCode = '',
  availableCoupons = [],
  canPlaceBooking,
  canProceedToPayment,
  checkoutStep,
  couponCode,
  couponMessage,
  couponMessageType = '',
  discount,
  errorMessage,
  gstClaim = null,
  isApplyingCoupon = false,
  isLoggedIn,
  isPlacingBooking,
  onApplyCoupon,
  onCouponChange,
  onOpenProfile,
  onPlaceBooking,
  onProceedToPayment,
  onRemoveCoupon,
  onRemoveTip,
  onRequireLogin,
  serviceFee,
  showCouponSuccess = false,
  subtotal,
  payable,
  tipAmount = 0,
  wallet,
}) {
  const isPaymentStep = checkoutStep === 'payment'
  const isCartStep = checkoutStep === 'cart'
  const totalToPay = Number(payable) + Number(tipAmount || 0)
  const canApplyCoupon = Boolean(subtotal) && isPaymentStep
  const showCouponSection = !isCartStep
  const couponFeedbackClass = couponMessageType === 'error'
    ? 'text-red-600'
    : couponMessageType === 'success'
      ? 'text-[#167634]'
      : 'text-blue-800'

  const content = (
    <>
      <h2 className="text-sm font-bold lg:text-[15px]">Bill details</h2>
      <div className="mt-1.5 grid gap-1 text-[13px]">
        <div className="flex justify-between"><span>Item total</span><span>Rs. {subtotal}</span></div>
        <div className="flex justify-between"><span>Service fee</span><span>Rs. {subtotal ? serviceFee : 0}</span></div>
        {!isCartStep && Number(discount) > 0 && (
          <div className="flex justify-between text-[#67B529]">
            <span className="flex items-center gap-2">
              {appliedCoupon?.code ? `Coupon (${appliedCoupon.code})` : 'Discount'}
              {onRemoveCoupon ? (
                <button className="text-[11px] font-semibold text-red-400 hover:text-red-600 hover:underline" onClick={onRemoveCoupon} type="button">
                  Remove
                </button>
              ) : null}
            </span>
            <span>- Rs. {discount}</span>
          </div>
        )}
        {Number(tipAmount) > 0 && (
          <div className="flex justify-between text-[#6338E0] font-semibold">
            <span className="flex items-center gap-2">
              Tip for professional
              {onRemoveTip ? (
                <button className="text-[11px] font-semibold text-red-400 hover:text-red-600 hover:underline" onClick={onRemoveTip} type="button">
                  Remove
                </button>
              ) : null}
            </span>
            <span>Rs. {tipAmount}</span>
          </div>
        )}
        <div className="border-t border-blue-100 pt-1.5 text-[15px] font-bold">
          <div className="flex justify-between"><span>To pay</span><span>Rs. {isCartStep ? Number(subtotal) + Number(subtotal ? serviceFee : 0) + Number(tipAmount || 0) : totalToPay}</span></div>
        </div>
        {gstClaim?.gstin ? (
          <div className="rounded-md border border-[#E8DFFF] bg-[#F7F3FF] px-2 py-1.5 text-[10px] font-semibold leading-4 text-[#5B2CC0]">
            GST invoice requested for {gstClaim.companyName || 'your business'} ({gstClaim.gstin}).
          </div>
        ) : null}
      </div>
      {showCouponSection && (
        <div className={`relative mt-2.5 overflow-hidden transition-colors ${
          showCouponSuccess ? 'animate-coupon-glow' : ''
        }`}>
          {showCouponSuccess ? <CouponSuccessBurst /> : null}
          <p className="relative z-[1] text-xs font-bold">Offer coupon</p>

          {/* Available coupons — tap row to apply (no second Apply button) */}
          <div className="relative z-[1] mt-1.5 hidden lg:block">
            {availableCoupons.length === 0 ? (
              <p className="mb-1.5 text-[11px] font-medium text-neutral-500">
                No listed offers — enter a code below if you have one.
              </p>
            ) : (
              <div className="mb-1.5 max-h-[140px] space-y-1 overflow-y-auto pr-0.5">
                {availableCoupons.map((coupon) => {
                  const isApplied = appliedCoupon?.code?.toLowerCase() === String(coupon.code).toLowerCase()
                  const isApplyingThis = isApplyingCoupon && applyingCouponCode?.toLowerCase() === String(coupon.code).toLowerCase()
                  return (
                    <button
                      key={coupon.code}
                      type="button"
                      disabled={!canApplyCoupon || isApplyingCoupon || isApplied}
                      onClick={() => onApplyCoupon?.(coupon.code)}
                      className={`flex w-full items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-left transition ${
                        isApplied
                          ? 'cursor-default border-[#67B529]/50 bg-[#F3FBED]'
                          : 'border-[#6338E0]/30 bg-white hover:border-[#6338E0]/60 hover:bg-[#FAF8FF] disabled:opacity-50'
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        isApplied
                          ? 'border-[#67B529] bg-[#67B529] text-white'
                          : 'border-neutral-300 bg-white'
                      }`}>
                        {isApplied ? (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isApplyingThis ? (
                          <span className="coupon-spinner scale-75" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold text-slate-900">
                          <span className="text-[#6338E0]">{coupon.code}</span>
                          <span className="font-semibold text-neutral-500"> · {coupon.type === 'Percentage' ? `${coupon.value}% off` : `Rs. ${coupon.value} off`}</span>
                        </span>
                        <span className="block truncate text-[10px] text-neutral-500 leading-snug">
                          {formatCouponDescription(coupon)}
                        </span>
                      </span>
                      {isApplied ? (
                        <span className="shrink-0 text-[10px] font-bold text-[#167634]">Applied</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="relative z-[1] flex h-8 gap-1.5">
            <input
              className="h-full min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[#6338E0] disabled:bg-slate-50"
              disabled={!canApplyCoupon || isApplyingCoupon}
              onChange={(event) => onCouponChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onApplyCoupon?.()
                }
              }}
              placeholder={canApplyCoupon ? 'Or enter code' : 'Available after address & slot'}
              value={couponCode}
            />
            <button
              className="h-full min-w-[64px] rounded-md bg-[#6338E0] px-3 text-xs font-bold text-white hover:bg-[#5229C0] disabled:bg-neutral-200 disabled:text-neutral-400"
              disabled={!canApplyCoupon || isApplyingCoupon || !String(couponCode || '').trim()}
              onClick={() => onApplyCoupon?.()}
              type="button"
            >
              {isApplyingCoupon && (!applyingCouponCode || applyingCouponCode.toLowerCase() === String(couponCode).trim().toLowerCase()) ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <span className="coupon-spinner" />
                </span>
              ) : 'Apply'}
            </button>
          </div>
          {couponMessage ? (
            <p className={`relative z-[1] mt-1 text-[11px] font-semibold ${couponFeedbackClass}`}>
              {couponMessage}
            </p>
          ) : null}
        </div>
      )}
      {wallet?.isVisible && (
        <div className={`mt-3 rounded-lg border p-2.5 text-xs lg:mt-3 lg:p-2.5 ${
          wallet.hasEnoughBalance ? 'border-[#67B529]/35 bg-[#EEF9E8] text-[#2F6412]' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <div className="flex justify-between gap-3 font-bold">
            <span>Wallet balance</span>
            <span>Rs. {Number(wallet.balance || 0).toLocaleString('en-IN')}</span>
          </div>
          {wallet.payable != null ? (
            <div className="mt-1 flex justify-between gap-3 font-semibold opacity-90">
              <span>Payable amount</span>
              <span>Rs. {Number(wallet.payable || 0).toLocaleString('en-IN')}</span>
            </div>
          ) : null}
          {!wallet.hasEnoughBalance && (
            <p className="mt-1.5 font-bold uppercase tracking-wide">Insufficient balance</p>
          )}
          {wallet.message && wallet.hasEnoughBalance ? (
            <p className="mt-1.5 font-semibold">{wallet.message}</p>
          ) : null}
          {wallet.message && !wallet.hasEnoughBalance && wallet.message !== 'Insufficient balance' ? (
            <p className="mt-1 font-semibold">{wallet.message}</p>
          ) : null}
        </div>
      )}
      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 lg:mt-3">
          {errorMessage}
        </div>
      )}
    </>
  )

  const actionButton = (
    <button
      className="w-full rounded-xl bg-[#6338E0] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#5229C0] disabled:bg-neutral-200 disabled:text-neutral-400 shadow-md shadow-[#6338E0]/25 transition active:scale-[0.98] lg:mt-0 lg:rounded-lg lg:py-2.5 lg:text-[13px]"
      disabled={isLoggedIn && (isPaymentStep ? !canPlaceBooking : !canProceedToPayment)}
      onClick={!isLoggedIn ? onRequireLogin : isPaymentStep ? onPlaceBooking : onProceedToPayment}
      type="button"
    >
      {!isLoggedIn
        ? 'Login to book'
        : isPaymentStep
          ? isPlacingBooking ? 'Processing payment...' : 'Pay & place booking'
          : checkoutStep === 'cart'
            ? 'Select slots'
            : 'Continue to payment'}
    </button>
  )

  return (
    <>
      {!isPaymentStep && (
        <aside className="rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5 shadow-xs mb-6 lg:hidden">
          {content}
        </aside>
      )}

      {isPaymentStep && (errorMessage || (wallet?.isVisible && !wallet.hasEnoughBalance)) && (
        <div className="lg:hidden mb-12 px-1 space-y-2">
          {wallet?.isVisible && !wallet.hasEnoughBalance && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-extrabold text-red-700 shadow-2xs uppercase tracking-wide">
              Insufficient balance
            </div>
          )}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-extrabold text-red-700 shadow-2xs">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200/80 p-3.5 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider block leading-tight">To pay</span>
          <p className="text-base sm:text-lg font-black text-slate-900 truncate">Rs. {totalToPay}</p>
        </div>
        <div className="flex-1 max-w-[240px]">
          {actionButton}
        </div>
      </div>

      <aside className="hidden h-fit max-h-[calc(100vh-8rem)] self-start overflow-y-auto rounded-xl border border-neutral-200/90 bg-white p-3.5 shadow-sm lg:sticky lg:top-28 lg:block">
        {content}
        <div className="mt-2.5">
          {actionButton}
        </div>
      </aside>
    </>
  )
}

export default BillSummary
