from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.player_search import PlayerSearchRequest, PlayerSearchResponse
from app.services.player_search_service import (
    InvalidSearchFieldError,
    PlayerSearchService,
)


router = APIRouter(prefix="/players", tags=["players"])


@router.post("/search", response_model=PlayerSearchResponse)
def search_players(
    payload: PlayerSearchRequest,
    session: Session = Depends(get_session),
) -> PlayerSearchResponse:
    try:
        return PlayerSearchService(session).search(payload)
    except InvalidSearchFieldError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
