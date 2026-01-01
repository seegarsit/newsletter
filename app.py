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
app.config["SITE_USERNAME"] = os.environ.get("SITE_USERNAME")
app.config["SITE_PASSWORD"] = os.environ.get("SITE_PASSWORD")
database_url = os.environ.get("DATABASE_URL")
if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:////tmp/newsletter.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

login_manager = LoginManager()
login_manager.login_view = "admin_login"
login_manager.init_app(app)

db = SQLAlchemy(app)

ALLOWED_TAGS = [
    "p",
    "strong",
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


def _migrate_issue(issue: dict[str, Any]) -> dict[str, Any]:
    """Convert file-based issue JSON to the database schema."""

    hero = {
        "title": issue["hero"]["title"],
        "subtitle": "\n".join(issue["hero"].get("tagline", [])),
        "image": issue["hero"]["image"],
        "cta": {"label": "", "url": ""},
        "theme": _default_theme(),
        "text_styles": {},
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
                if "meta" in birthday:
                    birthdays.append(birthday)
                else:
                    meta_parts = [
                        birthday.get("date", ""),
                        birthday.get("weekday", ""),
                        birthday.get("office", ""),
                    ]
                    meta = " · ".join(
                        [part for part in meta_parts if part]
                    )
                    birthdays.append({"name": birthday.get("name", ""), "meta": meta})
            anniversaries = []
            for anniversary in module["anniversaries"]:
                if "meta" in anniversary:
                    anniversaries.append(anniversary)
                else:
                    meta_parts = [
                        anniversary.get("tenure", ""),
                        anniversary.get("office", ""),
                    ]
                    meta = " · ".join(
                        [part for part in meta_parts if part]
                    )
                    anniversaries.append(
                        {"name": anniversary.get("name", ""), "meta": meta}
                    )
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
    }


@app.before_request
def require_site_auth() -> Response | None:
    """Require basic auth credentials to access the site."""

    if request.endpoint == "static":
        return None

    username = app.config.get("SITE_USERNAME")
    password = app.config.get("SITE_PASSWORD")
    if not username or not password:
        return None

    auth = request.authorization
    if auth and auth.username == username and auth.password == password:
        return None

    return Response(
        "Authentication required.",
        401,
        {"WWW-Authenticate": 'Basic realm="Seegars Fence Newsletter"'},
    )


@app.route("/")
def index() -> str:
    """Render the main newsletter page."""

    issue = _get_current_issue()
    if not issue:
        return render_template("index.html", issue=None)

    return render_template("index.html", issue=issue)


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


def _sanitize_issue_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Sanitize issue payload before persisting."""

    hero = payload.get("hero", {})
    hero_theme = hero.get("theme", {})
    hero_text_styles = _sanitize_text_styles(hero.get("text_styles"))
    cleaned = {
        "issue_month": payload.get("issue_month", ""),
        "hero": {
            "title": hero.get("title", ""),
            "subtitle": hero.get("subtitle", ""),
            "image": hero.get("image", ""),
            "cta": hero.get("cta", {"label": "", "url": ""}),
            "theme": hero_theme,
            "text_styles": hero_text_styles,
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
                cards.append(
                    {
                        "id": card.get("id", ""),
                        "eyebrow": card.get("eyebrow", ""),
                        "title": card.get("title", ""),
                        "body": _sanitize_body(card.get("body")),
                        "cta": card.get("cta", {"label": "", "url": ""}),
                        "style_preset": card.get("style_preset", "default"),
                        "alignment": card.get("alignment", "left"),
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
            base["birthdays"] = module.get("birthdays", [])
            base["anniversaries"] = module.get("anniversaries", [])
        elif module_type == "contributors":
            base["people"] = module.get("people", [])
        elif module_type == "resource_hub":
            base["id"] = module.get("id", "resource_hub")
            base["intro"] = module.get("intro", "")
            base["links"] = module.get("links", [])
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
    if ext not in {"png", "jpg", "jpeg", "webp"}:
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
