"""The daily run.

    python -m job_watcher.pipeline [--no-issues] [--date YYYY-MM-DD]

1. call every source, save data/raw/<date>/<source>.json.gz (a failing source
   writes no raw file; the result of every source goes in results.json)
2. build data/history.csv from the raw files
3. write data/status.json
4. open the day's GitHub Issue and close the previous day's
The workflow then commits data/.
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from . import build, sources

STATUS_JSON = build.ROOT / "data" / "status.json"


def run_sources(date: str) -> list[dict]:
    """Fetch every source; return [{name, ok, count, error?}]. Replaces the day's raw files."""
    day_dir = build.RAW_DIR / date
    if day_dir.exists():
        shutil.rmtree(day_dir)
    day_dir.mkdir(parents=True)
    results = []
    for src in sources.SOURCES:
        try:
            body = sources.fetch(src)
            count = len(src.convert(json.loads(body), src.employer))
            (day_dir / f"{src.name}.json.gz").write_bytes(sources.compress(body))
            results.append({"name": src.name, "ok": True, "count": count})
        except Exception as exc:  # noqa: BLE001 - one source failing must not stop the run
            results.append({"name": src.name, "ok": False, "count": 0, "error": str(exc)[:300]})
    (day_dir / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    return results


def make_status(rows: list[dict], results: list[dict], run_time: str, date: str) -> dict:
    files = build.raw_files()
    return {
        "run_time": run_time,
        "first_run_date": min(files) if files else date,
        "days_with_success": len(files),
        "open": sum(1 for r in rows if r["status"] == "open"),
        "new_today": sum(1 for r in rows if r["first_seen"] == date and not r["first_run"]),
        "removed_today": sum(1 for r in rows if r["removed_date"] == date),
        "sources": [{"name": r["name"], "ok": r["ok"], "count": r["count"]} for r in results],
    }


def issue_body(rows: list[dict], date: str, status: dict) -> str:
    new = [r for r in rows if r["first_seen"] == date and not r["first_run"]]
    removed = [r for r in rows if r["removed_date"] == date]

    def lines(items):
        items = sorted(items, key=lambda r: (not r["in_role"], r["employer"], r["title"]))
        return [
            f"- {'**[your role]** ' if r['in_role'] else ''}[{r['title']}]({r['url']}) "
            f"- {r['employer']}" + (f", {r['location']}" if r["location"] else "")
            for r in items
        ] or ["- none"]

    failed = [s["name"] for s in status["sources"] if not s["ok"]]
    out = [
        f"Run {status['run_time']} UTC. {status['open']} open postings, "
        f"{len(new)} new, {len(removed)} removed.",
    ]
    if failed:
        out.append(f"Sources that failed today: {', '.join(failed)}.")
    out += ["", f"## New postings ({len(new)})", *lines(new),
            "", f"## Removed postings ({len(removed)})", *lines(removed)]
    return "\n".join(out)


def gh(*args: str, check: bool = True) -> str:
    proc = subprocess.run(["gh", *args], capture_output=True, text=True)
    if check and proc.returncode != 0:
        raise RuntimeError(f"gh {' '.join(args)}: {proc.stderr.strip()}")
    return proc.stdout


def update_issues(date: str, body: str) -> None:
    """Open (or update) today's issue; close every older date-titled issue."""
    issues = json.loads(gh("issue", "list", "--state", "open", "--limit", "100",
                           "--json", "number,title"))
    today = [i for i in issues if i["title"] == date]
    if today:
        gh("issue", "edit", str(today[0]["number"]), "--body", body)
    else:
        gh("issue", "create", "--title", date, "--body", body)
    for issue in issues:
        title = issue["title"]
        if title != date and build.DATE_RE.match(title) and title < date:
            gh("issue", "close", str(issue["number"]), "--comment", f"Superseded by {date}.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-issues", action="store_true")
    parser.add_argument("--date", help="override the UTC date (testing only)")
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc)
    date = args.date or now.strftime("%Y-%m-%d")
    run_time = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    results = run_sources(date)
    for r in results:
        print(("ok  " if r["ok"] else "FAIL"), r["name"], r["count"], r.get("error", ""))

    rows = build.build_history()
    build.write_history(rows)
    status = make_status(rows, results, run_time, date)
    STATUS_JSON.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status))

    if not args.no_issues:
        update_issues(date, issue_body(rows, date, status))
    return 0


if __name__ == "__main__":
    sys.exit(main())
