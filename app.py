from flask import Flask, render_template

app = Flask(__name__)

NEWSLETTER = {
    "month": "March",
    "year": 2026,
    "volume": "LXXVII",
    "issue": 3,
    "location": "North Carolina \u2022 South Carolina \u2022 Georgia",
    "edition": "MORNING EDITION",
    "motto": "Changing the world one linear foot at the time.",
    "tagline": "A family business distinguished by exceptional values and quality.",
    "established": 1949,

    # Ben's Team Letter — hidden for March 2026, can be re-enabled later
    # "team_letter": { ... },

    "lead_section": {
        "type": "spirit_contest",
        "title": "S.P.I.R.I.T Logo Contest",
        "prize": "$500.00 to the winner!",
        "author": "Christina Williams",
        "author_title": "Marketing Manager",
        "headshot": "christina.png",
        "image": "spirit.png",
        "content": [
            "We\u2019re excited to announce a Company Logo Redesign Contest open to all employees! This is your opportunity to help shape the future look of our brand by creating a new and improved S.P.I.R.I.T logo that truly reflects who we are\u2014our culture, our values, and our team-first approach. We\u2019re looking for a design that visually represents the pride we take in our work, the strength of our teamwork, and the SPIRIT (Service, Professionalism, Integrity, Relationships, Initiative, and Teamwork) that sets our company apart. The winning designer will receive a $500 reward and the honor of seeing their creativity become part of our company\u2019s identity. Let your creativity shine and show us what our culture looks like through your eyes!",
            "This contest is designed to be fully inclusive\u2014whether you\u2019re a skilled digital designer or simply have a great idea and want to hand-draw your concept, all submission formats are welcome.",
            "Submissions are due to John Seegars (<a href='mailto:johns@seegarsfence.com'>johns@seegarsfence.com</a>) by <strong>Wednesday, April 1, 2026</strong>."
        ]
    },

    "feature_article": {
        "title": "The Power of Relationships",
        "subtitle": "How genuine connections drive success in the fencing industry and beyond",
        "author": "John Seegars",
        "author_title": "Vice President",
        "headshot": "john.png",
        "dateline": "GOLDSBORO, N.C.",
        "content": [
            "In the fencing business, materials matter, equipment matters, and craftsmanship matters, but relationships matter most. Strong relationships are the foundation that everything else is built on. They are what turn a one-time job into a repeat customer, a crew into a team, and a company into a trusted name.",
            "Internal relationships start with communication. Clear, honest, and consistent communication between estimators/project managers, crews, and office staff keeps jobs running smoothly and expectations aligned. When teams communicate well, mistakes are reduced, problems are solved faster, and everyone understands their role in delivering a quality product. Respect and trust within the organization creates accountability and a culture where people want to do their best work.",
            "External relationships are just as critical. Customers aren\u2019t only buying a fence, they\u2019re buying confidence that the job will be done right. Open communication, responsiveness, and follow-through build trust and set us apart in our competitive markets. The same is true for relationships with suppliers, vendors, and subcontractors. Strong partnerships lead to better support, better products, and better outcomes for our customers.",
            "At the end of the day, fencing is a people business. Posts and panels may define the perimeter, but relationships define the company. When communication is strong, both internally and externally, everything else falls into place."
        ],
        "pull_quote": "Posts and panels may define the perimeter, but relationships define the company."
    },

    "hr_corner": {
        "title": "Did you Know?",
        "subtitle": "Employees may donate PTO to a Co-worker in need",
        "author": "Veronica Aycock",
        "author_title": "Exec. Vice President",
        "headshot": "veronica.png",
        "dateline": "GOLDSBORO, N.C.",
        "intro": "Seegars Fence Company recognizes that employees may have a family medical emergency or be affected by a major disaster, resulting in a need for additional time off in excess of their available sick/personal time. To address this need, all eligible employees will be allowed to donate sick/personal time from their unused balance to their co-workers in need of sick/personal time in accordance with the policy outlined below. This policy is strictly voluntary.",
        "sections": [
            {
                "heading": "Eligibility",
                "content": "Employees must be employed with Seegars Fence Company for a minimum of one year to be eligible to donate and/or receive donated sick/personal time."
            },
            {
                "heading": "Guidelines",
                "content": "Employees who are eligible to receive donated sick/personal time from their co-workers must have a situation that meets the following criteria:",
                "criteria": [
                    "Medical emergency, defined as a medical condition of the employee or an immediate family member that will require the prolonged/extended absence of the employee from duty and will result in a substantial loss of income to the employee due to the exhaustion of all paid leave available. An immediate family member is defined as a spouse, child or parent.",
                    "Major disaster, defined as a disaster declared by the president under \u00a7401 of the Robert T. Stafford Disaster Relief and Emergency Assistance Act (the Stafford Act), or as a major disaster or emergency declared by the president pursuant to 5 U.S.C. \u00a76391 for federal government agencies. An employee is considered to be adversely affected by a major disaster if the disaster has caused severe hardship to the employee or to a family member of the employee that requires the employee to be absent from work."
                ]
            },
            {
                "heading": "Donation of Sick/Personal Time",
                "bullets": [
                    "The donation of sick/personal time is strictly voluntary.",
                    "The donation of sick/personal time is on an hourly basis, without regard to the dollar value of the donated or used leave.",
                    "Following the donation of hours, the donating employee must maintain a minimum of 20 hours of leave time.",
                    "Employees cannot borrow against future sick/personal time to donate.",
                    "Employees who are currently on an approved leave of absence cannot donate sick/personal time."
                ]
            }
        ],
        "closing": "If the recipient employee has available sick/personal time in his or her balance, this time will be used prior to any donated sick/personal time. Donated sick/personal time may only be used for time off related to the approved incident. Employees who receive donated sick/personal time may receive no more than 480 hours (12 weeks) within a rolling 12-month period."
    },

    "safety": {
        "title": "Know the Chemical Before It Knows You",
        "author": "Chanda Best",
        "author_title": "Safety Manager",
        "headshot": "chanda.png",
        "image": "ppe.png",
        "purpose": "Hazard Communication (HazCom) is how we make sure everyone knows what chemicals are on the job, what hazards they have, and how to work with them safely\u2014before an exposure happens.",
        "subtitle": "What HazCom Requires (What You Should Expect at Work)",
        "intro": "Under OSHA HazCom, employees must have access to:",
        "requirements": [
            "A chemical inventory (what hazardous chemicals we use/store)",
            "Safety Data Sheets (SDS) for each chemical",
            "Proper labels on containers (including secondary containers)",
            "Training on chemical hazards and protective measures",
            "PPE available to protect against chemical exposure"
        ],
        "closing": "If you can\u2019t find an SDS, the label is missing, or a product is in an unmarked bottle\u2014stop and ask."
    },

    "tech_talk": {
        "title": "Your Newsletter. Your Stories.",
        "author": "Brad Wells",
        "author_title": "IT Manager",
        "headshot": "brad.png",
        "content": [
            "So, this month I wanted to do something a little different with my section. Instead of talking about technology, I want to talk about the newsletter itself.",
            "Every month a group of us put The Fence Line together and try to make it something worth reading. But honestly, I think the best content isn\u2019t going to come from us sitting at our desks. It\u2019s going to come from you all out in the field."
        ],
        "subheading_1": "Show off your work",
        "content_2": [
            "You all are out there everyday building fences that people are going to see and depend on for years. Some of these jobs look incredible when they\u2019re done, and most of the time the only people who ever see the finished product are the crew that built it and the customer.",
            "Next time you wrap up a job you\u2019re proud of, snap some pictures. Get a few good angles. Then send them to me with a quick description. What was installed, where it was, and who the crew was. I want to start featuring your work in The Fence Line so everybody across the company can see it!",
            "A few photos and a couple sentences is all I need."
        ],
        "subheading_2": "Other ideas?",
        "content_3": [
            "And it doesn\u2019t stop at photos. If you\u2019ve got an idea for something you\u2019d like to see in the newsletter, whether it\u2019s a topic, a section, or a story about something going on at your location, let me know. You can reach out to me directly or tell your manager and they\u2019ll pass it along.",
            "The bigger the idea, the better this will be. I\u2019m always looking for ways to make The Fence Line something people actually want to read, and that starts with the fences being installed. Because <em>WE BUILD FENCES!</em>",
            "So, send me your photos. Send me your ideas.",
            "Email <a href='mailto:brad@seegarsfence.com'>brad@seegarsfence.com</a>, text <a href='tel:+12529080231'>252-908-0231</a>, or let your manager know."
        ]
    },

    "birthdays": [
        {"name": "Dakota Boneske", "date": "March 1", "location": "New Hanover"},
        {"name": "Amanda Carpenter", "date": "March 1", "location": "Rocky Mount"},
        {"name": "David Miley", "date": "March 1", "location": "Jacksonville"},
        {"name": "Clint Spence", "date": "March 1", "location": "Columbia"},
        {"name": "Christopher Parsons", "date": "March 3", "location": "Raleigh"},
        {"name": "Mitchell Hankins", "date": "March 4", "location": "Columbia"},
        {"name": "Steven Stewart", "date": "March 4", "location": "Greenville"},
        {"name": "Josh Doughty", "date": "March 6", "location": "Greenville"},
        {"name": "Jamie Price", "date": "March 6", "location": "Wayne Co."},
        {"name": "Liam Hinnant", "date": "March 7", "location": "Columbia"},
        {"name": "Josue Lagunas", "date": "March 8", "location": "Goldsboro"},
        {"name": "Tina Mantooth", "date": "March 9", "location": "Raleigh"},
        {"name": "Ben Seegars Jr", "date": "March 9", "location": "Goldsboro"},
        {"name": "Homer Pike", "date": "March 11", "location": "Goldsboro"},
        {"name": "Max Batchelor", "date": "March 12", "location": "Goldsboro"},
        {"name": "Dale McGinnis", "date": "March 12", "location": "Allison"},
        {"name": "Tim Williams", "date": "March 12", "location": "Goldsboro"},
        {"name": "Fernando Cannon", "date": "March 13", "location": "Columbia"},
        {"name": "Keith Hefner", "date": "March 18", "location": "Jacksonville"},
        {"name": "Gurney Blake", "date": "March 19", "location": "Greenville"},
        {"name": "Random Jeffcoat", "date": "March 19", "location": "Columbia"},
        {"name": "Dustin Hardy", "date": "March 20", "location": "Raleigh"},
        {"name": "Jason Daniels", "date": "March 21", "location": "Raleigh"},
        {"name": "Jessica McEntire", "date": "March 21", "location": "Columbia"},
        {"name": "Joseph Harrison", "date": "March 22", "location": "Wayne Co."},
        {"name": "Latezea Lyles-Thompson", "date": "March 23", "location": "Columbia"},
        {"name": "Jose Cervera", "date": "March 24", "location": "Raleigh"},
        {"name": "Cameron Martin", "date": "March 25", "location": "Allison"},
        {"name": "Jose Santiago", "date": "March 25", "location": "Goldsboro"},
        {"name": "Zander Fewell", "date": "March 27", "location": "Raleigh"},
        {"name": "David Gottschammer", "date": "March 28", "location": "Jacksonville"},
        {"name": "Caleb Milian", "date": "March 28", "location": "Augusta"},
        {"name": "Coleman Dawson", "date": "March 29", "location": "Goldsboro"},
        {"name": "Jackson Wilkinson", "date": "March 30", "location": "Columbia"},
    ],

    "anniversaries": [
        {"name": "Chris Holland", "years": 28, "location": "Jacksonville"},
        {"name": "Lori Capps", "years": 26, "location": "Fayetteville"},
        {"name": "Scottie Sumner", "years": 20, "location": "Greensboro"},
        {"name": "Stephanie Borkowski", "years": 19, "location": "Goldsboro"},
        {"name": "Lorenzo Quetzecua", "years": 19, "location": "Wayne Co."},
        {"name": "Victor Silva", "years": 19, "location": "Goldsboro"},
        {"name": "Brandon Bossolono", "years": 17, "location": "Greenville"},
        {"name": "Darryl Kennedy", "years": 16, "location": "Greensboro"},
        {"name": "Travis Caviness", "years": 12, "location": "Allison"},
        {"name": "Amy Alford", "years": 11, "location": "Fayetteville"},
        {"name": "Evan Proctor", "years": 9, "location": "Wayne Co."},
        {"name": "Ralph Turnage", "years": 8, "location": "Goldsboro"},
        {"name": "Chad Alford", "years": 7, "location": "Fayetteville"},
        {"name": "Brenda Haun", "years": 6, "location": "Newport"},
        {"name": "Amy Lancaster", "years": 6, "location": "Goldsboro"},
        {"name": "Curtis L. Boyd", "years": 5, "location": "Allison"},
        {"name": "Chris Buck", "years": 2, "location": "Goldsboro"},
        {"name": "Brittany Sistare", "years": 2, "location": "Spartanburg"},
        {"name": "Brandon Watson", "years": 2, "location": "Spartanburg"},
        {"name": "Raymond L. Mantooth", "years": 1, "location": "Raleigh"},
        {"name": "Kayla Mccarty", "years": 1, "location": "Spartanburg"},
        {"name": "James W. McGirt", "years": 1, "location": "Fayetteville"},
        {"name": "Caleb Milian", "years": 1, "location": "Augusta"},
        {"name": "Greg Morton", "years": 1, "location": "Goldsboro"},
        {"name": "Ryan Rouse", "years": 1, "location": "Newport"},
        {"name": "Jackson Wilkinson", "years": 1, "location": "Columbia"},
    ],

    "contributors": [
        {"name": "Christina Williams", "title": "Marketing Manager", "section": "S.P.I.R.I.T Contest"},
        {"name": "John Seegars", "title": "Vice President", "section": "Feature Article"},
        {"name": "Veronica Aycock", "title": "Exec. Vice President", "section": "HR Corner"},
        {"name": "Chanda Best", "title": "Safety Manager", "section": "Safety First"},
        {"name": "Brad Wells", "title": "IT Manager", "section": "Your Newsletter. Your Stories."},
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

    "social_links": {
        "facebook": "https://www.facebook.com/seegarsfencecompany/",
        "instagram": "https://www.instagram.com/seegarsfence/",
        "youtube": "https://www.youtube.com/user/SeegarsFence/videos",
        "linkedin": "https://www.linkedin.com/company/seegars-fence-company/",
    }
}


@app.route("/")
def index():
    return render_template("index.html", n=NEWSLETTER)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
