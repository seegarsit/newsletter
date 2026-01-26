"""Add draft and published tracking to issues.

Revision ID: 20250914_add_issue_draft_published_fields
Revises: 
Create Date: 2025-09-14 00:00:00.000000
"""
from __future__ import annotations

from datetime import datetime

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250914_add_issue_draft_published_fields"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("issue", sa.Column("draft_content", sa.JSON(), nullable=True))
    op.add_column("issue", sa.Column("draft_updated_at", sa.DateTime(), nullable=True))
    op.add_column("issue", sa.Column("published_content", sa.JSON(), nullable=True))
    op.add_column("issue", sa.Column("published_at", sa.DateTime(), nullable=True))

    issue_table = sa.table(
        "issue",
        sa.column("id", sa.Integer),
        sa.column("slug", sa.String),
        sa.column("issue_month", sa.String),
        sa.column("hero", sa.JSON),
        sa.column("modules", sa.JSON),
        sa.column("published_content", sa.JSON),
        sa.column("published_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
        sa.column("created_at", sa.DateTime),
    )

    connection = op.get_bind()
    rows = connection.execute(sa.select(issue_table)).mappings().all()
    for row in rows:
        if row["published_content"] is not None and row["published_at"] is not None:
            continue
        published_payload = {
            "slug": row["slug"],
            "issue_month": row["issue_month"],
            "hero": row["hero"],
            "modules": row["modules"],
        }
        published_at = row["published_at"] or row["updated_at"] or row["created_at"]
        if published_at is None:
            published_at = datetime.utcnow()
        connection.execute(
            sa.update(issue_table)
            .where(issue_table.c.id == row["id"])
            .values(published_content=published_payload, published_at=published_at)
        )


def downgrade() -> None:
    pass
