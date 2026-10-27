import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// `shadcn-vue add` re-inserts a Google Fonts @import; the CSP blocks remote styles and
// loading Google Fonts from visitors' browsers is a privacy problem. Fonts are self-hosted.
describe('stylesheets', () => {
  const dir = resolve('src/assets') // vitest runs in frontend/
  const sheets = readdirSync(dir).filter((name) => name.endsWith('.css'))

  it.each(sheets)('%s loads nothing from other origins', (name) => {
    const css = readFileSync(`${dir}/${name}`, 'utf8')
    expect(css).not.toMatch(/@import\s+(url\()?['"]?https?:/)
  })
})
