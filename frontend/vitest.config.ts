import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        // The logic layer (API client incl. CSRF, store, router guard). Components are
        // added once they get tests (planned frontend overhaul).
        include: ['src/services/**', 'src/stores/**', 'src/router/**'],
        exclude: ['**/__tests__/**'],
        thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  }),
)
