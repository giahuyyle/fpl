"""add squads

Revision ID: e6f7a8b9c012
Revises: c5d6e7f8a901
Create Date: 2026-08-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6f7a8b9c012"
down_revision: Union[str, None] = "c5d6e7f8a901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "squads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("is_complete", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "season_id"),
    )
    op.create_index("ix_squads_season_id", "squads", ["season_id"], unique=False)
    op.create_index("ix_squads_user_id", "squads", ["user_id"], unique=False)

    op.create_table(
        "squad_picks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("squad_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.Column("lineup_position", sa.Integer(), nullable=True),
        sa.Column("purchase_price", sa.Integer(), nullable=False),
        sa.Column("is_captain", sa.Boolean(), nullable=False),
        sa.Column("is_vice_captain", sa.Boolean(), nullable=False),
        sa.CheckConstraint("slot >= 1 AND slot <= 15", name="ck_squad_pick_slot"),
        sa.CheckConstraint(
            "lineup_position IS NULL OR (lineup_position >= 1 AND lineup_position <= 15)",
            name="ck_squad_pick_lineup_position",
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["squad_id"], ["squads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("squad_id", "lineup_position"),
        sa.UniqueConstraint("squad_id", "player_id"),
        sa.UniqueConstraint("squad_id", "slot"),
    )
    op.create_index("ix_squad_picks_player_id", "squad_picks", ["player_id"], unique=False)
    op.create_index("ix_squad_picks_squad_id", "squad_picks", ["squad_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_squad_picks_squad_id", table_name="squad_picks")
    op.drop_index("ix_squad_picks_player_id", table_name="squad_picks")
    op.drop_table("squad_picks")
    op.drop_index("ix_squads_user_id", table_name="squads")
    op.drop_index("ix_squads_season_id", table_name="squads")
    op.drop_table("squads")
