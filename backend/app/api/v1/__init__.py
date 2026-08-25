from fastapi import APIRouter

from app.api.v1.chip import router as chip_router
from app.api.v1.game_rule import router as game_rule_router
from app.api.v1.gameweek import router as gameweek_router
from app.api.v1.phase import router as phase_router
from app.api.v1.player import router as player_router
from app.api.v1.player_season_stats import router as player_season_stats_router
from app.api.v1.position import router as position_router
from app.api.v1.scoring_rule import router as scoring_rule_router
from app.api.v1.season import router as season_router
from app.api.v1.team import router as team_router
from app.api.v1.user import router as user_router


api_router = APIRouter()
api_router.include_router(season_router)
api_router.include_router(team_router)
api_router.include_router(position_router)
api_router.include_router(player_router)
api_router.include_router(player_season_stats_router)
api_router.include_router(gameweek_router)
api_router.include_router(phase_router)
api_router.include_router(chip_router)
api_router.include_router(game_rule_router)
api_router.include_router(scoring_rule_router)
api_router.include_router(user_router)
