from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.fixture import FixtureResponse
from app.services.fixture_service import FixtureService


router = APIRouter(prefix="/fixtures", tags=["fixtures"])


@router.get("", response_model=list[FixtureResponse])
def list_fixtures(
    season_id: int,
    gameweek_number: int | None = None,
    session: Session = Depends(get_session),
) -> list[FixtureResponse]:
    return FixtureService(session).list_fixtures(season_id, gameweek_number)
