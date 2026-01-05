"""Application entry point for the Seegars Fence newsletter."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import bleach
from flask import (
    Flask,
    Response,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy
from markupsafe import Markup, escape
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder="assets", static_url_path="/assets")

DATA_DIR = Path("data")
ISSUES_DIR = DATA_DIR / "issues"

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
app.config["ADMIN_EMAIL"] = os.environ.get("ADMIN_EMAIL")
app.config["ADMIN_PASSWORD"] = os.environ.get("ADMIN_PASSWORD")
app.config["SITE_USERNAME"] = os.environ.get("SITE_USERNAME", "SEEGARS")
app.config["SITE_PASSWORD"] = os.environ.get("SITE_PASSWORD", "Sfc1949!")
default_database_url = (
    "postgresql+psycopg://seegarsit_db_user:x6HcYaFnxMN5x4bCVcC9NC11GkL7GOF8"
    "@dpg-d3uiemfdiees73eadfg0-a/seegarsit_db"
)
database_url = os.environ.get("DATABASE_URL", default_database_url)
if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = default_database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

login_manager = LoginManager()
login_manager.login_view = "admin_login"
login_manager.init_app(app)

db = SQLAlchemy(app)
_db_initialized = False

ALLOWED_TAGS = [
    "p",
    "strong",
    "b",
    "em",
    "a",
    "ul",
    "ol",
    "li",
    "br",
    "span",
    "div",
    "h3",
    "h4",
    "h5",
]
ALLOWED_ATTRS = {
    "a": ["href", "target", "rel"],
    "*": ["class"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]
THEME_TOKENS = {
    "ink": "--ink",
    "ink_muted": "--ink-muted",
    "ink_soft": "--ink-soft",
    "accent": "--accent",
    "accent_strong": "--accent-strong",
    "surface": "--surface",
    "surface_alt": "--surface-alt",
    "card": "--card",
    "highlight": "--highlight",
    "highlight_text": "--highlight-text",
}
COLOR_PATTERN = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
FONT_SIZE_PATTERN = re.compile(r"^\d+(\.\d+)?px$")
STYLE_COLOR_KEYS = ("background_color", "text_color")
META_SEPARATOR = " • "
ALLOWED_MEDIA_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "webp"}
ALLOWED_ALIGNMENTS = {"left", "center", "right"}
ALLOWED_MEDIA_ALIGNMENTS = {
    "left",
    "center",
    "right",
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
}


def _default_theme() -> dict[str, str]:
    """Return the default site theme colors."""

    return {
        "ink": "#22577A",
        "ink_muted": "#2C6A8C",
        "ink_soft": "#3A7A96",
        "accent": "#38A3A5",
        "accent_strong": "#22577A",
        "surface": "#C7F9CC",
        "surface_alt": "#80ED99",
        "card": "#ffffff",
        "highlight": "#57CC99",
        "highlight_text": "#22577A",
    }


class AdminUser(UserMixin, db.Model):
    """Application admin user."""

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Issue(db.Model):
    """Newsletter issue configuration."""

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(80), unique=True, nullable=False)
    issue_month = db.Column(db.String(120), nullable=False)
    hero = db.Column(db.JSON, nullable=False)
    modules = db.Column(db.JSON, nullable=False)
    is_active = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


@login_manager.user_loader
def load_user(user_id: str) -> AdminUser | None:
    """Load an admin user for session management."""

    return db.session.get(AdminUser, int(user_id))


def _read_json(path: Path) -> Any:
    """Load JSON data from ``path`` and return its decoded payload."""

    return json.loads(path.read_text(encoding="utf-8"))


def _theme_style(theme: dict[str, Any] | None) -> str:
    """Build an inline theme style string."""

    if not theme:
        return ""

    segments = []
    for key, css_var in THEME_TOKENS.items():
        value = str(theme.get(key, "")).strip()
        if value:
            segments.append(f"{css_var}: {value}")
    return "; ".join(segments)


def _style_vars(values: dict[str, Any] | None) -> str:
    """Build inline CSS variables from a dictionary."""

    if not values:
        return ""

    segments = []
    for key, value in values.items():
        cleaned = str(value or "").strip()
        if cleaned:
            segments.append(f"{key}: {cleaned}")
    return "; ".join(segments)


def _sort_editorial_cards(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort editorial cards so the team letter is always first."""

    def sort_key(item: dict[str, Any]) -> tuple[int, int]:
        order_value = item.get("order", 0)
        try:
            order = int(order_value)
        except (TypeError, ValueError):
            order = 0
        return (
            0 if item.get("id") == "team-letter" else 1,
            order,
        )

    return sorted(cards or [], key=sort_key)


