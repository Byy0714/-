import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppContext'
import { loadNativeTts } from './lib/nativeTts'
import './styles/global.css'

// Android APK：预先初始化原生 TTS 引擎（网站版为空操作）
loadNativeTts()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
