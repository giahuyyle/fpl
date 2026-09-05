"""add squad profiles

Revision ID: a8b9c0d1e234
Revises: f7a8b9c0d123
Create Date: 2026-09-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8b9c0d1e234"
down_revision: Union[str, None] = "f7a8b9c0d123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "squads",
        sa.Column(
            "name", sa.String(length=50), server_default="Squad", nullable=False
        ),
    )
    op.add_column(
        "squads",
        sa.Column(
            "badge_style",
            sa.String(length=30),
            server_default="classic-purple",
            nullable=False,
        ),
    )
    op.create_table(
        "squad_favorite_teams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("squad_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["squad_id"], ["squads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("squad_id", "team_id"),
    )
    op.create_index(
        "ix_squad_favorite_teams_squad_id",
        "squad_favorite_teams",
        ["squad_id"],
        unique=False,
    )
    op.create_index(
        "ix_squad_favorite_teams_team_id",
        "squad_favorite_teams",
        ["team_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_squad_favorite_teams_team_id", table_name="squad_favorite_teams"
    )
    op.drop_index(
        "ix_squad_favorite_teams_squad_id", table_name="squad_favorite_teams"
    )
    op.drop_table("squad_favorite_teams")
    op.drop_column("squads", "badge_style")
    op.drop_column("squads", "name")
