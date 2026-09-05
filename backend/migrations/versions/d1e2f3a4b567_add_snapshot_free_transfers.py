"""add snapshot free transfers

Revision ID: d1e2f3a4b567
Revises: c0d1e2f3a456
Create Date: 2026-09-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b567"
down_revision: Union[str, None] = "c0d1e2f3a456"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "squad_gameweeks",
        sa.Column("free_transfers", sa.Integer(), server_default="1", nullable=False),
    )
    op.add_column(
        "squad_gameweeks",
        sa.Column(
            "free_transfers_after", sa.Integer(), server_default="1", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("squad_gameweeks", "free_transfers_after")
    op.drop_column("squad_gameweeks", "free_transfers")
