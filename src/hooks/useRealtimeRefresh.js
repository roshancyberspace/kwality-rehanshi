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
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && payload?.source === 'poll') {
        return
      }
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

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh({ source: 'broadcast', targets: [target || 'all'] })
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, intervalMs, target])
}

export default useRealtimeRefresh
