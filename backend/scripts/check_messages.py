"""
Fail if locale/ is out of date: a text in the code without a German entry, or django.mo not
compiled from the current django.po. Regenerates both, so after a failure the files only need
translating (empty msgstr) and committing. Run from backend/: uv run python scripts/check_messages.py
"""

import re
import subprocess
import sys
from pathlib import Path

LOCALE = Path("locale/de/LC_MESSAGES")
PO, MO = LOCALE / "django.po", LOCALE / "django.mo"
MANAGE = [sys.executable, "manage.py"]


def without_date(text: str) -> str:
    return re.sub(r'"POT-Creation-Date: .*"\n', "", text)


before_po, before_mo = PO.read_text(), MO.read_bytes()
subprocess.run([*MANAGE, "compilemessages", "-l", "de", "--ignore=.venv"], check=True, capture_output=True)
stale_mo = MO.read_bytes() != before_mo
subprocess.run(
    [*MANAGE, "makemessages", "-l", "de", "--ignore=.venv", "--ignore=*/tests/*"]
    + ["--no-obsolete", "--no-location"],
    check=True,
    capture_output=True,
)
changed_po = without_date(PO.read_text()) != without_date(before_po)
if not changed_po:
    PO.write_text(before_po)  # keep the old date: no change at all
untranslated = [m for m in re.findall(r'msgid "(.+)"\nmsgstr ""\n(?!")', PO.read_text() + "\n")]

problems = []
if changed_po:
    problems.append("django.po was missing texts (now added)")
if untranslated:
    problems.append(f"untranslated: {untranslated}")
if stale_mo:
    problems.append("django.mo was not compiled from django.po (now compiled)")
if problems:
    sys.exit("locale/ is out of date — " + "; ".join(problems) + ". Translate, then commit locale/.")
print("translations ok")
