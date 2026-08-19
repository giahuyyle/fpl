import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect

from app.db.schema import Base


def load_initial_migration():
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "migrations"
        / "versions"
        / "1d58ea37c51e_initial_schema.py"
    )
    spec = importlib.util.spec_from_file_location("initial_schema", migration_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_initial_migration_matches_metadata_and_downgrades_cleanly() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    migration = load_initial_migration()

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        migration.op = Operations(context)
        migration.upgrade()

        inspector = inspect(connection)
        assert set(inspector.get_table_names()) == set(Base.metadata.tables)
        for table_name, table in Base.metadata.tables.items():
            migrated_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            model_columns = {column.name for column in table.columns}
            assert migrated_columns == model_columns, table_name

        migration.downgrade()
        assert inspect(connection).get_table_names() == []

    engine.dispose()
