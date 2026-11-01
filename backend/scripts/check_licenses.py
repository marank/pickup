"""Fail if a production dependency's license doesn't go with Pickup's (AGPL-3.0-or-later).

Reads `pip-licenses --format=json` from stdin (see the Licenses step in CI). Free licenses,
GPL and AGPL included, are fine. Not: non-free ones (SSPL, Business Source, Elastic,
Commons Clause, non-commercial, proprietary) and GPL version 2 *only*, which can't be
combined with version 3. A bare "GPLv2" may mean either: check it and add it to ALLOW.
"""

import json
import re
import sys

NON_FREE = re.compile(
    r"SSPL|Server Side Public|BUSL|Business Source|Elastic License|Commons Clause|"
    r"Proprietary|UNLICENSED|NonCommercial|CC-BY-NC",
    re.I,
)
# GPL 2 without "or later" (LGPL 2.x may always be used under GPL 3, so it is fine).
GPL2_ONLY = re.compile(
    r"(?<![L\w-])GPL-2\.0(-only)?(?![-+\w.])|(?<![L\w])GPLv2(?!\+| or later)"
    r"|General Public License v2 \(GPLv2\)",
    re.I,
)

# Packages whose metadata is wrong or ambiguous, after checking them by hand:
# {"package-name": "reason"}
ALLOW: dict[str, str] = {}


def problem(license_: str) -> str | None:
    if NON_FREE.search(license_):
        return "not a free license"
    if GPL2_ONLY.search(license_):
        return "GPL version 2 only (or unclear): doesn't combine with AGPL-3.0"
    return None


def main() -> int:
    bad = []
    for pkg in json.load(sys.stdin):
        name, license_ = pkg["Name"], pkg.get("License", "")
        reason = None if name.lower() in ALLOW else problem(license_)
        if reason:
            bad.append(f"{name} {pkg.get('Version', '')}: {license_} — {reason}")
    for line in bad:
        print(f"forbidden license: {line}")
    if not bad:
        print("licenses ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
