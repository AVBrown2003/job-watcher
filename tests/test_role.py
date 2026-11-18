import pytest

from job_watcher.role import in_role


@pytest.mark.parametrize("title", [
    "Financial Advisor", "Senior Financial Advisor, Retirement", "Wealth Advisor",
    "Principal Wealth Advisor", "Financial Planner", "CFP Professional",
    "Investment Adviser", "Private Client Advisor", "Associate Financial Advisor",
    "financial advisor (remote)",
])
def test_in_role(title):
    assert in_role(title)


@pytest.mark.parametrize("title", [
    "Software Engineer", "Advisor Onboarding Specialist", "Compliance Advisory Lead",
    "Director, FP&A", "Financial Planning & Analysis Manager",
    "Software Engineer, Wealth Advisor Tools", "Marketing Manager", "", None,
])
def test_not_in_role(title):
    assert not in_role(title)
