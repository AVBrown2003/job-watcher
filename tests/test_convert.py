from job_watcher import sources


def test_greenhouse_to_common_columns():
    payload = {"jobs": [{
        "id": 8246279, "title": "  Financial   Advisor ",
        "location": {"name": "New York, NY"},
        "first_published": "2026-10-05T22:30:00-04:00",
        "absolute_url": "https://example.com/job?gh_jid=8246279",
    }]}
    rows = sources.convert_greenhouse(payload, "Betterment")
    assert rows == [{
        "source_id": "8246279", "employer": "Betterment", "title": "Financial Advisor",
        "location": "New York, NY", "department": "",
        "posted_date": "2026-10-06",  # 22:30 at -04:00 is 02:30 UTC the next day
        "url": "https://example.com/job?gh_jid=8246279",
    }]


def test_greenhouse_missing_location_and_date():
    rows = sources.convert_greenhouse({"jobs": [{"id": 1, "title": "X", "absolute_url": "u"}]}, "E")
    assert rows[0]["location"] == "" and rows[0]["posted_date"] == ""


def test_ashby_to_common_columns_skips_unlisted():
    payload = {"jobs": [
        {"id": "a1", "title": "Wealth Advisor", "department": "Advisors", "location": "Remote",
         "publishedAt": "2026-11-13T16:14:33.605+00:00", "isListed": True,
         "jobUrl": "https://jobs.ashbyhq.com/savvy/a1"},
        {"id": "a2", "title": "Hidden", "isListed": False, "jobUrl": "x"},
    ]}
    rows = sources.convert_ashby(payload, "Savvy Wealth")
    assert rows == [{
        "source_id": "a1", "employer": "Savvy Wealth", "title": "Wealth Advisor",
        "location": "Remote", "department": "Advisors", "posted_date": "2026-11-13",
        "url": "https://jobs.ashbyhq.com/savvy/a1",
    }]


def test_lever_to_common_columns():
    payload = [{"id": "l1", "text": "Financial Planner", "createdAt": 1760000000000,
                "categories": {"location": "Austin", "team": "Planning"},
                "hostedUrl": "https://jobs.lever.co/x/l1"}]
    rows = sources.convert_lever(payload, "X")
    assert rows[0]["title"] == "Financial Planner"
    assert rows[0]["department"] == "Planning"
    assert rows[0]["posted_date"] == "2025-10-09"


def test_every_source_has_a_converter_and_unique_name():
    names = [s.name for s in sources.SOURCES]
    assert len(names) == len(set(names))
    assert all(callable(s.convert) for s in sources.SOURCES)


def test_compress_is_deterministic():
    assert sources.compress(b'{"a":1}') == sources.compress(b'{"a":1}')


def test_at_least_fifteen_employers_with_json_endpoints():
    employers = {s.employer for s in sources.SOURCES}
    assert len(employers) >= 15
    for s in sources.SOURCES:
        assert s.url.startswith("https://")
        assert s.ats in {"Greenhouse", "Ashby", "Lever", "Workday"}


def test_workday_to_common_columns():
    payload = {"jobPostings": [{
        "title": "Financial Advisor Trainee-Mount Pleasant, SC", "locationsText": "Mount Pleasant",
        "externalPath": "/job/Mount-Pleasant/Financial-Advisor-Trainee_R-0012345-1",
        "postedOn": "Posted 3 Days Ago", "bulletFields": ["Mount Pleasant"]}]}
    rows = sources.convert_workday(payload, "Raymond James", base="https://x.wd1.myworkdayjobs.com/Site")
    assert rows == [{
        "source_id": "R-0012345-1", "employer": "Raymond James",
        "title": "Financial Advisor Trainee-Mount Pleasant, SC", "location": "Mount Pleasant",
        "department": "", "posted_date": "",
        "url": "https://x.wd1.myworkdayjobs.com/Site/job/Mount-Pleasant/Financial-Advisor-Trainee_R-0012345-1",
    }]


def test_workday_pages_through_every_posting(monkeypatch):
    import json
    calls = []

    def fake(url, timeout, data=None):
        calls.append(data["offset"])
        page = [{"title": f"t{i}", "externalPath": f"/job/x_{i}"}
                for i in range(data["offset"], min(data["offset"] + 20, 45))]
        # Workday sends "total" on the first page only
        return json.dumps({"total": 45 if data["offset"] == 0 else 0, "jobPostings": page}).encode()

    monkeypatch.setattr(sources, "_http_json", fake)
    src = next(s for s in sources.SOURCES if s.ats == "Workday")
    body = json.loads(sources._fetch_workday(src, 5))
    assert calls == [0, 20, 40] and len(body["jobPostings"]) == 45


def test_workday_search_term_is_sent(monkeypatch):
    import json
    seen = []

    def fake(url, timeout, data=None):
        seen.append(data["searchText"])
        return json.dumps({"total": 1, "jobPostings": [{"title": "t", "externalPath": "/job/x_1"}]}).encode()

    monkeypatch.setattr(sources, "_http_json", fake)
    merrill = sources.BY_NAME["merrill"]
    sources._fetch_workday(merrill, 5)
    assert seen == ["Merrill"]
