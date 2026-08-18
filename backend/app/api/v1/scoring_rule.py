from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.scoring_rule import (
    ScoringRuleCreate,
    ScoringRuleResponse,
    ScoringRuleUpdate,
)
from app.services.scoring_rule_service import ScoringRuleService


router = APIRouter(prefix="/scoring-rules", tags=["scoring rules"])


def get_scoring_rule_service(
    session: Session = Depends(get_session),
) -> ScoringRuleService:
    return ScoringRuleService(session)


@router.get("", response_model=list[ScoringRuleResponse])
def list_scoring_rules(
    season_id: int,
    service: ScoringRuleService = Depends(get_scoring_rule_service),
):
    return service.list_scoring_rules(season_id)


@router.get("/{scoring_rule_id}", response_model=ScoringRuleResponse)
def get_scoring_rule(
    scoring_rule_id: int,
    service: ScoringRuleService = Depends(get_scoring_rule_service),
):
    rule = service.get_scoring_rule(scoring_rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Scoring rule not found")
    return rule


@router.post("", response_model=ScoringRuleResponse, status_code=201)
def create_scoring_rule(
    payload: ScoringRuleCreate,
    service: ScoringRuleService = Depends(get_scoring_rule_service),
):
    return service.create_scoring_rule(payload)


@router.patch("/{scoring_rule_id}", response_model=ScoringRuleResponse)
def update_scoring_rule(
    scoring_rule_id: int,
    payload: ScoringRuleUpdate,
    service: ScoringRuleService = Depends(get_scoring_rule_service),
):
    rule = service.update_scoring_rule(scoring_rule_id, payload)
    if rule is None:
        raise HTTPException(status_code=404, detail="Scoring rule not found")
    return rule
