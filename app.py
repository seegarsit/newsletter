import hashlib
import os
import re
import threading
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "seegars-fence-line-2026-dev-key")

# Hardcoded credentials
LOGIN_USER = "SEEGARS"
LOGIN_PASS = "Sfc1949!"

# Database configuration — Render PostgreSQL via DATABASE_URL, SQLite fallback for local dev
_db_url = os.environ.get("DATABASE_URL", "sqlite:///poll.db")
_db_url = _db_url.replace("postgres://", "postgresql://", 1)
_db_url = _db_url.replace("postgresql+psycopg://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = _db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

POLL_CHOICES = [
    "Completed Job Highlights",
    "Employee of the Month",
    "New Hire Announcements",
    "Company News & Updates",
    "Employee Spotlight",
]


class PollVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    choice = db.Column(db.String(100), nullable=False)
    voter_id = db.Column(db.String(64), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class PageView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.String(64), nullable=False)
    month = db.Column(db.String(7), nullable=False)  # "2026-03"
    visited_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint("visitor_id", "month", name="uq_visitor_month"),)


with app.app_context():
    db.create_all()


def _voter_id():
    """Hash of IP + User-Agent for one-vote-per-reader enforcement."""
    ip = request.headers.get("X-Forwarded-For", request.remote_addr) or ""
    ua = request.headers.get("User-Agent", "")
    return hashlib.sha256(f"{ip}:{ua}".encode()).hexdigest()


# ── Live News & Sports Headlines (refreshed daily via RSS) ──────────────
_news_cache = {"date": None, "national": [], "sports": []}
_news_lock = threading.Lock()

_NATIONAL_FALLBACK = [
    {"headline": "Check back soon", "summary": "Live headlines update daily."},
]
_SPORTS_FALLBACK = [
    {"headline": "Check back soon", "summary": "Live headlines update daily."},
]


