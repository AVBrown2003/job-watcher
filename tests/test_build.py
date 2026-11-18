import json

from job_watcher import build, sources


def p(sid, title="Financial Advisor"):
    return {"source_id": sid, "employer": "E", "title": title, "location": "L",
            "department": "", "posted_date": "", "url": f"https://x/{sid}"}


def day(history, date, ids, first_run=False, source="s"):
    build.apply_day(history, source, date, [p(i) for i in ids], first_run)


def test_first_seen_last_seen_and_first_run():
    h = {}
    day(h, "2026-01-01", ["a", "b"], first_run=True)
    day(h, "2026-01-02", ["a", "b", "c"])
    assert h["s:a"]["first_seen"] == "2026-01-01" and h["s:a"]["first_run"] is True
    assert h["s:a"]["last_seen"] == "2026-01-02"
    assert h["s:c"]["first_seen"] == "2026-01-02" and h["s:c"]["first_run"] is False
    assert all(r["status"] == "open" for r in h.values())


def test_removed_when_no_longer_listed():
    h = {}
    day(h, "2026-01-01", ["a", "b"], first_run=True)
    day(h, "2026-01-02", ["a"])
    assert h["s:b"]["status"] == "removed" and h["s:b"]["removed_date"] == "2026-01-02"
    assert h["s:b"]["last_seen"] == "2026-01-01"
    assert h["s:a"]["status"] == "open" and h["s:a"]["removed_date"] == ""


def test_removed_posting_listed_again_reopens():
    h = {}
    day(h, "2026-01-01", ["a"], first_run=True)
    day(h, "2026-01-02", [])
    assert h["s:a"]["status"] == "removed"
    day(h, "2026-01-03", ["a"])
    row = h["s:a"]
    assert row["status"] == "open" and row["removed_date"] == ""
    assert row["first_seen"] == "2026-01-01" and row["last_seen"] == "2026-01-03"


def test_removal_only_touches_its_own_source():
    h = {}
    day(h, "2026-01-01", ["a"], first_run=True, source="s1")
    day(h, "2026-01-01", ["z"], first_run=True, source="s2")
    day(h, "2026-01-02", [], source="s1")
    assert h["s1:a"]["status"] == "removed"
    assert h["s2:z"]["status"] == "open"


def test_duplicate_ids_in_one_day_make_one_row():
    h = {}
    build.apply_day(h, "s", "2026-01-01", [p("a"), p("a")], True)
    assert len(h) == 1


def write_raw(root, date, name, jobs):
    d = root / date
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.json.gz").write_bytes(sources.compress(json.dumps({"jobs": jobs}).encode()))


def gh_job(i, title="Financial Advisor"):
    return {"id": i, "title": title, "location": {"name": "NYC"}, "absolute_url": f"https://x/{i}"}


def test_build_history_from_raw_files(tmp_path):
    write_raw(tmp_path, "2026-01-01", "betterment", [gh_job(1), gh_job(2, "Engineer")])
    write_raw(tmp_path, "2026-01-02", "betterment", [gh_job(1), gh_job(3)])
    # a source with no raw file on 01-02 must not have its postings removed
    write_raw(tmp_path, "2026-01-01", "sofi", [gh_job(9)])
    rows = {r["posting_id"]: r for r in build.build_history(tmp_path)}
    assert list(rows) == sorted(rows)
    assert rows["betterment:2"]["status"] == "removed"
    assert rows["betterment:2"]["removed_date"] == "2026-01-02"
    assert rows["betterment:3"]["first_run"] is False
    assert rows["betterment:1"]["first_run"] is True
    assert rows["betterment:1"]["in_role"] is True and rows["betterment:2"]["in_role"] is False
    assert rows["sofi:9"]["status"] == "open"


def test_first_run_is_the_first_raw_file_of_each_source(tmp_path):
    write_raw(tmp_path, "2026-01-01", "betterment", [gh_job(1)])
    write_raw(tmp_path, "2026-01-02", "betterment", [gh_job(1)])
    write_raw(tmp_path, "2026-01-02", "sofi", [gh_job(5)])  # sofi failed on day 1
    rows = {r["posting_id"]: r for r in build.build_history(tmp_path)}
    assert rows["sofi:5"]["first_run"] is True


def test_build_is_reproducible_and_writes_csv(tmp_path):
    raw = tmp_path / "raw"
    write_raw(raw, "2026-01-01", "betterment", [gh_job(2), gh_job(1)])
    out1, out2 = tmp_path / "a.csv", tmp_path / "b.csv"
    build.write_history(build.build_history(raw), out1)
    build.write_history(build.build_history(raw), out2)
    assert out1.read_bytes() == out2.read_bytes()
    lines = out1.read_text(encoding="utf-8").splitlines()
    assert lines[0] == ",".join(build.COLUMNS)
    assert lines[1].startswith("betterment:1,betterment,1,")
    assert ",true,true,2026-01-01,2026-01-01,open," in lines[1]