def _sanitize_html(content: str) -> str:
    """Sanitize rich HTML content."""

    return bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )


def _split_meta(meta: str) -> list[str]:
    """Split a meta string into trimmed parts."""

    if not meta:
        return []
    return [part.strip() for part in re.split(r"[·•]", meta) if part.strip()]


def _join_meta(parts: list[str]) -> str:
    """Join meta parts into a standardized string."""

    return META_SEPARATOR.join([part for part in parts if part])


def _normalize_birthday(entry: dict[str, Any]) -> dict[str, str]:
    """Normalize birthday payload to two display lines."""

    name = str(entry.get("name", "")).strip()
    line_one = str(entry.get("line_one", "")).strip()
    line_two = str(entry.get("line_two", "")).strip()

    if not line_one and not line_two:
        date = str(entry.get("date", "")).strip()
        weekday = str(entry.get("weekday", "")).strip()
        office = str(entry.get("office", "")).strip()
        line_one = _join_meta([date, weekday])
        line_two = office

    if not line_one and not line_two:
        parts = _split_meta(str(entry.get("meta", "")).strip())
        if parts:
            line_one = _join_meta(parts[:2])
            if len(parts) > 2:
                line_two = _join_meta(parts[2:])

    return {
        "name": name,
        "line_one": line_one,
        "line_two": line_two,
    }


def _normalize_anniversary(entry: dict[str, Any]) -> dict[str, str]:
    """Normalize anniversary payload to two display lines."""

    name = str(entry.get("name", "")).strip()
    line_one = str(entry.get("line_one", "")).strip()
    line_two = str(entry.get("line_two", "")).strip()

    if not line_one and not line_two:
        tenure = str(entry.get("tenure", "")).strip()
        office = str(entry.get("office", "")).strip()
        line_one = tenure
        line_two = office

    if not line_one and not line_two:
        parts = _split_meta(str(entry.get("meta", "")).strip())
        if parts:
            line_one = parts[0]
            if len(parts) > 1:
                line_two = _join_meta(parts[1:])

    return {
        "name": name,
        "line_one": line_one,
        "line_two": line_two,
    }


def _celebration_lines(entry: dict[str, Any], kind: str) -> tuple[str, str]:
    """Return celebration line one/two for templates."""

    if kind == "birthday":
        normalized = _normalize_birthday(entry)
    else:
        normalized = _normalize_anniversary(entry)
    return normalized.get("line_one", ""), normalized.get("line_two", "")


def _render_body(body: dict[str, Any]) -> Markup:
    """Render body content based on mode."""

    content = body.get("content", "")
    mode = body.get("mode", "plain")
    if mode == "rich":
        return Markup(_sanitize_html(content))
    return Markup(escape(content).replace("\n", "<br>"))


def _text_length(body: dict[str, Any]) -> int:
    """Estimate text length for collapse heuristics."""

    content = body.get("content", "")
    if body.get("mode") == "rich":
        cleaned = re.sub(r"<[^>]+>", "", content)
        return len(cleaned.strip())
    return len(content.strip())


def _sanitize_text_styles(styles: dict[str, Any] | None) -> dict[str, dict[str, str]]:
    """Sanitize inline text styles stored by the inline editor."""

    if not isinstance(styles, dict):
        return {}

    cleaned: dict[str, dict[str, str]] = {}
    for key, value in styles.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            continue
        entry: dict[str, str] = {}
        color = str(value.get("color", "")).strip()
        if COLOR_PATTERN.match(color):
            entry["color"] = color
        font_size = str(value.get("font_size", "")).strip()
        if FONT_SIZE_PATTERN.match(font_size):
            entry["font_size"] = font_size
        if entry:
            cleaned[key] = entry
    return cleaned


def _sanitize_element_styles(styles: dict[str, Any] | None) -> dict[str, dict[str, str]]:
    """Sanitize inline element styles stored by the inline editor."""

    if not isinstance(styles, dict):
        return {}

    cleaned: dict[str, dict[str, str]] = {}
    for key, value in styles.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            continue
        entry: dict[str, str] = {}
        for style_key in STYLE_COLOR_KEYS:
            color = str(value.get(style_key, "")).strip()
            if COLOR_PATTERN.match(color):
                entry[style_key] = color
        if entry:
            cleaned[key] = entry
    return cleaned


