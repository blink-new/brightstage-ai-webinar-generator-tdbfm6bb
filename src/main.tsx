import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { errorService } from './services/errorService'

// Initialize error service
errorService

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
) 