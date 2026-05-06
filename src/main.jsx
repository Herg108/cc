import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TestMode from './components/TestMode.jsx'

const Component = window.location.search.includes('test') ? TestMode : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Component />
  </StrictMode>
)
