"""
Code security analyser helpers.

Public API:
  detect_language(code)  -> str  (e.g. "Python", "JavaScript", "Unknown")
  OWASP_TOP10            -> str  (checklist ready to inject into a prompt)
"""

import re


# ── Language signatures ──────────────────────────────────

_LANGUAGE_SIGNATURES: dict[str, list[str]] = {
    "Python": [
        r"^\s*def \w+\(",
        r"^\s*import \w+",
        r"^\s*from \w+ import",
        r"^\s*class \w+.*:",
        r"print\(",
        r"if __name__ == ['\"]__main__['\"]",
    ],
    "JavaScript": [
        r"^\s*(const|let|var) ",
        r"=>\s*\{",
        r"require\(",
        r"module\.exports",
        r"console\.log\(",
        r"document\.",
    ],
    "TypeScript": [
        r": (string|number|boolean|void|any)\b",
        r"interface \w+",
        r"type \w+ =",
        r"<T>",
        r" as \w+",
    ],
    "Java": [
        r"public (static )?void main",
        r"System\.out\.println",
        r"import java\.",
        r"(public|private|protected) class \w+",
    ],
    "C": [
        r"#include\s*<",
        r"int main\(",
        r"printf\(",
        r"malloc\(",
        r"free\(",
        r"\bNULL\b",
    ],
    "C++": [
        r"#include\s*<iostream>",
        r"std::",
        r"cout\s*<<",
        r"cin\s*>>",
        r"new \w+\(",
        r"delete ",
    ],
    "C#": [
        r"using System;",
        r"namespace \w+",
        r"Console\.WriteLine\(",
        r"(public|private|protected) (static )?class \w+",
    ],
    "Go": [
        r"^package \w+",
        r"^import \(",
        r"func \w+\(",
        r"fmt\.Print",
        r":= ",
        r"go \w+\(",
    ],
    "Rust": [
        r"fn main\(\)",
        r"let mut ",
        r"println!\(",
        r"use std::",
        r"impl \w+",
        r"->\s*(i32|String|bool|Vec)",
    ],
    "PHP": [
        r"<\?php",
        r"\$\w+ =",
        r"echo ",
        r"function \w+\(",
        r"->",
        r"::",
    ],
    "Ruby": [
        r"def \w+",
        r"puts ",
        r"require ['\"]",
        r"end\s*$",
        r"\.each do",
        r"@\w+",
    ],
    "Shell": [
        r"#!/bin/(bash|sh|zsh)",
        r"\$\{?\w+\}?",
        r"echo ",
        r"chmod ",
        r"if \[",
        r"\bfi\b",
        r"done\s*$",
    ],
    "SQL": [
        r"\bSELECT\b",
        r"\bFROM\b",
        r"\bWHERE\b",
        r"\bINSERT INTO\b",
        r"\bDROP TABLE\b",
        r"\bJOIN\b",
    ],
    "Kotlin": [
        r"fun main\(",
        r"val \w+ =",
        r"var \w+ =",
        r"println\(",
        r"data class \w+",
        r"companion object",
    ],
    "Swift": [
        r"import Swift",
        r"func \w+\(.*\) ->",
        r"let \w+:",
        r"var \w+:",
        r"print\(",
        r"guard let",
    ],
}


def detect_language(code: str) -> str:
    """
    Score *code* (first 6 000 chars) against known language signatures and
    return the best-matching language name.  Returns ``"Unknown"`` if no
    pattern fires.
    """
    sample = code[:6_000]
    scores: dict[str, int] = {}

    for lang, patterns in _LANGUAGE_SIGNATURES.items():
        hits = sum(
            1
            for pat in patterns
            if re.search(pat, sample, re.MULTILINE)
        )
        if hits:
            scores[lang] = hits

    return max(scores, key=scores.get) if scores else "Unknown"


# ── OWASP Top 10 checklist ───────────────────────────────

OWASP_TOP10 = """\
OWASP Top 10 Security Checklist (2021):
A01 - Broken Access Control      : Verify proper authorization checks, path traversal, IDOR
A02 - Cryptographic Failures     : Weak ciphers, hardcoded keys/passwords, plaintext secrets
A03 - Injection                  : SQL, OS command, LDAP, XSS, template injection, eval() usage
A04 - Insecure Design            : Missing rate limiting, business logic flaws
A05 - Security Misconfiguration  : Debug flags, default creds, overly permissive CORS, verbose errors
A06 - Vulnerable Components      : Outdated dependencies, known CVEs in imports
A07 - Auth & Session Failures    : Weak passwords, session fixation, missing MFA, JWT issues
A08 - Software & Data Integrity  : Unsafe deserialization, pickle/eval/exec usage
A09 - Logging & Monitoring Gaps  : Sensitive data in logs, missing audit trails
A10 - SSRF                       : Unvalidated URLs passed to HTTP clients, internal network probing\
"""