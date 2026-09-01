from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def subsample_if_large(df: pd.DataFrame, max_rows: int = 5000, random_state: int = 42) -> pd.DataFrame:
    """
    Subsamples large datasets to guarantee instant (< 2s) training while retaining
    statistical representative distribution across features and targets.
    """
    if len(df) > max_rows:
        return df.sample(n=max_rows, random_state=random_state)
    return df


def split_features_target(df: pd.DataFrame, target_column: str) -> tuple[pd.DataFrame, pd.Series]:
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found")
    X = df.drop(columns=[target_column]).copy()
    y = df[target_column].copy()
    if X.empty:
        raise ValueError("Dataset must contain at least one feature column")
    return X, y


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    """
    Builds an optimized, robust preprocessor:
    - Numeric features: Median Imputation + StandardScaler
    - Categorical features (cardinality <= 60): Most Frequent Imputation + OneHotEncoder(max_categories=15)
    - Automatically ignores ultra-high-cardinality free text / unique ID columns to prevent memory explosion.
    """
    numeric_features = [col for col in X.columns if pd.api.types.is_numeric_dtype(X[col])]
    categorical_features = [
        col
        for col in X.columns
        if not pd.api.types.is_numeric_dtype(X[col]) and X[col].nunique() <= 60
    ]

    transformers = []
    if numeric_features:
        transformers.append(
            (
                "numeric",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]),
                numeric_features,
            )
        )
    if categorical_features:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "encoder",
                            OneHotEncoder(
                                max_categories=15,
                                handle_unknown="ignore",
                                sparse_output=False,
                            ),
                        ),
                    ]
                ),
                categorical_features,
            )
        )

    # Fallback if no numeric or low-cardinality categorical found
    if not transformers:
        # Include all columns encoded safely
        transformers.append(
            (
                "all_cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "encoder",
                            OneHotEncoder(
                                max_categories=10,
                                handle_unknown="ignore",
                                sparse_output=False,
                            ),
                        ),
                    ]
                ),
                list(X.columns),
            )
        )

    return ColumnTransformer(transformers=transformers, remainder="drop")


def coerce_target_for_classification(y: pd.Series) -> pd.Series:
    if y.dtype == "bool":
        return y.astype(int)
    return y.astype(str)
