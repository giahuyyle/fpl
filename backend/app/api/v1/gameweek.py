from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.gameweek import GameweekResponse
from app.services.gameweek_service import GameweekService


router = APIRouter(prefix="/gameweeks", tags=["gameweeks"])


def get_gameweek_service(
    session: Session = Depends(get_session),
) -> GameweekService:
    return GameweekService(session)


@router.get("", response_model=list[GameweekResponse])
def list_gameweeks(
    season_id: int,
    service: GameweekService = Depends(get_gameweek_service),
):
    return service.list_gameweeks(season_id)


@router.get("/by-number/{number}", response_model=GameweekResponse)
def get_gameweek_by_number(
    number: int,
    season_id: int,
    service: GameweekService = Depends(get_gameweek_service),
):
    gameweek = service.get_gameweek_by_number(season_id, number)
    if gameweek is None:
        raise HTTPException(status_code=404, detail="Gameweek not found")
    return gameweek


@router.get("/{gameweek_id}", response_model=GameweekResponse)
def get_gameweek(
    gameweek_id: int,
    service: GameweekService = Depends(get_gameweek_service),
):
    gameweek = service.get_gameweek(gameweek_id)
    if gameweek is None:
        raise HTTPException(status_code=404, detail="Gameweek not found")
    return gameweek
