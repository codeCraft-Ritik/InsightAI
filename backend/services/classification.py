from __future__ import annotations

import uuid
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from config import settings
from services.ml_utils import (
    build_preprocessor,
    coerce_target_for_classification,
    split_features_target,
    subsample_if_large,
)


def _evaluate_classifier(name: str, model, X_train, X_test, y_train, y_test) -> dict[str, object]:
    pipeline = Pipeline(steps=[("preprocessor", build_preprocessor(X_train)), ("model", model)])
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    return {
        "model": name,
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, predictions, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
        "pipeline": pipeline,
    }


def run_classification(df: pd.DataFrame, target_column: str, dataset_id: int | None = None) -> dict[str, object]:
    # Subsample if dataset is very large (> 5000 rows) for instant sub-second response
    df_work = subsample_if_large(df, max_rows=5000)

    X, y = split_features_target(df_work, target_column)
    y = coerce_target_for_classification(y)

    # ── High Cardinality Target Handling ─────────────────────────────────────
    # If target has more than 20 distinct classes (e.g. unique IDs, product codes),
    # keep top 15 most frequent classes and group the rest into 'Other'.
    # This prevents 'test_size < number of classes' errors and makes models learnable.
    if y.nunique(dropna=False) > 20:
        top_classes = set(y.value_counts().nlargest(15).index)
        y = y.apply(lambda val: val if val in top_classes else "Other")

    if y.nunique(dropna=False) < 2:
        raise ValueError("Target column must contain at least two distinct classes")

    # ── Safe Train/Test Split (handles any class distribution) ───────────────
    # Try stratified split first; if classes have too few samples or test_size < num_classes,
    # fallback cleanly to unstratified split so training NEVER crashes.
    try:
        val_counts = y.value_counts()
        can_stratify = (
            y.nunique() < len(y) * 0.5
            and val_counts.min() >= 2
            and int(len(y) * 0.2) >= y.nunique()
        )
        stratify = y if can_stratify else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=None
        )

    models = {
        "Logistic Regression": LogisticRegression(max_iter=300),
        "Decision Tree": DecisionTreeClassifier(max_depth=10, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=40, max_depth=10, n_jobs=-1, random_state=42),
        "Naive Bayes": GaussianNB(),
    }

    evaluations = []
    for name, model in models.items():
        try:
            evaluations.append(_evaluate_classifier(name, model, X_train, X_test, y_train, y_test))
        except Exception as exc:
            evaluations.append(
                {
                    "model": name,
                    "error": str(exc),
                    "accuracy": 0.0,
                    "precision": 0.0,
                    "recall": 0.0,
                    "f1": 0.0,
                }
            )

    successful = [evaluation for evaluation in evaluations if not evaluation.get("error")]
    if not successful:
        raise ValueError("Unable to train classification models on this dataset")

    best = max(successful, key=lambda evaluation: evaluation["accuracy"])

    # ── Save best pipeline to disk ──────────────────────────────────────────
    artifact_id = f"ds{dataset_id or 0}_{best['model'].replace(' ', '_').lower()}_{uuid.uuid4().hex[:8]}"
    artifact_path: Path = settings.models_dir / f"{artifact_id}.pkl"
    joblib.dump(
        {
            "pipeline": best["pipeline"],
            "task": "classification",
            "target_column": target_column,
            "best_model": best["model"],
            "accuracy": best["accuracy"],
        },
        artifact_path,
    )

    feature_importance: dict[str, float] = {}
    try:
        model_obj = best["pipeline"].named_steps["model"]
        if hasattr(model_obj, "feature_importances_"):
            feature_importance = {f"feature_{i}": float(v) for i, v in enumerate(model_obj.feature_importances_)}
        elif hasattr(model_obj, "coef_"):
            coefficients = model_obj.coef_[0] if model_obj.coef_.ndim > 1 else model_obj.coef_
            feature_importance = {f"feature_{i}": float(abs(v)) for i, v in enumerate(coefficients)}
    except Exception:
        feature_importance = {}

    return {
        "task": "classification",
        "best_model": best["model"],
        "best_score": best["accuracy"],
        "artifact_id": artifact_id,
        "artifact_filename": f"{artifact_id}.pkl",
        "model_results": [
            {
                "model": evaluation["model"],
                "accuracy": evaluation["accuracy"],
                "precision": evaluation["precision"],
                "recall": evaluation["recall"],
                "f1": evaluation["f1"],
                "error": evaluation.get("error"),
            }
            for evaluation in evaluations
        ],
        "feature_importance": feature_importance,
    }
