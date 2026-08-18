from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.team import TeamResponse
from app.services.team_service import TeamService


router = APIRouter(prefix="/teams", tags=["teams"])


def get_team_service(session: Session = Depends(get_session)) -> TeamService:
    return TeamService(session)


@router.get("", response_model=list[TeamResponse])
def list_teams(
    season_id: int,
    service: TeamService = Depends(get_team_service),
):
    return service.list_teams(season_id)


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    service: TeamService = Depends(get_team_service),
):
    team = service.get_team(team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
