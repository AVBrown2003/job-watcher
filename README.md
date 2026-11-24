# Job Watcher

[![tests](https://github.com/AVBrown2003/job-watcher/actions/workflows/tests.yml/badge.svg)](https://github.com/AVBrown2003/job-watcher/actions/workflows/tests.yml)

A tool that watches the job market for **financial advisor** roles. Every day GitHub Actions pulls the open postings from 22 employers, compares them with the day before, records what is new and what is gone, opens a GitHub Issue with the changes, and publishes the result to a website.

- Live site: https://avbrown2003.github.io/job-watcher/
- Daily issues: the repository's Issues tab (one per day, the previous day's is closed)

## How it works

1. `daily.yml` runs once a day (14:00 UTC, 8:00 AM Central) and calls `python -m job_watcher.pipeline`.
2. Every source is called and saved as `data/raw/<date>/<source>.json.gz`. A source that fails writes no raw file that day; one failing source does not stop the run. An empty board is also treated as a failed call, so a glitch cannot make every posting look removed. The result of every source is in `data/raw/<date>/results.json`.
3. `data/history.csv` is rebuilt from the raw files alone (see below).
4. `data/status.json` is written for the latest run.
5. The day's GitHub Issue is opened (or updated, on a second run the same day) and the previous day's is closed.
6. The raw files, history and status are committed.

A second run on the same UTC day replaces that day's raw files and issue, so each day counts once.

## Sources

22 employers on four applicant tracking systems. Every board is read as JSON from a public, no-login endpoint; no HTML page is read.

| Source name | Employer | Applicant tracking system | Endpoint |
|---|---|---|---|
| `betterment` | Betterment | Greenhouse | `boards-api.greenhouse.io/v1/boards/betterment/jobs` |
| `altruist` | Altruist | Greenhouse | `boards-api.greenhouse.io/v1/boards/altruist/jobs` |
| `sofi` | SoFi | Greenhouse | `boards-api.greenhouse.io/v1/boards/sofi/jobs` |
| `robinhood` | Robinhood | Greenhouse | `boards-api.greenhouse.io/v1/boards/robinhood/jobs` |
| `vestwell` | Vestwell | Greenhouse | `boards-api.greenhouse.io/v1/boards/vestwell/jobs` |
| `chime` | Chime | Greenhouse | `boards-api.greenhouse.io/v1/boards/chime/jobs` |
| `affirm` | Affirm | Greenhouse | `boards-api.greenhouse.io/v1/boards/affirm/jobs` |
| `brex` | Brex | Greenhouse | `boards-api.greenhouse.io/v1/boards/brex/jobs` |
| `coinbase` | Coinbase | Greenhouse | `boards-api.greenhouse.io/v1/boards/coinbase/jobs` |
| `upstart` | Upstart | Greenhouse | `boards-api.greenhouse.io/v1/boards/upstart/jobs` |
| `mercury` | Mercury | Greenhouse | `boards-api.greenhouse.io/v1/boards/mercury/jobs` |
| `savvy` | Savvy Wealth | Ashby | `api.ashbyhq.com/posting-api/job-board/savvy` |
| `plaid` | Plaid | Ashby | `api.ashbyhq.com/posting-api/job-board/plaid` |
| `nerdwallet` | NerdWallet | Ashby | `api.ashbyhq.com/posting-api/job-board/nerdwallet` |
| `acorns` | Acorns | Ashby | `api.ashbyhq.com/posting-api/job-board/acorns` |
| `wealthfront` | Wealthfront | Lever | `api.lever.co/v0/postings/wealthfront?mode=json` |
| `raymondjames` | Raymond James | Workday | `POST raymondjames.wd1.myworkdayjobs.com/wday/cxs/raymondjames/RaymondJamesCareers/jobs` |
| `merrill` | Merrill Lynch (Bank of America) | Workday | `POST ghr.wd1.myworkdayjobs.com/wday/cxs/ghr/lateral-us/jobs`, search term **Merrill** |
| `morganstanley` | Morgan Stanley | Workday | `POST ms.wd5.myworkdayjobs.com/wday/cxs/ms/External/jobs` |
| `lpl` | LPL Financial | Workday | `POST lplfinancial.wd1.myworkdayjobs.com/wday/cxs/lplfinancial/External/jobs` |
| `wellsfargo` | Wells Fargo | Workday | `POST wf.wd1.myworkdayjobs.com/wday/cxs/wf/WellsFargoJobs/jobs` |
| `fidelity` | Fidelity Investments | Workday | `POST fmr.wd1.myworkdayjobs.com/wday/cxs/fmr/FidelityCareers/jobs` |

Every posting the board returns is kept, not only ones in the role. Workday boards return 20 postings per request, so the tool pages through all of them. No board is near 5,000 postings (the largest is Wells Fargo at about 1,500). Merrill Lynch is a part of Bank of America and has no board of its own, so its postings are the Bank of America lateral-hiring board (about 2,000 postings) requested with the search term **Merrill**; that is the only board requested with a search term. Workday gives only a relative "posted N days ago", so `posted_date` is empty for the Workday sources.

**Not watched:** Edward Jones (its careers site runs on SmashFly and has no JSON board we could read without scraping HTML) and Stephens Inc. (no public JSON board found).

## Title rule (in role or not)

A posting is **in role** when its title (case-insensitive) matches one of these and none of the exclusions:

- includes: `financial advisor/adviser/planner/consultant/coach`, `financial planning advisor/associate/consultant/specialist`, `wealth advisor/planner/manager`, `investment/retirement/private client/client advisor`, `advisor associate`, `CFP`
- excludes: `FP&A`, `financial planning and analysis`, and titles with `software`, `engineer`, `developer`, `data scientist`, `designer`

The rule lives in `job_watcher/role.py`. It is applied when the history is built, so changing it re-labels every day of the history.

## Rebuild the history from the raw files

```
uv run python -m job_watcher.build
```

(or `python -m job_watcher.build` with any Python 3.11+; there are no dependencies). The history depends only on `data/raw/` and the title rule, so the same raw files always give the same `data/history.csv`.

History rules, applied day by day for each source that has a raw file that day:

- a posting seen for the first time gets that day as `first_seen`; `first_run` is true if it was in that source's first raw file
- every posting listed that day gets that day as `last_seen`
- an open posting that is no longer listed becomes `removed` with that day as `removed_date`
- a removed posting that is listed again becomes `open`, its `removed_date` is cleared, its `first_seen` is unchanged

## Data files

- `data/history.csv`: one row per posting (`posting_id`, `source`, `source_id`, `employer`, `title`, `location`, `department`, `posted_date`, `url`, `in_role`, `first_run`, `first_seen`, `last_seen`, `status`, `removed_date`), sorted by `posting_id`.
- `data/status.json`: the latest run (`run_time`, `first_run_date`, `days_with_success`, `open`, `new_today`, `removed_today`, `sources`).
- `data/raw/<date>/<source>.json.gz`: what each source returned, compressed.
- `data/raw/<date>/results.json`: ok/failed and count for every source that day.

## The site

Three pages that load the two data files in the browser and compute everything there:

- **Today** (`index.html`): last run time, status of every source, sorted by postings listed (each shown with its capitalized name, logo and company color, and a green check or red X), the four counts, and the new and removed postings of the latest run.
- **Browse** (`browse.html`): open postings, in-role or all, with filters (employer, location, days open), each a text box with suggestions (location has States and Cities tabs, with street addresses left out), title search, sort by first-seen date, an apply link, and a star to save a posting to a shortlist that stays in the browser.
- **Market** (`market.html`): six findings computed from the history (new per day, removed per day, open per employer, days open and its median, share removed within seven days, top locations).

The site is installable (`manifest.webmanifest`, `sw.js`). Online it loads fresh data; offline it opens and shows the last data it loaded.

## Files

| File | What it does |
|---|---|
| `job_watcher/sources.py` | the sources, how to fetch each, and conversion to the common columns |
| `job_watcher/role.py` | the title rule |
| `job_watcher/build.py` | builds `data/history.csv` from the raw files |
| `job_watcher/pipeline.py` | the daily run: fetch, build, status, GitHub Issue |
| `job_watcher/__init__.py` | marks `job_watcher` as a Python package |
| `tests/test_convert.py` | tests each source type's conversion to the common columns (Greenhouse, Ashby, Lever, Workday), Workday paging and search term, and the 15+ employer requirement |
| `tests/test_role.py` | tests the title rule |
| `tests/test_build.py` | tests first-seen, last-seen, removed and re-opened logic, and that the build is reproducible |
| `tests/test_pipeline.py` | tests the status counts, the issue text, and that a failed source or a second run behaves correctly |
| `tests/conftest.py` | lets the tests import the `job_watcher` package |
| `.github/workflows/daily.yml` | daily schedule: runs the pipeline and commits `data/` |
| `.github/workflows/tests.yml` | runs pytest on every push |
| `index.html`, `browse.html`, `market.html` | the three pages |
| `assets/style.css` | shared look (one navigation bar, fonts, colors) |
| `assets/common.js` | navigation bar, data loading, CSV parser |
| `assets/today.js`, `assets/browse.js`, `assets/market.js` | page logic |
| `assets/charts.js` | small SVG chart helpers |
| `assets/places.js` | turns messy location text into plain states and cities for the Location filter |
| `assets/desk.js` | the cartoon desk items (pencils, tacks, eraser, rubber-band ball, paper airplane) beside the notepad |
| `assets/turn.js` | tells the page-turn animation which way to turn |
| `manifest.webmanifest`, `sw.js` | installable app and offline support |
| `assets/icon-192.png`, `assets/icon-512.png`, `make_icons.py` | app icons and the script that draws them |
| `pyproject.toml`, `uv.lock` | project settings (pytest for development) |
| `.gitignore` | keeps caches and virtual environments out of the repository |
| `.gitattributes` | keeps line endings as LF so data files match across machines |
| `README.md` | this file |

## Run it yourself

```
uv run python -m job_watcher.pipeline --no-issues   # one run without opening an issue
uv run --with pytest python -m pytest               # tests
uv run python -m http.server 8000                   # preview the site
```
