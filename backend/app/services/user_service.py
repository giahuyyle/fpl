from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.db.schema import User
from app.models import PasswordChange, UserCreate, UserUpdate


password_hash = PasswordHash.recommended()


class DuplicateUserError(ValueError):
    pass


class InvalidCurrentPasswordError(ValueError):
    pass


def normalize_identity(value: str) -> str:
    return value.strip().casefold()


class UserService:
    def __init__(self, session: Session):
        self._db = session

    def get_user(self, user_id: int) -> User | None:
        return self._db.get(User, user_id)

    def get_user_by_email(self, email: str) -> User | None:
        statement = select(User).where(
            User.email_normalized == normalize_identity(email)
        )
        return self._db.scalar(statement)

    def create_user(self, payload: UserCreate) -> User:
        username = payload.username
        email = str(payload.email)

        username_normalized = normalize_identity(username)
        email_normalized = normalize_identity(email)

        self._ensure_identity_available(
            username_normalized=username_normalized,
            email_normalized=email_normalized,
        )

        user = User(
            username=username,
            username_normalized=username_normalized,
            email=email,
            email_normalized=email_normalized,
            password_hash=password_hash.hash(
                payload.password.get_secret_value()
            ),
            is_active=True,
            email_verified_at=None,
        )

        try:
            with self._db.begin_nested():
                self._db.add(user)
                self._db.flush()
        except IntegrityError as exc:
            raise DuplicateUserError(
                "username or email is already in use"
            ) from exc
        self._db.refresh(user)

        return user

    def update_user(
        self, user_id: int, payload: UserUpdate
    ) -> User | None:
        user = self.get_user(user_id)
        if user is None:
            return None

        try:
            with self._db.begin_nested():
                if payload.username is not None:
                    normalized = normalize_identity(payload.username)
                    self._ensure_identity_available(
                        username_normalized=normalized,
                        excluding_user_id=user.id,
                    )
                    user.username = payload.username
                    user.username_normalized = normalized

                if payload.email is not None:
                    email = str(payload.email)
                    normalized = normalize_identity(email)
                    self._ensure_identity_available(
                        email_normalized=normalized,
                        excluding_user_id=user.id,
                    )
                    if normalized != user.email_normalized:
                        user.email_verified_at = None
                    user.email = email
                    user.email_normalized = normalized
                self._db.flush()
        except IntegrityError as exc:
            raise DuplicateUserError(
                "username or email is already in use"
            ) from exc
        self._db.refresh(user)
        return user

    def change_password(
        self, user_id: int, payload: PasswordChange
    ) -> User | None:
        user = self.get_user(user_id)
        if user is None:
            return None
        if not password_hash.verify(
            payload.current_password.get_secret_value(),
            user.password_hash,
        ):
            raise InvalidCurrentPasswordError(
                "current password is incorrect"
            )
        user.password_hash = password_hash.hash(
            payload.new_password.get_secret_value()
        )
        self._db.flush()
        self._db.refresh(user)
        return user

    def _ensure_identity_available(
        self,
        *,
        username_normalized: str | None = None,
        email_normalized: str | None = None,
        excluding_user_id: int | None = None,
    ) -> None:
        filters = []
        if username_normalized is not None:
            filters.append(User.username_normalized == username_normalized)
        if email_normalized is not None:
            filters.append(User.email_normalized == email_normalized)
        if not filters:
            return

        statement = select(User.id).where(or_(*filters))
        if excluding_user_id is not None:
            statement = statement.where(User.id != excluding_user_id)
        if self._db.scalar(statement) is not None:
            raise DuplicateUserError(
                "username or email is already in use"
            )
