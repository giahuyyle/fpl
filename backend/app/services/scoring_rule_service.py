from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import ScoringRule
from app.models import ScoringRuleCreate, ScoringRuleUpdate


class ScoringRuleService:
    """Manage scoring rules while leaving commit and rollback to the caller."""

    def __init__(self, session: Session):
        self._db = session

    def get_scoring_rule(self, scoring_rule_id: int) -> ScoringRule | None:
        return self._db.get(ScoringRule, scoring_rule_id)

    def list_scoring_rules(self, season_id: int) -> list[ScoringRule]:
        statement = (
            select(ScoringRule)
            .where(ScoringRule.season_id == season_id)
            .order_by(ScoringRule.stat, ScoringRule.position_id)
        )
        return list(self._db.scalars(statement))

    def create_scoring_rule(self, payload: ScoringRuleCreate) -> ScoringRule:
        rule = ScoringRule(**payload.model_dump())
        self._db.add(rule)
        self._db.flush()
        self._db.refresh(rule)
        return rule

    def update_scoring_rule(
        self, scoring_rule_id: int, payload: ScoringRuleUpdate
    ) -> ScoringRule | None:
        rule = self.get_scoring_rule(scoring_rule_id)
        if rule is None:
            return None

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)

        self._db.flush()
        self._db.refresh(rule)
        return rule
