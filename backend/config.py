from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")


def _resolve_path(env_var: str, default_subpath: Path) -> Path:
    val = os.getenv(env_var)
    if not val:
        return default_subpath
    p = Path(val)
    if p.is_absolute():
        return p
    parts = p.parts
    if parts and parts[0] == "backend":
        p = Path(*parts[1:])
    return BASE_DIR / p


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "InsightAI - AI-Powered Data Analyst")
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    secret_key: str = os.getenv("SECRET_KEY", "change-this-secret-key")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    database_path: Path = _resolve_path("DATABASE_PATH", BASE_DIR / "database" / "insightai.sqlite3")
    mongo_uri: str = os.getenv("MONGODB_URI", "").strip().strip('"').strip("'")
    mongo_database: str = os.getenv("MONGODB_DATABASE", "insightai").strip().strip('"').strip("'")
    mongo_users_collection: str = os.getenv("MONGODB_USERS_COLLECTION", "users").strip().strip('"').strip("'")
    allow_mongo_fallback: bool = os.getenv("ALLOW_MONGO_FALLBACK", "true").lower() == "true"
    otp_expire_minutes: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    expose_otp_in_response: bool = os.getenv("EXPOSE_OTP_IN_RESPONSE", "false").lower() == "true"
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com").strip().strip('"').strip("'")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "").strip().strip('"').strip("'")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "").strip().strip('"').strip("'")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "").strip().strip('"').strip("'")
    uploads_dir: Path = _resolve_path("UPLOADS_DIR", BASE_DIR / "uploads")
    reports_dir: Path = _resolve_path("REPORTS_DIR", BASE_DIR / "reports")
    vectorstore_dir: Path = _resolve_path("VECTORSTORE_DIR", BASE_DIR / "vectorstores")
    models_dir: Path = _resolve_path("MODELS_DIR", BASE_DIR / "models_saved")
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "5"))
    rag_row_limit: int = int(os.getenv("RAG_ROW_LIMIT", "1000"))
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_chat_model: str = os.getenv("OLLAMA_CHAT_MODEL", "llama3")
    ollama_embedding_model: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    cors_origins: tuple[str, ...] = tuple(
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()
    )


settings = Settings()
settings.database_path.parent.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.reports_dir.mkdir(parents=True, exist_ok=True)
settings.vectorstore_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
