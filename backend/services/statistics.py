from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd


def _safe_float(value: object, fallback: float = 0.0) -> float:
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return fallback
        return f
    except Exception:
        return fallback


# ── Core Overview ────────────────────────────────────────────────────────────

def dataset_overview(df: pd.DataFrame) -> dict[str, object]:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "missing_values": int(df.isna().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "numeric_columns": int(len(df.select_dtypes(include=["number"]).columns)),
        "categorical_columns": int(len(df.select_dtypes(exclude=["number"]).columns)),
    }


# ── Numeric Statistics ───────────────────────────────────────────────────────

def numeric_statistics(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    stats: dict[str, dict[str, float]] = {}
    numeric_columns = df.select_dtypes(include=["number"]).columns
    for column in numeric_columns:
        series = df[column].dropna()
        if series.empty:
            continue
        mode_val = series.mode().iloc[0] if not series.mode().empty else series.mean()
        stats[column] = {
            "mean": _safe_float(series.mean()),
            "median": _safe_float(series.median()),
            "mode": _safe_float(mode_val),
            "variance": _safe_float(series.var(ddof=1)) if len(series) > 1 else 0.0,
            "std_dev": _safe_float(series.std(ddof=1)) if len(series) > 1 else 0.0,
            "skewness": _safe_float(series.skew()) if len(series) > 2 else 0.0,
            "kurtosis": _safe_float(series.kurtosis()) if len(series) > 3 else 0.0,
            "min": _safe_float(series.min()),
            "max": _safe_float(series.max()),
            "q1": _safe_float(series.quantile(0.25)),
            "q3": _safe_float(series.quantile(0.75)),
        }
    return stats


# ── Categorical Statistics ───────────────────────────────────────────────────

def categorical_statistics(df: pd.DataFrame) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    cat_columns = df.select_dtypes(exclude=["number"]).columns
    for column in cat_columns:
        series = df[column]
        value_counts = series.value_counts(dropna=False).head(5)
        top_values = {str(k): int(v) for k, v in value_counts.items()}
        unique = int(series.nunique(dropna=True))
        total = len(series)
        null_count = int(series.isna().sum())
        stats[column] = {
            "unique_count": unique,
            "null_count": null_count,
            "null_pct": round(null_count / total * 100, 2) if total > 0 else 0.0,
            "top_values": top_values,
            "most_common": str(value_counts.index[0]) if len(value_counts) > 0 else "",
            "most_common_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
        }
    return stats


# ── Correlation Matrix ───────────────────────────────────────────────────────

def correlation_matrix(df: pd.DataFrame) -> dict[str, object]:
    numeric_df = df.select_dtypes(include=["number"])
    if numeric_df.shape[1] < 2:
        return {"columns": list(numeric_df.columns), "matrix": [], "top_pairs": []}
    correlation = numeric_df.corr(numeric_only=True).fillna(0.0)
    matrix = correlation.round(4).values.tolist()

    # Extract top correlated pairs
    pairs: list[dict[str, Any]] = []
    cols = list(correlation.columns)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            val = float(correlation.iloc[i, j])
            if abs(val) > 0.3:
                pairs.append({
                    "col_a": cols[i],
                    "col_b": cols[j],
                    "value": round(val, 4),
                    "strength": "strong" if abs(val) > 0.7 else "moderate",
                })
    pairs.sort(key=lambda p: abs(p["value"]), reverse=True)

    return {
        "columns": cols,
        "matrix": matrix,
        "top_pairs": pairs[:10],
    }


# ── Distribution Summary ────────────────────────────────────────────────────

def distribution_summary(df: pd.DataFrame) -> dict[str, object]:
    summary: dict[str, object] = {}
    for column in df.select_dtypes(include=["number"]).columns:
        series = df[column].dropna()
        if series.empty:
            continue
        summary[column] = {
            "quartiles": [_safe_float(series.quantile(value)) for value in [0.25, 0.5, 0.75]],
            "range": _safe_float(series.max() - series.min()),
        }
    return summary


# ── Column Details (per-column metadata for the UI) ──────────────────────────

def column_details(df: pd.DataFrame) -> list[dict[str, Any]]:
    details: list[dict[str, Any]] = []
    total_rows = len(df)
    for column in df.columns:
        series = df[column]
        null_count = int(series.isna().sum())
        unique_count = int(series.nunique(dropna=True))
        dtype_str = str(series.dtype)
        is_numeric = pd.api.types.is_numeric_dtype(series)
        is_datetime = pd.api.types.is_datetime64_any_dtype(series)

        # Determine display type
        if is_numeric:
            display_type = "numeric"
        elif is_datetime:
            display_type = "datetime"
        else:
            display_type = "categorical"

        detail: dict[str, Any] = {
            "name": str(column),
            "dtype": dtype_str,
            "display_type": display_type,
            "total_count": total_rows,
            "non_null_count": total_rows - null_count,
            "null_count": null_count,
            "null_pct": round(null_count / total_rows * 100, 2) if total_rows > 0 else 0.0,
            "unique_count": unique_count,
            "completeness": round((total_rows - null_count) / total_rows * 100, 2) if total_rows > 0 else 0.0,
        }

        # Sample values (up to 5 non-null unique values)
        non_null = series.dropna()
        samples = non_null.unique()[:5].tolist()
        detail["sample_values"] = [str(s) for s in samples]

        if is_numeric:
            detail["mean"] = _safe_float(non_null.mean())
            detail["median"] = _safe_float(non_null.median())
            detail["std_dev"] = _safe_float(non_null.std(ddof=1)) if len(non_null) > 1 else 0.0
            detail["min"] = _safe_float(non_null.min())
            detail["max"] = _safe_float(non_null.max())
            mode_vals = non_null.mode()
            detail["mode"] = _safe_float(mode_vals.iloc[0]) if not mode_vals.empty else detail["mean"]
        elif not is_datetime:
            vc = series.value_counts(dropna=True).head(3)
            detail["top_values"] = {str(k): int(v) for k, v in vc.items()}
            mode_vals = series.mode(dropna=True)
            detail["mode"] = str(mode_vals.iloc[0]) if not mode_vals.empty else ""

        details.append(detail)
    return details


# ── Anomaly Summary (IQR-based outlier detection per column) ─────────────────

def anomaly_summary(df: pd.DataFrame) -> dict[str, dict[str, Any]]:
    anomalies: dict[str, dict[str, Any]] = {}
    numeric_columns = df.select_dtypes(include=["number"]).columns
    total_rows = len(df)

    for column in numeric_columns:
        series = df[column].dropna()
        if len(series) < 5:
            continue
        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outlier_mask = (series < lower_bound) | (series > upper_bound)
        outlier_count = int(outlier_mask.sum())

        if outlier_count > 0:
            anomalies[column] = {
                "outlier_count": outlier_count,
                "outlier_pct": round(outlier_count / total_rows * 100, 2),
                "lower_bound": round(lower_bound, 4),
                "upper_bound": round(upper_bound, 4),
                "q1": round(q1, 4),
                "q3": round(q3, 4),
                "iqr": round(iqr, 4),
                "severity": "high" if outlier_count / total_rows > 0.1 else "medium" if outlier_count / total_rows > 0.02 else "low",
            }
    return anomalies


# ── Data Quality Score (0-100) ───────────────────────────────────────────────

def data_quality_score(df: pd.DataFrame) -> dict[str, Any]:
    total_cells = df.shape[0] * df.shape[1]
    if total_cells == 0:
        return {"overall": 100, "completeness": 100, "uniqueness": 100, "consistency": 100}

    # Completeness: % of non-null cells
    missing = int(df.isna().sum().sum())
    completeness = round((1 - missing / total_cells) * 100, 1)

    # Uniqueness: inverse of duplicate row %
    duplicate_count = int(df.duplicated().sum())
    uniqueness = round((1 - duplicate_count / max(df.shape[0], 1)) * 100, 1)

    # Consistency: check mixed types in object columns
    consistency_score = 100.0
    obj_cols = df.select_dtypes(include=["object"]).columns
    if len(obj_cols) > 0:
        mixed_type_issues = 0
        for col in obj_cols:
            non_null = df[col].dropna()
            if len(non_null) == 0:
                continue
            # Check if there's a mix of numeric-like and non-numeric values
            try:
                numeric_check = pd.to_numeric(non_null, errors="coerce")
                pct_numeric = numeric_check.notna().mean()
                if 0.1 < pct_numeric < 0.9:
                    mixed_type_issues += 1
            except Exception:
                pass
        if len(obj_cols) > 0:
            consistency_score = round((1 - mixed_type_issues / len(obj_cols)) * 100, 1)

    overall = round((completeness * 0.5 + uniqueness * 0.3 + consistency_score * 0.2), 1)

    return {
        "overall": min(overall, 100.0),
        "completeness": completeness,
        "uniqueness": uniqueness,
        "consistency": consistency_score,
        "missing_cells": missing,
        "total_cells": total_cells,
        "duplicate_rows": duplicate_count,
    }


# ── Dataset Shape Info ───────────────────────────────────────────────────────

def dataset_shape_info(df: pd.DataFrame) -> dict[str, Any]:
    memory_bytes = int(df.memory_usage(deep=True).sum())
    dtype_counts = df.dtypes.value_counts()
    return {
        "memory_bytes": memory_bytes,
        "memory_human": (
            f"{memory_bytes / 1024 / 1024:.2f} MB" if memory_bytes > 1024 * 1024
            else f"{memory_bytes / 1024:.1f} KB"
        ),
        "dtype_breakdown": {str(k): int(v) for k, v in dtype_counts.items()},
        "index_type": str(df.index.dtype),
    }


# ── Full Statistics (aggregated) ─────────────────────────────────────────────

def full_statistics(df: pd.DataFrame) -> dict[str, object]:
    return {
        "overview": dataset_overview(df),
        "numeric": numeric_statistics(df),
        "categorical": categorical_statistics(df),
        "correlation": correlation_matrix(df),
        "distribution": distribution_summary(df),
        "column_details": column_details(df),
        "anomaly_summary": anomaly_summary(df),
        "data_quality": data_quality_score(df),
        "shape_info": dataset_shape_info(df),
    }
