"""Fail if a production dependency has a strong copyleft license (GPL, AGPL, SSPL).

Reads `pip-licenses --format=json` from stdin (see the Licenses step in CI). LGPL is
fine: it doesn't bind an application that merely uses the library (e.g. psycopg).
"""

import json
import re
import sys

# Whole tokens only, so "LGPL" doesn't count as "GPL".
FORBIDDEN = re.compile(r"(?<![A-Za-z])(A?GPL|SSPL)(?=$|[^A-Za-z]|v\d)|GNU (Affero )?General Public", re.I)
LESSER = re.compile(r"LGPL|Lesser General Public|Library General Public", re.I)

# Packages whose metadata is wrong or ambiguous, after checking them by hand:
# {"package-name": "reason"}
ALLOW: dict[str, str] = {}


def main() -> int:
    bad = []
    for pkg in json.load(sys.stdin):
        name, license_ = pkg["Name"], pkg.get("License", "")
        if name.lower() in ALLOW:
            continue
        if FORBIDDEN.search(license_) and not LESSER.search(license_):
            bad.append(f"{name} {pkg.get('Version', '')}: {license_}")
    for line in bad:
        print(f"forbidden license: {line}")
    if not bad:
        print("licenses ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
