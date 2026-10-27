// Fail if a production dependency has a strong copyleft license (GPL, AGPL, SSPL).
// Reads `pnpm licenses list --prod --json`. LGPL is fine.
import { execFileSync } from 'node:child_process'

const FORBIDDEN = /(?<![A-Za-z])(A?GPL|SSPL)(?=$|[^A-Za-z]|v\d)/i
const LESSER = /LGPL/i
// Packages whose metadata is wrong or ambiguous, after checking them by hand:
// { 'package-name': 'reason' }
const ALLOW = {}

const byLicense = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], { encoding: 'utf8' }),
)
const bad = []
for (const [license, packages] of Object.entries(byLicense)) {
  if (!FORBIDDEN.test(license) || LESSER.test(license)) continue
  for (const pkg of packages) {
    if (!(pkg.name in ALLOW)) bad.push(`${pkg.name} ${pkg.versions?.join(', ') ?? ''}: ${license}`)
  }
}
for (const line of bad) console.log(`forbidden license: ${line}`)
if (!bad.length) console.log('licenses ok')
process.exit(bad.length ? 1 : 0)
