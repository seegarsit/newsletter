# The Fence Line — Newsletter Project

## Autonomy
- **Never ask "do you want me to proceed?" or similar.** Just do it.
- **Do not ask for confirmation before running commands.** Make the decision and proceed.
- Take action first, report results after. The only exception is force-pushing to main or deleting production data.

## Startup Checklist
Run these steps at the beginning of every session before doing any work:

1. **Fetch and check for remote changes:**
   ```bash
   git fetch origin
   ```
   - Compare local `dev` against `origin/dev` using `git diff origin/dev -- .` (content-level, not just filenames).
   - If there are incoming changes, pull them: `git pull origin dev`.
   - Report sync status to the user.

2. **Start the local dev server:**
   ```bash
   /c/Users/BradWells/AppData/Local/Programs/Python/Python313/python.exe app.py
   ```
   - Run in background on port 5000.
   - Confirm it's running before beginning work.
   - All changes should be reviewed locally before pushing.

## Project Structure
- `app.py` — Flask app + all newsletter content (in the `NEWSLETTER` dict)
- `templates/base.html` — base HTML layout
- `templates/index.html` — main newsletter template (Jinja2)
- `static/css/newspaper.css` — all styling
- `static/js/main.js` — client-side JS (poll, scroll, etc.)
- `static/images/` — headshots and graphics

## Content Editing
- Newsletter text content lives in the `NEWSLETTER` dict in `app.py`.
- Layout and structure changes go in `templates/index.html`.
- Styling changes go in `static/css/newspaper.css`.

## Branch Workflow
- Work on `dev` branch.
- PRs merge `dev` → `main`.
- `main` deploys to Render.
