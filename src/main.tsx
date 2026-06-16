import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/hanken-grotesk/index.css'
import "antd/dist/reset.css";
import './index.css'
import './styles/base.scss'
import './styles/store-skeletons.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
