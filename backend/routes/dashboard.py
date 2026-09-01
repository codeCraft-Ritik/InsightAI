from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status

from database.session import from_json, get_dataset_by_id, get_latest_dataset, list_datasets
from models.dataset import DashboardSummary
from routes.auth import get_current_user
from services.data_io import load_dataset
from services.statistics import column_details, anomaly_summary, data_quality_score
from services.visualization import build_visualizations

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _dataset_payload(dataset) -> dict[str, object]:
    return {
        "id": int(dataset["id"]),
        "filename": str(dataset["filename"]),
        "row_count": int(dataset["row_count"]),
        "column_count": int(dataset["column_count"]),
        "missing_count": int(dataset["missing_count"]),
        "duplicate_count": int(dataset["duplicate_count"]),
        "outlier_count": int(dataset["outlier_count"]),
        "summary": from_json(str(dataset["summary_json"]), {}),
        "stats": from_json(str(dataset["stats_json"]), {}),
        "insights": from_json(str(dataset["insights_json"]), []),
        "created_at": str(dataset["created_at"]),
    }


@router.get("/summary", response_model=DashboardSummary)
def summary(dataset_id: int | None = None, current_user: dict[str, object] = Depends(get_current_user)) -> DashboardSummary:
    uid = str(current_user["id"])
    dataset = get_dataset_by_id(dataset_id) if dataset_id else get_latest_dataset(uid)
    if dataset and str(dataset["user_id"]) != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    datasets = list_datasets(uid)
    latest = _dataset_payload(dataset) if dataset else None
    total_rows = int(latest["row_count"]) if latest else 0
    total_columns = int(latest["column_count"]) if latest else 0
    missing_values = int(latest["missing_count"]) if latest else 0
    duplicates = int(latest["duplicate_count"]) if latest else 0

    return DashboardSummary(
        total_rows=total_rows,
        total_columns=total_columns,
        missing_values=missing_values,
        duplicates=duplicates,
        datasets=len(datasets),
        latest_dataset=latest,
    )


@router.get("/datasets")
def all_datasets(current_user: dict[str, object] = Depends(get_current_user)) -> dict[str, object]:
    records = [_dataset_payload(dataset) for dataset in list_datasets(str(current_user["id"]))]
    return {"datasets": records}


@router.get("/dataset/{dataset_id}/preview")
def dataset_preview(
    dataset_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=10, le=200),
    current_user: dict[str, object] = Depends(get_current_user),
) -> dict[str, object]:
    dataset = get_dataset_by_id(dataset_id)
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if str(dataset["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    cleaned_path = Path(str(dataset["cleaned_file_path"]))
    if not cleaned_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleaned dataset file is missing")

    df = load_dataset(cleaned_path)
    total_rows = len(df)
    start = (page - 1) * page_size
    end = min(start + page_size, total_rows)
    page_data = df.iloc[start:end].copy()

    # Serialize safely
    for col in page_data.columns:
        if pd.api.types.is_datetime64_any_dtype(page_data[col]):
            page_data[col] = page_data[col].astype(str)
        elif pd.api.types.is_numeric_dtype(page_data[col]):
            page_data[col] = page_data[col].apply(lambda x: None if pd.isna(x) else x)
        else:
            page_data[col] = page_data[col].fillna("").astype(str)

    return {
        "rows": page_data.to_dict(orient="records"),
        "columns": list(df.columns),
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_rows + page_size - 1) // page_size),
    }


@router.get("/dataset/{dataset_id}/charts")
def dataset_charts(
    dataset_id: int,
    current_user: dict[str, object] = Depends(get_current_user),
) -> dict[str, object]:
    dataset = get_dataset_by_id(dataset_id)
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if str(dataset["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    cleaned_path = Path(str(dataset["cleaned_file_path"]))
    if not cleaned_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleaned dataset file is missing")

    df = load_dataset(cleaned_path)
    charts = build_visualizations(df)
    col_dets = column_details(df)
    anomalies = anomaly_summary(df)
    quality = data_quality_score(df)

    return {
        "charts": charts,
        "column_details": col_dets,
        "anomaly_summary": anomalies,
        "data_quality_score": quality,
    }
