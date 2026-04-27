import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import AOS from 'aos'
// import 'aos/dist/aos.css'
import './styles/critical.css' // Load critical CSS first
import './index.css'
import './styles/global.css'
import App from './App.jsx'

// Fix for iPad/Safari media query issues
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  // Force viewport recalculation on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      // Trigger a re-render by dispatching resize event
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });

  // Initial calculation
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  // Handle resize for iPad Safari
  window.addEventListener('resize', () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });
}

// // Initialize AOS
// AOS.init({
//   duration: 600,
//   easing: 'ease-in-out',
//   once: true,
//   offset: 100,
// })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
