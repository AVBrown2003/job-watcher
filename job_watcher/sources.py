"""The sources: how to call each employer's board and convert it to common columns."""
from __future__ import annotations

import gzip
import json
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

COLUMNS_FROM_SOURCE = [
    "source_id", "employer", "title", "location", "department", "posted_date", "url",
]

USER_AGENT = "job-watcher/0.1 (student project; daily job board check)"


def utc_date(value: str | None) -> str:
    """Turn an ISO timestamp (any offset) into a UTC YYYY-MM-DD string; '' if missing."""
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")


def clean(value) -> str:
    return " ".join(str(value).split()) if value not in (None, "") else ""


def convert_greenhouse(payload: dict, employer: str) -> list[dict]:
    rows = []
    for job in payload["jobs"]:
        location = job.get("location") or {}
        rows.append({
            "source_id": str(job["id"]),
            "employer": employer,
            "title": clean(job.get("title")),
            "location": clean(location.get("name")),
            "department": "",
            "posted_date": utc_date(job.get("first_published")),
            "url": job.get("absolute_url", ""),
        })
    return rows


def convert_ashby(payload: dict, employer: str) -> list[dict]:
    rows = []
    for job in payload["jobs"]:
        if job.get("isListed") is False:
            continue
        rows.append({
            "source_id": str(job["id"]),
            "employer": employer,
            "title": clean(job.get("title")),
            "location": clean(job.get("location")),
            "department": clean(job.get("department")),
            "posted_date": utc_date(job.get("publishedAt")),
            "url": job.get("jobUrl", ""),
        })
    return rows


def convert_lever(payload: list, employer: str) -> list[dict]:
    rows = []
    for job in payload:
        categories = job.get("categories") or {}
        created = job.get("createdAt")
        posted = ""
        if created:
            posted = datetime.fromtimestamp(created / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        rows.append({
            "source_id": str(job["id"]),
            "employer": employer,
            "title": clean(job.get("text")),
            "location": clean(categories.get("location")),
            "department": clean(categories.get("department") or categories.get("team")),
            "posted_date": posted,
            "url": job.get("hostedUrl", ""),
        })
    return rows


@dataclass(frozen=True)
class Source:
    name: str          # also the raw file name: data/raw/<date>/<name>.json.gz
    employer: str
    ats: str           # applicant tracking system
    url: str
    convert: Callable[[object, str], list[dict]]


SOURCES = [
    Source("betterment", "Betterment", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/betterment/jobs", convert_greenhouse),
    Source("altruist", "Altruist", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/altruist/jobs", convert_greenhouse),
    Source("sofi", "SoFi", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/sofi/jobs", convert_greenhouse),
    Source("robinhood", "Robinhood", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/robinhood/jobs", convert_greenhouse),
    Source("savvy", "Savvy Wealth", "Ashby",
           "https://api.ashbyhq.com/posting-api/job-board/savvy", convert_ashby),
]

BY_NAME = {s.name: s for s in SOURCES}


def fetch(source: Source, timeout: int = 30, attempts: int = 3) -> bytes:
    """Download the board; return the raw response bytes. Raises on any problem."""
    last = None
    for _ in range(attempts):
        try:
            req = urllib.request.Request(source.url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
            payload = json.loads(body)
            rows = source.convert(payload, source.employer)
            if not rows:
                raise ValueError("board returned zero postings (treated as a failed call)")
            return body
        except Exception as exc:  # noqa: BLE001 - any failure means "source failed today"
            last = exc
    raise RuntimeError(f"{source.name}: {last}")


def compress(body: bytes) -> bytes:
    # mtime=0 so identical content gives identical bytes
    return gzip.compress(body, compresslevel=9, mtime=0)


def load_postings(source_name: str, gz_bytes: bytes) -> list[dict]:
    source = BY_NAME[source_name]
    payload = json.loads(gzip.decompress(gz_bytes))
    return source.convert(payload, source.employer)
