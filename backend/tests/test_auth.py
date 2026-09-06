from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import config
from app.db.schema import AuthLoginFailure, AuthSession, User
from app.models import (
    AccountSettings,
    LoginRequest,
    PasswordChange,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.auth_service import (
    AuthService,
    InvalidCredentialsError,
    TooManyLoginAttemptsError,
    hash_rate_limit_key,
    hash_session_token,
)
from app.services.user_service import (
    DuplicateUserError,
    InvalidCurrentPasswordError,
    UserService,
    normalize_identity,
    password_hash,
)


PASSWORD = "matchday1"
NEW_PASSWORD = "new-matchday2"


def user_payload(**overrides) -> UserCreate:
    values = {
        "username": "alex",
        "email": "alex@example.com",
        "password": PASSWORD,
    }
    return UserCreate(**(values | overrides))


def create_user(session: Session, **overrides) -> User:
    return UserService(session).create_user(user_payload(**overrides))


def register(client: TestClient) -> None:
    response = client.post(
        "/auth/v1/register",
        json={
            "username": "alex",
            "email": "alex@example.com",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201
    assert response.content == b""
    assert "fpl_session=" in response.headers["set-cookie"]
    assert "Max-Age" not in response.headers["set-cookie"]


@pytest.mark.parametrize(
    "model,payload",
    [
        (UserCreate, {"username": "ab", "email": "bad", "password": "short"}),
        (UserCreate, {"username": "valid", "email": "a@b.com", "password": PASSWORD, "is_active": True}),
        (LoginRequest, {"email": "bad", "password": PASSWORD}),
        (UserUpdate, {}),
        (UserUpdate, {"email": None}),
        (PasswordChange, {"current_password": PASSWORD, "new_password": PASSWORD}),
    ],
)
def test_user_request_models_reject_invalid_data(model, payload) -> None:
    with pytest.raises(ValidationError):
        model.model_validate(payload)


def test_account_settings_reject_a_future_birth_date() -> None:
    with pytest.raises(ValidationError):
        AccountSettings(date_of_birth=date.today() + timedelta(days=1))


def test_user_response_excludes_internal_and_password_fields(session: Session) -> None:
    user = create_user(session)
    response = UserResponse.model_validate(user).model_dump()
    assert response["email_verified_at"] is None
    assert "password_hash" not in response
    assert "email_normalized" not in response
    assert "username_normalized" not in response


def test_user_service_create_lookup_update_and_password_change(session: Session) -> None:
    service = UserService(session)
    user = service.create_user(
        user_payload(username=" Alex.User ", email="Alex@Example.com")
    )
    assert user.username == "Alex.User"
    assert user.username_normalized == "alex.user"
    assert user.email_normalized == "alex@example.com"
    assert user.password_hash != PASSWORD
    assert password_hash.verify(PASSWORD, user.password_hash)
    assert service.get_user(user.id) is user
    assert service.get_user(9999) is None
    assert service.get_user_by_email(" ALEX@example.COM ") is user
    assert normalize_identity(" Alex ") == "alex"

    user.email_verified_at = datetime.now(UTC)
    updated = service.update_user(
        user.id,
        UserUpdate(
            username="captain",
            email="captain@example.com",
            settings=AccountSettings(
                first_name="Alex",
                country="GB",
                appearance="system",
                interests=["matches", "fantasy"],
            ),
        ),
    )
    assert updated is user
    assert user.username_normalized == "captain"
    assert user.email_verified_at is None
    assert user.settings == {
        "first_name": "Alex",
        "country": "GB",
        "appearance": "system",
        "interests": ["matches", "fantasy"],
    }
    assert service.update_user(9999, UserUpdate(username="missing")) is None

    changed = service.change_password(
        user.id,
        PasswordChange(current_password=PASSWORD, new_password=NEW_PASSWORD),
    )
    assert changed is user
    assert password_hash.verify(NEW_PASSWORD, user.password_hash)
    assert service.change_password(
        9999,
        PasswordChange(current_password=PASSWORD, new_password=NEW_PASSWORD),
    ) is None
    with pytest.raises(InvalidCurrentPasswordError):
        service.change_password(
            user.id,
            PasswordChange(current_password=PASSWORD, new_password="another-password"),
        )


def test_user_service_rejects_duplicate_identity(session: Session) -> None:
    service = UserService(session)
    first = service.create_user(user_payload())
    with pytest.raises(DuplicateUserError):
        service.create_user(user_payload(username="other"))
    second = service.create_user(
        user_payload(username="other", email="other@example.com")
    )
    with pytest.raises(DuplicateUserError):
        service.update_user(second.id, UserUpdate(username=first.username.upper()))


def test_auth_service_login_sessions_and_revocation(session: Session) -> None:
    user = create_user(session)
    service = AuthService(session)

    normal = service.login(
        email=user.email,
        password=PASSWORD,
        ip_address="127.0.0.1",
        remember_me=False,
    )
    assert normal.max_age is None
    assert service.get_user_for_token(normal.token) is user
    assert service.get_user_for_token(None) is None
    assert service.get_user_for_token("malformed") is None
    stored = session.scalar(select(AuthSession))
    assert stored is not None
    assert stored.token_hash == hash_session_token(normal.token)
    assert normal.token not in stored.token_hash

    remembered = service.login(
        email=user.email,
        password=PASSWORD,
        ip_address="127.0.0.1",
        remember_me=True,
    )
    assert remembered.max_age == 30 * 24 * 60 * 60
    service.revoke_session(normal.token)
    assert service.get_user_for_token(normal.token) is None
    service.revoke_session(None)

    user.is_active = False
    session.flush()
    assert service.get_user_for_token(remembered.token) is None


def test_auth_service_failures_rate_limit_reset_and_pruning(session: Session) -> None:
    user = create_user(session)
    service = AuthService(session)
    for _ in range(5):
        with pytest.raises(InvalidCredentialsError):
            service.login(
                email=user.email,
                password="wrong-password",
                ip_address="127.0.0.1",
                remember_me=False,
            )
    failure = session.scalar(select(AuthLoginFailure))
    assert failure is not None
    assert len(failure.identity_key) == 64
    assert len(failure.ip_key) == 64
    assert user.email not in failure.identity_key
    assert "127.0.0.1" not in failure.ip_key
    with pytest.raises(TooManyLoginAttemptsError):
        service.login(
            email=user.email,
            password=PASSWORD,
            ip_address="127.0.0.1",
            remember_me=False,
        )

    session.execute(AuthLoginFailure.__table__.delete())
    service.login(
        email=user.email,
        password=PASSWORD,
        ip_address="127.0.0.1",
        remember_me=False,
    )
    assert session.scalar(select(func.count()).select_from(AuthLoginFailure)) == 0

    old = datetime.now(UTC) - timedelta(days=2)
    session.add(
        AuthLoginFailure(
            identity_key=hash_rate_limit_key("identity", "old@example.com"),
            ip_key=hash_rate_limit_key("ip", "192.0.2.1"),
            attempted_at=old,
        )
    )
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash="0" * 64,
            created_at=old,
            expires_at=old,
        )
    )
    session.flush()
    service.login(
        email=user.email,
        password=PASSWORD,
        ip_address="127.0.0.1",
        remember_me=False,
    )
    assert session.scalar(
        select(func.count()).select_from(AuthLoginFailure)
    ) == 0
    assert session.scalar(
        select(AuthSession).where(AuthSession.token_hash == "0" * 64)
    ) is None


def test_auth_service_limits_failures_across_emails_for_one_ip(
    session: Session,
) -> None:
    service = AuthService(session)
    for number in range(20):
        with pytest.raises(InvalidCredentialsError):
            service.login(
                email=f"missing{number}@example.com",
                password=PASSWORD,
                ip_address="192.0.2.25",
                remember_me=False,
            )
    with pytest.raises(TooManyLoginAttemptsError):
        service.login(
            email="another@example.com",
            password=PASSWORD,
            ip_address="192.0.2.25",
            remember_me=False,
        )


def test_auth_service_persists_an_upgraded_password_hash(
    session: Session, monkeypatch
) -> None:
    user = create_user(session)

    class UpgradingPasswordHash:
        def verify_and_update(self, plain: str, stored: str):
            assert plain == PASSWORD
            assert stored == user.password_hash
            return True, "upgraded-password-hash"

    monkeypatch.setattr(
        "app.services.auth_service.password_hash", UpgradingPasswordHash()
    )
    AuthService(session).login(
        email=user.email,
        password=PASSWORD,
        ip_address="127.0.0.1",
        remember_me=False,
    )
    assert user.password_hash == "upgraded-password-hash"


def test_auth_api_register_login_me_patch_and_logout(client: TestClient) -> None:
    register(client)
    registered_me = client.get("/api/v1/users/me")
    assert registered_me.status_code == 200
    assert registered_me.json()["username"] == "alex"
    assert client.post(
        "/auth/v1/register",
        json={"username": "alex", "email": "other@example.com", "password": PASSWORD},
    ).status_code == 409

    login_response = client.post(
        "/auth/v1/login",
        json={"email": "ALEX@example.com", "password": PASSWORD, "remember_me": True},
    )
    assert login_response.status_code == 204
    cookie = login_response.headers["set-cookie"]
    assert "fpl_session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert "Max-Age=2592000" in cookie

    me = client.get("/api/v1/users/me")
    assert me.status_code == 200
    assert me.json()["email"] == "alex@example.com"
    assert client.get("/api/v1/users/1").status_code == 404

    patched = client.patch(
        "/api/v1/users/me",
        json={
            "username": "captain",
            "settings": {
                "first_name": "Alex",
                "last_name": "Morgan",
                "country": "GB",
                "nationality": "US",
                "different_nationality": True,
                "email_news": True,
                "appearance": "dark",
                "interests": ["matches", "players"],
            },
        },
    )
    assert patched.status_code == 200
    assert patched.json()["username"] == "captain"
    assert patched.json()["settings"]["first_name"] == "Alex"
    assert patched.json()["settings"]["appearance"] == "dark"

    changed = client.post(
        "/api/v1/users/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
    )
    assert changed.status_code == 204
    assert client.get("/api/v1/users/me").status_code == 401

    invalid_login = client.post(
        "/auth/v1/login",
        json={"email": "alex@example.com", "password": PASSWORD},
    )
    assert invalid_login.status_code == 401
    assert client.post(
        "/auth/v1/login",
        json={"email": "alex@example.com", "password": NEW_PASSWORD},
    ).status_code == 204

    assert client.post("/auth/v1/logout").status_code == 204
    assert client.get("/api/v1/users/me").status_code == 401
    assert client.post("/auth/v1/logout").status_code == 204


def test_password_change_rejects_the_wrong_current_password(
    client: TestClient,
) -> None:
    register(client)
    response = client.post(
        "/api/v1/users/me/password",
        json={"current_password": "wrong-password", "new_password": NEW_PASSWORD},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Current password is incorrect"}


def test_auth_api_rejects_credentials_and_disallowed_origin(client: TestClient) -> None:
    register(client)
    invalid = client.post(
        "/auth/v1/login",
        json={"email": "missing@example.com", "password": PASSWORD},
    )
    assert invalid.status_code == 401
    assert invalid.json() == {"detail": "Invalid email or password"}

    forbidden = client.post(
        "/auth/v1/login",
        headers={"Origin": "https://evil.example"},
        json={"email": "alex@example.com", "password": PASSWORD},
    )
    assert forbidden.status_code == 403


def test_auth_api_rate_limits_and_normal_cookie(client: TestClient) -> None:
    register(client)
    for _ in range(5):
        assert client.post(
            "/auth/v1/login",
            json={"email": "alex@example.com", "password": "wrong-password"},
        ).status_code == 401
    blocked = client.post(
        "/auth/v1/login",
        json={"email": "alex@example.com", "password": PASSWORD},
    )
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "900"


def test_missing_and_expired_session_cookies_are_rejected(
    client: TestClient, session: Session
) -> None:
    assert client.get("/api/v1/users/me").status_code == 401
    client.cookies.set(config.auth_cookie_name, "unknown")
    assert client.get("/api/v1/users/me").status_code == 401

    user = create_user(session)
    token = "expired-token"
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            created_at=datetime.now(UTC) - timedelta(days=2),
            expires_at=datetime.now(UTC) - timedelta(days=1),
        )
    )
    session.commit()
    client.cookies.set(config.auth_cookie_name, token)
    assert client.get("/api/v1/users/me").status_code == 401
