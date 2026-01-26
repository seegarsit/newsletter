"""add draft/publish fields

Revision ID: 202501120001
Revises: 
Create Date: 2025-01-12 00:01:00.000000
"""

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "202501120001"
down_revision = None
branch_labels = None
depends_on = None


def _json_type() -> sa.TypeEngine:
    bind = op.get_bind()
    if bind is not None:
        dialect = bind.dialect.name
    else:
        dialect = context.get_context().dialect.name
    if dialect == "postgresql":
        return postgresql.JSONB()
    return sa.JSON()


def upgrade() -> None:
    op.add_column("issue", sa.Column("published_content", _json_type(), nullable=True))
    op.add_column("issue", sa.Column("draft_content", _json_type(), nullable=True))
    op.add_column("issue", sa.Column("published_at", sa.DateTime(), nullable=True))
    op.add_column("issue", sa.Column("draft_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("issue", "draft_updated_at")
    op.drop_column("issue", "published_at")
    op.drop_column("issue", "draft_content")
    op.drop_column("issue", "published_content")
