from job_watcher import pipeline


def row(pid, **kw):
    base = {"posting_id": pid, "employer": "E", "title": "T", "location": "L", "url": "u",
            "in_role": False, "first_run": False, "first_seen": "2026-01-01",
            "status": "open", "removed_date": ""}
    base.update(kw)
    return base


JOB = b'{"jobs": [{"id": 1, "title": "T", "absolute_url": "u"}]}'


def test_status_counts(monkeypatch):
    monkeypatch.setattr(pipeline.build, "raw_files", lambda: {"2026-01-01": {}, "2026-01-02": {}})
    rows = [
        row("a", first_run=True),
        row("b", first_seen="2026-01-02"),
        row("c", first_seen="2026-01-02", first_run=True),
        row("d", status="removed", removed_date="2026-01-02"),
    ]
    results = [{"name": "s", "ok": True, "count": 3, "error": "ignored"}]
    st = pipeline.make_status(rows, results, "2026-01-02T09:00:00Z", "2026-01-02")
    assert st["days_with_success"] == 2 and st["first_run_date"] == "2026-01-01"
    assert st["open"] == 3 and st["new_today"] == 1 and st["removed_today"] == 1
    assert st["sources"] == [{"name": "s", "ok": True, "count": 3}]


def test_status_sources_sorted_by_postings_listed():
    results = [{"name": "b", "ok": True, "count": 5}, {"name": "z", "ok": False, "count": 0},
               {"name": "a", "ok": True, "count": 5}, {"name": "c", "ok": True, "count": 9}]
    st = pipeline.make_status([], results, "2026-01-02T09:00:00Z", "2026-01-02")
    assert [x["name"] for x in st["sources"]] == ["c", "a", "b", "z"]


def test_issue_body_lists_new_and_removed_with_links():
    rows = [row("a", first_seen="2026-01-02", title="New Job", url="https://x/a"),
            row("b", status="removed", removed_date="2026-01-02", title="Gone", url="https://x/b")]
    st = {"run_time": "t", "open": 1, "sources": [{"name": "s", "ok": False, "count": 0}]}
    body = pipeline.issue_body(rows, "2026-01-02", st)
    assert "[New Job](https://x/a)" in body and "[Gone](https://x/b)" in body
    assert "Sources that failed today: s" in body


def test_issue_body_with_no_changes():
    body = pipeline.issue_body([], "2026-01-02", {"run_time": "t", "open": 0, "sources": []})
    assert body.count("- none") == 2


def test_failed_source_does_not_stop_the_run(tmp_path, monkeypatch):
    monkeypatch.setattr(pipeline.build, "RAW_DIR", tmp_path)

    def fake_fetch(src):
        if src.name == "sofi":
            raise RuntimeError("boom")
        return JOB

    monkeypatch.setattr(pipeline.sources, "fetch", fake_fetch)
    keep = [s for s in pipeline.sources.SOURCES if s.name in ("sofi", "betterment")]
    monkeypatch.setattr(pipeline.sources, "SOURCES", keep)
    results = pipeline.run_sources("2026-01-01")
    by = {r["name"]: r for r in results}
    assert by["sofi"]["ok"] is False and by["betterment"]["ok"] is True
    assert (tmp_path / "2026-01-01" / "betterment.json.gz").exists()
    assert not (tmp_path / "2026-01-01" / "sofi.json.gz").exists()


def test_second_run_replaces_the_days_raw_files(tmp_path, monkeypatch):
    monkeypatch.setattr(pipeline.build, "RAW_DIR", tmp_path)
    one = pipeline.sources.SOURCES[:1]
    monkeypatch.setattr(pipeline.sources, "SOURCES", one)
    monkeypatch.setattr(pipeline.sources, "fetch", lambda s: JOB)
    pipeline.run_sources("2026-01-01")
    assert (tmp_path / "2026-01-01" / f"{one[0].name}.json.gz").exists()

    def broken(s):
        raise RuntimeError("down")

    monkeypatch.setattr(pipeline.sources, "fetch", broken)
    pipeline.run_sources("2026-01-01")
    assert not (tmp_path / "2026-01-01" / f"{one[0].name}.json.gz").exists()
