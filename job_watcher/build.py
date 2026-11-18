"""Build data/history.csv from the raw files alone.

    python -m job_watcher.build

The history depends only on data/raw/<date>/<source>.json.gz and on the title
rule, so running it again gives the same file and a rule change applies to
every day of the history.
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from . import sources
from .role import in_role

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
HISTORY_CSV = ROOT / "data" / "history.csv"

COLUMNS = [
    "posting_id", "source", "source_id", "employer", "title", "location", "department",
    "posted_date", "url", "in_role", "first_run", "first_seen", "last_seen", "status",
    "removed_date",
]

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def raw_files(raw_dir: Path = RAW_DIR) -> dict[str, dict[str, Path]]:
    """{date: {source_name: path}} for every raw file, only known sources."""
    found: dict[str, dict[str, Path]] = {}
    if not raw_dir.exists():
        return found
    for day_dir in sorted(raw_dir.iterdir()):
        if not (day_dir.is_dir() and DATE_RE.match(day_dir.name)):
            continue
        for path in sorted(day_dir.glob("*.json.gz")):
            name = path.name[: -len(".json.gz")]
            if name in sources.BY_NAME:
                found.setdefault(day_dir.name, {})[name] = path
    return found


def apply_day(history: dict, source: str, date: str, postings: list[dict], first_run: bool) -> None:
    """Apply one source's listing for one day to the history (mutates it).

    - first time seen: first_seen = date, first_run as given
    - every listed posting: last_seen = date; a removed posting becomes open again
    - an open posting of this source that is no longer listed: removed on this date
    """
    listed: dict[str, dict] = {}
    for p in postings:
        listed[f"{source}:{p['source_id']}"] = p

    for pid, p in listed.items():
        row = history.get(pid)
        if row is None:
            row = {
                "posting_id": pid, "source": source, "source_id": p["source_id"],
                "first_run": first_run, "first_seen": date,
                "status": "open", "removed_date": "",
            }
            history[pid] = row
        elif row["status"] == "removed":
            row["status"] = "open"
            row["removed_date"] = ""
        for key in ("employer", "title", "location", "department", "posted_date", "url"):
            row[key] = p.get(key, "")
        row["last_seen"] = date

    for pid, row in history.items():
        if row["source"] == source and row["status"] == "open" and pid not in listed:
            row["status"] = "removed"
            row["removed_date"] = date


def build_history(raw_dir: Path = RAW_DIR) -> list[dict]:
    files = raw_files(raw_dir)
    history: dict[str, dict] = {}
    seen_sources: set[str] = set()
    for date in sorted(files):
        for name in sorted(files[date]):
            postings = sources.load_postings(name, files[date][name].read_bytes())
            apply_day(history, name, date, postings, first_run=name not in seen_sources)
            seen_sources.add(name)
    rows = []
    for pid in sorted(history):
        row = dict(history[pid])
        row["in_role"] = in_role(row["title"])
        rows.append(row)
    return rows


def write_history(rows: list[dict], path: Path = HISTORY_CSV) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    def cell(col, value):
        if isinstance(value, bool):
            return "true" if value else "false"
        return value if value is not None else ""

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(COLUMNS)
        for row in rows:
            writer.writerow([cell(c, row.get(c, "")) for c in COLUMNS])


def main() -> int:
    rows = build_history()
    write_history(rows)
    print(f"wrote {HISTORY_CSV} ({len(rows)} postings)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
