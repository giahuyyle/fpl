def validate_pagination(offset: int, limit: int) -> None:
    if offset < 0:
        raise ValueError("offset must be non-negative")
    if not 1 <= limit <= 500:
        raise ValueError("limit must be between 1 and 500")
