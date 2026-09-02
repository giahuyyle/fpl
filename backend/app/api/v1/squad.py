from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.auth.dependencies import get_current_user, require_allowed_origin
from app.db.schema import User
from app.models.squad import SquadResponse, SquadUpsert
from app.services.squad_service import SquadService, SquadValidationError


router = APIRouter(prefix="/squads", tags=["squads"])


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
