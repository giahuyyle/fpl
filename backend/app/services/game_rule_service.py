from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import GameRule
from app.models import GameRuleCreate, GameRuleUpdate


class GameRuleService:
    """Manage game rules while leaving commit and rollback to the caller."""

    def __init__(self, session: Session):
        self._db = session

    def get_game_rule(self, game_rule_id: int) -> GameRule | None:
        return self._db.get(GameRule, game_rule_id)

    def get_game_rule_by_season(self, season_id: int) -> GameRule | None:
        statement = select(GameRule).where(GameRule.season_id == season_id)
        return self._db.scalar(statement)

    def create_game_rule(self, payload: GameRuleCreate) -> GameRule:
        rule = GameRule(**payload.model_dump())
        self._db.add(rule)
        self._db.flush()
        self._db.refresh(rule)
        return rule

    def update_game_rule(
        self, game_rule_id: int, payload: GameRuleUpdate
    ) -> GameRule | None:
        rule = self.get_game_rule(game_rule_id)
        if rule is None:
            return None

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)

        self._db.flush()
        self._db.refresh(rule)
        return rule
