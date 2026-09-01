from __future__ import annotations

import uuid
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeRegressor

from config import settings
from services.ml_utils import build_preprocessor, split_features_target, subsample_if_large


def _evaluate_regressor(name: str, model, X_train, X_test, y_train, y_test) -> dict[str, object]:
    pipeline = Pipeline(steps=[("preprocessor", build_preprocessor(X_train)), ("model", model)])
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    return {
        "model": name,
        "r2": float(r2_score(y_test, predictions)),
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "pipeline": pipeline,
    }


def run_regression(df: pd.DataFrame, target_column: str, dataset_id: int | None = None) -> dict[str, object]:
    # Subsample if dataset is very large (> 5000 rows) for instant sub-second response
    df_work = subsample_if_large(df, max_rows=5000)

    X, y = split_features_target(df_work, target_column)
    y = pd.to_numeric(y, errors="coerce")
    valid_mask = y.notna()
    X = X.loc[valid_mask].copy()
    y = y.loc[valid_mask].copy()

    if len(y) < 10:
        raise ValueError("Regression requires at least 10 valid target rows")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Decision Tree": DecisionTreeRegressor(max_depth=10, random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=40, max_depth=10, n_jobs=-1, random_state=42),
    }

    evaluations = []
    for name, model in models.items():
        try:
            evaluations.append(_evaluate_regressor(name, model, X_train, X_test, y_train, y_test))
        except Exception as exc:
            evaluations.append({"model": name, "error": str(exc), "r2": float("-inf"), "mae": 0.0, "rmse": 0.0})

    successful = [evaluation for evaluation in evaluations if not evaluation.get("error")]
    if not successful:
        raise ValueError("Unable to train regression models on this dataset")

    best = max(successful, key=lambda evaluation: evaluation["r2"])

    # ── Save best pipeline to disk ──────────────────────────────────────────
    artifact_id = f"ds{dataset_id or 0}_{best['model'].replace(' ', '_').lower()}_{uuid.uuid4().hex[:8]}"
    artifact_path: Path = settings.models_dir / f"{artifact_id}.pkl"
    joblib.dump(
        {
            "pipeline": best["pipeline"],
            "task": "regression",
            "target_column": target_column,
            "best_model": best["model"],
            "r2": best["r2"],
        },
        artifact_path,
    )

    feature_importance: dict[str, float] = {}
    try:
        model_obj = best["pipeline"].named_steps["model"]
        if hasattr(model_obj, "feature_importances_"):
            feature_importance = {f"feature_{i}": float(v) for i, v in enumerate(model_obj.feature_importances_)}
        elif hasattr(model_obj, "coef_"):
            coefficients = model_obj.coef_[0] if getattr(model_obj.coef_, "ndim", 1) > 1 else model_obj.coef_
            feature_importance = {f"feature_{i}": float(abs(v)) for i, v in enumerate(coefficients)}
    except Exception:
        feature_importance = {}

    return {
        "task": "regression",
        "best_model": best["model"],
        "best_score": best["r2"],
        "artifact_id": artifact_id,
        "artifact_filename": f"{artifact_id}.pkl",
        "model_results": [
            {
                "model": evaluation["model"],
                "r2": evaluation.get("r2"),
                "mae": evaluation.get("mae"),
                "rmse": evaluation.get("rmse"),
                "error": evaluation.get("error"),
            }
            for evaluation in evaluations
        ],
        "feature_importance": feature_importance,
    }