def _inline_text_style(styles: dict[str, Any] | None, path: str) -> str:
    """Build inline styles for a specific editable text path."""

    if not styles or not isinstance(styles, dict) or not path:
        return ""

    value = styles.get(path)
    if not isinstance(value, dict):
        return ""

    segments = []
    color = str(value.get("color", "")).strip()
    if COLOR_PATTERN.match(color):
        segments.append(f"color: {color}")
    font_size = str(value.get("font_size", "")).strip()
    if FONT_SIZE_PATTERN.match(font_size):
        segments.append(f"font-size: {font_size}")
    return "; ".join(segments)


def _inline_element_style(styles: dict[str, Any] | None, path: str) -> str:
    """Build inline styles for a specific editable element path."""

    if not styles or not isinstance(styles, dict) or not path:
        return ""

    value = styles.get(path)
    if not isinstance(value, dict):
        return ""

    segments = []
    background_color = str(value.get("background_color", "")).strip()
    if COLOR_PATTERN.match(background_color):
        segments.append(f"background-color: {background_color}")
    text_color = str(value.get("text_color", "")).strip()
    if COLOR_PATTERN.match(text_color):
        segments.append(f"color: {text_color}")
    return "; ".join(segments)


def _migrate_issue(issue: dict[str, Any]) -> dict[str, Any]:
    """Convert file-based issue JSON to the database schema."""

    hero = {
        "title": issue["hero"]["title"],
        "subtitle": "\n".join(issue["hero"].get("tagline", [])),
        "image": issue["hero"]["image"],
        "cta": {"label": "", "url": ""},
        "theme": _default_theme(),
        "text_styles": {},
        "element_styles": {},
    }

    modules: list[dict[str, Any]] = []
    for module in issue["modules"]:
        if module["type"] == "featured_story":
            modules.append(
                {
                    "type": "featured_story",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "body": {"content": module["body_html"], "mode": "rich"},
                    "style_preset": "featured",
                }
            )
        elif module["type"] == "editorial_grid":
            cards = []
            for card in module["cards"]:
                cards.append(
                    {
                        "id": card["id"],
                        "eyebrow": card["eyebrow"],
                        "title": card["title"],
                        "body": {
                            "content": card["body_html"],
                            "mode": "rich",
                        },
                        "cta": card.get("cta") or {"label": "", "url": ""},
                        "style_preset": "default",
                        "alignment": "left",
                        "media_alignment": "left",
                        "media": [],
                    }
                )
            modules.append(
                {
                    "type": "editorial_grid",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "intro": module["intro"],
                    "cards": cards,
                    "style_preset": "default",
                }
            )
        elif module["type"] == "highlight_panel":
            modules.append(
                {
                    "type": "highlight_panel",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "label": module.get("label", ""),
                    "body": {"content": module["body_html"], "mode": "rich"},
                    "style_preset": "highlight",
                }
            )
        elif module["type"] == "celebrations":
            birthdays = []
            for birthday in module["birthdays"]:
                birthdays.append(_normalize_birthday(birthday))
            anniversaries = []
            for anniversary in module["anniversaries"]:
                anniversaries.append(_normalize_anniversary(anniversary))
            modules.append(
                {
                    "type": "celebrations",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "intro": module["intro"],
                    "birthdays": birthdays,
                    "anniversaries": anniversaries,
                    "style_preset": "default",
                }
            )
        elif module["type"] == "contributors":
            modules.append(
                {
                    "type": "contributors",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "people": module["people"],
                    "style_preset": "default",
                }
            )
        elif module["type"] == "resource_hub":
            links = module.get("links")
            if links is None:
                links = []
                for group in module.get("groups", []):
                    links.extend(group.get("links", []))
            modules.append(
                {
                    "type": "resource_hub",
                    "enabled": module["enabled"],
                    "id": "resource_hub",
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "intro": module["intro"],
                    "links": links,
                    "style_preset": "default",
                }
            )

    return {
        "slug": "current",
        "issue_month": issue["issue_month"],
        "hero": hero,
        "modules": modules,
    }


def _ensure_seed_data() -> None:
    """Ensure that a default issue is loaded into the database."""

    if Issue.query.first():
        return

    if ISSUES_DIR.exists():
        payload = _read_json(ISSUES_DIR / "december-2025.json")
        migrated = _migrate_issue(payload)
        issue = Issue(
            slug="current",
            issue_month=migrated["issue_month"],
            hero=migrated["hero"],
            modules=migrated["modules"],
            is_active=True,
        )
        db.session.add(issue)
        db.session.commit()


def _ensure_database_ready() -> None:
    """Create tables and seed defaults once per process."""

    global _db_initialized
    if _db_initialized:
        return
    db.create_all()
    _ensure_seed_data()
    _db_initialized = True


@app.cli.command("init-db")
def init_db() -> None:
    """Create database tables and seed initial data."""

    db.create_all()
    _ensure_seed_data()


