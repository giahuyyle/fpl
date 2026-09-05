"""add user chips

Revision ID: b9c0d1e2f345
Revises: a8b9c0d1e234
Create Date: 2026-09-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b9c0d1e2f345"
down_revision: Union[str, None] = "a8b9c0d1e234"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_chips",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("chip_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('available', 'active', 'used')",
            name="ck_user_chip_status",
        ),
        sa.ForeignKeyConstraint(["chip_id"], ["chips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "chip_id"),
    )
    op.create_index("ix_user_chips_chip_id", "user_chips", ["chip_id"], unique=False)
    op.create_index("ix_user_chips_user_id", "user_chips", ["user_id"], unique=False)
    op.execute(
        """
        INSERT INTO user_chips (user_id, chip_id, status)
        SELECT users.id, chips.id, 'available'
        FROM users CROSS JOIN chips
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_chips_user_id", table_name="user_chips")
    op.drop_index("ix_user_chips_chip_id", table_name="user_chips")
    op.drop_table("user_chips")
