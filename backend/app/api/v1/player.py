from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.player import PlayerResponse
from app.services.player_service import PlayerService


router = APIRouter(prefix="/players", tags=["players"])


def get_player_service(
    session: Session = Depends(get_session),
) -> PlayerService:
    return PlayerService(session)


@router.get("", response_model=list[PlayerResponse])
def list_players(
    season_id: int | None = None,
    team_id: int | None = None,
    position_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: PlayerService = Depends(get_player_service),
):
    return service.list_players(
        season_id=season_id,
        team_id=team_id,
        position_id=position_id,
        status=status,
        search=search,
        offset=offset,
        limit=limit,
    )


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
):
    player = service.get_player(player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player
