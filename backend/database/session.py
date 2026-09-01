from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from config import settings


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def db_session() -> Iterator[sqlite3.Connection]:
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with db_session() as connection:
        # Check if legacy datasets table exists with foreign key
        schema_row = connection.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='datasets'"
        ).fetchone()
        if schema_row and "REFERENCES users" in str(schema_row[0]):
            connection.execute("ALTER TABLE datasets RENAME TO old_datasets")
            connection.execute(
                """
                CREATE TABLE datasets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    raw_file_path TEXT NOT NULL,
                    cleaned_file_path TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    row_count INTEGER NOT NULL,
                    column_count INTEGER NOT NULL,
                    missing_count INTEGER NOT NULL,
                    duplicate_count INTEGER NOT NULL,
                    outlier_count INTEGER NOT NULL,
                    summary_json TEXT NOT NULL,
                    stats_json TEXT NOT NULL,
                    insights_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            try:
                connection.execute("INSERT INTO datasets SELECT * FROM old_datasets")
            except Exception:
                pass
            connection.execute("DROP TABLE IF EXISTS old_datasets")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                raw_file_path TEXT NOT NULL,
                cleaned_file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                column_count INTEGER NOT NULL,
                missing_count INTEGER NOT NULL,
                duplicate_count INTEGER NOT NULL,
                outlier_count INTEGER NOT NULL,
                summary_json TEXT NOT NULL,
                stats_json TEXT NOT NULL,
                insights_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER DEFAULT 0,
                gender TEXT DEFAULT '',
                email TEXT UNIQUE NOT NULL,
                location TEXT DEFAULT '',
                password_hash TEXT NOT NULL,
                verified INTEGER NOT NULL DEFAULT 0,
                otp_hash TEXT,
                otp_expires_at TEXT,
                reset_otp_hash TEXT,
                reset_otp_expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """
        )


def fetch_one(query: str, parameters: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    with db_session() as connection:
        return connection.execute(query, parameters).fetchone()


def fetch_all(query: str, parameters: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    with db_session() as connection:
        return connection.execute(query, parameters).fetchall()


def execute(query: str, parameters: tuple[Any, ...] = ()) -> int:
    with db_session() as connection:
        cursor = connection.execute(query, parameters)
        return int(cursor.lastrowid)


def create_user(email: str, password_hash: str) -> int:
    return execute(
        "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
        (email.lower().strip(), password_hash, utc_now()),
    )


def get_user_by_email(email: str) -> sqlite3.Row | None:
    return fetch_one("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))


def get_user_by_id(user_id: int) -> sqlite3.Row | None:
    return fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))


def create_dataset_record(
    *,
    user_id: str | int,
    filename: str,
    raw_file_path: str,
    cleaned_file_path: str,
    file_type: str,
    row_count: int,
    column_count: int,
    missing_count: int,
    duplicate_count: int,
    outlier_count: int,
    summary_json: str,
    stats_json: str,
    insights_json: str,
) -> int:
    return execute(
        """
        INSERT INTO datasets (
            user_id, filename, raw_file_path, cleaned_file_path, file_type, row_count, column_count,
            missing_count, duplicate_count, outlier_count, summary_json, stats_json, insights_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(user_id),
            filename,
            raw_file_path,
            cleaned_file_path,
            file_type,
            row_count,
            column_count,
            missing_count,
            duplicate_count,
            outlier_count,
            summary_json,
            stats_json,
            insights_json,
            utc_now(),
        ),
    )


def get_dataset_by_id(dataset_id: int) -> sqlite3.Row | None:
    return fetch_one("SELECT * FROM datasets WHERE id = ?", (dataset_id,))


def list_datasets(user_id: str | int | None = None) -> list[sqlite3.Row]:
    if user_id is None:
        return fetch_all("SELECT * FROM datasets ORDER BY id DESC")
    return fetch_all("SELECT * FROM datasets WHERE user_id = ? ORDER BY id DESC", (str(user_id),))


def get_latest_dataset(user_id: str | int | None = None) -> sqlite3.Row | None:
    if user_id is None:
        return fetch_one("SELECT * FROM datasets ORDER BY id DESC LIMIT 1")
    return fetch_one("SELECT * FROM datasets WHERE user_id = ? ORDER BY id DESC LIMIT 1", (str(user_id),))



def to_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)


def from_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def utc_now() -> str:
    return _utc_now()


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
