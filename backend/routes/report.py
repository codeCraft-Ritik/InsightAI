from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from config import settings
from database.session import from_json, get_dataset_by_id
from models.dataset import ReportRequest
from routes.auth import get_current_user
from services.data_io import load_dataset
from services.report_generator import export_report
from services.statistics import full_statistics
from services.insight_generator import generate_insights

router = APIRouter(prefix="/report", tags=["report"])


@router.post("/generate")
def generate_report(payload: ReportRequest, current_user: dict[str, object] = Depends(get_current_user)) -> dict[str, object]:
    dataset = get_dataset_by_id(payload.dataset_id)
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if str(dataset["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    cleaned_path = Path(str(dataset["cleaned_file_path"]))
    if not cleaned_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleaned dataset file is missing")

    dataframe = load_dataset(cleaned_path)
    summary = from_json(str(dataset["summary_json"]), {})
    statistics = full_statistics(dataframe)
    insights = generate_insights(dataframe)

    suffix = {"csv": ".csv", "excel": ".xlsx", "pdf": ".pdf"}[payload.format]
    report_name = f"insightai_report_{payload.dataset_id}{suffix}"
    report_path = settings.reports_dir / report_name
    generated_path = export_report(dataframe, report_path, payload.format, summary, statistics, insights)

    return {"report_name": generated_path.name, "report_path": str(generated_path)}


@router.get("/download/{report_name}")
def download_report(report_name: str) -> FileResponse:
    safe_name = Path(report_name).name
    report_path = settings.reports_dir / safe_name
    if not report_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return FileResponse(path=report_path, filename=safe_name)
