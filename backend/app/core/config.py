from dotenv import load_dotenv
import os

from pydantic_settings import BaseSettings

load_dotenv()

class Config(BaseSettings):
    app_name: str = "FPL"
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"

    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "password")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = os.getenv("DB_PORT", 5433)
    db_name: str = os.getenv("DB_NAME", "fpl")

    @property
    def postgresql_db_url(self):
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

config = Config()