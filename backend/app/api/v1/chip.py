from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.chip import ChipResponse
from app.services.chip_service import ChipService


router = APIRouter(prefix="/chips", tags=["chips"])


def get_chip_service(session: Session = Depends(get_session)) -> ChipService:
    return ChipService(session)


@router.get("", response_model=list[ChipResponse])
def list_chips(
    season_id: int,
    service: ChipService = Depends(get_chip_service),
):
    return service.list_chips(season_id)


@router.get("/{chip_id}", response_model=ChipResponse)
def get_chip(
    chip_id: int,
    service: ChipService = Depends(get_chip_service),
):
    chip = service.get_chip(chip_id)
    if chip is None:
        raise HTTPException(status_code=404, detail="Chip not found")
    return chip