@app.context_processor
def inject_helpers() -> dict[str, Any]:
    """Provide template helpers."""

    return {
        "render_body": _render_body,
        "body_length": _text_length,
        "theme_style": _theme_style,
        "style_vars": _style_vars,
        "default_theme": _default_theme,
        "sort_editorial_cards": _sort_editorial_cards,
        "inline_text_style": _inline_text_style,
        "inline_element_style": _inline_element_style,
        "celebration_lines": _celebration_lines,
    }


@app.before_request
def ensure_database_ready() -> None:
    """Ensure database tables exist before serving requests."""

    _ensure_database_ready()


@app.before_request
def require_site_auth() -> Response | None:
    """Require site credentials before allowing access."""

    if request.endpoint in {"static", "site_login", "admin_login"}:
        return None

    if request.path.startswith("/admin"):
        return None

    if current_user.is_authenticated:
        return None

    if session.get("site_authenticated"):
        return None

    next_url = request.full_path if request.full_path else request.path
    return redirect(url_for("site_login", next=next_url))


@app.route("/")
def index() -> str:
    """Render the main newsletter page."""

    issue = _get_current_issue()
    if not issue:
        return render_template("index.html", issue=None)

    return render_template("index.html", issue=issue)


def _safe_next_url(next_url: str | None) -> str:
    """Return a safe redirect destination."""

    if next_url and next_url.startswith("/"):
        return next_url
    return url_for("index")


@app.route("/login", methods=["GET", "POST"])
def site_login() -> str | Response:
    """Authenticate site visitors."""

    if session.get("site_authenticated") or current_user.is_authenticated:
        return redirect(url_for("index"))

    issue = _get_current_issue()
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        site_username = app.config.get("SITE_USERNAME")
        site_password = app.config.get("SITE_PASSWORD")

        if username == site_username and password == site_password:
            session["site_authenticated"] = True
            next_url = _safe_next_url(request.args.get("next"))
            return redirect(next_url)

        flash("Invalid username or password.", "error")

    return render_template("login.html", issue=issue)


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login() -> str | Response:
    """Authenticate an admin user."""

    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        email = request.form.get("email", "")
        password = request.form.get("password", "")

        user = AdminUser.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for("index"))

        env_email = app.config.get("ADMIN_EMAIL")
        env_password = app.config.get("ADMIN_PASSWORD")
        if not user and env_email and env_password:
            if email == env_email and password == env_password:
                user = AdminUser(
                    email=email,
                    password_hash=generate_password_hash(password),
                )
                db.session.add(user)
                db.session.commit()
                login_user(user)
                return redirect(url_for("index"))

        flash("Invalid credentials.", "error")

    return render_template("admin/login.html")


@app.route("/admin/logout")
@login_required
def admin_logout() -> Response:
    """Log the user out."""

    logout_user()
    return redirect(url_for("admin_login"))


def _get_current_issue() -> Issue | None:
    """Fetch or initialize the current issue."""

    issue = Issue.query.filter_by(slug="current").first()
    if issue:
        if not issue.is_active:
            issue.is_active = True
            db.session.commit()
        return issue

    issue = Issue.query.first()
    if issue:
        issue.slug = "current"
        issue.is_active = True
        db.session.commit()
        return issue

    _ensure_seed_data()
    return Issue.query.filter_by(slug="current").first()


def _sanitize_body(body: dict[str, Any] | None) -> dict[str, Any]:
    """Sanitize body payloads."""

    if not body:
        return {"content": "", "mode": "plain"}

    mode = body.get("mode", "plain")
    content = body.get("content", "")
    if mode == "rich":
        content = _sanitize_html(str(content))
    return {"content": content, "mode": mode}


def _sanitize_media_items(items: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    """Sanitize card media items."""

    if not isinstance(items, list):
        return []

    cleaned: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or item.get("src") or "").strip()
        if not path:
            continue
        ext = Path(path).suffix.lower().lstrip(".")
        if ext not in ALLOWED_MEDIA_EXTENSIONS:
            continue
        alt = str(item.get("alt") or "").strip()
        cleaned.append({"path": path, "alt": alt})
    return cleaned


def _sanitize_alignment(
    value: str | None,
    default: str = "left",
    allowed_alignments: set[str] | None = None,
) -> str:
    """Return a supported alignment token."""

    if allowed_alignments is None:
        allowed_alignments = ALLOWED_ALIGNMENTS
    if isinstance(value, str) and value in allowed_alignments:
        return value
    return default


