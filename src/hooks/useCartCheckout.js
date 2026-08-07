import { useEffect, useState } from 'react'
import { frontendApi } from '../services/frontendApi'

export function useCartCheckout(cart, customerId, couponCode = '') {
  const [calculation, setCalculation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cart || cart.length === 0) {
      setCalculation(null)
      return
    }

    let ignore = false
    setIsLoading(true)
    setError(null)

    const fetchCalculation = async () => {
      try {
        const items = cart.map((item) => ({ id: item.id, quantity: item.quantity }))
        const response = await frontendApi.calculateCheckout({
          items,
          customer_id: customerId,
          coupon_code: couponCode?.trim() || undefined,
        })
        if (!ignore) {
          setCalculation(response)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to calculate total.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchCalculation()

    return () => {
      ignore = true
    }
  }, [cart, customerId, couponCode])

  return { calculation, isLoading, error }
}
