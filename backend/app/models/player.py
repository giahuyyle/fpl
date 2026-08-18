from datetime import date

from app.models.base import ORMResponseModel


class PlayerResponse(ORMResponseModel):
    id: int
    fpl_id: int
    code: int
    opta_code: str | None
    first_name: str
    last_name: str
    known_name: str | None
    web_name: str
    birth_date: date | None
    region: int | None
    photo: str | None
    team_id: int
    position_id: int
    squad_number: int | None
    team_join_date: date | None
    status: str
    can_select: bool
    can_transact: bool
    removed: bool
