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
      setupFiles: ['src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**'],
        // Vendored shadcn-vue components, generated API types, bootstrapping, test helpers.
        exclude: [
          'src/components/ui/**',
          'src/api/schema.d.ts',
          'src/main.ts',
          'src/test/**',
          '**/__tests__/**',
          '**/*.d.ts',
        ],
        thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  }),
)
