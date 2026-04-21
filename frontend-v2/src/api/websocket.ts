import { API_BASE_URL } from '@/utils/constants'

type MessageHandler = (data: unknown) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
const handlers = new Set<MessageHandler>()

function getWsUrl(): string {
  // API_BASE_URL may be e.g. "https://megabanx.com/api" — strip trailing /api for WS
  const base = API_BASE_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws')
  const token = localStorage.getItem('token')
  return `${base}/ws?token=${token ?? ''}`
}

export function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  ws = new WebSocket(getWsUrl())
  const currentWs = ws

  ws.onopen = () => {
    // Send ping every 30s to keep connection alive
    if (pingInterval) clearInterval(pingInterval)
    pingInterval = setInterval(() => {
      if (currentWs.readyState === WebSocket.OPEN) {
        currentWs.send('ping')
      }
    }, 30_000)
  }

  ws.onmessage = (event) => {
    // Ignore pong responses
    if (event.data === 'pong') return
    try {
      const data: unknown = JSON.parse(event.data as string)
      handlers.forEach((h) => h(data))
    } catch { /* ignore parse errors */ }
  }

  ws.onclose = (event) => {
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
    if (reconnectTimer) clearTimeout(reconnectTimer)
    // Don't reconnect on auth failures (code 4001) to avoid infinite loop
    if (event.code === 4001) return
    reconnectTimer = setTimeout(connectWebSocket, 3000)
  }

  ws.onerror = () => currentWs.close()
}

export function disconnectWebSocket() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
}

export function onWsMessage(handler: MessageHandler) {
  handlers.add(handler)
  return () => { handlers.delete(handler) }
}
