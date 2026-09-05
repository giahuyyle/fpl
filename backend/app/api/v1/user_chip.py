from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.auth.dependencies import get_current_user, require_allowed_origin
from app.db.schema import User
from app.models.chip import ActiveChipUpdate, UserChipStateResponse
from app.services.user_chip_service import UserChipService, UserChipValidationError


router = APIRouter(prefix="/users/me/chips", tags=["user chips"])


@router.get("", response_model=list[UserChipStateResponse])
def get_my_chip_states(
    season_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[UserChipStateResponse]:
    return UserChipService(session).get_states(current_user.id, season_id)


@router.put(
    "/active",
    response_model=list[UserChipStateResponse],
    dependencies=[Depends(require_allowed_origin)],
)
def set_my_active_chip(
    payload: ActiveChipUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[UserChipStateResponse]:
    try:
        return UserChipService(session).set_active(
            current_user.id, payload.season_id, payload.chip_id
        )
    except UserChipValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
