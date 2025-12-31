"""Application entry point for the Seegars Fence newsletter."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from flask import Flask, Response, render_template, request

app = Flask(__name__, static_folder="assets", static_url_path="/assets")

DATA_DIR = Path("data")
ISSUES_DIR = DATA_DIR / "issues"


def _read_json(path: Path) -> Any:
    """Load JSON data from ``path`` and return its decoded payload."""

    return json.loads(path.read_text(encoding="utf-8"))


def _load_issue(issue_slug: str) -> dict:
    """Load the configured issue payload."""

    return _read_json(ISSUES_DIR / f"{issue_slug}.json")


def _check_auth(username: str | None, password: str | None) -> bool:
    """Validate the provided credentials against the configured values."""

    return username == "SEEGARS" and password == "Sfc1949!"


def _request_authentication() -> Response:
    """Return a 401 response prompting the browser to request credentials."""

    response = Response("Authentication required", 401)
    response.headers["WWW-Authenticate"] = 'Basic realm="Seegars Newsletter"'
    return response


@app.before_request
def _enforce_authentication() -> Response | None:
    """Ensure that every request supplies the correct basic-auth credentials."""

    auth = request.authorization
    if not auth or not _check_auth(auth.username, auth.password):
        return _request_authentication()

    return None


@app.route("/")
def index():
    """Render the main newsletter page."""

    issue = _load_issue("december-2025")

    return render_template(
        "index.html",
        issue=issue,
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
