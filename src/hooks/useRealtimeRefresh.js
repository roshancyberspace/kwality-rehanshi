import { useEffect, useRef } from 'react'
import { shouldHandleRealtimeTarget, subscribeRealtimeRefresh } from '../utils/realtime'

function useRealtimeRefresh({
  enabled = true,
  intervalMs = 6000,
  onRefresh,
  target,
}) {
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || typeof refreshRef.current !== 'function') return undefined

    let isRefreshing = false
    const refresh = async (payload = {}) => {
      if (!shouldHandleRealtimeTarget(payload, target) || isRefreshing) return
      isRefreshing = true
      try {
        await refreshRef.current(payload)
      } finally {
        isRefreshing = false
      }
    }

    const unsubscribe = subscribeRealtimeRefresh(refresh)
    const timer = window.setInterval(() => refresh({ source: 'poll', targets: [target || 'all'] }), intervalMs)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [enabled, intervalMs, target])
}

export default useRealtimeRefresh
