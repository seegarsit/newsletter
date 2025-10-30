"""Application entry point for the Seegars Fence newsletter."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import List

from flask import Flask, render_template

app = Flask(__name__, static_folder="assets", static_url_path="/assets")

DATA_DIR = Path("data")
DOCS_DIR = Path("assets") / "docs"


def _read_json(path: Path) -> List[dict]:
    """Load JSON data from ``path`` and return it as a list of dictionaries."""

    return json.loads(path.read_text(encoding="utf-8"))


def _format_birthdays() -> list[dict]:
    """Return birthday entries with friendly date information."""

    birthdays = _read_json(DATA_DIR / "birthdays.json")
    formatted = []
    for entry in birthdays:
        timestamp_ms = entry.get("Birth Date")
        if timestamp_ms is None:
            continue

        date = datetime.utcfromtimestamp(timestamp_ms / 1000)
        formatted.append(
            {
                "name": entry.get("Name", ""),
                "office": entry.get("Office", ""),
                "date": f"{date.strftime('%B')} {date.day}",
                "weekday": date.strftime("%A"),
                "_sort_key": date.timetuple().tm_yday,
            }
        )

    formatted.sort(key=lambda item: item["_sort_key"])
    for item in formatted:
        item.pop("_sort_key", None)

    return formatted


def _format_anniversaries() -> list[dict]:
    """Return service anniversary entries preserving the source order."""

    anniversaries = _read_json(DATA_DIR / "anniversaries.json")
    return [
        {
            "name": entry.get("Name", ""),
            "office": entry.get("Office", ""),
            "tenure": entry.get("Length of Service", ""),
        }
        for entry in anniversaries
    ]


def _load_resources() -> list[dict]:
    """Parse resource links defined in ``Resources.txt``."""

    resource_text = (DOCS_DIR / "Resources.txt").read_text(encoding="utf-8")
    resource_pattern = re.compile(r"^\((.+?)\)\s+(https?://\S+)$")
    resources: list[dict] = []

    for line in resource_text.splitlines():
        line = line.strip()
        if not line:
            continue

        match = resource_pattern.match(line)
        if not match:
            continue

        resources.append({"label": match.group(1).strip(), "url": match.group(2).strip()})

    return resources


@app.route("/")
def index():
    """Render the main newsletter page."""

    birthdays = _format_birthdays()
    anniversaries = _format_anniversaries()
    resources = _load_resources()

    return render_template(
        "index.html",
        birthdays=birthdays,
        anniversaries=anniversaries,
        resources=resources,
        issue_month="November 2025",
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
