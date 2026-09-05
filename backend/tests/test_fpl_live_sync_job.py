from app.jobs.fpl_live_sync import _next_sync_delay


def test_next_sync_delay_tracks_match_activity() -> None:
    assert _next_sync_delay({"events": 1, "live_fixtures": 2}) == 60
    assert _next_sync_delay({"events": 1, "live_fixtures": 0}) == 300
    assert _next_sync_delay({"events": 0, "live_fixtures": 0}) == 3600
