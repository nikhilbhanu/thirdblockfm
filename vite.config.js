import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/thirdblockfm/', // Set base for GitHub Pages deployment
  server: {
    proxy: {
      '/stream-api': {
        target: 'https://roughly-proud-vervet.ngrok-free.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/stream-api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
          });
        },
      },
    },
  },
});
