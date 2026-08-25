from datetime import datetime
from typing import Annotated, Self

from pydantic import EmailStr, Field, SecretStr, StringConstraints, model_validator

from app.models.base import ORMResponseModel, RequestModel


Username = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=3,
        max_length=50,
        pattern=r"^[A-Za-z0-9_.-]+$",
    ),
]
Password = Annotated[SecretStr, Field(min_length=8, max_length=128)]


class UserCreate(RequestModel):
    username: Username
    email: EmailStr
    password: Password


class LoginRequest(RequestModel):
    email: EmailStr
    password: SecretStr
    remember_me: bool = False


class UserUpdate(RequestModel):
    username: Username | None = None
    email: EmailStr | None = None

    @model_validator(mode="after")
    def reject_empty_or_null_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("update fields cannot be null")
        return self


class PasswordChange(RequestModel):
    current_password: SecretStr
    new_password: Password

    @model_validator(mode="after")
    def reject_unchanged_password(self) -> Self:
        if (
            self.current_password.get_secret_value()
            == self.new_password.get_secret_value()
        ):
            raise ValueError("new password must differ from current password")
        return self


class UserResponse(ORMResponseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool
    email_verified_at: datetime | None
    created_at: datetime
