from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from pymongo import MongoClient
from pymongo.collection import Collection

from config import settings

_client: MongoClient | None = None


def utc_now() -> datetime:
    return datetime.utcnow()


def _create_client() -> MongoClient:
    uri = settings.mongo_uri.strip()
    if not uri:
        raise RuntimeError("MONGODB_URI is not configured")
    client = MongoClient(uri, serverSelectionTimeoutMS=3000)
    client.admin.command("ping")
    return client


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = _create_client()
    return _client


def get_users_collection() -> Collection[Any]:
    client = get_client()
    collection = client[settings.mongo_database][settings.mongo_users_collection]
    collection.create_index("email", unique=True)
    return collection


def normalize_email(email: str) -> str:
    return email.strip().lower()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    key = settings.secret_key.encode("utf-8")
    return hmac.new(key, otp.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp(otp: str, digest: str) -> bool:
    return hmac.compare_digest(hash_otp(otp), digest)


def serialize_user(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if not document:
        return None
    return {
        "id": str(document["_id"]),
        "name": str(document.get("name", "")),
        "age": int(document.get("age", 0) or 0),
        "gender": str(document.get("gender", "")),
        "email": str(document.get("email", "")),
        "location": str(document.get("location", "")),
        "verified": bool(document.get("verified", False)),
        "created_at": document.get("created_at"),
        "updated_at": document.get("updated_at"),
        "last_login_at": document.get("last_login_at"),
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    return get_users_collection().find_one({"email": normalize_email(email)})


def get_user_by_id(user_id: str | int) -> dict[str, Any] | None:
    collection = get_users_collection()
    if isinstance(user_id, int):
        return collection.find_one({"legacy_user_id": user_id})
    return collection.find_one({"_id": str(user_id)})


def create_or_refresh_pending_user(*, name: str, age: int, gender: str, email: str, location: str, password_hash: str, otp: str) -> dict[str, Any]:
    collection = get_users_collection()
    email_value = normalize_email(email)
    now = utc_now()
    user_id = uuid4().hex
    otp_expires_at = now + timedelta(minutes=settings.otp_expire_minutes)
    payload = {
        "_id": user_id,
        "name": name.strip(),
        "age": int(age),
        "gender": gender.strip(),
        "email": email_value,
        "location": location.strip(),
        "password_hash": password_hash,
        "verified": False,
        "otp_hash": hash_otp(otp),
        "otp_expires_at": otp_expires_at,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }

    existing = collection.find_one({"email": email_value})
    if existing and existing.get("verified"):
        raise ValueError("Email is already registered")
    if existing:
        payload_without_id = {k: v for k, v in payload.items() if k != "_id"}
        collection.update_one({"_id": existing["_id"]}, {"$set": payload_without_id})
        return collection.find_one({"_id": existing["_id"]})

    result = collection.insert_one(payload)
    return collection.find_one({"_id": result.inserted_id})


def verify_user_account(email: str, otp: str) -> dict[str, Any]:
    collection = get_users_collection()
    user = get_user_by_email(email)
    if not user:
        raise ValueError("Account not found")
    if user.get("verified"):
        return user

    otp_expires_at = user.get("otp_expires_at")
    if not otp_expires_at or otp_expires_at < utc_now():
        raise ValueError("OTP expired. Please request a new code.")
    if not verify_otp(otp, str(user.get("otp_hash", ""))):
        raise ValueError("Invalid OTP")

    now = utc_now()
    collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"verified": True, "updated_at": now, "last_login_at": now},
            "$unset": {"otp_hash": "", "otp_expires_at": ""},
        },
    )
    return collection.find_one({"_id": user["_id"]})


def update_last_login(user_id: str) -> None:
    get_users_collection().update_one({"_id": str(user_id)}, {"$set": {"last_login_at": utc_now(), "updated_at": utc_now()}})


def resend_verification_code(email: str, otp: str) -> None:
    user = get_user_by_email(email)
    if not user:
        raise ValueError("Account not found")
    get_users_collection().update_one(
        {"_id": user["_id"]},
        {
            "$set": {"otp_hash": hash_otp(otp), "otp_expires_at": utc_now() + timedelta(minutes=settings.otp_expire_minutes), "updated_at": utc_now()},
        },
    )


# ── Password-reset helpers ──────────────────────────────────────────────────

def store_reset_otp(email: str, otp: str) -> None:
    """Store a password-reset OTP for a verified user."""
    user = get_user_by_email(email)
    if not user:
        raise ValueError("Account not found")
    if not user.get("verified"):
        raise ValueError("Account is not verified")
    get_users_collection().update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_otp_hash": hash_otp(otp),
                "reset_otp_expires_at": utc_now() + timedelta(minutes=settings.otp_expire_minutes),
                "updated_at": utc_now(),
            }
        },
    )


def verify_reset_otp(email: str, otp: str) -> None:
    """Raise ValueError if the reset OTP is wrong or expired; otherwise mark it consumed."""
    user = get_user_by_email(email)
    if not user:
        raise ValueError("Account not found")
    expires_at = user.get("reset_otp_expires_at")
    if not expires_at or expires_at < utc_now():
        raise ValueError("Reset code expired. Please request a new one.")
    if not verify_otp(otp, str(user.get("reset_otp_hash", ""))):
        raise ValueError("Invalid reset code")


def reset_user_password(email: str, otp: str, new_password_hash: str) -> None:
    """Verify OTP then update the password hash and clear reset fields."""
    user = get_user_by_email(email)
    if not user:
        raise ValueError("Account not found")
    expires_at = user.get("reset_otp_expires_at")
    if not expires_at or expires_at < utc_now():
        raise ValueError("Reset code expired. Please request a new one.")
    if not verify_otp(otp, str(user.get("reset_otp_hash", ""))):
        raise ValueError("Invalid reset code")
    get_users_collection().update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_password_hash, "updated_at": utc_now()},
            "$unset": {"reset_otp_hash": "", "reset_otp_expires_at": ""},
        },
    )

