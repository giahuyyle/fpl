from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.player_season_stats import PlayerSeasonStatsResponse
from app.services.player_season_stats_service import PlayerSeasonStatsService


router = APIRouter(prefix="/player-season-stats", tags=["player season stats"])


def get_player_season_stats_service(
    session: Session = Depends(get_session),
) -> PlayerSeasonStatsService:
    return PlayerSeasonStatsService(session)


@router.get("", response_model=list[PlayerSeasonStatsResponse])
def list_player_season_stats(
    season_id: int,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: PlayerSeasonStatsService = Depends(get_player_season_stats_service),
):
    return service.list_player_season_stats(
        season_id,
        offset=offset,
        limit=limit,
    )


@router.get("/by-player/{player_id}", response_model=PlayerSeasonStatsResponse)
def get_player_season_stats(
    player_id: int,
    season_id: int,
    service: PlayerSeasonStatsService = Depends(get_player_season_stats_service),
):
    stats = service.get_player_season_stats(player_id, season_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Player season stats not found")
    return stats
