from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.season import SeasonCreate, SeasonResponse, SeasonUpdate
from app.services.season_service import SeasonService


router = APIRouter(prefix="/seasons", tags=["seasons"])


def get_season_service(
    session: Session = Depends(get_session),
) -> SeasonService:
    return SeasonService(session)


@router.get("", response_model=list[SeasonResponse])
def list_seasons(
    service: SeasonService = Depends(get_season_service),
):
    return service.list_seasons()


@router.get("/current", response_model=SeasonResponse)
def get_current_season(
    service: SeasonService = Depends(get_season_service),
):
    season = service.get_current_season()
    if season is None:
        raise HTTPException(status_code=404, detail="Current season not found")
    return season


@router.get("/{season_id}", response_model=SeasonResponse)
def get_season(
    season_id: int,
    service: SeasonService = Depends(get_season_service),
):
    season = service.get_season(season_id)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.post("", response_model=SeasonResponse, status_code=201)
def create_season(
    payload: SeasonCreate,
    service: SeasonService = Depends(get_season_service),
):
    return service.create_season(payload)


@router.patch("/{season_id}", response_model=SeasonResponse)
def update_season(
    season_id: int,
    payload: SeasonUpdate,
    service: SeasonService = Depends(get_season_service),
):
    season = service.update_season(season_id, payload)
    if season is None:
        raise HTTPException(status_code=404, detail="Season not found")
    return season
