import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginCypress from 'eslint-plugin-cypress'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import sonarjs from 'eslint-plugin-sonarjs'
import comments from '@eslint-community/eslint-plugin-eslint-comments'

// Import boundaries. The typed API client is called only from src/api and the features'
// composables; shared code never depends on a feature's pages; src/lib stays free of
// components and API calls (it may use the generated payload types and ApiError).
const apiClient = {
  group: ['@/api/client', '**/api/client'],
  message: "Call the API from a feature's composables (TanStack Query), not from components.",
}
const pages = {
  group: ['@/features/*/views/*', '**/views/*'],
  message: 'Shared code must not depend on a page.',
}
const impure = {
  group: [
    '@/components/*',
    '**/components/*',
    '@/features/*',
    '@/api/*',
    '!@/api/types',
    '!@/api/errors',
  ],
  message: 'src/lib stays pure: no components, features or API calls.',
}

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/strongly-recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,

  {
    // Vendored shadcn-vue components keep their single-word names (Button, Card, …).
    name: 'app/shadcn-ui',
    files: ['src/components/ui/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },

  {
    ...pluginCypress.configs.recommended,
    files: ['cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}', 'cypress/support/**/*.{js,ts,jsx,tsx}'],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*', 'src/test/**'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,

  // No silenced checks: every disable names its rules and says why; unused ones fail.
  { name: 'project/linter', linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    name: 'project/no-silencing',
    files: ['src/**/*.{ts,tsx,vue}'],
    plugins: { '@eslint-community/eslint-comments': comments },
    rules: {
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/require-description': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],
    },
  },
  // Tests that test: every test asserts, no `.only` or skipped test is committed.
  {
    name: 'project/tests',
    files: ['src/**/__tests__/*', 'src/**/*.{test,spec}.{ts,tsx}'],
    plugins: { vitest: pluginVitest },
    rules: {
      'vitest/expect-expect': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
    },
  },
  {
    name: 'project/readability',
    files: ['src/**/*.{ts,tsx,vue}'],
    plugins: { sonarjs },
    rules: {
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-depth': ['error', 4],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // `??` for numbers and objects. The API sends an unset text as "" (a pickup without a
      // title) and flags as false, so `title || fallback` is meant: strings and booleans keep `||`.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true, boolean: true } },
      ],
      'vue/no-v-html': 'error',
      'vue/no-unused-properties': [
        'error',
        { groups: ['props', 'data', 'computed', 'methods', 'setup'] },
      ],
      'no-restricted-imports': ['error', { patterns: [apiClient] }],
    },
  },
  // Later blocks replace the rule's options, so each lists every pattern that applies.
  {
    name: 'project/api',
    files: ['src/api/**', 'src/features/*/composables/**', 'src/**/__tests__/**', 'src/test/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    name: 'project/shared',
    files: ['src/components/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [apiClient, pages] }] },
  },
  {
    name: 'project/lib',
    files: ['src/lib/**/*.ts', 'src/features/*/lib/**/*.ts'],
    ignores: ['**/__tests__/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [apiClient, pages, impure] }] },
  },
  {
    name: 'project/a11y',
    files: ['src/**/*.vue'],
    rules: {
      // shadcn-vue's Label and form controls; a label counts when it wraps or names its control.
      'vuejs-accessibility/label-has-for': [
        'error',
        {
          components: ['Label'],
          controlComponents: ['Input', 'Textarea', 'Switch', 'Checkbox', 'SelectTrigger'],
          required: { some: ['nesting', 'id'] },
        },
      ],
      // Videos are the members' own uploads: there are no caption files to offer.
      'vuejs-accessibility/media-has-caption': 'off',
    },
  },
  // Vendored shadcn-vue components follow upstream; the strict rules are for our own code.
  {
    name: 'project/shadcn-ui-upstream',
    files: ['src/components/ui/**'],
    rules: {
      'vue/no-unused-properties': 'off',
      'vue/require-default-prop': 'off',
      // The label comes from where the component is used.
      'vuejs-accessibility/form-control-has-label': 'off',
      'vuejs-accessibility/label-has-for': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
)
