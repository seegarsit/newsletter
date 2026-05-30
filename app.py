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
    "month": "June",
    "year": 2026,
    "volume": "LXXVII",
    "issue": 5,
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
            "May has been a great month for Seegars Fence Company. We have continued to see strong sales, and just as importantly, we have been building a lot of fences!",
            "We have continued to build on the backlog of work that carried over from the first quarter. Charges are ahead of goal for the current quarter, and we have nearly filled the hole from the first quarter, with year-to-date charges now very close to goal. That is a strong accomplishment, especially in tough market conditions where residential work remains slower than normal and fuel prices are sky high.",
            "Even with those headwinds, our team continues to excel. Thank you for the effort, commitment, and pride you bring to your work every day. We are blessed beyond measure, and I do not take for granted the people who make this company what it is.",
            "We are also excited to welcome Dana Mull to our team as our new People and Culture Manager. Dana\u2019s role will be focused on helping our people make the most out of being part of the Seegars team. That includes making sure you fully understand and take advantage of all our benefits, as well as work on recruitment, training, growth opportunities, advancement, and continuing to strengthen the culture that has carried this company for generations. She has hit the ground running and is making office visits to meet everyone, learn more about each location, and begin building strong relationships across the company.",
            "Veronica has been working hard on our upcoming health insurance renewal, and we are excited about a new opportunity to partner with Gravie. I know, it is a funny name, but they are bringing us very good rates and benefits for our July 1 renewal. With this new Gravie partnership, along with Seegars increasing the monthly insurance contribution from $475 to $500, just about everyone will see better rates and benefits than we have had in a while. That is a big win for our team and families.",
            "For this month\u2019s devotion, I want to reflect on Matthew 7:13\u201314, where Jesus teaches about the narrow gate and the difficult road that leads to life. The easy road is wide, crowded, and tempting, but it does not lead where we truly want to go. The narrow road requires discipline, humility, patience, and faithfulness. That applies to our spiritual lives, but it also applies to leadership, work, family, and the way we carry ourselves each day. Great teams are not built by taking shortcuts. Great companies are not built by doing what is easiest. Great lives are not built by drifting. They are built by choosing discipline over regret, responsibility over excuses, and faithfulness over convenience. Every day, each of us gets to choose which road we are walking. My prayer is that we continue to choose the narrow road together, doing the right things the right way, trusting that God honors steady, faithful work done with the right heart.",
            "Thank you for all you do. I hope everyone has a great month ahead!",
        ],
        "pull_quote": "Great teams are not built by taking shortcuts. Great companies are not built by doing what is easiest. Great lives are not built by drifting.",
    },

    "hr_corner": {
        "title": "Meet Dana Mull",
        "author": "Dana Mull",
        "author_title": "People and Culture Manager",
        "headshot": "dana_mull.png",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "I\u2019m excited to join the Seegars team as the new People and Culture Manager and to support all our locations with workforce development and organizational growth initiatives. My experience in organizational leadership, talent development, business ownership, and culture\u2011building, combined with years of leading sales, marketing, and HR teams across the US, has shaped my approach to supporting people and strengthening workplaces.",
            "I look forward to working closely with each branch, listening first, and understanding what your teams need to thrive. My goal is to support strong leadership, clear communication, and a consistent employee experience across the company.",
            "I\u2019m truly grateful for the warm welcome so far and look forward to building relationships, supporting your teams, and contributing to the strong culture that makes Seegars special. If we haven\u2019t met in person yet, I look forward to doing so very soon.",
        ],
    },

    "safety": {
        "eyebrow": "Toolbox Topics \u2014 Drug-Free Workplace",
        "title": "Zero Tolerance for Drugs and Alcohol",
        "author": "Chanda Best",
        "author_title": "Safety Manager",
        "headshot": "chanda.png",
        "image": "no_to_drugs.png",
        "intro": [
            "It is the policy of Seegars Fence Company that its workplace be free from the illegal use, possession of, or distribution of controlled substances, by all employees of Seegars Fence Company. The possession and distribution of controlled substances will be dealt with promptly in accordance with legal and administrative disciplinary procedures. However, the policy\u2019s primary goal is to ensure that illegal drug use is eliminated, and that Seegars Fence Company\u2019s workplace be safe, healthful, productive, and secure."
        ],
        "sections": [
            {
                "heading": "Drug Screening Program",
                "intro_paragraphs": [
                    "The Seegars Fence Company Drug Screening program includes the following types of drug testing:"
                ],
                "entries": [
                    "Pre-employment testing.",
                    "Random testing of all employees and employees in safety sensitive positions.",
                    "Reasonable-suspicion testing \u2014 includes post accident when applicable.",
                    "Involvement in accidents or unsafe-practices.",
                    "Voluntary testing.",
                    "Testing as part of and as a follow-up to counseling or rehabilitation.",
                ],
                "numbered": False,
                "outro_paragraphs": [
                    "The frequency of testing will depend on the type of testing to be conducted. Generally, 10 percent of the pool shall be subject to random testing each year. However, Seegars Fence Company management reserves the right to increase or decrease the frequency and testing percentage of any category of drug testing, consistent with the duty to achieve a drug-free workplace. These testing will be determined by a company official or other competent person."
                ]
            }
        ],
        "closing": "A drug-free workplace keeps every crew, every job site, and every family safer."
    },

    "employee_spotlight": {
        "title": "Employee Spotlight",
        "name": "Chris Cook",
        "location": "Allison Fence Co.",
        "photos": ["Employee_spotlight/chris.png"],
        "video": "Employee_spotlight/chris_fish.mp4",
        "video_poster_time": 5,
        "qa": [
            {"q": "How long have you been working at Allison Fence?", "a": "4 years, 7 months"},
            {"q": "What\u2019s your job position?", "a": "Estimator"},
            {"q": "Favorite movie or TV show?", "a": "Remember the Titans"},
            {"q": "Favorite food?", "a": "BBQ"},
            {"q": "Cake or pie, and what kind?", "a": "Coconut Cake"},
            {"q": "Dream vacation spot?", "a": "Australia"},
            {"q": "First thing you\u2019d do if you won the lottery?", "a": "Help my family"},
            {"q": "Go-to weekend activity?", "a": "Fishing or golfing"},
            {"q": "Favorite way to relax after work?", "a": "Laying in my recliner"},
            {"q": "One thing most people at work don\u2019t know about you?", "a": "Most of my friends call me Cookie."},
        ]
    },

    "tech_talk": {
        "eyebrow": "Tech Talk",
        "title": "AI Isn’t Just for Coders",
        "author": "Brad Wells",
        "author_title": "IT Manager",
        "headshot": "brad.png",
        "intro": [
            "AI isn’t just a tool for coders and developers — it’s also for the average everyday user. Whether you’re in the office juggling spreadsheets and emails, or out in the field measuring a long stretch of fence line, AI can save you time, do the math for you, and answer the kinds of questions you’d usually have to wing it on.",
            "For our office staff, that looks like drafting emails faster, summarizing long documents, and pulling answers out of data without wrestling with Excel formulas. For our installers in the field, it can be even more useful — snap a photo of a job site and have it figure out post spacing, calculate materials, or help read measurements off a tape that’s tough to see in bright sun.",
            "Here’s a quick example of what that actually looks like. I asked Claude:",
        ],
        "chat": {
            "user_label": "Brad",
            "user_avatar": "brad.png",
            "prompt": "Claude, we have a straight line of 156 linear feet of fence. I’m showing a 10' double gate 25' from one end. With post spacing no more than 10', what should my post spacing be on both sides of the gate?",
            "response_paragraphs": [
                "Good setup. With the gate 25' from one end, the run breaks into two sections: a short side of 25' and a long side of 121' (156 total, minus the 10' gate opening).",
                "Short side (25'): you need at least 3 sections to keep every gap under 10', so 25 ÷ 3 = exactly 8' 4\" between posts. That’s 2 line posts sitting between the corner and the gate.",
                "Long side (121'): at a 10' max, you need 13 sections, so 121 ÷ 13 ≈ 9' 3¾\" between posts. That’s 12 line posts between the gate and the far corner.",
                "Totals: 2 terminal posts, 2 gate posts, 14 line posts, plus your 10' double gate. Both runs stay just under 10' and look evenly proportioned. If you’d rather shift the gate so both sides land on round numbers, I can rerun it.",
            ],
        },
        "outro": [
            "That kind of help is just a question away — on your phone, on your laptop, anywhere you’ve got a signal. If you’ve never tried it, give it a shot the next time you’re stuck on something. You might be surprised how quickly it changes the way you work.",
        ],
    },

    "benefits_update": {
        "eyebrow": "Open Enrollment Begins Soon",
        "title": "Employee Health Insurance Update",
        "author": "Veronica Aycock",
        "author_title": "Benefits Administrator",
        "headshot": "veronica.png",
        "content": [
            "We are excited to announce that beginning with the upcoming plan year, our Employee Health Insurance program will transition to Gravie as our Third-Party Administrator (TPA) while utilizing the Cigna network for healthcare providers and services. Your new insurance card will have the Gravie name and Cigna on the card.",
            "As part of this transition, Open Enrollment meetings will be held at each of our locations to provide employees with important information about the new plan offerings and to answer any questions you may have. Attendance is strongly encouraged so you can fully understand your benefit options before making your election.",
        ],
        "heads_up": "With the change in insurance carriers, we suggest refilling any prescriptions you have prior to <strong>June 30</strong>.",
        "sections": [
            {
                "heading": "Medical Plan Options",
                "intro": "Employees will have three medical plan options to choose from:",
                "bullets": ["HSA Plan", "PPO Plan", "Comfort Fit Plan"],
                "outro": "We encourage everyone to carefully review all available options and ask questions before selecting a plan that best fits your healthcare and financial needs.",
            },
            {
                "heading": "Important Dates",
                "bullets": [
                    "<strong>Open Enrollment Deadline:</strong> All benefit elections must be completed by June 17, 2026.",
                    "<strong>Payroll Deductions Begin:</strong> Insurance premium deductions will begin with the July 2, 2026 payroll.",
                ],
                "outro": "Additional information, including meeting schedules and enrollment instructions, will be shared at your location soon.",
            },
        ],
        "closing": "Thank you for your attention and participation during this important enrollment period.",
    },

    "birthdays": [
        {"name": "Wes Langston", "date": "June 1", "location": "Allison Fence Co."},
        {"name": "Clevan Temple", "date": "June 1", "location": "Goldsboro"},
        {"name": "Eric Boneske", "date": "June 3", "location": "New Hanover"},
        {"name": "Brenda Haun", "date": "June 3", "location": "Newport"},
        {"name": "Brandon Watson", "date": "June 3", "location": "Spartanburg"},
        {"name": "Dylan Danner", "date": "June 6", "location": "Greensboro"},
        {"name": "Sheree Price", "date": "June 6", "location": "Wayne County"},
        {"name": "Charles Patterson", "date": "June 8", "location": "Spartanburg"},
        {"name": "Osiris Ruiz", "date": "June 10", "location": "Allison Fence Co."},
        {"name": "Daniel Smith", "date": "June 11", "location": "Goldsboro"},
        {"name": "John Francis", "date": "June 12", "location": "Jacksonville"},
        {"name": "Jose Rangel", "date": "June 12", "location": "Goldsboro"},
        {"name": "Charles Major", "date": "June 13", "location": "Jacksonville"},
        {"name": "Willard Radimer", "date": "June 13", "location": "Allison Fence Co."},
        {"name": "Christopher Politis", "date": "June 15", "location": "Columbia"},
        {"name": "Luis Hernandez", "date": "June 16", "location": "Raleigh"},
        {"name": "Chris Smith", "date": "June 16", "location": "Allison Fence Co."},
        {"name": "Terri Piercy", "date": "June 17", "location": "Allison Fence Co."},
        {"name": "Brandon Bossolono", "date": "June 18", "location": "Greenville"},
        {"name": "William Cotton", "date": "June 18", "location": "Columbia"},
        {"name": "Russell Kornegay", "date": "June 19", "location": "Goldsboro"},
        {"name": "James Truitt", "date": "June 19", "location": "Allison Fence Co."},
        {"name": "Jean Santiago", "date": "June 20", "location": "Fayetteville"},
        {"name": "Damadian Arrington", "date": "June 21", "location": "Rocky Mount"},
        {"name": "Steven Eury", "date": "June 21", "location": "New Hanover"},
        {"name": "Adam Setzco", "date": "June 24", "location": "Greenville"},
        {"name": "Jereli Garcia", "date": "June 25", "location": "Goldsboro"},
        {"name": "Vernon Chaffin", "date": "June 26", "location": "Greensboro"},
        {"name": "Austin May", "date": "June 26", "location": "Rocky Mount"},
        {"name": "Jeff Grey", "date": "June 28", "location": "Raleigh"},
        {"name": "Julian Moore", "date": "June 28", "location": "Greensboro"},
        {"name": "Kawaski Cobb", "date": "June 30", "location": "Jacksonville"},
        {"name": "Evan Proctor", "date": "June 30", "location": "Wayne County"},
        {"name": "Dustin Wetherington", "date": "June 30", "location": "Greenville"},
    ],

    "anniversaries": [
        {"name": "Ben Seegars", "years": 35, "location": "Goldsboro"},
        {"name": "Mark Rouse", "years": 32, "location": "Raleigh"},
        {"name": "Jennifer Rouse", "years": 30, "location": "Raleigh"},
        {"name": "John Seegars", "years": 30, "location": "Goldsboro"},
        {"name": "Veronica Aycock", "years": 24, "location": "Goldsboro"},
        {"name": "Gary Norwood", "years": 21, "location": "Fayetteville"},
        {"name": "Avery Bailey", "years": 13, "location": "Goldsboro"},
        {"name": "Chris Smith", "years": 13, "location": "Allison Fence Co."},
        {"name": "Anthony Nolan", "years": 9, "location": "Allison Fence Co."},
        {"name": "Jose Santiago", "years": 9, "location": "Goldsboro"},
        {"name": "Alex Holland", "years": 8, "location": "Jacksonville"},
        {"name": "Jackson Frederick", "years": 7, "location": "Goldsboro"},
        {"name": "Jordan Brown", "years": 5, "location": "Goldsboro"},
        {"name": "Orlando Torres", "years": 5, "location": "Allison Fence Co."},
        {"name": "Frank Claude", "years": 4, "location": "New Hanover"},
        {"name": "Cameron Martin", "years": 4, "location": "Allison Fence Co."},
        {"name": "Carolyn Reagan-Parliman", "years": 4, "location": "New Hanover"},
        {"name": "Ethan Wilson", "years": 4, "location": "Allison Fence Co."},
        {"name": "Carlos Franco", "years": 3, "location": "Goldsboro"},
        {"name": "Dale McGinnis", "years": 3, "location": "Allison Fence Co."},
        {"name": "David Parker", "years": 3, "location": "Rocky Mount"},
        {"name": "Landon Bossolono", "years": 2, "location": "Greenville"},
        {"name": "Clifton Coley", "years": 2, "location": "Goldsboro"},
        {"name": "Brandy Goddard", "years": 2, "location": "Greenville"},
        {"name": "Jarvis Grady", "years": 2, "location": "Goldsboro"},
        {"name": "Jennifer Godinez-Zacarias", "years": 1, "location": "Goldsboro"},
        {"name": "Kyle Longwith", "years": 1, "location": "Goldsboro"},
        {"name": "Nathaniel McDonald", "years": 1, "location": "Goldsboro"},
        {"name": "Anthony Smith", "years": 1, "location": "Spartanburg"},
        {"name": "David Stiller", "years": 1, "location": "Rocky Mount"},
        {"name": "Clevan Temple", "years": 1, "location": "Goldsboro"},
        {"name": 'Stephanie "Swiggins" Wiggins', "years": 1, "location": "Goldsboro"},
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

    "word_search": {
        "title": "Word Search",
        "subtitle": "Terms from this issue",
        "grid": [
            list("WSPIRITAOWXCKX"),
            list("BRICEGHYPOLTJV"),
            list("LSUHTRYEJREWSJ"),
            list("MXNRUARCURISPA"),
            list("TGWIEVAKNAKEOY"),
            list("FHHSDISUENOETA"),
            list("OMWVUERSCNOGLD"),
            list("BAMWASENNYCAIH"),
            list("VLWBLFVOACIRGT"),
            list("WLFOCQIPRRESHR"),
            list("CIGNATNYEACBTI"),
            list("PSKJOBNZLZNNGB"),
            list("ROUCXEAAOMEVNK"),
            list("ANGAWYAVTQFTDG"),
        ],
        "words": ["ALLISON", "ANNIVERSARY", "BIRTHDAY", "CHRIS", "CIGNA", "CLAUDE", "COOKIE", "FENCE", "GRAVIE", "JUNE", "NARROW", "SEEGARS", "SPIRIT", "SPOTLIGHT", "TOLERANCE"],
        "solution": {
            "ALLISON": [[7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1]],
            "ANNIVERSARY": [[12, 6], [11, 6], [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6]],
            "BIRTHDAY": [[11, 13], [10, 13], [9, 13], [8, 13], [7, 13], [6, 13], [5, 13], [4, 13]],
            "CHRIS": [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]],
            "CIGNA": [[10, 0], [10, 1], [10, 2], [10, 3], [10, 4]],
            "CLAUDE": [[9, 4], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4]],
            "COOKIE": [[7, 10], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10]],
            "FENCE": [[13, 10], [12, 10], [11, 10], [10, 10], [9, 10]],
            "GRAVIE": [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5]],
            "JUNE": [[2, 8], [3, 8], [4, 8], [5, 8]],
            "NARROW": [[5, 9], [4, 9], [3, 9], [2, 9], [1, 9], [0, 9]],
            "SEEGARS": [[3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11]],
            "SPIRIT": [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
            "SPOTLIGHT": [[2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12]],
            "TOLERANCE": [[13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8]],
        },
    },

    "contributors": [
        {"name": "Ben Seegars", "title": "CEO", "section": "A Letter From Ben"},
        {"name": "Dana Mull", "title": "People and Culture Manager", "section": "Meet Dana Mull"},
        {"name": "Chanda Best", "title": "Safety Manager", "section": "Zero Tolerance for Drugs and Alcohol"},
        {"name": "Chris Cook", "title": "Employee Spotlight", "section": "Employee Spotlight"},
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
