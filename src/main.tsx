
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { version as reactVersion } from 'react'

// Development-only diagnostics to verify a single React instance
if (import.meta.env.DEV) {
  console.log('[Debug] React version:', reactVersion)
  const renderers = (window as any)?.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers
  const rendererCount = typeof renderers?.size === 'number' ? renderers.size : undefined
  if (rendererCount !== undefined) {
    console.log('[Debug] React DevTools renderer count:', rendererCount)
  } else {
    console.log('[Debug] React DevTools renderer info not available')
  }
}

createRoot(document.getElementById("root")!).render(<App />);
