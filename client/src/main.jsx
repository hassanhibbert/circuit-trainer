import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContainer theme="dark" position="top-center" autoClose={3000} />
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
