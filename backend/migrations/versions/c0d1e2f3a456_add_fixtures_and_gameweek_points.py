"""add fixtures and gameweek points

Revision ID: c0d1e2f3a456
Revises: b9c0d1e2f345
Create Date: 2026-09-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c0d1e2f3a456"
down_revision: Union[str, None] = "b9c0d1e2f345"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fixtures",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("fpl_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("gameweek_id", sa.Integer(), nullable=True),
        sa.Column("home_team_id", sa.Integer(), nullable=False),
        sa.Column("away_team_id", sa.Integer(), nullable=False),
        sa.Column("home_score", sa.Integer(), nullable=True),
        sa.Column("away_score", sa.Integer(), nullable=True),
        sa.Column("kickoff_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started", sa.Boolean(), nullable=False),
        sa.Column("finished", sa.Boolean(), nullable=False),
        sa.Column("finished_provisional", sa.Boolean(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("home_difficulty", sa.Integer(), nullable=True),
        sa.Column("away_difficulty", sa.Integer(), nullable=True),
        sa.Column("pulse_id", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["away_team_id"], ["teams.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["gameweek_id"], ["gameweeks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["home_team_id"], ["teams.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season_id", "fpl_id"),
    )
    op.create_index("ix_fixtures_away_team_id", "fixtures", ["away_team_id"])
    op.create_index("ix_fixtures_gameweek_id", "fixtures", ["gameweek_id"])
    op.create_index(
        "ix_fixtures_gameweek_kickoff",
        "fixtures",
        ["gameweek_id", "kickoff_time"],
    )
    op.create_index("ix_fixtures_home_team_id", "fixtures", ["home_team_id"])
    op.create_index("ix_fixtures_season_id", "fixtures", ["season_id"])

    op.create_table(
        "player_gameweek_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("gameweek_id", sa.Integer(), nullable=False),
        sa.Column("total_points", sa.Integer(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("played", sa.Boolean(), nullable=False),
        sa.Column("in_dreamteam", sa.Boolean(), nullable=False),
        sa.Column("starts", sa.Integer(), nullable=False),
        sa.Column("goals_scored", sa.Integer(), nullable=False),
        sa.Column("assists", sa.Integer(), nullable=False),
        sa.Column("clean_sheets", sa.Integer(), nullable=False),
        sa.Column("goals_conceded", sa.Integer(), nullable=False),
        sa.Column("own_goals", sa.Integer(), nullable=False),
        sa.Column("penalties_saved", sa.Integer(), nullable=False),
        sa.Column("penalties_missed", sa.Integer(), nullable=False),
        sa.Column("yellow_cards", sa.Integer(), nullable=False),
        sa.Column("red_cards", sa.Integer(), nullable=False),
        sa.Column("saves", sa.Integer(), nullable=False),
        sa.Column("bonus", sa.Integer(), nullable=False),
        sa.Column("bps", sa.Integer(), nullable=False),
        sa.Column("defensive_contribution", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["gameweek_id"], ["gameweeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("player_id", "gameweek_id"),
    )
    op.create_index("ix_player_gameweek_stats_gameweek_id", "player_gameweek_stats", ["gameweek_id"])
    op.create_index("ix_player_gameweek_stats_player_id", "player_gameweek_stats", ["player_id"])

    op.create_table(
        "squad_gameweeks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("squad_id", sa.Integer(), nullable=False),
        sa.Column("gameweek_id", sa.Integer(), nullable=False),
        sa.Column("active_chip_id", sa.Integer(), nullable=True),
        sa.Column("is_backfilled", sa.Boolean(), nullable=False),
        sa.Column("finalized", sa.Boolean(), nullable=False),
        sa.Column("bank", sa.Integer(), nullable=False),
        sa.Column("squad_value", sa.Integer(), nullable=False),
        sa.Column("transfers_made", sa.Integer(), nullable=False),
        sa.Column("transfer_cost", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("points_on_bench", sa.Integer(), nullable=False),
        sa.Column("total_points", sa.Integer(), nullable=False),
        sa.Column("gameweek_rank", sa.Integer(), nullable=True),
        sa.Column("overall_rank", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["active_chip_id"], ["chips.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["gameweek_id"], ["gameweeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["squad_id"], ["squads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("squad_id", "gameweek_id"),
    )
    op.create_index("ix_squad_gameweeks_gameweek_id", "squad_gameweeks", ["gameweek_id"])
    op.create_index("ix_squad_gameweeks_gameweek_points", "squad_gameweeks", ["gameweek_id", "points"])
    op.create_index("ix_squad_gameweeks_squad_id", "squad_gameweeks", ["squad_id"])

    op.create_table(
        "squad_gameweek_picks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("squad_gameweek_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.Column("lineup_position", sa.Integer(), nullable=False),
        sa.Column("purchase_price", sa.Integer(), nullable=False),
        sa.Column("is_captain", sa.Boolean(), nullable=False),
        sa.Column("is_vice_captain", sa.Boolean(), nullable=False),
        sa.Column("multiplier", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("effective_points", sa.Integer(), nullable=False),
        sa.Column("was_auto_subbed", sa.Boolean(), nullable=False),
        sa.CheckConstraint("slot >= 1 AND slot <= 15", name="ck_sgw_pick_slot"),
        sa.CheckConstraint("lineup_position >= 1 AND lineup_position <= 15", name="ck_sgw_pick_lineup_position"),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["squad_gameweek_id"], ["squad_gameweeks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("squad_gameweek_id", "lineup_position"),
        sa.UniqueConstraint("squad_gameweek_id", "player_id"),
    )
    op.create_index("ix_squad_gameweek_picks_player_id", "squad_gameweek_picks", ["player_id"])
    op.create_index("ix_squad_gameweek_picks_squad_gameweek_id", "squad_gameweek_picks", ["squad_gameweek_id"])


def downgrade() -> None:
    op.drop_index("ix_squad_gameweek_picks_squad_gameweek_id", table_name="squad_gameweek_picks")
    op.drop_index("ix_squad_gameweek_picks_player_id", table_name="squad_gameweek_picks")
    op.drop_table("squad_gameweek_picks")
    op.drop_index("ix_squad_gameweeks_squad_id", table_name="squad_gameweeks")
    op.drop_index("ix_squad_gameweeks_gameweek_points", table_name="squad_gameweeks")
    op.drop_index("ix_squad_gameweeks_gameweek_id", table_name="squad_gameweeks")
    op.drop_table("squad_gameweeks")
    op.drop_index("ix_player_gameweek_stats_player_id", table_name="player_gameweek_stats")
    op.drop_index("ix_player_gameweek_stats_gameweek_id", table_name="player_gameweek_stats")
    op.drop_table("player_gameweek_stats")
    op.drop_index("ix_fixtures_season_id", table_name="fixtures")
    op.drop_index("ix_fixtures_home_team_id", table_name="fixtures")
    op.drop_index("ix_fixtures_gameweek_kickoff", table_name="fixtures")
    op.drop_index("ix_fixtures_gameweek_id", table_name="fixtures")
    op.drop_index("ix_fixtures_away_team_id", table_name="fixtures")
    op.drop_table("fixtures")
