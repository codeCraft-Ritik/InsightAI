from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database.session import initialize_database
from routes import auth, chat, dashboard, ml, report, upload

initialize_database()

app = FastAPI(title=settings.app_name, version="1.0.0")

# CORS middleware for development and decoupled deployments (e.g. Vercel + Render)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in settings.cors_origins else list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes under /api
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(upload.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(ml.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(report.router, prefix=settings.api_prefix)


# ── Production Static Files & SPA Serving ────────────────────────────────────
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    # Mount assets folder if it exists
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow /api to pass to routers or 404
        if full_path.startswith("api"):
            return {"detail": "Not Found"}
        file_path = frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))

else:
    @app.get("/")
    def root() -> dict[str, str]:
        return {"name": settings.app_name, "status": "ok", "docs": "/docs"}