def _sanitize_issue_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Sanitize issue payload before persisting."""

    hero = payload.get("hero", {})
    hero_theme = hero.get("theme", {})
    hero_text_styles = _sanitize_text_styles(hero.get("text_styles"))
    hero_element_styles = _sanitize_element_styles(hero.get("element_styles"))
    cleaned = {
        "issue_month": payload.get("issue_month", ""),
        "hero": {
            "title": hero.get("title", ""),
            "subtitle": hero.get("subtitle", ""),
            "image": hero.get("image", ""),
            "cta": hero.get("cta", {"label": "", "url": ""}),
            "theme": hero_theme,
            "text_styles": hero_text_styles,
            "element_styles": hero_element_styles,
        },
        "modules": [],
    }

    for module in payload.get("modules", []):
        module_type = module.get("type")
        base = {
            "type": module_type,
            "enabled": module.get("enabled", True),
            "id": module.get("id", ""),
            "eyebrow": module.get("eyebrow", ""),
            "title": module.get("title", ""),
            "style_preset": module.get("style_preset", "default"),
        }

        if module_type == "featured_story":
            base["body"] = _sanitize_body(module.get("body"))
        elif module_type == "editorial_grid":
            base["intro"] = module.get("intro", "")
            cards = []
            for card in module.get("cards", []):
                alignment = _sanitize_alignment(card.get("alignment"), "left")
                media_alignment = _sanitize_alignment(
                    card.get("media_alignment"),
                    alignment,
                    allowed_alignments=ALLOWED_MEDIA_ALIGNMENTS,
                )
                cards.append(
                    {
                        "id": card.get("id", ""),
                        "eyebrow": card.get("eyebrow", ""),
                        "title": card.get("title", ""),
                        "body": _sanitize_body(card.get("body")),
                        "cta": card.get("cta", {"label": "", "url": ""}),
                        "style_preset": card.get("style_preset", "default"),
                        "alignment": alignment,
                        "media_alignment": media_alignment,
                        "media": _sanitize_media_items(card.get("media")),
                    }
                )
            base["cards"] = cards
        elif module_type == "highlight_panel":
            base["label"] = module.get("label", "")
            base["background_color"] = module.get("background_color", "")
            base["text_color"] = module.get("text_color", "")
            base["body"] = _sanitize_body(module.get("body"))
        elif module_type == "celebrations":
            base["intro"] = module.get("intro", "")
            base["birthdays"] = [
                _normalize_birthday(item)
                for item in module.get("birthdays", [])
                if isinstance(item, dict)
            ]
            base["anniversaries"] = [
                _normalize_anniversary(item)
                for item in module.get("anniversaries", [])
                if isinstance(item, dict)
            ]
        elif module_type == "contributors":
            base["people"] = module.get("people", [])
        elif module_type == "resource_hub":
            base["id"] = module.get("id", "resource_hub")
            base["intro"] = module.get("intro", "")
            links = module.get("links")
            if links is None:
                links = []
                for group in module.get("groups", []):
                    links.extend(group.get("links", []))
            base["links"] = links
        else:
            continue

        cleaned["modules"].append(base)

    return cleaned


@app.route("/admin/api/current")
@login_required
def admin_api_current() -> Response:
    """Return the current issue configuration."""

    issue = _get_current_issue()
    if not issue:
        return Response(status=404)

    return Response(
        json.dumps(
            {
                "slug": issue.slug,
                "issue_month": issue.issue_month,
                "hero": issue.hero,
                "modules": issue.modules,
            }
        ),
        mimetype="application/json",
    )


@app.route("/admin/api/current", methods=["POST"])
@login_required
def admin_api_update_current() -> Response:
    """Update the current issue configuration."""

    issue = _get_current_issue()
    if not issue:
        return Response(status=404)

    payload = request.get_json(silent=True) or {}
    cleaned = _sanitize_issue_payload(payload)
    issue.issue_month = cleaned["issue_month"]
    issue.hero = cleaned["hero"]
    issue.modules = cleaned["modules"]
    issue.is_active = True
    issue.slug = "current"
    db.session.commit()
    return Response(status=204)


@app.route("/admin/upload-image", methods=["POST"])
@login_required
def admin_upload_image() -> Response:
    """Upload an image for inline editor usage."""

    image = request.files.get("image")
    if not image or not image.filename:
        return Response("No image uploaded.", status=400)

    filename = secure_filename(image.filename)
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        return Response("Unsupported file type.", status=400)

    upload_dir = Path(app.static_folder) / "images" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{Path(filename).stem}-{timestamp}.{ext}"
    image.save(upload_dir / safe_name)

    return Response(
        json.dumps({"path": f"images/uploads/{safe_name}"}),
        mimetype="application/json",
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
