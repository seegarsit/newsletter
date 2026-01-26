# Fence Line Newsletter

A modern, single-page internal newsletter experience for the Seegars Fence Company team. The site is now served by a lightweight [Flask](https://flask.palletsprojects.com/) application so you can run it with Python instead of opening a static file.

## Getting started

1. Create and activate a virtual environment (optional but recommended).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the development server:
   ```bash
   flask db upgrade
   python app.py
   ```
4. Visit [http://localhost:5000](http://localhost:5000) in your browser to view the newsletter.

## Admin dashboard

The modular editorial editor is available at `/admin/login`.

### Required environment variables

Set these before the first login to bootstrap the initial admin user:

- `ADMIN_EMAIL` – Email address for the first admin login.
- `ADMIN_PASSWORD` – Password for the first admin login.

Optional configuration:

- `DATABASE_URL` – SQLAlchemy database URL (defaults to `sqlite:///data/newsletter.db`).
- `SECRET_KEY` – Flask secret key for sessions.
- `FLASK_APP` – Set to `app.py` for migrations and CLI commands.

## Database migrations

This app uses Flask-Migrate/Alembic. Run migrations before starting the app:

```bash
flask db upgrade
```

## Render deployment

Use a start command that runs migrations before Gunicorn:

```bash
bash -lc "flask db upgrade && gunicorn app:app"
```

Alternatively, point Render at the included script:

```bash
./render-start.sh
```

### Admin pages

- `/admin/login` – Sign in with the admin credentials.
- `/admin/issues` – Create, duplicate, delete, and activate issues.
- `/admin/editor/<issue_slug>` – Edit hero content, module order, and module data.

## Structure

- `app.py` – Flask entry point, admin routes, and database integration.
- `templates/index.html` – Landing page markup rendered by Flask.
- `templates/admin/` – Admin dashboard templates.
- `assets/styles.css` – Editorial styling and responsive layout.
- `assets/admin.css` – Admin dashboard styling.
- `assets/app.js` – Front-end interactions and editorial card collapse logic.
- `assets/admin.js` – Admin editor UI helpers.
- `requirements.txt` – Python dependencies for running the application.

Feel free to adapt the content and imagery to match the latest edition of *The Fence Line*.
