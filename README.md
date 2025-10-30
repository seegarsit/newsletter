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
   python app.py
   ```
4. Visit [http://localhost:5000](http://localhost:5000) in your browser to view the newsletter.

## Structure

- `app.py` – Flask entry point that renders the newsletter template and serves static assets.
- `templates/index.html` – Landing page markup rendered by Flask.
- `assets/styles.css` – Global styling, responsive layout, and theming.
- `assets/app.js` – Interactive enhancements for the subscription forms and footer year.
- `requirements.txt` – Python dependencies for running the application.

Feel free to adapt the content and imagery to match the latest edition of *The Fence Line*.
