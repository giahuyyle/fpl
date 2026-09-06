from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.auth.dependencies import get_current_user, require_allowed_origin
from app.db.schema import AuthSession, User
from app.models import PasswordChange, UserResponse, UserUpdate
from app.services.user_service import (
    DuplicateUserError,
    InvalidCurrentPasswordError,
    UserService,
)


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_my_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    dependencies=[Depends(require_allowed_origin)],
)
def update_my_user(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> User:
    try:
        user = UserService(session).update_user(current_user.id, payload)
    except DuplicateUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already in use",
        ) from exc
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


@router.post(
    "/me/password",
    status_code=204,
    dependencies=[Depends(require_allowed_origin)],
)
def change_my_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    try:
        UserService(session).change_password(current_user.id, payload)
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        ) from exc
    session.execute(delete(AuthSession).where(AuthSession.user_id == current_user.id))
