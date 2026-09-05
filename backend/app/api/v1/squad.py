from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.auth.dependencies import get_current_user, require_allowed_origin
from app.db.schema import User
from app.models.squad import SquadProfileUpdate, SquadResponse, SquadUpsert
from app.models.squad_points import SquadPointsResponse
from app.services.squad_service import SquadService, SquadValidationError
from app.services.squad_points_service import SquadPointsService


router = APIRouter(prefix="/squads", tags=["squads"])


@router.get("/me/points/history", response_model=list[SquadPointsResponse])
def list_my_squad_points(
    season_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[SquadPointsResponse]:
    return SquadPointsService(session).list_points(current_user.id, season_id)


@router.get("/me/points", response_model=SquadPointsResponse | None)
def get_my_squad_points(
    season_id: int,
    gameweek_number: int | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SquadPointsResponse | None:
    return SquadPointsService(session).get_points(
        current_user.id, season_id, gameweek_number
    )


@router.get("/me", response_model=SquadResponse | None)
def get_my_squad(
    season_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SquadResponse | None:
    return SquadService(session).get_squad(current_user.id, season_id)


@router.put(
    "/me",
    response_model=SquadResponse,
    dependencies=[Depends(require_allowed_origin)],
)
def put_my_squad(
    payload: SquadUpsert,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SquadResponse:
    try:
        return SquadService(session).upsert_squad(current_user.id, payload)
    except SquadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


@router.patch(
    "/me/profile",
    response_model=SquadResponse,
    dependencies=[Depends(require_allowed_origin)],
)
def patch_my_squad_profile(
    payload: SquadProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SquadResponse:
    try:
        return SquadService(session).update_profile(current_user.id, payload)
    except SquadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
