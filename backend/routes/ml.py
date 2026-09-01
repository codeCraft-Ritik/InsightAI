from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from config import settings
from database.session import get_dataset_by_id
from models.dataset import MlRequest
from routes.auth import get_current_user, verify_access_token
from services.clustering import run_clustering
from services.data_io import load_dataset
from services.classification import run_classification
from services.regression import run_regression

router = APIRouter(prefix="/ml", tags=["ml"])


def _infer_task(df, target_column: str | None) -> str:
    if not target_column or target_column not in df.columns:
        return "clustering"
    target = df[target_column]
    # Check if numeric or numeric convertible with high cardinality
    if pd.api.types.is_numeric_dtype(target):
        if target.nunique(dropna=True) > 15:
            return "regression"
        return "classification"
    numeric_series = pd.to_numeric(target, errors="coerce")
    if numeric_series.notna().sum() > len(target) * 0.8 and numeric_series.nunique() > 15:
        return "regression"
    return "classification"


@router.post("/train")
def train_model(
    payload: MlRequest,
    current_user: dict[str, object] = Depends(get_current_user),
) -> dict[str, object]:
    dataset = get_dataset_by_id(payload.dataset_id)
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if str(dataset["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    cleaned_path = Path(str(dataset["cleaned_file_path"]))
    if not cleaned_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cleaned dataset file is missing")

    dataframe = load_dataset(cleaned_path)
    task = (payload.task or _infer_task(dataframe, payload.target_column)).lower()
    dataset_id = int(payload.dataset_id)

    try:
        if task == "clustering":
            return run_clustering(dataframe, dataset_id=dataset_id)
        if not payload.target_column:
            raise ValueError("target_column is required for regression and classification")
        if task == "regression":
            return run_regression(dataframe, payload.target_column, dataset_id=dataset_id)
        return run_classification(dataframe, payload.target_column, dataset_id=dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/download/{artifact_id}")
def download_model_artifact(
    artifact_id: str,
    token: str = Query(..., description="Bearer token passed as query param for direct download"),
) -> FileResponse:
    """
    Download a previously saved trained model .pkl file.
    The token is accepted as a query param because this endpoint is opened
    directly by the browser (window.open / anchor href) which cannot set
    Authorization headers.
    """
    # Verify the token — raises 401 if invalid
    verify_access_token(token)

    # Sanitise artifact_id — no path traversal
    safe_name = Path(artifact_id).name
    artifact_path = settings.models_dir / f"{safe_name}.pkl"

    if not artifact_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model artifact not found. It may have been cleaned up.",
        )

    return FileResponse(
        path=str(artifact_path),
        media_type="application/octet-stream",
        filename=f"{safe_name}.pkl",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pkl"'},
    )
