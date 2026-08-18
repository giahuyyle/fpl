from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.phase import PhaseResponse
from app.services.phase_service import PhaseService


router = APIRouter(prefix="/phases", tags=["phases"])


def get_phase_service(session: Session = Depends(get_session)) -> PhaseService:
    return PhaseService(session)


@router.get("", response_model=list[PhaseResponse])
def list_phases(
    season_id: int,
    service: PhaseService = Depends(get_phase_service),
):
    return service.list_phases(season_id)


@router.get("/{phase_id}", response_model=PhaseResponse)
def get_phase(
    phase_id: int,
    service: PhaseService = Depends(get_phase_service),
):
    phase = service.get_phase(phase_id)
    if phase is None:
        raise HTTPException(status_code=404, detail="Phase not found")
    return phase
