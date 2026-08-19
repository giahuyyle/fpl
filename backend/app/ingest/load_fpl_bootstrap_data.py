import json
from pathlib import Path
from typing import Any


def load_fpl_bootstrap_data() -> dict[str, Any]:
    """
    Loads FPL Bootstrap data from the FPL API
    Returns a dictionary that consists of necessary data for ingestion
    """
    path = Path(__file__).resolve().parents[2] / "data" / "initial_bootstrap.json"
    with path.open(mode="r", encoding="utf-8") as file:
        data = json.load(file)

    chips = data["chips"]
    gameweeks = data["events"]
    phases = data["phases"]
    teams = data["teams"]
    element_stats = data["element_stats"]
    player_types = data["element_types"]
    players = data["elements"]
    game_settings = data["game_settings"]
    scoring = data["game_config"]["scoring"]

    return {
        "chips": chips,
        "gameweeks": gameweeks,
        "phases": phases,
        "teams": teams,
        "element_stats": element_stats,
        "player_types": player_types,
        "players": players,
        "game_settings": game_settings,
        "scoring": scoring,
    }
