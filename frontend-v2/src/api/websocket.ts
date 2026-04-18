import { API_BASE_URL } from '@/utils/constants'

type MessageHandler = (data: unknown) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const handlers = new Set<MessageHandler>()

function getWsUrl(): string {
  const base = API_BASE_URL.replace(/^http/, 'ws')
  const token = localStorage.getItem('token')
  return `${base}/ws?token=${token ?? ''}`
}

export function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  ws = new WebSocket(getWsUrl())
  const currentWs = ws

  ws.onmessage = (event) => {
    try {
      const data: unknown = JSON.parse(event.data as string)
      handlers.forEach((h) => h(data))
    } catch { /* ignore parse errors */ }
  }

  ws.onclose = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connectWebSocket, 3000)
  }

  ws.onerror = () => currentWs.close()
}

export function disconnectWebSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
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
