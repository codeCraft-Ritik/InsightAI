from typing import Any

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    dataset_id: int
    filename: str
    row_count: int
    column_count: int
    missing_count: int
    duplicate_count: int
    outlier_count: int
    cleaning_report: dict[str, Any]
    statistics: dict[str, Any]
    insights: list[str]
    charts: dict[str, Any]
    column_details: list[dict[str, Any]] = []
    anomaly_summary: dict[str, Any] = {}
    data_quality_score: dict[str, Any] = {}
    data_preview: list[dict[str, Any]] = []


class ChatRequest(BaseModel):
    dataset_id: int
    question: str = Field(..., min_length=2)


class MlRequest(BaseModel):
    dataset_id: int
    target_column: str | None = None
    task: str | None = None


class ReportRequest(BaseModel):
    dataset_id: int
    format: str = Field(default="excel", pattern="^(csv|excel|pdf)$")


class DashboardSummary(BaseModel):
    total_rows: int
    total_columns: int
    missing_values: int
    duplicates: int
    datasets: int
    latest_dataset: dict[str, Any] | None = None
