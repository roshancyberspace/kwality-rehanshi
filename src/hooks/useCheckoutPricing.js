import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCartTotal } from '../components/services/ServiceCartUtils'
import { frontendApi } from '../services/frontendApi'
import {
  buildCheckoutPricing,
  money,
  readStoredCoupon,
  readStoredTipAmount,
  writeStoredCoupon,
  writeStoredTipAmount,
} from '../utils/checkoutPricing'
import { useCartCheckout } from './useCartCheckout'

export function useCheckoutPricing(cart, customerId, knownCoupons = []) {
  const [appliedCoupon, setAppliedCouponState] = useState(() => readStoredCoupon())
  const [tipAmount, setTipAmountState] = useState(() => readStoredTipAmount())
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [applyingCouponCode, setApplyingCouponCode] = useState('')
  const { calculation, isLoading, error } = useCartCheckout(cart, customerId, appliedCoupon?.code)

  const cartSubtotal = useMemo(() => money(getCartTotal(cart || [])), [cart])
  const effectiveSubtotal = money(calculation?.subtotal ?? cartSubtotal)

  const setAppliedCoupon = useCallback((coupon) => {
    setAppliedCouponState(coupon)
    writeStoredCoupon(coupon)
  }, [])

  const setTipAmount = useCallback((amount) => {
    const normalized = Number(amount) > 0 ? Number(amount) : 0
    setTipAmountState(normalized)
    writeStoredTipAmount(normalized)
  }, [])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
  }, [setAppliedCoupon])

  const removeTip = useCallback(() => {
    setTipAmount(0)
  }, [setTipAmount])

  useEffect(() => {
    if (!appliedCoupon?.code || calculation == null) return undefined

    const nextDiscount = money(calculation.discount || 0)
    setAppliedCouponState((previous) => {
      if (!previous || previous.code !== appliedCoupon.code) return previous
      if (money(previous.discount || 0) === nextDiscount) return previous

      const next = { ...previous, discount: nextDiscount }
      writeStoredCoupon(next)
      return next
    })
  }, [appliedCoupon?.code, calculation])

  const pricing = useMemo(() => buildCheckoutPricing({
    subtotal: effectiveSubtotal,
    serviceFee: calculation?.service_fee ?? calculation?.tax ?? 0,
    discount: calculation?.discount ?? appliedCoupon?.discount ?? 0,
    tipAmount,
    walletApplied: calculation?.wallet_applied ?? 0,
  }), [appliedCoupon?.discount, calculation, effectiveSubtotal, tipAmount])

  const applyCoupon = useCallback(async (code) => {
    const normalizedCode = String(code || '').trim()
    if (!normalizedCode) {
      throw new Error('Enter a coupon code.')
    }

    if (effectiveSubtotal <= 0) {
      throw new Error('Add services to your cart before applying a coupon.')
    }

    setIsApplyingCoupon(true)
    setApplyingCouponCode(normalizedCode)

    try {
      const coupon = await frontendApi.applyCoupon(normalizedCode, effectiveSubtotal, knownCoupons, cart || [])
      setAppliedCoupon(coupon)
      return coupon
    } finally {
      setIsApplyingCoupon(false)
      setApplyingCouponCode('')
    }
  }, [cart, effectiveSubtotal, knownCoupons, setAppliedCoupon])

  return {
    appliedCoupon,
    applyCoupon,
    applyingCouponCode,
    calculation,
    error,
    isApplyingCoupon,
    isLoading,
    pricing,
    removeCoupon,
    removeTip,
    setAppliedCoupon,
    setTipAmount,
    tipAmount,
  }
}
