"""
Log analyser helpers.

Public API:
  detect_log_format(log_text)           -> str  (format label, e.g. "nginx_access")
  chunk_log(log_text, chunk_size=...)   -> list[str]
"""

import re

from config import LOG_CHUNK_SIZE


# ── Format signatures ────────────────────────────────────
# Each key maps to a list of regex patterns.
# detect_log_format scores the sample against all patterns and returns
# the label with the most hits.

_FORMAT_SIGNATURES: dict[str, list[str]] = {
    "nginx_access": [
        r'\d+\.\d+\.\d+\.\d+ - .+ \[.+\] "(GET|POST|PUT|DELETE|HEAD)',
        r'"(GET|POST) .+ HTTP/\d',
    ],
    "nginx_error": [
        r"\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\]",
        r"\[warn\].*nginx",
    ],
    "apache_access": [
        r'\d+\.\d+\.\d+\.\d+ - .+ \[.+\] "(GET|POST)',
        r'Mozilla/\d+\.\d+ .* \d{3} \d+',
    ],
    "apache_error": [
        r"\[.+\] \[error\] \[client \d+\.\d+\.\d+\.\d+\]",
        r"AH\d{5}:",
    ],
    "syslog": [
        r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+ \d{2}:\d{2}:\d{2}",
        r"\w+ kernel:",
        r"\w+ systemd\[",
    ],
    "auth_log": [
        r"sshd\[\d+\]:",
        r"Failed password for",
        r"Accepted publickey for",
        r"Invalid user",
        r"PAM:",
    ],
    "windows_event": [
        r"EventID:\s*\d+",
        r"Event ID:\s*\d+",
        r"Security\s+Audit",
        r"Logon Type:\s*\d+",
        r"Microsoft-Windows",
    ],
    "json_structured": [
        r'^\s*\{.*"level"\s*:',
        r'^\s*\{.*"timestamp"\s*:',
        r'^\s*\{.*"message"\s*:',
        r'^\s*\{.*"severity"\s*:',
    ],
    "cef": [
        r"CEF:\d+\|",
    ],
    "leef": [
        r"LEEF:\d+\.",
    ],
    "firewall_iptables": [
        r"IN=\w* OUT=\w*",
        r"SRC=\d+\.\d+\.\d+\.\d+ DST=",
        r"PROTO=(TCP|UDP|ICMP)",
    ],
    "aws_cloudtrail": [
        r'"eventSource"\s*:\s*"\w+\.amazonaws\.com"',
        r'"eventName"\s*:',
        r'"userAgent"\s*:',
    ],
    "kubernetes": [
        r'I\d{4} \d{2}:\d{2}:\d{2}\.\d+ .+ (kubelet|kube-apiserver|scheduler)',
        r"kube-system",
        r"pod/\w+-\w+-\w+",
    ],
}


def detect_log_format(log_text: str) -> str:
    """
    Sample the first 4 000 chars of *log_text* and return the best-matching
    format label.  Falls back to ``"unknown"`` if no patterns match.
    """
    sample = log_text[:4_000]
    scores: dict[str, int] = {}

    for fmt, patterns in _FORMAT_SIGNATURES.items():
        hits = sum(
            1
            for pat in patterns
            if re.search(pat, sample, re.MULTILINE | re.IGNORECASE)
        )
        if hits:
            scores[fmt] = hits

    return max(scores, key=scores.get) if scores else "unknown"


# ── Chunking ─────────────────────────────────────────────

def chunk_log(log_text: str, chunk_size: int = LOG_CHUNK_SIZE) -> list[str]:
    """
    Split *log_text* into chunks of at most *chunk_size* characters,
    always breaking on a newline boundary so individual log lines are
    never split across two chunks.
    """
    chunks: list[str] = []
    start = 0
    total = len(log_text)

    while start < total:
        end = min(start + chunk_size, total)
        # Walk back to the nearest newline to keep lines intact
        if end < total:
            nl = log_text.rfind("\n", start, end)
            if nl != -1 and nl > start:
                end = nl + 1
        chunks.append(log_text[start:end])
        start = end

    return chunks