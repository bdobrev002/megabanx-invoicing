import { useEffect, useRef } from 'react'

import { onWsMessage } from '@/api/websocket'

/**
 * Subscribe to WebSocket `refresh` events and invoke `refresh` at most once per
 * `delayMs` window. Rapid bursts (e.g. upload + delete in quick succession) are
 * collapsed into a single fetch, preventing the API storms flagged in Devin
 * Review on PR #8.
 *
 * The latest `refresh` is always read through a ref so callers do not need to
 * memoize the callback — useful for page components that close over fetch
 * helpers which themselves change identity.
 */
export function useWsRefresh(refresh: () => void, delayMs = 300) {
  const refreshRef = useRef(refresh)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = onWsMessage((data) => {
      if (typeof data !== 'object' || data === null || !('type' in data)) {
        return
      }
      const evt = data as { type: string }
      if (evt.type !== 'refresh') {
        return
      }

      if (timer !== null) {
        return
      }
      timer = setTimeout(() => {
        timer = null
        refreshRef.current()
      }, delayMs)
    })

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      unsubscribe()
    }
  }, [delayMs])
}
