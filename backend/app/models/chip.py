from app.models.base import ORMResponseModel


class ChipResponse(ORMResponseModel):
    id: int
    fpl_id: int
    season_id: int
    name: str
    number: int
    chip_type: str
    start_gameweek_id: int
    end_gameweek_id: int
