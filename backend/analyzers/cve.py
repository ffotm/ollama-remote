"""
CVE analyser — NVD API integration.

Public API:
  extract_cve_id(text)         -> "CVE-2024-1234" or None
  fetch_nvd_cve(cve_id)        -> dict | None
  build_cve_context(cve_data)  -> str   (ready to prepend to an LLM prompt)
"""

import re
from typing import Optional

import httpx

from config import NVD_API_BASE, NVD_API_KEY


# ── ID extraction ────────────────────────────────────────

def extract_cve_id(text: str) -> Optional[str]:
    """Return the first CVE-YYYY-NNNNN pattern found in *text*, upper-cased."""
    match = re.search(r"CVE-\d{4}-\d{4,7}", text, re.IGNORECASE)
    return match.group(0).upper() if match else None


# ── NVD fetch ────────────────────────────────────────────

async def fetch_nvd_cve(cve_id: str) -> Optional[dict]:
    """
    Query the NVD 2.0 REST API for *cve_id*.

    Returns a normalised dict with keys:
        id, description, cvss, affected_products, references,
        published, lastModified
    Returns None if the CVE is not found or on network error.
    """
    headers = {"Accept": "application/json"}
    if NVD_API_KEY:
        headers["apiKey"] = NVD_API_KEY

    url = f"{NVD_API_BASE}?cveId={cve_id}"
    try:
        async with httpx.AsyncClient(timeout=15, headers=headers) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return None

            raw = res.json()
            vulns = raw.get("vulnerabilities", [])
            if not vulns:
                return None

            cve_item = vulns[0].get("cve", {})

            return {
                "id": cve_id,
                "description": _extract_description(cve_item),
                "cvss": _extract_cvss(cve_item),
                "affected_products": _extract_affected_products(cve_item),
                "references": _extract_references(cve_item),
                "published": cve_item.get("published", "N/A"),
                "lastModified": cve_item.get("lastModified", "N/A"),
            }
    except Exception:
        return None


def _extract_description(cve_item: dict) -> str:
    descriptions = cve_item.get("descriptions", [])
    return next(
        (d["value"] for d in descriptions if d.get("lang") == "en"),
        "No description available.",
    )


def _extract_cvss(cve_item: dict) -> dict:
    """Try CVSS v3.1 → v3.0 → v2 in order; return the first hit."""
    metrics = cve_item.get("metrics", {})
    for version_key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(version_key, [])
        if not entries:
            continue
        entry = entries[0]
        cvss_data = entry.get("cvssData", {})
        return {
            "version": cvss_data.get("version", ""),
            "baseScore": cvss_data.get("baseScore", "N/A"),
            "baseSeverity": entry.get("baseSeverity") or cvss_data.get("baseSeverity", "N/A"),
            "vectorString": cvss_data.get("vectorString", "N/A"),
            "attackVector": cvss_data.get("attackVector") or cvss_data.get("accessVector", "N/A"),
            "attackComplexity": cvss_data.get("attackComplexity") or cvss_data.get("accessComplexity", "N/A"),
            "privilegesRequired": cvss_data.get("privilegesRequired", "N/A"),
            "userInteraction": cvss_data.get("userInteraction", "N/A"),
            "confidentialityImpact": cvss_data.get("confidentialityImpact", "N/A"),
            "integrityImpact": cvss_data.get("integrityImpact", "N/A"),
            "availabilityImpact": cvss_data.get("availabilityImpact", "N/A"),
        }
    return {}


def _extract_affected_products(cve_item: dict) -> list[str]:
    products: list[str] = []
    for config in cve_item.get("configurations", []):
        for node in config.get("nodes", []):
            for cpe_match in node.get("cpeMatch", []):
                if not cpe_match.get("vulnerable"):
                    continue
                parts = cpe_match.get("criteria", "").split(":")
                if len(parts) < 5:
                    continue
                vendor, product = parts[3], parts[4]
                ver_start = cpe_match.get("versionStartIncluding", "")
                ver_end = cpe_match.get(
                    "versionEndExcluding",
                    cpe_match.get("versionEndIncluding", ""),
                )
                entry = f"{vendor}/{product}"
                if ver_start:
                    entry += f" >= {ver_start}"
                if ver_end:
                    entry += f" < {ver_end}"
                products.append(entry)
    return products[:10]  # cap to avoid bloating the prompt


def _extract_references(cve_item: dict) -> list[str]:
    return [ref.get("url", "") for ref in cve_item.get("references", [])[:5]]


# ── Prompt context builder ───────────────────────────────

def build_cve_context(cve_data: dict) -> str:
    """
    Format a fetched CVE dict into a structured block ready to be
    prepended to the LLM prompt.
    """
    cvss = cve_data.get("cvss", {})
    products = cve_data.get("affected_products", [])
    refs = cve_data.get("references", [])

    lines = [
        f"=== LIVE NVD DATA FOR {cve_data['id']} ===",
        f"Published    : {cve_data['published']}",
        f"Last Modified: {cve_data['lastModified']}",
        "",
        f"DESCRIPTION:\n{cve_data['description']}",
        "",
    ]

    if cvss:
        lines += [
            f"CVSS {cvss.get('version', '')} SCORE:",
            f"  Base Score          : {cvss.get('baseScore')} ({cvss.get('baseSeverity')})",
            f"  Vector              : {cvss.get('vectorString')}",
            f"  Attack Vector       : {cvss.get('attackVector')}",
            f"  Attack Complexity   : {cvss.get('attackComplexity')}",
            f"  Privileges Required : {cvss.get('privilegesRequired')}",
            f"  User Interaction    : {cvss.get('userInteraction')}",
            f"  C / I / A Impact    : {cvss.get('confidentialityImpact')} / "
            f"{cvss.get('integrityImpact')} / {cvss.get('availabilityImpact')}",
            "",
        ]

    if products:
        lines.append("AFFECTED PRODUCTS:")
        lines += [f"  - {p}" for p in products]
        lines.append("")

    if refs:
        lines.append("REFERENCES:")
        lines += [f"  - {r}" for r in refs]
        lines.append("")

    lines.append("=== END NVD DATA ===")
    return "\n".join(lines)