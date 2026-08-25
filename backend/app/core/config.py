from dotenv import load_dotenv
import os
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings

load_dotenv()

debug_default = os.getenv("DEBUG", "true").lower() == "true"
development_auth_secret = "development-only-change-me"

class Config(BaseSettings):
    app_name: str = "FPL"
    debug: bool = debug_default

    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173"
        ).split(",")
        if origin.strip()
    ]
    auth_secret: str = os.getenv(
        "AUTH_SECRET", development_auth_secret
    )
    auth_cookie_name: str = "fpl_session"
    auth_cookie_secure: bool = os.getenv(
        "AUTH_COOKIE_SECURE", "false" if debug_default else "true"
    ).lower() == "true"
    auth_session_hours: int = 24
    auth_remember_days: int = 30

    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "password")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = os.getenv("DB_PORT", 5433)
    db_name: str = os.getenv("DB_NAME", "fpl")

    @property
    def postgresql_db_url(self):
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @model_validator(mode="after")
    def validate_production_auth_settings(self) -> Self:
        if not self.debug and self.auth_secret == development_auth_secret:
            raise ValueError("AUTH_SECRET must be set outside development")
        if not self.debug and not self.auth_cookie_secure:
            raise ValueError("AUTH_COOKIE_SECURE must be true outside development")
        return self

config = Config()
