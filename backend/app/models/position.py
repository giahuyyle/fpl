from app.models.base import ORMResponseModel


class PositionResponse(ORMResponseModel):
    id: int
    fpl_id: int
    code: str
    name: str
    squad_select: int
    min_play: int
    max_play: int
