"""The title rule: is a posting in the role (financial advisor)?

A title is in the role when it matches at least one INCLUDE pattern and none
of the EXCLUDE patterns. Matching is case-insensitive.
"""
import re

INCLUDE = [
    r"\bfinancial\s+(advis[oe]r|planner|consultant|coach)",
    r"\bfinancial\s+planning\s+(advis[oe]r|associate|consultant|specialist)",
    r"\bwealth\s+(advis[oe]r|planner|manager)",
    r"\b(investment|retirement|private\s+client|client)\s+advis[oe]r",
    r"\badvis[oe]r\s+associate\b",
    r"\bCFP\b",
]

EXCLUDE = [
    r"\bFP\s*&\s*A\b",
    r"\bfinancial\s+planning\s*(&|and)\s*analysis\b",
    r"\b(software|engineer|developer|data\s+scientist|designer)\b",
]

_INCLUDE = [re.compile(p, re.IGNORECASE) for p in INCLUDE]
_EXCLUDE = [re.compile(p, re.IGNORECASE) for p in EXCLUDE]


def in_role(title: str) -> bool:
    title = title or ""
    if any(p.search(title) for p in _EXCLUDE):
        return False
    return any(p.search(title) for p in _INCLUDE)
