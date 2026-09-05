"""add squad bank

Revision ID: f7a8b9c0d123
Revises: e6f7a8b9c012
Create Date: 2026-09-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d123"
down_revision: Union[str, None] = "e6f7a8b9c012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "squads",
        sa.Column("bank", sa.Integer(), server_default="0", nullable=False),
    )
    op.execute(
        """
        UPDATE squads
        SET bank = (
            SELECT game_rules.budget
            FROM game_rules
            WHERE game_rules.season_id = squads.season_id
        ) - COALESCE((
            SELECT SUM(squad_picks.purchase_price)
            FROM squad_picks
            WHERE squad_picks.squad_id = squads.id
        ), 0)
        """
    )


def downgrade() -> None:
    op.drop_column("squads", "bank")
