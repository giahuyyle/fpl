"""add account settings

Revision ID: e2f3a4b5c678
Revises: d1e2f3a4b567
"""
from alembic import op
import sqlalchemy as sa

revision = "e2f3a4b5c678"
down_revision = "d1e2f3a4b567"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("settings", sa.JSON(), nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("users", "settings")
