import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), vueDevTools()],
  server: {
    // Same origin as in production: the Django dev server answers these paths.
    // Keep the browser's Host (no changeOrigin), so links Django builds (e.g. in mails)
    // point to the Vite dev server, like they point to nginx in production.
    proxy: Object.fromEntries(
      ['/api', '/admin', '/django-static'].map((path) => [
        path,
        { target: 'http://localhost:8000', changeOrigin: false },
      ]),
    ),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
