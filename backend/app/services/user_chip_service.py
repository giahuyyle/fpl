from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.db.schema import Chip, Gameweek, UserChip
from app.models.chip import ChipResponse, UserChipStateResponse
from app.services.gameweek_deadline_service import (
    GameweekDeadlineError,
    GameweekDeadlineService,
)


class UserChipValidationError(ValueError):
    pass


class UserChipService:
    def __init__(self, session: Session):
        self._db = session

    def get_states(self, user_id: int, season_id: int) -> list[UserChipStateResponse]:
        chips = self._display_chips(season_id)
        states = self._ensure_states(user_id, season_id)
        return self._responses(chips, states)

    def set_active(
        self,
        user_id: int,
        season_id: int,
        chip_id: int | None,
        gameweek_number: int | None = None,
    ) -> list[UserChipStateResponse]:
        try:
            editable_gameweek = GameweekDeadlineService(self._db).editable_gameweek(
                season_id, gameweek_number
            )
        except GameweekDeadlineError as exc:
            raise UserChipValidationError(str(exc)) from exc
        chips = self._display_chips(
            season_id, editable_gameweek.number if editable_gameweek else None
        )
        if not chips:
            raise UserChipValidationError("Chips are unavailable for this gameweek")
        states = self._ensure_states(user_id, season_id)

        selected = states.get(chip_id) if chip_id is not None else None
        eligible_ids = {chip.id for chip in chips}
        if chip_id is not None and (chip_id not in eligible_ids or selected is None):
            raise UserChipValidationError("That chip is unavailable for this gameweek")
        if selected is not None and selected.status == "used":
            raise UserChipValidationError("That chip has already been used")

        for state in states.values():
            if state.status == "active":
                state.status = "available"
                state.activated_at = None
        if selected is not None:
            selected.status = "active"
            selected.activated_at = datetime.now(timezone.utc)
        self._db.flush()
        return self._responses(chips, states)

    def _ensure_states(self, user_id: int, season_id: int) -> dict[int, UserChip]:
        chips = list(
            self._db.scalars(
                select(Chip).where(Chip.season_id == season_id).order_by(Chip.id)
            )
        )
        states = {
            state.chip_id: state
            for state in self._db.scalars(
                select(UserChip)
                .join(Chip, UserChip.chip_id == Chip.id)
                .where(UserChip.user_id == user_id, Chip.season_id == season_id)
            )
        }
        for chip in chips:
            if chip.id not in states:
                state = UserChip(
                    user_id=user_id,
                    chip_id=chip.id,
                    status="available",
                )
                self._db.add(state)
                states[chip.id] = state
        self._db.flush()
        return states

    def _display_chips(
        self, season_id: int, gameweek_number: int | None = None
    ) -> list[Chip]:
        current_gameweek = None
        if gameweek_number is not None:
            current_gameweek = self._db.scalar(
                select(Gameweek).where(
                    Gameweek.season_id == season_id,
                    Gameweek.number == gameweek_number,
                )
            )
        if current_gameweek is None:
            try:
                current_gameweek = GameweekDeadlineService(
                    self._db
                ).editable_gameweek(season_id)
            except GameweekDeadlineError:
                current_gameweek = None
        if current_gameweek is None:
            current_gameweek = self._db.scalar(
                select(Gameweek)
                .where(Gameweek.season_id == season_id)
                .order_by(Gameweek.number.desc())
            )
        if current_gameweek is None:
            return []

        start = aliased(Gameweek)
        end = aliased(Gameweek)
        rows = self._db.execute(
            select(Chip, start.number, end.number)
            .join(start, Chip.start_gameweek_id == start.id)
            .join(end, Chip.end_gameweek_id == end.id)
            .where(Chip.season_id == season_id)
            .order_by(start.number, Chip.fpl_id)
        ).all()
        grouped: dict[str, list[tuple[Chip, int, int]]] = {}
        for chip, start_number, end_number in rows:
            grouped.setdefault(chip.name, []).append(
                (chip, start_number, end_number)
            )

        selected = []
        for variants in grouped.values():
            current = next(
                (
                    variant
                    for variant in variants
                    if variant[1] <= current_gameweek.number <= variant[2]
                ),
                None,
            )
            upcoming = next(
                (
                    variant
                    for variant in variants
                    if variant[1] > current_gameweek.number
                ),
                None,
            )
            selected.append((current or upcoming or variants[-1])[0])
        return sorted(selected, key=lambda chip: chip.fpl_id)

    @staticmethod
    def _responses(
        chips: list[Chip], states: dict[int, UserChip]
    ) -> list[UserChipStateResponse]:
        active_chip_id = next(
            (
                chip.id
                for chip in chips
                if states[chip.id].status == "active"
            ),
            None,
        )
        responses = []
        for chip in chips:
            stored_status = states[chip.id].status
            if stored_status == "used":
                status = "unavailable"
            elif active_chip_id is None:
                status = "available"
            elif chip.id == active_chip_id:
                status = "active"
            else:
                status = "unavailable"
            responses.append(
                UserChipStateResponse(
                    **ChipResponse.model_validate(chip).model_dump(),
                    status=status,
                )
            )
        return responses
