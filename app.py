"""Application entry point for the Seegars Fence newsletter."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import bleach
from flask import (Flask, Response, flash, redirect, render_template, request,
                   url_for)
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy
from markupsafe import Markup, escape
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder="assets", static_url_path="/assets")

DATA_DIR = Path("data")
ISSUES_DIR = DATA_DIR / "issues"

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///data/newsletter.db"
)
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
]
ALLOWED_ATTRS = {
    "a": ["href", "target", "rel"],
    "*": ["class"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


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


def _normalize_slug(value: str) -> str:
    """Normalize a slug entry."""

    slug = value.strip().lower().replace(" ", "-")
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    return slug


def _default_modules() -> list[dict[str, Any]]:
    """Return a default module configuration."""

    return [
        {
            "type": "featured_story",
            "enabled": False,
            "id": "featured-story",
            "eyebrow": "Featured Story",
            "title": "",
            "body": {"content": "", "mode": "plain"},
            "style_preset": "featured",
        },
        {
            "type": "editorial_grid",
            "enabled": True,
            "id": "editorial",
            "eyebrow": "Editorial Desk",
            "title": "Monthly perspectives",
            "intro": "",
            "style_preset": "default",
            "cards": [],
        },
        {
            "type": "highlight_panel",
            "enabled": True,
            "id": "highlight",
            "eyebrow": "Safety",
            "title": "",
            "label": "",
            "body": {"content": "", "mode": "plain"},
            "style_preset": "highlight",
        },
        {
            "type": "celebrations",
            "enabled": True,
            "id": "celebrations",
            "eyebrow": "Celebrations",
            "title": "",
            "intro": "",
            "style_preset": "default",
            "birthdays": [],
            "anniversaries": [],
        },
        {
            "type": "contributors",
            "enabled": True,
            "id": "contributors",
            "eyebrow": "Contributors",
            "title": "",
            "style_preset": "default",
            "people": [],
        },
        {
            "type": "resource_hub",
            "enabled": True,
            "id": "resources",
            "eyebrow": "Resource Hub",
            "title": "",
            "intro": "",
            "style_preset": "default",
            "groups": [],
        },
    ]


def _migrate_issue(issue: dict[str, Any]) -> dict[str, Any]:
    """Convert file-based issue JSON to the database schema."""

    hero = {
        "title": issue["hero"]["title"],
        "subtitle": "\n".join(issue["hero"].get("tagline", [])),
        "image": issue["hero"]["image"],
        "cta": {"label": "", "url": ""},
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
            modules.append(
                {
                    "type": "celebrations",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "intro": module["intro"],
                    "birthdays": module["birthdays"],
                    "anniversaries": module["anniversaries"],
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
            modules.append(
                {
                    "type": "resource_hub",
                    "enabled": module["enabled"],
                    "id": module["id"],
                    "eyebrow": module["eyebrow"],
                    "title": module["title"],
                    "intro": module["intro"],
                    "groups": module["groups"],
                    "style_preset": "default",
                }
            )

    return {
        "slug": "december-2025",
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
            slug=migrated["slug"],
            issue_month=migrated["issue_month"],
            hero=migrated["hero"],
            modules=migrated["modules"],
            is_active=True,
        )
        db.session.add(issue)
        db.session.commit()


@app.context_processor
def inject_helpers() -> dict[str, Any]:
    """Provide template helpers."""

    return {
        "render_body": _render_body,
        "body_length": _text_length,
    }


@app.before_request
def _initialize_database() -> None:
    """Initialize the database on first request."""

    if not getattr(app, "_db_initialized", False):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        db.create_all()
        _ensure_seed_data()
        app._db_initialized = True


@app.route("/")
def index() -> str:
    """Render the main newsletter page."""

    issue = Issue.query.filter_by(is_active=True).first() or Issue.query.first()
    if not issue:
        return render_template("index.html", issue=None)

    return render_template("index.html", issue=issue)


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login() -> str | Response:
    """Authenticate an admin user."""

    if current_user.is_authenticated:
        return redirect(url_for("admin_issues"))

    if request.method == "POST":
        email = request.form.get("email", "")
        password = request.form.get("password", "")

        user = AdminUser.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for("admin_issues"))

        env_email = os.environ.get("ADMIN_EMAIL")
        env_password = os.environ.get("ADMIN_PASSWORD")
        if not user and env_email and env_password:
            if email == env_email and password == env_password:
                user = AdminUser(
                    email=email,
                    password_hash=generate_password_hash(password),
                )
                db.session.add(user)
                db.session.commit()
                login_user(user)
                return redirect(url_for("admin_issues"))

        flash("Invalid credentials.", "error")

    return render_template("admin/login.html")


@app.route("/admin/logout")
@login_required
def admin_logout() -> Response:
    """Log the user out."""

    logout_user()
    return redirect(url_for("admin_login"))


@app.route("/admin/issues")
@login_required
def admin_issues() -> str:
    """List available issues."""

    issues = Issue.query.order_by(Issue.created_at.desc()).all()
    return render_template("admin/issues.html", issues=issues)


def _issue_from_form(form: dict[str, str]) -> dict[str, Any]:
    """Parse issue data from admin form payload."""

    hero = {
        "title": form.get("hero_title", ""),
        "subtitle": form.get("hero_subtitle", ""),
        "image": form.get("hero_image", ""),
        "cta": {
            "label": form.get("hero_cta_label", ""),
            "url": form.get("hero_cta_url", ""),
        },
    }

    modules: list[dict[str, Any]] = []
    module_count = int(form.get("module-count", "0"))
    for index in range(module_count):
        prefix = f"module-{index}-"
        module_type = form.get(prefix + "type")
        if not module_type:
            continue

        module = {
            "type": module_type,
            "enabled": form.get(prefix + "enabled") == "on",
            "id": form.get(prefix + "id", ""),
            "eyebrow": form.get(prefix + "eyebrow", ""),
            "title": form.get(prefix + "title", ""),
            "style_preset": form.get(prefix + "preset", "default"),
            "order": int(form.get(prefix + "order", str(index))),
        }

        if module_type == "featured_story":
            module["body"] = {
                "content": form.get(prefix + "body", ""),
                "mode": form.get(prefix + "body_mode", "plain"),
            }
        elif module_type == "editorial_grid":
            module["intro"] = form.get(prefix + "intro", "")
            card_count = int(form.get(prefix + "cards-count", "0"))
            cards = []
            for card_index in range(card_count):
                card_prefix = f"{prefix}cards-{card_index}-"
                if form.get(card_prefix + "remove") == "on":
                    continue
                cards.append(
                    {
                        "id": form.get(card_prefix + "id", ""),
                        "eyebrow": form.get(card_prefix + "eyebrow", ""),
                        "title": form.get(card_prefix + "title", ""),
                        "body": {
                            "content": form.get(card_prefix + "body", ""),
                            "mode": form.get(card_prefix + "body_mode", "plain"),
                        },
                        "cta": {
                            "label": form.get(card_prefix + "cta_label", ""),
                            "url": form.get(card_prefix + "cta_url", ""),
                        },
                        "style_preset": form.get(
                            card_prefix + "preset", "default"
                        ),
                    }
                )
            module["cards"] = cards
        elif module_type == "highlight_panel":
            module["label"] = form.get(prefix + "label", "")
            module["body"] = {
                "content": form.get(prefix + "body", ""),
                "mode": form.get(prefix + "body_mode", "plain"),
            }
        elif module_type == "celebrations":
            module["intro"] = form.get(prefix + "intro", "")
            birthdays = []
            birthday_count = int(form.get(prefix + "birthdays-count", "0"))
            for birthday_index in range(birthday_count):
                item_prefix = f"{prefix}birthday-{birthday_index}-"
                if form.get(item_prefix + "remove") == "on":
                    continue
                birthdays.append(
                    {
                        "name": form.get(item_prefix + "name", ""),
                        "date": form.get(item_prefix + "date", ""),
                        "weekday": form.get(item_prefix + "weekday", ""),
                        "office": form.get(item_prefix + "office", ""),
                    }
                )
            anniversaries = []
            anniversary_count = int(
                form.get(prefix + "anniversaries-count", "0")
            )
            for anniversary_index in range(anniversary_count):
                item_prefix = f"{prefix}anniversary-{anniversary_index}-"
                if form.get(item_prefix + "remove") == "on":
                    continue
                anniversaries.append(
                    {
                        "name": form.get(item_prefix + "name", ""),
                        "tenure": form.get(item_prefix + "tenure", ""),
                        "office": form.get(item_prefix + "office", ""),
                    }
                )
            module["birthdays"] = birthdays
            module["anniversaries"] = anniversaries
        elif module_type == "contributors":
            people = []
            people_count = int(form.get(prefix + "people-count", "0"))
            for person_index in range(people_count):
                item_prefix = f"{prefix}person-{person_index}-"
                if form.get(item_prefix + "remove") == "on":
                    continue
                person = {
                    "name": form.get(item_prefix + "name", ""),
                    "title": form.get(item_prefix + "title", ""),
                    "section": form.get(item_prefix + "section", ""),
                    "image": form.get(item_prefix + "image", ""),
                }
                secondary = form.get(item_prefix + "secondary", "")
                if secondary:
                    person["secondary"] = secondary
                people.append(person)
            module["people"] = people
        elif module_type == "resource_hub":
            module["intro"] = form.get(prefix + "intro", "")
            groups = []
            group_count = int(form.get(prefix + "groups-count", "0"))
            for group_index in range(group_count):
                group_prefix = f"{prefix}group-{group_index}-"
                if form.get(group_prefix + "remove") == "on":
                    continue
                group = {"title": form.get(group_prefix + "title", "")}
                links = []
                link_count = int(form.get(group_prefix + "links-count", "0"))
                for link_index in range(link_count):
                    link_prefix = f"{group_prefix}link-{link_index}-"
                    if form.get(link_prefix + "remove") == "on":
                        continue
                    links.append(
                        {
                            "label": form.get(link_prefix + "label", ""),
                            "url": form.get(link_prefix + "url", ""),
                            "icon": form.get(link_prefix + "icon", ""),
                        }
                    )
                group["links"] = links
                groups.append(group)
            module["groups"] = groups

        modules.append(module)

    modules.sort(key=lambda item: item.get("order", 0))
    for module in modules:
        module.pop("order", None)

    return {"hero": hero, "modules": modules}


@app.route("/admin/issues/create", methods=["POST"])
@login_required
def admin_create_issue() -> Response:
    """Create a new issue."""

    slug = _normalize_slug(request.form.get("slug", ""))
    issue_month = request.form.get("issue_month", "")
    source_slug = request.form.get("source_issue", "")

    if not slug or not issue_month:
        flash("Slug and issue month are required.", "error")
        return redirect(url_for("admin_issues"))

    if Issue.query.filter_by(slug=slug).first():
        flash("That slug already exists.", "error")
        return redirect(url_for("admin_issues"))

    source_issue = Issue.query.filter_by(slug=source_slug).first()
    if source_issue:
        hero = json.loads(json.dumps(source_issue.hero))
        modules = json.loads(json.dumps(source_issue.modules))
    else:
        hero = {
            "title": "",
            "subtitle": "",
            "image": "",
            "cta": {"label": "", "url": ""},
        }
        modules = _default_modules()

    issue = Issue(
        slug=slug,
        issue_month=issue_month,
        hero=hero,
        modules=modules,
        is_active=False,
    )
    db.session.add(issue)
    db.session.commit()
    flash("Issue created.", "success")
    return redirect(url_for("admin_editor", issue_slug=slug))


@app.route("/admin/issues/<issue_slug>/duplicate", methods=["POST"])
@login_required
def admin_duplicate_issue(issue_slug: str) -> Response:
    """Duplicate an existing issue."""

    source = Issue.query.filter_by(slug=issue_slug).first_or_404()
    new_slug = _normalize_slug(request.form.get("new_slug", ""))
    new_month = request.form.get("new_issue_month", "")

    if not new_slug or not new_month:
        flash("New slug and month are required.", "error")
        return redirect(url_for("admin_issues"))

    if Issue.query.filter_by(slug=new_slug).first():
        flash("That slug already exists.", "error")
        return redirect(url_for("admin_issues"))

    issue = Issue(
        slug=new_slug,
        issue_month=new_month,
        hero=json.loads(json.dumps(source.hero)),
        modules=json.loads(json.dumps(source.modules)),
        is_active=False,
    )
    db.session.add(issue)
    db.session.commit()
    flash("Issue duplicated.", "success")
    return redirect(url_for("admin_editor", issue_slug=new_slug))


@app.route("/admin/issues/<issue_slug>/delete", methods=["POST"])
@login_required
def admin_delete_issue(issue_slug: str) -> Response:
    """Delete an existing issue."""

    issue = Issue.query.filter_by(slug=issue_slug).first_or_404()
    if issue.is_active:
        flash("Cannot delete the active issue.", "error")
        return redirect(url_for("admin_issues"))

    db.session.delete(issue)
    db.session.commit()
    flash("Issue deleted.", "success")
    return redirect(url_for("admin_issues"))


@app.route("/admin/issues/<issue_slug>/activate", methods=["POST"])
@login_required
def admin_activate_issue(issue_slug: str) -> Response:
    """Set the active issue."""

    issue = Issue.query.filter_by(slug=issue_slug).first_or_404()
    Issue.query.update({Issue.is_active: False})
    issue.is_active = True
    db.session.commit()
    flash("Issue is now active.", "success")
    return redirect(url_for("admin_issues"))


@app.route("/admin/editor/<issue_slug>", methods=["GET", "POST"])
@login_required
def admin_editor(issue_slug: str) -> str | Response:
    """Edit an issue configuration."""

    issue = Issue.query.filter_by(slug=issue_slug).first_or_404()

    if request.method == "POST":
        payload = _issue_from_form(request.form)
        issue.issue_month = request.form.get("issue_month", issue.issue_month)
        issue.hero = payload["hero"]
        issue.modules = payload["modules"]
        db.session.commit()
        flash("Changes saved.", "success")
        return redirect(url_for("admin_editor", issue_slug=issue_slug))

    return render_template("admin/editor.html", issue=issue)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
