from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.auth.dependencies import require_allowed_origin
from app.core.config import config
from app.models import LoginRequest, UserCreate
from app.services.auth_service import (
    AuthService,
    InvalidCredentialsError,
    TooManyLoginAttemptsError,
)
from app.services.user_service import DuplicateUserError, UserService


router = APIRouter(tags=["authentication"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_allowed_origin)],
)
def register_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
) -> Response:
    try:
        user = UserService(session).create_user(payload)
    except DuplicateUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already in use",
        ) from exc
    created = AuthService(session).create_session(user.id)
    response = Response(status_code=status.HTTP_201_CREATED)
    response.set_cookie(
        key=config.auth_cookie_name,
        value=created.token,
        max_age=created.max_age,
        httponly=True,
        secure=config.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


@router.post(
    "/login",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_allowed_origin)],
)
def login(
    payload: LoginRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> Response:
    ip_address = request.client.host if request.client is not None else "unknown"
    try:
        created = AuthService(session).login(
            email=str(payload.email),
            password=payload.password.get_secret_value(),
            ip_address=ip_address,
            remember_me=payload.remember_me,
        )
    except TooManyLoginAttemptsError as exc:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many login attempts"},
            headers={"Retry-After": str(exc.retry_after)},
        )
    except InvalidCredentialsError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid email or password"},
        )

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.set_cookie(
        key=config.auth_cookie_name,
        value=created.token,
        max_age=created.max_age,
        httponly=True,
        secure=config.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_allowed_origin)],
)
def logout(
    request: Request,
    session: Session = Depends(get_session),
) -> Response:
    token = request.cookies.get(config.auth_cookie_name)
    AuthService(session).revoke_session(token)

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        key=config.auth_cookie_name,
        httponly=True,
        secure=config.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return response
