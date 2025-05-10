import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/thirdblockfm/', // Set base for GitHub Pages deployment
  server: {
    host: true // This makes the server accessible on your local network
  }
});
