# The Fence Line — Newsletter Project

## Autonomy
- **Never ask "do you want me to proceed?" or similar.** Just do it.
- **Do not ask for confirmation before running commands.** Make the decision and proceed.
- Take action first, report results after. The only exception is force-pushing to main or deleting production data.
- Do not ask permission to start tasks, run servers, commit, create PRs, or merge. Just do it.

## Startup Checklist
Run these steps at the beginning of every session before doing any work:

1. **Fetch and check for remote changes:**
   ```bash
   git fetch origin
   ```
   - Compare local `dev` against `origin/main` using `git diff origin/main -- .` (content-level, not just filenames).
   - If there are incoming changes on `origin/main`, fast-forward `dev`: `git pull origin main`.
   - Report sync status to the user.

2. **Start the local dev server:**
   ```bash
   "/c/Users/Brad Wells/AppData/Local/Programs/Python/Python313/python.exe" app.py
   ```
   - Run in background on port 5000.
   - Confirm it's running before beginning work.
   - All changes should be reviewed locally before pushing.

## Shutdown
- When the user says they're done, stop the local dev server before ending.

## Project Structure
- `app.py` — Flask app + all newsletter content (in the `NEWSLETTER` dict)
- `templates/base.html` — base HTML layout (includes lightbox with prev/next gallery arrows)
- `templates/index.html` — main newsletter template (Jinja2)
- `static/css/newspaper.css` — all styling
- `static/js/main.js` — client-side JS (poll, scroll, carousel, lightbox gallery, fireworks, weather, etc.)
- `static/images/` — headshots and graphics
- `static/images/installation_pics/` — carousel images (currently 1.png through 5.png)

## Content Editing
- Newsletter text content lives in the `NEWSLETTER` dict in `app.py`.
- Layout and structure changes go in `templates/index.html`.
- Styling changes go in `static/css/newspaper.css`.

## Key Features & Sections (top to bottom)
- **Masthead** — company name, nameplate, month/year, motto
- **Skybox banner** — linked announcement strip
- **Above the fold** — CEO letter, SPIRIT contest, HR corner, tech talk, reader poll (left); weather widget, feature article, safety section, vintage ad, news wire (right sidebar)
- **Milestones & Merriment** — birthdays and anniversaries with fireworks canvas animation
- **From the Field** (carousel) — installation photo showcase with animated green #008852 comic-gradient border, infinite loop, auto-advance (5s), dot nav, touch/swipe, lightbox gallery with prev/next arrows and keyboard nav
- **Bulletin Board & Resources** — company links and RightNow Media
- **The Crew** — comic strip panels
- **Footer** — copyright, back-to-top
- **Login overlay** — session-based auth gate (shown when not logged in)

## Branch Workflow
- Work on `dev` branch locally.
- Push directly to `origin/main` to deploy: `git push origin dev:main`.
- No PRs, no merges via API — `dev` is normally a fast-forward of `origin/main`, so a direct push works.
- `origin/main` deploys to Render automatically.
- Local `main` branch is diverged from `origin/main` — never use the local `main` branch. Always push from `dev` using the `dev:main` refspec.

## Deploying Changes
1. Commit on `dev`.
2. Push straight to main: `git push origin dev:main`
3. Render auto-deploys from `origin/main`.

## Environment Notes
- Python path: `"/c/Users/Brad Wells/AppData/Local/Programs/Python/Python313/python.exe"` (note the space — must be quoted)
- `python` and `pip` are NOT on the shell PATH — always use the full path
- `gh` CLI is installed at `/c/Program Files/GitHub CLI/gh.exe` (not on shell PATH — use the full path)
- `gh` is also wired in as the git credential helper for github.com, so `git push` uses whichever account is active in `gh auth status`
- Two accounts are logged into `gh`: `seegarsit` (owns the repo, must be the active account for pushes) and `dbwells1216` (read-only, do not use for pushes). Switch with `gh auth switch -u seegarsit` if pushes get a 403.