def _fetch_rss(url, count=3):
    """Fetch top `count` items from an RSS feed, return list of {headline, summary}."""
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0 (TheFenceLine Newsletter)"})
        with urlopen(req, timeout=10) as resp:
            tree = ET.parse(resp)
        items = tree.findall(".//item")[:count]
        results = []
        for item in items:
            title = (item.findtext("title") or "").strip()
            desc = (item.findtext("description") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = re.sub(r"<[^>]+>", "", desc).strip()
            if len(desc) > 140:
                desc = desc[:137] + "..."
            if title:
                results.append({"headline": title, "summary": desc, "url": link})
        return results
    except Exception:
        return []


def _refresh_news():
    """Refresh cached headlines once per day."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _news_cache["date"] == today:
        return
    with _news_lock:
        if _news_cache["date"] == today:
            return
        national = _fetch_rss("https://moxie.foxnews.com/google-publisher/latest.xml", 3)
        sports = _fetch_rss("https://www.espn.com/espn/rss/news", 3)
        _news_cache["national"] = national or _NATIONAL_FALLBACK
        _news_cache["sports"] = sports or _SPORTS_FALLBACK
        _news_cache["date"] = today


def get_live_news():
    """Return current cached headlines, refreshing if needed."""
    _refresh_news()
    return _news_cache["national"], _news_cache["sports"]


NEWSLETTER = {
    "month": "April",
    "year": 2026,
    "carousel_count": 25,
    "volume": "LXXVII",
    "issue": 4,
    "location": "North Carolina \u2022 South Carolina \u2022 Georgia",
    "edition": "MORNING EDITION",
    "motto": "Changing the world one linear foot at a time.",
    "tagline": "A family business distinguished by exceptional values and quality.",
    "established": 1949,

    "ceo_letter": {
        "title": "A Letter From Ben",
        "author": "Ben Seegars",
        "author_title": "CEO",
        "headshot": "ben.png",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "As we come to the close of March and wrap up the first quarter in just a few days, I want to take a moment to say thank you for the hard work, perseverance, and determination each of you has shown.",
            "What a difference a month can make. The weather has improved, business has picked up, and we\u2019ve seen strong momentum begin to build across the company. Sales have increased, and it looks like we are going to come collectively very close to hitting our charge goals for the quarter. That is a tremendous accomplishment, especially considering that not long ago it seemed nearly impossible. Great work, team.",
            "This is a great reminder that progress often comes after persistence. When conditions are tough, it can be easy to get discouraged or to focus on everything working against us. But this month has shown what can happen when a team keeps pushing, stays focused, and refuses to let temporary challenges define the outcome.",
            "For the devotional thought this month, I want to share a lesson from Caleb in Numbers. This fits perfectly with the challenges we\u2019ve faced this quarter. When others saw obstacles and reasons why something could not be done, Caleb responded with faith, confidence, and a different spirit. He said, \u201cLet us go up at once and take possession... for we are well able to overcome it.\u201d That mindset stands out. The difference was not in the challenge itself, but in the attitude toward it.",
            "That is a powerful message and reminds us of a fundamental truth: Attitude matters. A positive, faith-filled attitude does not ignore challenges, but it does help us face them with courage, confidence, and determination. It helps us lead better, work better, and encourage those around us. As we head into April and the beginning of the second quarter, let\u2019s be intentional about bringing a positive attitude to our jobs, our teams, and our customers each day. Positivity is contagious, and when each of us shows up ready to encourage others and focus on solutions, it makes anything possible!",
            "I\u2019m proud of the way this team has responded this month. Let\u2019s finish the quarter strong and carry this momentum forward into a great spring season. As Easter approaches, I hope you and your family have a wonderful Easter and take time to remember the hope we have and the gift we have been given through Jesus\u2019 sacrifice for us.",
            "Thank you for all you do.",
        ],
        "pull_quote": "Progress often comes after persistence. This month has shown what can happen when a team keeps pushing, stays focused, and refuses to let temporary challenges define the outcome.",
    },

    "hr_corner": {
        "title": "The Value of Your Company-Paid Life Insurance Benefit",
        "author": "Veronica Aycock",
        "author_title": "Exec. Vice President",
        "headshot": "veronica.png",
        "phone": "919-739-7510",
        "email": "veronica@seegarsfence.com",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "At our company, we are committed to supporting not only you, but also the people who matter most in your life. One of the ways we do this is by providing a company-paid life insurance policy of $25,000 for every employee at no cost to you.",
            "While it may not be something you think about every day, this benefit plays an important role in protecting your loved ones financially in the event of the unexpected. Life insurance can help ease the burden of expenses such as funeral costs, outstanding debts, or everyday living needs during a difficult time."
        ],
        "sections": [
            {
                "heading": "Why Keeping Your Beneficiary Updated Matters",
                "content": [
                    "Having life insurance is only part of the equation\u2014keeping your beneficiary information current is just as important.",
                    "Your beneficiary is the person (or people) who will receive the benefit from your policy. If this information is outdated, it could result in delays, complications, or even the benefit being paid to someone you no longer intend."
                ]
            },
            {
                "heading": "When Should You Review Your Beneficiary?",
                "content": ["It\u2019s a good idea to review and update your beneficiary anytime you experience a major life change, such as:"],
                "bullets": [
                    "Marriage or divorce",
                    "Birth or adoption of a child",
                    "Death of a previously named beneficiary",
                    "Significant changes in your personal relationships"
                ],
                "after": "Even if you haven\u2019t had a major life event recently, reviewing your information once a year is a smart habit."
            },
            {
                "heading": "Take a Few Minutes Today",
                "content": [
                    "Updating your beneficiary is typically a quick and simple process, but it makes a lasting impact. Taking a few minutes now ensures that your benefit will go exactly where you intend, providing peace of mind for you and security for your loved ones. To review your beneficiary choice, log into <a href='https://employeenavigator.com'>employeenavigator.com</a>.",
                    "If you have questions about your life insurance benefit or need help updating your beneficiary, please reach out to me."
                ]
            }
        ]
    },

    "safety": {
        "title": "Basic First Aid Guidelines",
        "author": "Chanda Best",
        "author_title": "Safety Manager",
        "headshot": "chanda.png",
        "image": "first_aid.svg",
        "sections": [
            {
                "heading": "Before First Aid Is Required",
                "entries": [
                    "Ensure you know where the first-aid kit is kept on site, or in your vehicle.",
                    "Know who the first aiders, emergency first aiders and appointed persons are.",
                    "If you use potentially dangerous tools or machinery, or are working in a small group away from the main site, keep a first-aid kit with you.",
                    "Know how to contact the emergency services\u2014 Call 911, Call Manager! Do not wait until an emergency to go looking for this information."
                ],
                "numbered": True
            },
            {
                "heading": "Discovering an Emergency",
                "entries": [
                    "Call or send someone for medical help.",
                    "Ensure your own safety before you approach the casualty, then, if it is safe to do so remove any hazards from around the injured person.",
                    "Do not move the injured person, unless they are in immediate danger.",
                    "Stay with the injured person and give reassurance until help arrives.",
                    "Do not give drinks or food to the injured person."
                ],
                "numbered": False
            },
            {
                "heading": "Basic First Aid May Save a Life",
                "entries": [
                    "Do you know how to resuscitate and start the heart? Who is CPR Certified near you?",
                    "Do you know how to stop major bleeding? Where are the supplies?",
                    "Do you know how to treat scalds, burns and shock? Where are the supplies?"
                ],
                "numbered": True
            }
        ],
        "closing": "Know where the first aid kits, CPR masks, and who is trained! This could save a life!"
    },

    "employee_spotlight": {
        "title": "Employee Spotlight",
        "name": "Avery Bailey",
        "location": "Seegars Fence Company \u2014 Goldsboro, NC",
        "photos": ["Employee_spotlight/avery_baliey1.png"],
        "qa": [
            {"q": "How long have you been working at Seegars?", "a": "June will be 13 years"},
            {"q": "What\u2019s your job position?", "a": "Sales & Product Support for North State Products"},
            {"q": "Favorite movie or show?", "a": "Any Equalizer Movie"},
            {"q": "Favorite food?", "a": "Shepherds Pie"},
            {"q": "Cake or pie, and what kind?", "a": "German Chocolate Cake"},
            {"q": "Dream vacation spot?", "a": "Fishing in Mexico"},
            {"q": "First thing you\u2019d do if you won the lottery?", "a": "New Boat"},
            {"q": "Go-to weekend activity?", "a": "Fishing / Card Shows"},
            {"q": "Favorite way to relax after work?", "a": "Having dinner with Colleen"},
            {"q": "What\u2019s your current daily average screen time on your mobile phone?", "a": "2 hours 37 minutes"},
            {"q": "One thing most people at work don\u2019t know about you?", "a": "I enjoy playing the drums (I\u2019m not very good)"},
        ]
    },

    "birthdays": [
        {"name": "Tyler Crawford", "date": "April 10", "location": "Wayne Co."},
        {"name": "Gary Mull Jr", "date": "April 11", "location": "Allison Fence Co."},
        {"name": "Valerie Parker", "date": "April 11", "location": "Augusta"},
        {"name": "Terry Sexton", "date": "April 15", "location": "Spartanburg"},
        {"name": "Mario Valente Garcia", "date": "April 15", "location": "Raleigh"},
        {"name": "Bryan Morris", "date": "April 17", "location": "Columbia"},
        {"name": "Ricky Lee", "date": "April 18", "location": "Goldsboro"},
        {"name": "Brandon Parker", "date": "April 18", "location": "Augusta"},
        {"name": "Dustin Smith", "date": "April 18", "location": "Columbia"},
        {"name": "Chanda Best", "date": "April 25", "location": "Goldsboro"},
        {"name": "Jeremy Moore", "date": "April 26", "location": "Raleigh"},
        {"name": "Jennifer Rouse", "date": "April 26", "location": "Raleigh"},
        {"name": "Jossie Santiago Collazo", "date": "April 27", "location": "Fayetteville"},
        {"name": "Bo Daughtry", "date": "April 29", "location": "Goldsboro"},
        {"name": "Devin Wagner", "date": "April 30", "location": "Wayne Co."},
    ],

    "anniversaries": [
        {"name": "Keith Hefner", "years": 32, "location": "Jacksonville"},
        {"name": "Terri Piercy", "years": 20, "location": "Allison Fence Co."},
        {"name": "Charles Patterson", "years": 16, "location": "Spartanburg"},
        {"name": "Christy Havens", "years": 11, "location": "Greensboro"},
        {"name": "Michael Hicks", "years": 10, "location": "Columbia"},
        {"name": "Joel Lopez Rosado", "years": 8, "location": "Fayetteville"},
        {"name": "Noe Davalos Carrillo", "years": 6, "location": "Goldsboro"},
        {"name": "Mark Humphreys", "years": 5, "location": "Goldsboro"},
        {"name": "Kawaski Cobb", "years": 2, "location": "Jacksonville"},
        {"name": "Mitchell Hankins", "years": 2, "location": "Columbia"},
        {"name": "Edmond Zuravel", "years": 2, "location": "Goldsboro"},
        {"name": "Maddox Miller", "years": 1, "location": "Jacksonville"},
        {"name": "Christopher Parsons", "years": 1, "location": "Raleigh"},
        {"name": "Nicholas Shupe", "years": 1, "location": "Jacksonville"},
    ],

    "news_wire": {
        "national": [
            {"headline": "DOE Launches \u201cGenesis Mission\u201d", "summary": "Department of Energy initiative leverages AI to accelerate scientific discovery and energy innovation."},
            {"headline": "Renewable Energy Gains Ground", "summary": "Analysis projects renewables will be cheaper than natural gas by 2028, creating an estimated 145,000 new jobs."},
            {"headline": "Businesses Redesign Hybrid Work", "summary": "Companies nationwide are updating remote and hybrid models to boost productivity while maintaining flexibility."},
        ],
        "sports": [
            {"headline": "Team USA Sets Winter Olympics Record", "summary": "12 gold medals at Milan-Cortina 2026, the most ever for the U.S. in a Winter Games."},
            {"headline": "March Madness Tips Off March 17", "summary": "Duke holds the No. 1 overall seed. 68 teams compete for the title in Indianapolis."},
            {"headline": "World Baseball Classic Opens March 5", "summary": "International tournament kicks off in San Juan, Puerto Rico."},
        ],
    },

    "contributors": [
        {"name": "Ben Seegars", "title": "CEO", "section": "A Letter From Ben"},
        {"name": "Veronica Aycock", "title": "Exec. Vice President", "section": "HR Corner"},
        {"name": "Chanda Best", "title": "Safety Manager", "section": "Safety First"},
        {"name": "Avery Bailey", "title": "Employee Spotlight", "section": "Employee Spotlight"},
    ],

    "resources": [
        {"name": "Success and Seegars", "url": "https://seegarsfence-my.sharepoint.com/:f:/p/thefenceline/IgAFyJ8mnRz3QZUE5CxgBgGFAe_8fKEQeMEfdvI_jRS6ISI", "description": "Welcome to the Team"},
        {"name": "401(k) Files", "url": "https://seegarsfence-my.sharepoint.com/:f:/p/thefenceline/IgD_t5uAH_-VS4QCMeaK32m3Aejm8kt1UV0d_mNDa-EdkeI", "description": "Retirement plan documents"},
        {"name": "Podium Files", "url": "https://seegarsfence-my.sharepoint.com/:f:/p/thefenceline/IgCDo31IQ-_qSoU8jOu151G7AVRra2cTnpJBXLv1haN5TwI", "description": "Celebrate your team"},
        {"name": "Safety Manuals", "url": "https://seegarsfence-my.sharepoint.com/:f:/p/thefenceline/IgCwK1-guhStQpiScEy8SXpgAWyAOUoIqE14rKq0XMco3fw", "description": "Safety documentation"},
        {"name": "SFC Media Files", "url": "https://seegarsfence-my.sharepoint.com/:f:/p/media/IgAPyDIzcOgTR69k-sy-P7m7AVTej9yHyawv1-Yu9byHKRU", "description": "Company media assets"},
        {"name": "Microsoft Teams", "url": "https://www.microsoft.com/en-us/microsoft-teams/download-app", "description": "Download Teams app"},
        {"name": "Microsoft 365 Home", "url": "https://portal.office.com/", "description": "Access Office apps"},
    ],

    "rightnow_media": {
        "url": "https://app.rightnowmedia.org/en/user/SFC",
    },

    "social_links": {
        "facebook": "https://www.facebook.com/seegarsfencecompany/",
        "instagram": "https://www.instagram.com/seegarsfence/",
        "youtube": "https://www.youtube.com/user/SeegarsFence/videos",
        "linkedin": "https://www.linkedin.com/company/seegars-fence-company/",
    }
}


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if username == LOGIN_USER and password == LOGIN_PASS:
            session["logged_in"] = True
            return redirect(url_for("index"))
        session["login_error"] = "Invalid credentials. Please try again."
    return redirect(url_for("index"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
def index():
    logged_in = session.get("logged_in", False)

    # Only count page views for authenticated visitors
    reader_count = 0
    if logged_in:
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        visitor = _voter_id()
        existing = PageView.query.filter_by(visitor_id=visitor, month=current_month).first()
        if not existing:
            db.session.add(PageView(visitor_id=visitor, month=current_month))
            db.session.commit()
        reader_count = PageView.query.filter_by(month=current_month).count()

    # Inject live headlines into the news wire
    national, sports = get_live_news()
    NEWSLETTER["news_wire"]["national"] = national
    NEWSLETTER["news_wire"]["sports"] = sports

    login_error = session.pop("login_error", None)
    return render_template("index.html", n=NEWSLETTER, reader_count=reader_count, logged_in=logged_in, login_error=login_error)


@app.route("/api/poll/results")
@login_required
def poll_results():
    counts = {c: 0 for c in POLL_CHOICES}
    rows = db.session.execute(
        db.select(PollVote.choice, db.func.count()).group_by(PollVote.choice)
    ).all()
    for choice, count in rows:
        if choice in counts:
            counts[choice] = count

    voter = _voter_id()
    has_voted = db.session.query(
        PollVote.query.filter_by(voter_id=voter).exists()
    ).scalar()

    return jsonify({"counts": counts, "has_voted": has_voted})


@app.route("/api/poll/vote", methods=["POST"])
@login_required
def poll_vote():
    data = request.get_json(silent=True) or {}
    choice = data.get("choice", "")

    if choice not in POLL_CHOICES:
        return jsonify({"error": "Invalid choice"}), 400

    voter = _voter_id()
    existing = PollVote.query.filter_by(voter_id=voter).first()
    if existing:
        return jsonify({"error": "Already voted"}), 409

    db.session.add(PollVote(choice=choice, voter_id=voter))
    db.session.commit()

    counts = {c: 0 for c in POLL_CHOICES}
    rows = db.session.execute(
        db.select(PollVote.choice, db.func.count()).group_by(PollVote.choice)
    ).all()
    for c, count in rows:
        if c in counts:
            counts[c] = count

    return jsonify({"counts": counts, "has_voted": True})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
