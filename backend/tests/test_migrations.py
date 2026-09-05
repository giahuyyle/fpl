import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect

from app.db.schema import Base


def load_migration(filename: str):
    migration_path = Path(__file__).resolve().parents[1] / "migrations" / "versions" / filename
    spec = importlib.util.spec_from_file_location(filename.removesuffix(".py"), migration_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_chain_matches_metadata_and_downgrades_cleanly() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    migrations = [
        load_migration("1d58ea37c51e_initial_schema.py"),
        load_migration("08effa837833_add_users_table.py"),
        load_migration("7ab5db54c358_add_users_table.py"),
        load_migration("c5d6e7f8a901_add_auth_sessions_and_login_failures.py"),
        load_migration("e6f7a8b9c012_add_squads.py"),
        load_migration("f7a8b9c0d123_add_squad_bank.py"),
    ]

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        for migration in migrations:
            migration.op = operations
            migration.upgrade()

        inspector = inspect(connection)
        assert set(inspector.get_table_names()) == set(Base.metadata.tables)
        for table_name, table in Base.metadata.tables.items():
            migrated_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            model_columns = {column.name for column in table.columns}
            assert migrated_columns == model_columns, table_name

        for migration in reversed(migrations):
            migration.downgrade()
        assert inspect(connection).get_table_names() == []

    engine.dispose()
