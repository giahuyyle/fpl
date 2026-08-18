from datetime import datetime

from app.models.base import ORMResponseModel


class GameweekResponse(ORMResponseModel):
    id: int
    fpl_id: int
    season_id: int
    number: int
    name: str
    deadline_time: datetime
    release_time: datetime | None
    finished: bool
    data_checked: bool
    released: bool
    average_score: int
    highest_score: int | None
    ranked_count: int
    transfers_made: int
    highest_scoring_entry: int | None
    most_selected_player_id: int | None
    most_transferred_in_player_id: int | None
    most_captained_player_id: int | None
    most_vice_captained_player_id: int | None
    top_player_id: int | None
