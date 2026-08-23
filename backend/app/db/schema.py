from datetime import date, datetime

from sqlalchemy import create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from sqlalchemy import ForeignKey, String, Boolean, Date, Float, DateTime, UniqueConstraint

from app.core.config import config


engine = create_engine(config.postgresql_db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username_normalized"),
        UniqueConstraint("email_normalized"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    username: Mapped[str] = mapped_column(String(50), nullable=False)
    username_normalized: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(String(320), nullable=False)
    email_normalized: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("season_id", "fpl_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    fpl_id: Mapped[int] = mapped_column(nullable=False)

    code: Mapped[int] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    short_name: Mapped[str] = mapped_column(String, nullable=False)

    played: Mapped[int] = mapped_column(nullable=False, default=0)
    wins: Mapped[int] = mapped_column(nullable=False, default=0)
    draws: Mapped[int] = mapped_column(nullable=False, default=0)
    losses: Mapped[int] = mapped_column(nullable=False, default=0)
    points: Mapped[int] = mapped_column(nullable=False, default=0)
    position: Mapped[int] = mapped_column(nullable=False)

    strength: Mapped[int | None] = mapped_column()
    strength_overall_home: Mapped[int] = mapped_column()
    strength_overall_away: Mapped[int] = mapped_column()
    strength_attack_home: Mapped[int] = mapped_column()
    strength_attack_away: Mapped[int] = mapped_column()
    strength_defence_home: Mapped[int] = mapped_column()
    strength_defence_away: Mapped[int] = mapped_column()

    unavailable: Mapped[bool] = mapped_column(Boolean, default=False)


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fpl_id: Mapped[int] = mapped_column()

    code: Mapped[str] = mapped_column(String)               # GKP, DEF, MID, FWD
    name: Mapped[str] = mapped_column(String)               

    squad_select: Mapped[int] = mapped_column(default=0)    # number of plyers in that position that a manager must have
    min_play: Mapped[int] = mapped_column()                 # min number of position in squad
    max_play: Mapped[int] = mapped_column()                 # max number of position in squad


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fpl_id: Mapped[int] = mapped_column(unique=True)

    code: Mapped[int] = mapped_column()
    opta_code: Mapped[str | None] = mapped_column(String)

    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    known_name: Mapped[str | None] = mapped_column(String)
    web_name: Mapped[str] = mapped_column(String)

    birth_date: Mapped[date | None] = mapped_column(Date)
    region: Mapped[int | None] = mapped_column()

    photo: Mapped[str | None] = mapped_column(String)

    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    position_id: Mapped[int] = mapped_column(ForeignKey("positions.id"))

    squad_number: Mapped[int | None] = mapped_column()
    team_join_date: Mapped[date | None] = mapped_column(Date)

    status: Mapped[str] = mapped_column(String)
    can_select: Mapped[bool] = mapped_column(Boolean)
    can_transact: Mapped[bool] = mapped_column(Boolean)
    removed: Mapped[bool] = mapped_column(Boolean, default=False)


class PlayerSeasonStats(Base):
    __tablename__ = "players_seasons_stats"
    __table_args__ = (UniqueConstraint("player_id", "season_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    minutes: Mapped[int] = mapped_column()
    starts: Mapped[int] = mapped_column()

    goals_scored: Mapped[int] = mapped_column()
    assists: Mapped[int] = mapped_column()
    clean_sheets: Mapped[int] = mapped_column()
    goals_conceded: Mapped[int] = mapped_column()

    own_goals: Mapped[int] = mapped_column()
    penalties_saved: Mapped[int] = mapped_column()
    penalties_missed: Mapped[int] = mapped_column()

    yellow_cards: Mapped[int] = mapped_column()
    red_cards: Mapped[int] = mapped_column()
    saves: Mapped[int] = mapped_column()

    bonus: Mapped[int] = mapped_column()
    bps: Mapped[int] = mapped_column()

    influence: Mapped[float] = mapped_column(Float)
    creativity: Mapped[float] = mapped_column(Float)
    threat: Mapped[float] = mapped_column(Float)
    ict_index: Mapped[float] = mapped_column(Float)

    clearances_blocks_interceptions: Mapped[int] = mapped_column()
    recoveries: Mapped[int] = mapped_column()
    tackles: Mapped[int] = mapped_column()
    defensive_contribution: Mapped[int] = mapped_column()

    expected_goals: Mapped[float] = mapped_column(Float)
    expected_assists: Mapped[float] = mapped_column(Float)
    expected_goal_involvements: Mapped[float] = mapped_column(Float)
    expected_goals_conceded: Mapped[float] = mapped_column(Float)

    total_points: Mapped[int] = mapped_column()
    points_per_game: Mapped[float] = mapped_column(Float)

    now_cost: Mapped[int] = mapped_column()
    form: Mapped[float] = mapped_column(Float)
    selected_by_percent: Mapped[float] = mapped_column(Float)

    transfers_in: Mapped[int] = mapped_column()
    transfers_out: Mapped[int] = mapped_column()
    transfers_in_event: Mapped[int] = mapped_column()
    transfers_out_event: Mapped[int] = mapped_column()

    event_points: Mapped[int] = mapped_column()

    chance_of_playing_next_round: Mapped[int | None] = mapped_column()
    chance_of_playing_this_round: Mapped[int | None] = mapped_column()

    ep_next: Mapped[float | None] = mapped_column(Float)
    ep_this: Mapped[float | None] = mapped_column(Float)

    dreamteam_count: Mapped[int] = mapped_column()
    in_dreamteam: Mapped[bool] = mapped_column(Boolean)

    value_form: Mapped[float] = mapped_column(Float)
    value_season: Mapped[float] = mapped_column(Float)


class Gameweek(Base):
    __tablename__ = "gameweeks"
    __table_args__ = (UniqueConstraint("season_id", "number"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fpl_id: Mapped[int] = mapped_column()

    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    number: Mapped[int] = mapped_column()
    name: Mapped[str] = mapped_column(String)

    deadline_time: Mapped[datetime] = mapped_column(DateTime)
    release_time: Mapped[datetime | None] = mapped_column(DateTime)

    finished: Mapped[bool] = mapped_column(Boolean)
    data_checked: Mapped[bool] = mapped_column(Boolean)
    released: Mapped[bool] = mapped_column(Boolean)

    average_score: Mapped[int] = mapped_column()
    highest_score: Mapped[int | None] = mapped_column()

    ranked_count: Mapped[int] = mapped_column()
    transfers_made: Mapped[int] = mapped_column()

    highest_scoring_entry: Mapped[int | None] = mapped_column()

    most_selected_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    most_transferred_in_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    most_captained_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    most_vice_captained_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    top_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fpl_id: Mapped[int] = mapped_column()

    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    name: Mapped[str] = mapped_column(String)

    start_gameweek_id: Mapped[int] = mapped_column(ForeignKey("gameweeks.id"))
    end_gameweek_id: Mapped[int] = mapped_column(ForeignKey("gameweeks.id"))

    highest_score: Mapped[int | None] = mapped_column()


class Chip(Base):
    __tablename__ = "chips"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fpl_id: Mapped[int] = mapped_column()
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    name: Mapped[str] = mapped_column(String)
    number: Mapped[int] = mapped_column()
    chip_type: Mapped[str] = mapped_column(String)

    start_gameweek_id: Mapped[int] = mapped_column(ForeignKey("gameweeks.id"))
    end_gameweek_id: Mapped[int] = mapped_column(ForeignKey("gameweeks.id"))


class GameRule(Base):
    __tablename__ = "game_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), unique=True)

    squad_size: Mapped[int] = mapped_column(default=15)
    starting_size: Mapped[int] = mapped_column(default=11)
    max_players_per_team: Mapped[int] = mapped_column(default=3)
    budget: Mapped[int] = mapped_column(default=1000)

    transfer_cap: Mapped[int] = mapped_column()
    max_extra_free_transfers: Mapped[int] = mapped_column()
    transfer_sell_on_fee: Mapped[float] = mapped_column(Float)

    sell_at_purchase_price: Mapped[bool] = mapped_column(Boolean)
    vice_captain_enabled: Mapped[bool] = mapped_column(Boolean)

    stats_form_days: Mapped[int] = mapped_column()

    currency_multiplier: Mapped[int] = mapped_column()


class ScoringRule(Base):
    __tablename__ = "scoring_rules"
    __table_args__ = (UniqueConstraint("season_id", "stat", "position_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))

    stat: Mapped[str] = mapped_column(String)
    position_id: Mapped[int | None] = mapped_column(ForeignKey("positions.id"))

    points: Mapped[int] = mapped_column()
