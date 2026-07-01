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
    "month": "July",
    "year": 2026,
    "volume": "LXXVII",
    "issue": 6,
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
            "June has been a solid month for company performance, and I want to start by saying thank you. We have seen sales continue to grow steadily, and charges have surged ahead of goal for the quarter. Even better, we are now showing ahead of goal for the year. That is a strong place to be as we close out the first half of 2026, and it is a direct reflection of the hard work, persistence, and commitment of this team.",
            "Residential sales continue to be slower than what we are used to seeing during the spring and early summer season, but our commercial opportunities have remained steady. Hopefully, as everyone gets refocused after the 4th of July and gas prices continue to fall, we will begin to see a resurgence in residential business as well. In the meantime, we will keep doing what we do best: serving customers, building quality fences, supporting one another, and continuing to move this company forward one linear foot at a time!",
            "As we celebrate the 4th of July and look toward America\u2019s 250th birthday, we are reminded that America\u2019s story did not begin with comfort, certainty, or convenience. It began with faith, conviction, and courage.",
            "It began with faith. The birth of America was rooted in the belief that rights come from God, not government, and that ordinary people could govern themselves under principles greater than any one person. Our Founding Fathers did not know how the story would end, but they believed future generations deserved the opportunity to live free, work hard, worship freely, raise families, and pursue a better life.",
            "It required conviction. Nearly 250 years ago, a group of men stepped forward and declared that liberty was worth defending and freedom was worth sacrificing for. They faced overwhelming odds, powerful opposition, personal risk, and an uncertain future. But they believed deeply enough in the cause of freedom to put their names, their fortunes, and their lives on the line.",
            "And it took courage. The freedoms we enjoy today were not handed to us casually. They were purchased through sacrifice, protected through service, and passed down through generations of men and women who believed this nation was worth building, defending, and improving.",
            "That same spirit lives on today. At Seegars Fence Company, we are called to build things that last, and that goes beyond the fences we install. It shows up in the way we serve our customers, support one another, take pride in our work, and carry ourselves in the communities where we live and work. When we do those things well, we are doing our small part to strengthen something bigger than ourselves.",
            "This Independence Day, as we look toward America\u2019s 250th birthday, let\u2019s remember that freedom is not free. It was secured through sacrifice, protected by courage, and must be carried forward by each generation. We honor that gift by being people willing to work, sacrifice, lead, serve, and believe that tomorrow can be better than today. May we be grateful for the blessings of liberty and committed to doing our part in our homes, our company, our communities, and our country.",
        ],
        "pull_quote": "Freedom is not free. It was secured through sacrifice, protected by courage, and must be carried forward by each generation.",
    },

    "hr_corner": {
        "title": "Finding Confidence in New Challenges",
        "subtitle": "Inspired by Eric Church",
        "author": "Dana Mull",
        "author_title": "People and Culture Manager",
        "headshot": "dana_mull.png",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "Recently, I listened to country music artist Eric Church share a story on a podcast about being invited to deliver the commencement address at UNC Chapel Hill. He mentioned that public speaking isn\u2019t in his comfort zone, and he was nervous about stepping into something so unfamiliar.",
            "But he brought his guitar on stage.",
            "Holding that guitar is something he is very confident with, and it grounded him. He strummed the guitar while he spoke about using the strings as a metaphor for the pillars of a meaningful and balanced life:",
        ],
        "pillars": [
            "<strong>Faith (Low E String):</strong> The strong, steady foundation that keeps you anchored.",
            "<strong>Family &amp; Friends:</strong> The strings that give your life richness and depth.",
            "<strong>Work &amp; Community:</strong> The strings that create rhythm and connection with the world around you.",
            "<strong>Your Unique Voice (High E String):</strong> The lightest string represents your individuality, passion, and purpose.",
        ],
        "content_after": [
            "His message went viral. Not because he delivered a perfect speech, but because he stepped into something uncomfortable and used what he already knew to help him do it well. The message was fantastic, and I believe it is a lesson worth sharing here at Seegars Fence.",
            "Every day, we face moments that push us outside of our comfort zones. This could be learning a new skill, approaching a new customer, taking on a new responsibility, or trying a different way of doing things. Growth doesn\u2019t usually feel comfortable at first. But like Eric Church, we can lean on the strengths we already have to help us step into something new.",
            "Maybe you are great with people. Maybe you are steady under pressure. Maybe you are a problem solver, a planner, or someone who brings calm to a chaotic day. Whatever your \u201cguitar\u201d is, use it! Let it give you confidence as you stretch into the new skill, the next challenge, or the next opportunity.",
            "If you would like to watch Eric Church\u2019s full address, you can view it right here:",
        ],
        "youtube_id": "pSYEDc7-Ah0",
        "youtube_title": "Eric Church\u2019s UNC Chapel Hill Commencement Address",
    },

    "safety": {
        "eyebrow": "Toolbox Topics \u2014 Summer Heat Safety",
        "title": "Beat the Heat: Spotting & Preventing Heat Illness",
        "author": "Chanda Best",
        "author_title": "Safety Manager",
        "headshot": "chanda.png",
        "image": "stay_cool.svg",
        "intro": [
            "With summer temperatures climbing, heat-related illness is a real risk on the job site. Knowing the warning signs \u2014 and how to respond \u2014 can keep you and your crew safe.",
        ],
        "sections": [
            {
                "heading": "What keeps the body from cooling itself?",
                "intro_paragraphs": [
                    "Several factors can affect a person\u2019s ability to cool down in extreme heat. When humidity (the amount of moisture in the air) is high, sweat does not evaporate as quickly, which keeps the body from releasing heat. Other risk factors include age, obesity, fever, dehydration, heart disease, poor circulation, sunburn, and the use of alcohol and certain prescription drugs.",
                ],
            },
            {
                "heading": "What are the warning signs?",
                "entries": [
                    "<strong>Heat rash:</strong> May look like a red cluster of pimples, a red area of skin, or small blisters. It most often appears on the neck and upper chest, in the groin, under the arms, and in the creases of the elbows.",
                    "<strong>Heat exhaustion:</strong> Cool, moist, pale, or flushed skin; heavy sweating; headache; nausea or vomiting; dizziness; and/or fatigue. Body temperature stays near normal.",
                    "<strong>Heat stroke:</strong> Hot, red skin; changes in consciousness; a rapid, strong pulse; and rapid, shallow breathing. Body temperature can climb very high \u2014 as high as 105\u00b0F. If the person was sweating from heavy work or exercise the skin may be wet; otherwise it will feel dry.",
                ],
                "numbered": False,
            },
            {
                "heading": "What should you do if illness develops?",
                "entries": [
                    "<strong>Heat rash:</strong> Move to a cooler, less humid environment. Keep the affected area dry; body powder can add comfort.",
                    "<strong>Heat cramps:</strong> If you have heart problems or are on a low-sodium diet, get medical attention. Otherwise, stop all activity and sit in a cool place; drink water, clear juice, or a sports drink; and seek medical attention if the cramps do not ease within an hour.",
                    "<strong>Heat exhaustion:</strong> Helpful measures include sips of cool water, rest, a cool shower or bath, air conditioning, and lightweight clothing. Get medical help if the person vomits or has a change in mental status, chest pain, or trouble breathing.",
                    "<strong>Heat stroke:</strong> This can be a life-threatening emergency. Move the person to a shady area and call for emergency medical help. Cool them rapidly by any means available \u2014 cool water, a cool shower, spray from a hose, or, if humidity is low, wrap them in a cool, wet sheet and fan them vigorously. Do not give them fluids to drink. Get medical care as soon as possible.",
                ],
                "numbered": False,
            },
            {
                "heading": "How can you prevent heat-related illness?",
                "entries": [
                    "<strong>Air conditioning:</strong> A/C is the number-one protection against heat-related illness and death. If your home is not air-conditioned, spend time in public places that are.",
                    "<strong>Fluids:</strong> Drink more liquids in hot weather. If your doctor limits how much you drink, or you take water pills, ask how much is right for you in the heat. Avoid caffeine, alcohol, and large amounts of sugar \u2014 they make the body lose more fluid \u2014 and skip very cold drinks, which can cause stomach cramps.",
                    "<strong>Wear appropriate clothing:</strong> Choose lightweight, light-colored, loose-fitting clothes \u2014 and wear less of them.",
                    "<strong>Limit outdoor activity:</strong> If you must be outside, try to work during the morning and evening hours, and rest often in the shade so your body\u2019s thermostat can recover.",
                    "<strong>Watch what you eat:</strong> Eat smaller meals more often, and go easy on foods high in protein.",
                ],
                "numbered": False,
            },
        ],
        "closing": "Look out for yourself and your crew this summer \u2014 hydrate often, take breaks in the shade, and don\u2019t ignore the warning signs."
    },

    "employee_spotlight": {
        "title": "Employee Spotlight",
        "name": "Dusty Horne",
        "location": "Raleigh",
        "photos": ["Employee_spotlight/dusty_horne.jpg"],
        "qa": [
            {"q": "How long have you been working at Seegars?", "a": "I\u2019ve been working at Seegars for 16 years."},
            {"q": "What\u2019s your job position?", "a": "I am a Superintendent for Seegars Fence of Raleigh."},
            {"q": "Favorite movie or TV show?", "a": "My favorite TV show is Animal Kingdom."},
            {"q": "Favorite food?", "a": "My favorite food would be Hamburger Steak and gravy."},
            {"q": "Cake or pie, and what kind?", "a": "That\u2019s a close one \u2014 I love sweets. But I\u2019d say a Hershey Bar cake."},
            {"q": "Dream vacation spot?", "a": "Jamaica. I\u2019ve been twice and plan to retire there."},
            {"q": "First thing you\u2019d do if you won the lottery?", "a": "Take 6 months off work and travel the world with my family."},
            {"q": "Go-to weekend activity?", "a": "Definitely some sporting event. Go Pack!"},
            {"q": "Favorite way to relax after work?", "a": "Shower, dinner and feet up watching Love Island with the family."},
            {"q": "One thing most people at work don\u2019t know about you?", "a": "Growing up I enjoyed drawing and writing poetry."},
        ]
    },

    "benefits_update": {
        "eyebrow": "For Employees with Accident or Critical Illness Coverage",
        "title": "Get Cash Back for Routine Health Screenings",
        "author": "Veronica Aycock",
        "author_title": "Executive VP",
        "headshot": "veronica.png",
        "content": [
            "The Guardian Wellness Benefit pays you a cash reward once per calendar year simply for completing a routine health screening, and you can redeem it entirely online through Guardian Life Insurance.",
        ],
        "sections": [
            {
                "heading": "Benefit Summary",
                "intro": "The wellness benefit is built into Guardian’s Accident and Critical Illness supplemental plans to incentivize preventive care.",
                "bullets": [
                    "<strong>How it works:</strong> If you or any covered family member completes a qualified routine exam, Guardian pays a flat cash payout (typically $50 to $100).",
                    "<strong>Frequency:</strong> You can claim this cash reward once per calendar year, per covered person.",
                ],
            },
            {
                "heading": "Eligible Screenings",
                "intro": "Covered procedures generally include routine health checks like:",
                "bullets": [
                    "Annual physicals and well-child visits",
                    "Mammograms and colonoscopies",
                    "Pap smears and PSA tests",
                    "Immunizations and flu shots",
                    "Blood screenings (cholesterol, diabetes)",
                    "Dental or vision exams (depending on your specific plan)",
                    "Specialized sports baseline studies or youth sports registration (on certain accident plans)",
                ],
            },
            {
                "heading": "How to Redeem Your Benefit Each Year",
                "intro": "You do not need to submit receipts or extensive medical records to claim this cash. The process is entirely self-reported online:",
                "bullets": [
                    "<strong>Log in:</strong> Go to <a href=\"https://www.guardianlife.com/\" target=\"_blank\" rel=\"noopener\">Guardian Life</a> and click “My Account / Login.” Log into your member portal (or register if it is your first time).",
                    "<strong>Navigate to claims:</strong> Under the “My Claims” tab, click “Submit a Claim” or “Claims Submission.”",
                    "<strong>Select wellness:</strong> Choose the “Wellness” claim option.",
                    "<strong>Enter details:</strong> Verify your personal information and enter the date of service, the doctor’s name and facility, and the specific screening test performed.",
                    "<strong>Submit:</strong> Submit the digital form. Guardian processes the claim quickly and sends the cash payout directly to you by check or direct deposit.",
                ],
            },
        ],
        "closing": "If you have any questions about your Guardian coverage or how to claim this benefit, please reach out — I’m glad to help.",
    },

    "birthdays": [
        {"name": "Alexis Wood", "date": "July 2", "location": "Allison Fence Co."},
        {"name": "Travonte Henry-Brown", "date": "July 3", "location": "New Hanover"},
        {"name": "Wilson Handy", "date": "July 4", "location": "Allison Fence Co."},
        {"name": "Daqwan Starks", "date": "July 4", "location": "Columbia"},
        {"name": "Abigayle McEntire", "date": "July 7", "location": "Columbia"},
        {"name": "Keontre Sharpe", "date": "July 10", "location": "Rocky Mount"},
        {"name": "Anthony Hagins", "date": "July 11", "location": "Wayne County"},
        {"name": "Scotty Reeder", "date": "July 12", "location": "Allison Fence Co."},
        {"name": "Steven Roux", "date": "July 12", "location": "Jacksonville"},
        {"name": "Camden Parrish", "date": "July 15", "location": "Fayetteville"},
        {"name": "Nickolas Whitley", "date": "July 15", "location": "Goldsboro"},
        {"name": "Larry Johnston", "date": "July 17", "location": "Rocky Mount"},
        {"name": "Greg Morton", "date": "July 18", "location": "Goldsboro"},
        {"name": "Edwin Ruiz", "date": "July 20", "location": "Goldsboro"},
        {"name": "Lori Capps", "date": "July 21", "location": "Fayetteville"},
        {"name": "Anthony Lazo", "date": "July 24", "location": "Raleigh"},
        {"name": "Jacob Palma", "date": "July 24", "location": "Columbia"},
        {"name": "Peter Zelaski", "date": "July 24", "location": "Greenville"},
        {"name": "Jose Serafin Cruz", "date": "July 25", "location": "Rocky Mount"},
        {"name": "Bryan Holland", "date": "July 29", "location": "Jacksonville"},
        {"name": "Robert Powell", "date": "July 30", "location": "Rocky Mount"},
    ],

    "anniversaries": [
        {"name": "Gregory Brown", "years": 30, "location": "Allison Fence Co."},
        {"name": "Jamie Price", "years": 21, "location": "Wayne County"},
        {"name": "Solomon May", "years": 18, "location": "Goldsboro"},
        {"name": "Robert Powell", "years": 14, "location": "Rocky Mount"},
        {"name": "Craig Wilson", "years": 13, "location": "Allison Fence Co."},
        {"name": "David Gottschammer", "years": 11, "location": "Jacksonville"},
        {"name": "Amber Hawkins", "years": 5, "location": "Rocky Mount"},
        {"name": "Scott Herring", "years": 5, "location": "Goldsboro"},
        {"name": "Daniel Lawson", "years": 5, "location": "Spartanburg"},
        {"name": "Kaleb Campbell", "years": 2, "location": "Allison Fence Co."},
        {"name": "Emilio Macias", "years": 2, "location": "Goldsboro"},
        {"name": "William Batchelor", "years": 1, "location": "Goldsboro"},
        {"name": "Valerie Parker", "years": 1, "location": "Augusta"},
        {"name": "Semaj Pixley", "years": 1, "location": "Columbia"},
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
        "subtitle": "Celebrating America's 250th",
        "grid": [
            list("SMDICTOIRTAPNZ"),
            list("EEECILBUPERYNM"),
            list("PNCANQDAXHVOEO"),
            list("IOLRNOVEANIGYD"),
            list("RIAQEFSSLTOCAE"),
            list("TNRPQVHRUGARAE"),
            list("SUAIYYOTERACPR"),
            list("VYTREBILCFIEUF"),
            list("UDITCTWOURFVOG"),
            list("UNOPSCMTETSEIP"),
            list("MTNNWEXMIXIIJJ"),
            list("LOOHDHAZDXSOZC"),
            list("OCECNEDNEPEDNI"),
            list("GNOTGNIHSAWGRI"),
        ],
        "words": ["AMERICA", "CONSTITUTION", "DECLARATION", "DEMOCRACY", "EAGLE", "FREEDOM", "INDEPENDENCE", "JEFFERSON", "LIBERTY", "PATRIOT", "REPUBLIC", "REVOLUTION", "STRIPES", "UNION", "WASHINGTON"],
        "solution": {
            "AMERICA": [[11, 6], [10, 7], [9, 8], [8, 9], [7, 10], [6, 11], [5, 12]],
            "CONSTITUTION": [[12, 1], [11, 2], [10, 3], [9, 4], [8, 5], [7, 6], [6, 7], [5, 8], [4, 9], [3, 10], [2, 11], [1, 12]],
            "DECLARATION": [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2]],
            "DEMOCRACY": [[11, 4], [10, 5], [9, 6], [8, 7], [7, 8], [6, 9], [5, 10], [4, 11], [3, 12]],
            "EAGLE": [[7, 11], [6, 10], [5, 9], [4, 8], [3, 7]],
            "FREEDOM": [[7, 13], [6, 13], [5, 13], [4, 13], [3, 13], [2, 13], [1, 13]],
            "INDEPENDENCE": [[12, 13], [12, 12], [12, 11], [12, 10], [12, 9], [12, 8], [12, 7], [12, 6], [12, 5], [12, 4], [12, 3], [12, 2]],
            "JEFFERSON": [[10, 12], [9, 11], [8, 10], [7, 9], [6, 8], [5, 7], [4, 6], [3, 5], [2, 4]],
            "LIBERTY": [[7, 7], [7, 6], [7, 5], [7, 4], [7, 3], [7, 2], [7, 1]],
            "PATRIOT": [[0, 11], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [0, 5]],
            "REPUBLIC": [[1, 10], [1, 9], [1, 8], [1, 7], [1, 6], [1, 5], [1, 4], [1, 3]],
            "REVOLUTION": [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12]],
            "STRIPES": [[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0]],
            "UNION": [[6, 1], [5, 1], [4, 1], [3, 1], [2, 1]],
            "WASHINGTON": [[13, 10], [13, 9], [13, 8], [13, 7], [13, 6], [13, 5], [13, 4], [13, 3], [13, 2], [13, 1]],
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
