import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// eslint-disable-next-line no-restricted-properties -- React bootstrap is the only legitimate DOM lookup (RULES.md §1.2 allowance)
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root missing — index.html is malformed.')
}
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
