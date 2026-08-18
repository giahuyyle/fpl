from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.models.game_rule import GameRuleCreate, GameRuleResponse, GameRuleUpdate
from app.services.game_rule_service import GameRuleService


router = APIRouter(prefix="/game-rules", tags=["game rules"])


def get_game_rule_service(
    session: Session = Depends(get_session),
) -> GameRuleService:
    return GameRuleService(session)


@router.get("/by-season/{season_id}", response_model=GameRuleResponse)
def get_game_rule_by_season(
    season_id: int,
    service: GameRuleService = Depends(get_game_rule_service),
):
    rule = service.get_game_rule_by_season(season_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Game rule not found")
    return rule


@router.get("/{game_rule_id}", response_model=GameRuleResponse)
def get_game_rule(
    game_rule_id: int,
    service: GameRuleService = Depends(get_game_rule_service),
):
    rule = service.get_game_rule(game_rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Game rule not found")
    return rule


@router.post("", response_model=GameRuleResponse, status_code=201)
def create_game_rule(
    payload: GameRuleCreate,
    service: GameRuleService = Depends(get_game_rule_service),
):
    return service.create_game_rule(payload)


@router.patch("/{game_rule_id}", response_model=GameRuleResponse)
def update_game_rule(
    game_rule_id: int,
    payload: GameRuleUpdate,
    service: GameRuleService = Depends(get_game_rule_service),
):
    rule = service.update_game_rule(game_rule_id, payload)
    if rule is None:
        raise HTTPException(status_code=404, detail="Game rule not found")
    return rule
