#!/usr/bin/env bash
set -euo pipefail

export FLASK_APP="${FLASK_APP:-app.py}"

flask db upgrade
exec gunicorn app:app
