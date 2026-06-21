from __future__ import annotations

import re
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"}
DATABASE_EXTENSIONS = {".db", ".sqlite", ".sqlite3", ".duckdb"}
ALLOWED_IMAGES = {
    "docs/screenshots/dashboard.png",
    "docs/screenshots/upload-review.png",
}
PRIVATE_DIRECTORIES = {"test-slip", "uploads", "uploaded-receipts"}
UNSAFE_CLAIMS = (
    re.compile(r"\btax compliant\b", re.IGNORECASE),
    re.compile(r"\bguaranteed accounting accuracy\b", re.IGNORECASE),
    re.compile(r"\bproduction financial automation\b", re.IGNORECASE),
)
SECRET_PATTERNS = (
    re.compile(rb"AIza[0-9A-Za-z_-]{30,}"),
    re.compile(rb"(?:gsk_|csk-|sk-)[0-9A-Za-z_-]{20,}"),
)
TEXT_EXTENSIONS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sql",
    ".ts",
    ".tsx",
    ".txt",
    ".yml",
    ".yaml",
}


def find_violations(files: Mapping[str, bytes]) -> list[str]:
    violations: dict[str, str] = {}

    for raw_path, content in files.items():
        path = raw_path.replace("\\", "/")
        pure_path = PurePosixPath(path)
        parts = {part.lower() for part in pure_path.parts}
        suffix = pure_path.suffix.lower()
        name = pure_path.name.lower()

        if PRIVATE_DIRECTORIES & parts:
            violations[path] = "private receipt directory is tracked"
        elif name.startswith(".env") and name != ".env.example":
            violations[path] = "environment file is tracked"
        elif suffix in DATABASE_EXTENSIONS:
            violations[path] = "local database is tracked"
        elif suffix in IMAGE_EXTENSIONS and path not in ALLOWED_IMAGES:
            violations[path] = "unapproved image or PDF is tracked"

        if path == "scripts/check_repo_guardrails.py" or suffix not in TEXT_EXTENSIONS:
            continue

        if any(pattern.search(content) for pattern in SECRET_PATTERNS):
            violations.setdefault(path, "possible API key is tracked")
            continue

        text = content.decode("utf-8", errors="ignore")
        if any(pattern.search(text) for pattern in UNSAFE_CLAIMS):
            violations.setdefault(path, "unsafe financial claim is tracked")

    return [f"{path}: {reason}" for path, reason in sorted(violations.items())]


def tracked_files() -> dict[str, bytes]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    paths = [path for path in result.stdout.decode("utf-8").split("\0") if path]
    return {path: (ROOT / path).read_bytes() for path in paths}


def main() -> int:
    violations = find_violations(tracked_files())
    if not violations:
        print("Repository guardrails passed.")
        return 0

    for violation in violations:
        print(f"guardrail: {violation}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
