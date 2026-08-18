from app.models.base import ORMResponseModel


class PlayerSeasonStatsResponse(ORMResponseModel):
    id: int
    player_id: int
    season_id: int
    minutes: int
    starts: int
    goals_scored: int
    assists: int
    clean_sheets: int
    goals_conceded: int
    own_goals: int
    penalties_saved: int
    penalties_missed: int
    yellow_cards: int
    red_cards: int
    saves: int
    bonus: int
    bps: int
    influence: float
    creativity: float
    threat: float
    ict_index: float
    clearances_blocks_interceptions: int
    recoveries: int
    tackles: int
    defensive_contribution: int
    expected_goals: float
    expected_assists: float
    expected_goal_involvements: float
    expected_goals_conceded: float
    total_points: int
    points_per_game: float
    now_cost: int
    form: float
    selected_by_percent: float
    transfers_in: int
    transfers_out: int
    transfers_in_event: int
    transfers_out_event: int
    event_points: int
    chance_of_playing_next_round: int | None
    chance_of_playing_this_round: int | None
    ep_next: float | None
    ep_this: float | None
    dreamteam_count: int
    in_dreamteam: bool
    value_form: float
    value_season: float
