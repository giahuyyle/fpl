from typing import Any

from pydantic import model_validator

from app.models.base import ORMResponseModel, RequestModel


class GameRuleCreate(RequestModel):
    season_id: int
    squad_size: int = 15
    starting_size: int = 11
    max_players_per_team: int = 3
    budget: int = 1000
    transfer_cap: int
    max_extra_free_transfers: int
    transfer_sell_on_fee: float
    sell_at_purchase_price: bool
    vice_captain_enabled: bool
    stats_form_days: int
    currency_multiplier: int


class GameRuleUpdate(RequestModel):
    squad_size: int | None = None
    starting_size: int | None = None
    max_players_per_team: int | None = None
    budget: int | None = None
    transfer_cap: int | None = None
    max_extra_free_transfers: int | None = None
    transfer_sell_on_fee: float | None = None
    sell_at_purchase_price: bool | None = None
    vice_captain_enabled: bool | None = None
    stats_form_days: int | None = None
    currency_multiplier: int | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, data: Any) -> Any:
        if isinstance(data, dict):
            null_fields = [field for field, value in data.items() if value is None]
            if null_fields:
                raise ValueError(f"fields cannot be null: {', '.join(sorted(null_fields))}")
        return data


class GameRuleResponse(ORMResponseModel):
    id: int
    season_id: int
    squad_size: int
    starting_size: int
    max_players_per_team: int
    budget: int
    transfer_cap: int
    max_extra_free_transfers: int
    transfer_sell_on_fee: float
    sell_at_purchase_price: bool
    vice_captain_enabled: bool
    stats_form_days: int
    currency_multiplier: int
