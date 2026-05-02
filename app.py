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


_PARTY_PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "static", "images", "party_photos")
_PARTY_HERO = "IMG_7482_20260423_200454-wm.jpg"


def _list_party_photos():
    """Return all party photo paths (relative to /static/images/), excluding the hero."""
    if not os.path.isdir(_PARTY_PHOTOS_DIR):
        return []
    files = sorted(
        f for f in os.listdir(_PARTY_PHOTOS_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png")) and f != _PARTY_HERO
    )
    return [f"party_photos/{f}" for f in files]


NEWSLETTER = {
    "month": "May",
    "year": 2026,
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
            "We closed out Q1 in a strong position, especially considering how tough January and February were. That did not happen by accident. It came from grit, discipline, and a team that knows how to execute when conditions are not ideal.",
            "We carried that momentum straight into April. Our backlog has been strong, and it is showing up in the numbers. We have sold roughly 2.00 for every 1.00 of charges. That is how you build a pipeline that fuels the future. Charges came in a little below goal, but still ahead of last April, so we are moving in the right direction with real traction.",
            "Take a step back for a moment. This is how winning organizations operate. They stack wins. They build backlog. They stay disciplined on execution. Q2 is shaping up well because of what you are doing right now. Keep pushing. Great work, team!",
            "For this month\u2019s SPIRIT focus, I want to share something that stuck with me from a sermon I heard over Easter from the Gospel of Luke 24:13 to 35, the road to Emmaus. Two disciples were walking away from Jerusalem on resurrection day. They were discouraged, confused, and trying to process everything that had just happened. Then Jesus comes alongside them, but they do not recognize Him at first. He walks with them, talks with them, and reminds them of what had been said all along. He meets them right where they are and also challenges their lack of faith.",
            "Here is what stands out to me. He met them while they were moving. They were not sitting still. They were walking, talking, trying to figure things out, and that is when He showed up.",
            "After they realized who He was, they immediately turned around and went seven miles back to Jerusalem to share the news. That is renewed purpose. That is clarity. That is action.",
            "There are two takeaways here that apply directly to us. First, the Lord meets us where we are, but we have to be open to Him. If we are looking, listening, and willing to let Him in, He will guide us and renew us. Second, action matters. When we move forward, especially with prayerful direction, we put ourselves in position to be led. Clarity often comes after we step out, not before.",
            "That is a powerful way to think about both life and work. We do not wait for perfect conditions. We move with purpose, stay grounded in our values, and trust the direction will become clear as we go. Let\u2019s carry that mindset into May. Stay focused. Stay safe. Take care of each other. Keep building something we are proud of, one linear foot at a time.",
        ],
        "pull_quote": "He met them while they were moving. They were not sitting still. They were walking, talking, trying to figure things out, and that is when He showed up.",
    },

    "company_party": {
        "eyebrow": "Company Party — April 23, 2026",
        "title": "An Evening Together",
        "main_photo": "party_photos/" + _PARTY_HERO,
        "main_photo_alt": "Six teammates from SFC Goldsboro at the company party photo booth",
        "intro": [
            "On Thursday, April 23, the Seegars family came together for an evening of food, fellowship, and celebration. Once an annual tradition, our company party now comes around every other year — and the wait makes it that much sweeter."
        ],
        "gallery": _list_party_photos(),
    },

    "hr_corner": {
        "title": "Q1 2026 Awards",
        "author": "Bobby Batchelor",
        "author_title": "COO",
        "headshot": "bobby.png",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "The first quarter of 2026 was quite surprising \u2014 enthusiasm was low in the beginning, but the quarter shaped up to deliver. Both sales percentage KPIs exceeded goal, allowing us to generate a substantial backlog. Our charges came in close to goal and outpaced Q1 2025.",
            "In the end, several of our branches exceeded their goal (note that we now have 13 branches since Cary and Durham have rolled up into Raleigh), and a healthy share of our estimators exceeded their goal as well. Our net promoter score remained strong. We have so much to be thankful for and are blessed to roll into 2026 with this kind of momentum.",
            "Now let\u2019s recognize our high achievers for Q1. Please take a moment to congratulate them for their great work."
        ],
        "sections": [
            {
                "heading": "Quad Club",
                "subheading": "Obtaining a 4.0+ Profit Ratio for the quarter",
                "content": [
                    "This group will receive a bonus on top of P4P, provided they meet all the criteria for the bonus. Their names will also go into a hat for a nice surprise at the annual company party."
                ],
                "value_label": "Ratio",
                "show_rank": True,
                "awards": [
                    {"rank": 1,  "name": "Thomas Lashford", "location": "Spartanburg",  "value": "35.19"},
                    {"rank": 2,  "name": "Tony Smith",      "location": "Raleigh",      "value": "12.98"},
                    {"rank": 3,  "name": "Evan Corson",     "location": "Columbia",     "value": "11.01"},
                    {"rank": 4,  "name": "Alec Pittman",    "location": "Greensboro",   "value": "9.27"},
                    {"rank": 5,  "name": "Blue Francis",    "location": "Jacksonville", "value": "5.59"},
                    {"rank": 6,  "name": "Michael Winford", "location": "Columbia",     "value": "4.65"},
                    {"rank": 7,  "name": "Dusty Tant",      "location": "Rocky Mount",  "value": "4.56"},
                    {"rank": 8,  "name": "Ken Manning",     "location": "Raleigh",      "value": "4.22"},
                    {"rank": 9,  "name": "Scottie Sumner",  "location": "Greensboro",   "value": "4.22"},
                    {"rank": 10, "name": "Gary Norwood",    "location": "Fayetteville", "value": "4.02"},
                ]
            },
            {
                "heading": "35X Club",
                "subheading": "Obtaining a 3.5+ Profit Ratio for the quarter",
                "content": [
                    "This group will receive a bonus on top of P4P, provided they meet all the criteria for the bonus. Each recipient\u2019s name will also be entered into a drawing."
                ],
                "value_label": "Ratio",
                "awards": [
                    {"name": "Joe Marks",    "location": "Rocky Mount", "value": "3.98"},
                    {"name": "Josh Doughty", "location": "Greenville",  "value": "3.80"},
                    {"name": "Jeremy Moore", "location": "Raleigh",     "value": "3.70"},
                ]
            },
            {
                "heading": "Neal Seegars \u2018MVP\u2019 Award",
                "subheading": "Highest Percent-to-Goal for the quarter",
                "content": [
                    "Congratulations to <strong>Emily Atella</strong> in New Hanover! Emily is invited to attend Fence Tech in Phoenix, enjoying a weekend on Seegars Fence of New Hanover while attending classes and brushing up on new products in the industry. This award also places Emily\u2019s name in the drawing held at our annual company party."
                ],
                "value_label": "% to Goal",
                "awards": [
                    {"name": "Emily Atella", "location": "New Hanover", "value": "243%"},
                ]
            },
            {
                "heading": "125 Club Award",
                "subheading": "Crews with production rates at or above 125%",
                "content": [
                    "Each eligible crew has its name entered into a drawing at the company party for the annual prize. The winning crew receives a bonus and an SFC gift pack. The crew must still be with the company, and the helpers associated with the crew must have worked with the foreman for the majority of the quarter in which they became eligible to receive the bonus."
                ],
                "value_label": "Production",
                "awards": [
                    {"name": "Johnny Worthington", "location": "Wayne",        "value": "146%"},
                    {"name": "Sam Vines",          "location": "Fayetteville", "value": "134%"},
                    {"name": "Caleb Blood",        "location": "Rocky Mount",  "value": "132%", "crew": ["Weeks Worley"]},
                    {"name": "Devin Wagner",       "location": "Wayne",        "value": "129%"},
                    {"name": "Larry Johnston",     "location": "Rocky Mount",  "value": "129%", "crew": ["Zack Richardson", "Matthew Denton"]},
                    {"name": "Jordan Bailey",      "location": "Wayne",        "value": "126%"},
                ]
            }
        ]
    },

    "safety": {
        "eyebrow": "Toolbox Topics \u2014 General Safety",
        "title": "Cuts and Burns",
        "author": "Chanda Best",
        "author_title": "Safety Manager",
        "headshot": "chanda.png",
        "image": "first_aid.svg",
        "intro": [
            "Nicks, cuts, scratches, and burns \u2014 minor injuries that can happen to any one of us, no matter how careful we are. They are easy to ignore, but it is worth remembering that skin is a vital organ. Not only is it the largest organ in the body, it also keeps the good stuff in and the bad stuff out.",
            "So what do you do when you get a minor injury? If you are like many of us, you realize a doctor\u2019s visit is not necessary and try to treat the injury yourself. How do you know when to seek professional treatment? And how do you treat injuries that do not require a doctor\u2019s visit?"
        ],
        "sections": [
            {
                "heading": "Cuts",
                "intro_paragraphs": ["Cuts require immediate professional attention if:"],
                "entries": [
                    "There is severe bleeding, especially arterial wounds, which literally pump blood from the body.",
                    "It is a puncture wound, such as one caused by a rusty nail or animal bite \u2014 these will require a tetanus booster shot.",
                    "The cut is more than one half inch long and one quarter inch deep, which will require stitches."
                ],
                "numbered": False,
                "outro_paragraphs": [
                    "To treat any cut, first stop the bleeding and then treat to prevent infection. Place a sterile gauze (or, if you do not have any gauze, a clean cloth) over the wound and hold it until the bleeding stops. Apply pressure continuously. If the gauze or cloth soaks through, simply place another cloth over the first and resume the pressure. When the bleeding has stopped, wash the cut with soap and water and apply a clean dressing. If the bleeding does not stop, get professional treatment.",
                    "After the cut is clean, look for any foreign objects in the wound and remove them. If you do not, a serious infection may set in. To keep the wound clean while it heals, you can cover it with a bandage \u2014 but remember the bandage will need attention too. Change it twice daily and use an antibiotic cream to prevent further infection. Keep in mind that wounds exposed to air heal faster, but it is also important to keep a wound clean and dry to prevent infection.",
                    "Treatment for a scrape is the same, except you do not have to worry about stopping blood flow, as there is very little."
                ]
            },
            {
                "heading": "Burns",
                "intro_paragraphs": [
                    "Burns are classified as first, second, or third degree. A first degree burn causes redness. Blistering is caused by a second degree burn. Charred, blackened, or blanched skin are signs of a third degree burn. Burns can be caused by heat (thermal burns) or by contact with chemicals.",
                    "Seek professional medical treatment for:"
                ],
                "entries": [
                    "All third degree burns.",
                    "Second degree burns involving more than one fifth of the body, or any burn affecting the face, hands, feet, or genitalia."
                ],
                "numbered": False,
                "outro_paragraphs": [
                    "First aid treatment for a burn focuses on relief of pain, prevention of infection, and treatment or prevention of shock. If a burn begins to blister, cool it by placing your hand or foot in cold, still (not running) water. For other parts of the body, use an ice pack. Gently clean the burn and cover the area with a sterile, non-stick gauze. Change the dressing twice a day. Never puncture a blister \u2014 this just opens the door for infection. Never use butter, oils, or petroleum jelly on burns.",
                    "If the burn is due to chemical exposure, flush the burned area with running water for at least 15 minutes. While you flush, remove any contaminated clothing, especially clothing in the area of the burn. Check the first aid instructions for the chemical, which can be found on the container and/or the Material Safety Data Sheet (MSDS), and treat as specified. Cover the burn with a clean dressing and call a doctor.",
                    "If a third degree burn is involved, get professional medical treatment quickly. Call an ambulance first. While awaiting professional help, make sure any fire is out and/or remove the victim from the burn source. <strong>Do not remove any clothing or apply any dressings.</strong> Treat for shock and make sure the victim is still breathing."
                ]
            }
        ],
        "closing": "Use common sense in all situations. Maintain a well-stocked first aid kit and be familiar with first aid procedures. Being knowledgeable and prepared may be the smartest first step of all."
    },

    "employee_spotlight": {
        "title": "Employee Spotlight",
        "name": "Caleb Blood",
        "location": "Seegars Fence Company \u2014 Rocky Mount, NC",
        "photos": ["Employee_spotlight/caleb.jpg"],
        "qa": [
            {"q": "How long have you been working at Seegars?", "a": "20 years"},
            {"q": "What\u2019s your job position?", "a": "Foreman / Leadman"},
            {"q": "Favorite movie or show?", "a": "My favorite in this decade would have to be Top Gun 2."},
            {"q": "Favorite food?", "a": "Ribeye steak with asparagus and red skin mashed potatoes"},
            {"q": "Cake or pie, and what kind?", "a": "Homemade cheesecake with graham cracker crust"},
            {"q": "Dream vacation spot?", "a": "Somewhere in the mountains, maybe the Swiss Alps"},
            {"q": "First thing you\u2019d do if you won the lottery?", "a": "If gifted a large sum of money, the first thing I would do is tithe. The fun thing would be finding time to ski a lot more."},
            {"q": "Go-to weekend activity?", "a": "Cut grass"},
            {"q": "Favorite way to relax after work?", "a": "Jog, read a book, watch a ballgame"},
            {"q": "One thing most people at work don\u2019t know about you?", "a": "I\u2019m actually a pretty nice guy."},
        ]
    },

    "birthdays": [
        {"name": "James Stiller", "date": "May 1", "location": "Rocky Mount"},
        {"name": "Omari Sweat", "date": "May 2", "location": "New Hanover"},
        {"name": "Alexander Holland", "date": "May 6", "location": "Jacksonville"},
        {"name": "Derek Schaffer", "date": "May 6", "location": "Raleigh"},
        {"name": "Emily Atella", "date": "May 7", "location": "New Hanover"},
        {"name": "Derrick Hansley", "date": "May 7", "location": "New Hanover"},
        {"name": "Anthony Smith", "date": "May 7", "location": "Raleigh"},
        {"name": "Martin Greathouse", "date": "May 8", "location": "Columbia"},
        {"name": "Ryan Rouse", "date": "May 14", "location": "Newport"},
        {"name": "Stephanie Wiggins", "date": "May 16", "location": "Goldsboro"},
        {"name": "Caleb Bowen", "date": "May 17", "location": "Spartanburg"},
        {"name": "Felipe Brito Cruz", "date": "May 18", "location": "Raleigh"},
        {"name": "Lorenzo Quetzecua", "date": "May 18", "location": "Wayne Co."},
        {"name": "Samuel Vines Jr", "date": "May 22", "location": "Fayetteville"},
        {"name": "Cambria Richardson", "date": "May 24", "location": "Goldsboro"},
        {"name": "Jarvis Grady", "date": "May 28", "location": "Goldsboro"},
    ],

    "anniversaries": [
        {"name": "Jairo Romero", "years": 22, "location": "Greensboro"},
        {"name": "Ashley Alford", "years": 21, "location": "Fayetteville"},
        {"name": "Caleb Blood", "years": 20, "location": "Rocky Mount"},
        {"name": "Jose Garcia", "years": 19, "location": "Goldsboro"},
        {"name": "Dustin Smith", "years": 15, "location": "Columbia"},
        {"name": "Terry Sexton", "years": 13, "location": "Spartanburg"},
        {"name": "Larry Johnston", "years": 11, "location": "Rocky Mount"},
        {"name": "Chanda Best", "years": 10, "location": "Goldsboro"},
        {"name": "Cameron Freeman", "years": 8, "location": "Fayetteville"},
        {"name": "Joshua Doughty", "years": 6, "location": "Greenville"},
        {"name": "Bryan Holland", "years": 6, "location": "Jacksonville"},
        {"name": "Ricky Lee", "years": 6, "location": "Goldsboro"},
        {"name": "Emily Atella", "years": 4, "location": "New Hanover"},
        {"name": "Alexis Wood", "years": 4, "location": "Allison Fence Co."},
        {"name": "Jonn Blasingame", "years": 3, "location": "New Hanover"},
        {"name": "Peter Zelaski", "years": 3, "location": "Greenville"},
        {"name": "Anthony Hidalgo", "years": 2, "location": "Allison Fence Co."},
        {"name": "Nicholas Filomio", "years": 1, "location": "Allison Fence Co."},
        {"name": "Joe Marks", "years": 1, "location": "Rocky Mount"},
        {"name": "Qwan Starks", "years": 1, "location": "Columbia"},
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
            list("SZNRIROROAMKFI"),
            list("RPAZUNSXOBLOOT"),
            list("AATHGILTOPSBTC"),
            list("GWLPARTYSESEEU"),
            list("EAWARDSEIIMSAT"),
            list("EIMFTBELACCHMS"),
            list("SVPARCADEAFQKQ"),
            list("UIOCELEBRATEVU"),
            list("XRHANNIVERSARY"),
            list("HTKPVPHWNKRTXU"),
            list("BURNSYAMIUHBCY"),
            list("QULFQYZGJJWJRL"),
            list("FWWBIRTHDAYXOT"),
            list("CTIRIPSDECNEFT"),
        ],
        "words": ["ANNIVERSARY", "ARCADE", "AWARDS", "BIRTHDAY", "BURNS", "CALEB", "CELEBRATE", "CUTS", "FENCE", "MAY", "PARTY", "SEEGARS", "SPIRIT", "SPOTLIGHT", "TEAM", "TOOLBOX", "TRIVIA"],
        "solution": {
            "ANNIVERSARY": [[8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13]],
            "SPOTLIGHT": [[2, 10], [2, 9], [2, 8], [2, 7], [2, 6], [2, 5], [2, 4], [2, 3], [2, 2]],
            "CELEBRATE": [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9], [7, 10], [7, 11]],
            "BIRTHDAY": [[12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [12, 10]],
            "SEEGARS": [[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
            "TOOLBOX": [[1, 13], [1, 12], [1, 11], [1, 10], [1, 9], [1, 8], [1, 7]],
            "AWARDS": [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
            "ARCADE": [[6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8]],
            "SPIRIT": [[13, 6], [13, 5], [13, 4], [13, 3], [13, 2], [13, 1]],
            "TRIVIA": [[9, 1], [8, 1], [7, 1], [6, 1], [5, 1], [4, 1]],
            "FENCE": [[13, 12], [13, 11], [13, 10], [13, 9], [13, 8]],
            "PARTY": [[3, 3], [3, 4], [3, 5], [3, 6], [3, 7]],
            "CALEB": [[5, 9], [5, 8], [5, 7], [5, 6], [5, 5]],
            "BURNS": [[10, 0], [10, 1], [10, 2], [10, 3], [10, 4]],
            "TEAM": [[2, 12], [3, 12], [4, 12], [5, 12]],
            "CUTS": [[2, 13], [3, 13], [4, 13], [5, 13]],
            "MAY": [[10, 7], [10, 6], [10, 5]],
        },
    },

    "contributors": [
        {"name": "Ben Seegars", "title": "CEO", "section": "A Letter From Ben"},
        {"name": "Bobby Batchelor", "title": "COO", "section": "Q1 2026 Awards"},
        {"name": "Chanda Best", "title": "Safety Manager", "section": "Safety First"},
        {"name": "Caleb Blood", "title": "Employee Spotlight", "section": "Employee Spotlight"},
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
