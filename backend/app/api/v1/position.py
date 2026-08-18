from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.position import PositionResponse
from app.services.position_service import PositionService


router = APIRouter(prefix="/positions", tags=["positions"])


def get_position_service(
    session: Session = Depends(get_session),
) -> PositionService:
    return PositionService(session)


@router.get("", response_model=list[PositionResponse])
def list_positions(
    service: PositionService = Depends(get_position_service),
):
    return service.list_positions()


@router.get("/{position_id}", response_model=PositionResponse)
def get_position(
    position_id: int,
    service: PositionService = Depends(get_position_service),
):
    position = service.get_position(position_id)
    if position is None:
        raise HTTPException(status_code=404, detail="Position not found")
    return position
