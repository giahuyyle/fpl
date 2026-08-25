from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import secrets

from pwdlib import PasswordHash
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import config
from app.db.schema import AuthLoginFailure, AuthSession, User
from app.services.user_service import normalize_identity


IDENTITY_LIMIT = 5
IP_LIMIT = 20
RATE_WINDOW = timedelta(minutes=15)
FAILURE_RETENTION = timedelta(hours=24)

password_hash = PasswordHash.recommended()
dummy_password_hash = password_hash.hash(
    "this-password-does-not-belong-to-a-user"
)


class InvalidCredentialsError(ValueError):
    pass


class TooManyLoginAttemptsError(ValueError):
    retry_after = int(RATE_WINDOW.total_seconds())


@dataclass(frozen=True)
class CreatedSession:
    token: str
    max_age: int | None


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_rate_limit_key(namespace: str, value: str) -> str:
    message = f"{namespace}:{value}".encode()
    return hmac.new(
        config.auth_secret.encode(), message, hashlib.sha256
    ).hexdigest()


class AuthService:
    def __init__(self, session: Session):
        self._db = session

    def login(
        self,
        *,
        email: str,
        password: str,
        ip_address: str,
        remember_me: bool,
    ) -> CreatedSession:
        now = datetime.now(UTC)
        email_normalized = normalize_identity(email)
        identity_key = hash_rate_limit_key("identity", email_normalized)
        ip_key = hash_rate_limit_key("ip", ip_address)

        self._prune_old_records(now)
        if self._is_rate_limited(identity_key, ip_key, now):
            raise TooManyLoginAttemptsError("too many login attempts")

        user = self._db.scalar(
            select(User).where(User.email_normalized == email_normalized)
        )
        stored_hash = (
            user.password_hash if user is not None else dummy_password_hash
        )
        valid, updated_hash = password_hash.verify_and_update(
            password, stored_hash
        )

        if user is None or not valid or not user.is_active:
            self._db.add(
                AuthLoginFailure(
                    identity_key=identity_key,
                    ip_key=ip_key,
                    attempted_at=now,
                )
            )
            self._db.flush()
            raise InvalidCredentialsError("invalid email or password")

        if updated_hash is not None:
            user.password_hash = updated_hash

        self._db.execute(
            delete(AuthLoginFailure).where(
                AuthLoginFailure.identity_key == identity_key
            )
        )
        created_session = self.create_session(
            user.id, remember_me=remember_me, now=now
        )
        self._db.flush()
        return created_session

    def create_session(
        self,
        user_id: int,
        *,
        remember_me: bool = False,
        now: datetime | None = None,
    ) -> CreatedSession:
        created_at = now or datetime.now(UTC)
        token = secrets.token_urlsafe(32)
        if remember_me:
            lifetime = timedelta(days=config.auth_remember_days)
            max_age = int(lifetime.total_seconds())
        else:
            lifetime = timedelta(hours=config.auth_session_hours)
            max_age = None

        self._db.add(
            AuthSession(
                user_id=user_id,
                token_hash=hash_session_token(token),
                created_at=created_at,
                expires_at=created_at + lifetime,
            )
        )
        self._db.flush()
        return CreatedSession(token=token, max_age=max_age)

    def get_user_for_token(self, token: str | None) -> User | None:
        if not token:
            return None
        statement = (
            select(User)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(
                AuthSession.token_hash == hash_session_token(token),
                AuthSession.expires_at > func.now(),
                User.is_active.is_(True),
            )
        )
        return self._db.scalar(statement)

    def revoke_session(self, token: str | None) -> None:
        if not token:
            return
        self._db.execute(
            delete(AuthSession).where(
                AuthSession.token_hash == hash_session_token(token)
            )
        )

    def _is_rate_limited(
        self, identity_key: str, ip_key: str, now: datetime
    ) -> bool:
        cutoff = now - RATE_WINDOW
        identity_count = self._db.scalar(
            select(func.count())
            .select_from(AuthLoginFailure)
            .where(
                AuthLoginFailure.identity_key == identity_key,
                AuthLoginFailure.attempted_at >= cutoff,
            )
        )
        ip_count = self._db.scalar(
            select(func.count())
            .select_from(AuthLoginFailure)
            .where(
                AuthLoginFailure.ip_key == ip_key,
                AuthLoginFailure.attempted_at >= cutoff,
            )
        )
        return (identity_count or 0) >= IDENTITY_LIMIT or (
            ip_count or 0
        ) >= IP_LIMIT

    def _prune_old_records(self, now: datetime) -> None:
        self._db.execute(
            delete(AuthLoginFailure)
            .where(AuthLoginFailure.attempted_at < now - FAILURE_RETENTION)
            .execution_options(synchronize_session=False)
        )
        self._db.execute(
            delete(AuthSession)
            .where(AuthSession.expires_at <= now)
            .execution_options(synchronize_session=False)
        )
