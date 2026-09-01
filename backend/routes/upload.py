from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from config import settings
from database.session import create_dataset_record, to_json
from models.dataset import UploadResponse
from routes.auth import get_current_user
from services.cleaning import clean_dataframe
from services.data_io import file_type_from_name, load_dataset, save_cleaned_dataset
from services.insight_generator import generate_insights
from services.rag import build_dataset_index
from services.statistics import full_statistics, column_details, anomaly_summary, data_quality_score
from services.visualization import build_visualizations

router = APIRouter(prefix="/datasets", tags=["datasets"])

_PREVIEW_ROWS = 50


def _dataframe_preview(df: pd.DataFrame, max_rows: int = _PREVIEW_ROWS) -> list[dict]:
    """Convert the first N rows to a JSON-serializable list of dicts."""
    preview = df.head(max_rows).copy()
    # Convert everything to strings to avoid serialization issues
    for col in preview.columns:
        if pd.api.types.is_datetime64_any_dtype(preview[col]):
            preview[col] = preview[col].astype(str)
        elif pd.api.types.is_numeric_dtype(preview[col]):
            preview[col] = preview[col].apply(lambda x: None if pd.isna(x) else x)
        else:
            preview[col] = preview[col].fillna("").astype(str)
    return preview.to_dict(orient="records")


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: dict[str, object] = Depends(get_current_user),
) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a valid file")

    raw_contents = await file.read()
    if not raw_contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    if len(raw_contents) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds upload limit")

    upload_id = uuid.uuid4().hex
    original_name = Path(file.filename).name
    raw_path = settings.uploads_dir / f"{upload_id}_{original_name}"
    raw_path.write_bytes(raw_contents)

    try:
        dataframe = load_dataset(raw_path)
    except Exception as exc:
        raw_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unable to read dataset: {exc}") from exc

    cleaned_dataframe, cleaning_report = clean_dataframe(dataframe)
    cleaned_path = settings.uploads_dir / f"cleaned_{upload_id}.csv"
    save_cleaned_dataset(cleaned_dataframe, cleaned_path)

    statistics = full_statistics(cleaned_dataframe)
    insights = generate_insights(cleaned_dataframe, cleaning_report=cleaning_report)
    charts = build_visualizations(cleaned_dataframe)

    # New expanded fields
    col_details = column_details(cleaned_dataframe)
    anomalies = anomaly_summary(dataframe)  # Run on original data to show what was found
    quality = data_quality_score(cleaned_dataframe)
    preview = _dataframe_preview(cleaned_dataframe)

    dataset_id = create_dataset_record(
        user_id=str(current_user["id"]),
        filename=original_name,
        raw_file_path=str(raw_path),
        cleaned_file_path=str(cleaned_path),
        file_type=file_type_from_name(original_name),
        row_count=int(cleaned_dataframe.shape[0]),
        column_count=int(cleaned_dataframe.shape[1]),
        missing_count=int(statistics["overview"]["missing_values"]),
        duplicate_count=int(cleaning_report["duplicates_removed"]),
        outlier_count=int(cleaning_report["outliers_removed"]),
        summary_json=to_json(statistics["overview"]),
        stats_json=to_json(statistics),
        insights_json=to_json(insights),
    )

    try:
        build_dataset_index(
            dataset_id,
            cleaned_dataframe,
            summary=statistics["overview"],
            statistics=statistics,
            cleaning_report=cleaning_report,
            insights=insights,
        )
    except Exception:
        # Gracefully handle indexing if local LLM embedding is unavailable
        pass


    return UploadResponse(
        dataset_id=dataset_id,
        filename=original_name,
        row_count=int(cleaned_dataframe.shape[0]),
        column_count=int(cleaned_dataframe.shape[1]),
        missing_count=int(statistics["overview"]["missing_values"]),
        duplicate_count=int(cleaning_report["duplicates_removed"]),
        outlier_count=int(cleaning_report["outliers_removed"]),
        cleaning_report=cleaning_report,
        statistics=statistics,
        insights=insights,
        charts=charts,
        column_details=col_details,
        anomaly_summary=anomalies,
        data_quality_score=quality,
        data_preview=preview,
    )
