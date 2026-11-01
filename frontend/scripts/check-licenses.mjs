// Fail if a production dependency's license doesn't go with Pickup's (AGPL-3.0-or-later).
// Reads `pnpm licenses list --prod --json`. Free licenses, GPL and AGPL included, are fine.
// Not: non-free ones (SSPL, Business Source, Elastic, Commons Clause, non-commercial,
// proprietary) and GPL version 2 *only*, which can't be combined with version 3. A bare
// "GPL-2.0" may mean either: check it and add it to ALLOW. Same rules as the backend's
// scripts/check_licenses.py.
import { execFileSync } from 'node:child_process'

const NON_FREE =
  /SSPL|Server Side Public|BUSL|Business Source|Elastic License|Commons Clause|Proprietary|UNLICENSED|NonCommercial|CC-BY-NC/i
// GPL 2 without "or later" (LGPL 2.x may always be used under GPL 3, so it is fine).
const GPL2_ONLY =
  /(?<![L\w-])GPL-2\.0(-only)?(?![-+\w.])|(?<![L\w])GPLv2(?!\+| or later)|General Public License v2 \(GPLv2\)/i
// Packages whose metadata is wrong or ambiguous, after checking them by hand:
// { 'package-name': 'reason' }
const ALLOW = {}

const problem = (license) =>
  NON_FREE.test(license)
    ? 'not a free license'
    : GPL2_ONLY.test(license)
      ? "GPL version 2 only (or unclear): doesn't combine with AGPL-3.0"
      : null

const byLicense = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], { encoding: 'utf8' }),
)
const bad = []
for (const [license, packages] of Object.entries(byLicense)) {
  const reason = problem(license)
  if (!reason) continue
  for (const pkg of packages) {
    if (!(pkg.name in ALLOW))
      bad.push(`${pkg.name} ${pkg.versions?.join(', ') ?? ''}: ${license} — ${reason}`)
  }
}
for (const line of bad) console.log(`forbidden license: ${line}`)
if (!bad.length) console.log('licenses ok')
process.exit(bad.length ? 1 : 0)
