import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // CSS extraction strategy
        // Split CSS per page for smaller critical CSS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name]-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Code splitting strategy
        manualChunks(id) {
          // Separate vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendors';
            }
            if (id.includes('lucide-react') || id.includes('aos') || id.includes('recharts')) {
              return 'ui-libraries';
            }
            if (id.includes('zustand')) {
              return 'state-management';
            }
            if (id.includes('axios') || id.includes('crypto-js')) {
              return 'utilities';
            }
          }
          // Separate admin pages into their own chunk
          if (id.includes('/admin/')) {
            return 'admin-pages';
          }
          // Separate coach pages into their own chunk
          if (id.includes('/coach/')) {
            return 'coach-pages';
          }
        },
      },
    },
    // Optimization
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production for smaller build
    cssCodeSplit: true, // Enable CSS code splitting for smaller initial CSS
  },
  // Optimization for dev server
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios', 'lucide-react'],
  },
})
