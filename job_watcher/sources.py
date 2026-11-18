"""The sources: how to call each employer's board and convert it to common columns."""
from __future__ import annotations

import functools
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


def convert_workday(payload: dict, employer: str, base: str = "") -> list[dict]:
    """Workday gives only a relative 'Posted N days ago', so posted_date is left empty."""
    rows = []
    for job in payload["jobPostings"]:
        path = job.get("externalPath", "")
        source_id = path.rsplit("_", 1)[-1]   # the requisition number ends the posting's path
        rows.append({
            "source_id": source_id,
            "employer": employer,
            "title": clean(job.get("title")),
            "location": clean(job.get("locationsText")),
            "department": "",
            "posted_date": "",
            "url": base + path,
        })
    return rows


@dataclass(frozen=True)
class Source:
    name: str          # also the raw file name: data/raw/<date>/<name>.json.gz
    employer: str
    ats: str           # applicant tracking system
    url: str
    convert: Callable[[object, str], list[dict]]
    search: str = ""   # Workday only: search term sent with every request


def workday(name, employer, tenant, site, convert_site_base, search="", wd="wd1"):
    """A Workday board: POST to /wday/cxs/<tenant>/<site>/jobs, 20 postings per page."""
    host = f"https://{tenant}.{wd}.myworkdayjobs.com"
    return Source(name, employer, "Workday", f"{host}/wday/cxs/{tenant}/{site}/jobs",
                  functools.partial(convert_workday, base=f"{host}/{site}"), search=search)


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
    Source("vestwell", "Vestwell", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/vestwell/jobs", convert_greenhouse),
    Source("chime", "Chime", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/chime/jobs", convert_greenhouse),
    Source("affirm", "Affirm", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/affirm/jobs", convert_greenhouse),
    Source("brex", "Brex", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/brex/jobs", convert_greenhouse),
    Source("coinbase", "Coinbase", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/coinbase/jobs", convert_greenhouse),
    Source("upstart", "Upstart", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/upstart/jobs", convert_greenhouse),
    Source("mercury", "Mercury", "Greenhouse",
           "https://boards-api.greenhouse.io/v1/boards/mercury/jobs", convert_greenhouse),
    Source("plaid", "Plaid", "Ashby",
           "https://api.ashbyhq.com/posting-api/job-board/plaid", convert_ashby),
    Source("nerdwallet", "NerdWallet", "Ashby",
           "https://api.ashbyhq.com/posting-api/job-board/nerdwallet", convert_ashby),
    Source("acorns", "Acorns", "Ashby",
           "https://api.ashbyhq.com/posting-api/job-board/acorns", convert_ashby),
    Source("wealthfront", "Wealthfront", "Lever",
           "https://api.lever.co/v0/postings/wealthfront?mode=json", convert_lever),
    workday("raymondjames", "Raymond James", "raymondjames", "RaymondJamesCareers", None),
    workday("merrill", "Merrill Lynch (Bank of America)", "ghr", "lateral-us", None, search="Merrill"),
    workday("morganstanley", "Morgan Stanley", "ms", "External", None, wd="wd5"),
    workday("lpl", "LPL Financial", "lplfinancial", "External", None),
    workday("wellsfargo", "Wells Fargo", "wf", "WellsFargoJobs", None),
    workday("fidelity", "Fidelity Investments", "fmr", "FidelityCareers", None),
]

BY_NAME = {s.name: s for s in SOURCES}


def _http_json(url: str, timeout: int, data: dict | None = None) -> bytes:
    headers = {"User-Agent": USER_AGENT}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _fetch_workday(source: Source, timeout: int) -> bytes:
    """Page through a Workday board; return one JSON document with every posting."""
    postings, offset, total = [], 0, None
    while total is None or offset < total:
        page = json.loads(_http_json(source.url, timeout, {
            "appliedFacets": {}, "limit": 20, "offset": offset, "searchText": source.search}))
        if total is None:
            total = page.get("total", 0)      # Workday sends the total on the first page only
        if not page["jobPostings"]:
            break
        postings += page["jobPostings"]
        offset += len(page["jobPostings"])
    return json.dumps({"total": total, "jobPostings": postings}).encode()


def fetch(source: Source, timeout: int = 30, attempts: int = 3) -> bytes:
    """Download the board; return the raw response bytes. Raises on any problem."""
    last = None
    for _ in range(attempts):
        try:
            if source.ats == "Workday":
                body = _fetch_workday(source, timeout)
            else:
                body = _http_json(source.url, timeout)
            rows = source.convert(json.loads(body), source.employer)
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
