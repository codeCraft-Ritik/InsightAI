import numpy as np
import pandas as pd


def _clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    seen: dict[str, int] = {}
    unique_cols: list[str] = []
    for i, raw_col in enumerate(df.columns):
        col_str = str(raw_col).strip() if raw_col is not None and str(raw_col).strip() else f"column_{i + 1}"
        count = seen.get(col_str, 0)
        if count == 0:
            unique_cols.append(col_str)
        else:
            unique_cols.append(f"{col_str}_{count}")
        seen[col_str] = count + 1
    df.columns = unique_cols
    return df


def _maybe_convert_object_column(series: pd.Series) -> pd.Series:
    cleaned = series.copy()
    if cleaned.dtype != "object":
        return cleaned

    try:
        numeric_version = pd.to_numeric(cleaned, errors="coerce")
        if numeric_version.notna().mean() >= 0.8:
            return numeric_version
    except Exception:
        pass

    try:
        if any(token in str(series.name).lower() for token in ["date", "time", "year"]):
            datetime_version = pd.to_datetime(cleaned, errors="coerce")
            if datetime_version.notna().mean() >= 0.5:
                return datetime_version
    except Exception:
        pass

    return cleaned


def standardize_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    for column in result.columns:
        result[column] = _maybe_convert_object_column(result[column])
    return result


def detect_missing_values(df: pd.DataFrame) -> dict[str, int]:
    return {column: int(count) for column, count in df.isna().sum().items() if int(count) > 0}


def fill_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    for column in result.columns:
        if result[column].isna().sum() == 0:
            continue
        if pd.api.types.is_numeric_dtype(result[column]):
            med = result[column].median()
            fallback_num = 0.0 if pd.isna(med) else float(med)
            result[column] = result[column].fillna(fallback_num)
        elif pd.api.types.is_datetime64_any_dtype(result[column]):
            result[column] = result[column].ffill().bfill()
        else:
            mode = result[column].mode(dropna=True)
            fallback = mode.iloc[0] if not mode.empty else "Unknown"
            result[column] = result[column].fillna(fallback)
    return result


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if df.empty:
        return df.copy(), 0
    duplicate_count = int(df.duplicated().sum())
    return df.drop_duplicates().copy(), duplicate_count


def detect_outliers(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if len(df) <= 5:
        return df.copy(), 0
    numeric_columns = list(df.select_dtypes(include=["number"]).columns)
    if not numeric_columns:
        return df.copy(), 0

    result = df.copy()
    outlier_mask = pd.Series(False, index=result.index)
    for column in numeric_columns:
        q1 = result[column].quantile(0.25)
        q3 = result[column].quantile(0.75)
        iqr = q3 - q1
        if pd.isna(iqr) or iqr == 0:
            continue
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outlier_mask = outlier_mask | ((result[column] < lower_bound) | (result[column] > upper_bound))

    filtered = result.loc[~outlier_mask].copy()
    if filtered.empty:
        return result.copy(), 0
    return filtered, int(outlier_mask.sum())


def clean_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, object]]:
    working = _clean_column_names(df)
    working = standardize_dtypes(working)
    missing_before = detect_missing_values(working)
    working = fill_missing_values(working)
    working, duplicate_count = remove_duplicates(working)
    working, outlier_count = detect_outliers(working)

    report = {
        "missing_values_removed": int(sum(missing_before.values())),
        "duplicates_removed": duplicate_count,
        "outliers_removed": outlier_count,
        "rows_after_cleaning": int(len(working)),
        "columns_after_cleaning": int(len(working.columns)),
        "detected_types": {str(column): str(dtype) for column, dtype in working.dtypes.items()},
    }
    return working, report
