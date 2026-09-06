from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import (
    EmailStr,
    Field,
    SecretStr,
    StringConstraints,
    field_validator,
    model_validator,
)

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


class AccountSettings(RequestModel):
    first_name: str = Field(default="", max_length=100)
    last_name: str = Field(default="", max_length=100)
    date_of_birth: date | None = None
    gender: Literal[
        "", "male", "female", "non-binary", "prefer-not-to-say"
    ] = ""
    country: str = Field(default="", max_length=100)
    nationality: str = Field(default="", max_length=100)
    different_nationality: bool = False
    email_news: bool = False
    email_fantasy: bool = False
    appearance: Literal["light", "dark", "system"] = "light"
    interests: list[
        Literal["matches", "fantasy", "players", "clubs"]
    ] = Field(default_factory=list, max_length=4)

    @field_validator("date_of_birth")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("date of birth cannot be in the future")
        return value


class UserUpdate(RequestModel):
    settings: AccountSettings | None = None
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
    settings: AccountSettings = Field(default_factory=AccountSettings)
    id: int
    username: str
    email: EmailStr
    is_active: bool
    email_verified_at: datetime | None
    created_at: datetime
