from __future__ import annotations

import uuid
from pathlib import Path

import joblib
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from config import settings
from services.ml_utils import subsample_if_large


def run_clustering(df: pd.DataFrame, n_clusters: int = 3, dataset_id: int | None = None) -> dict[str, object]:
    # Subsample if dataset is large (> 3000 rows) for instant clustering and silhouette scoring
    df_work = subsample_if_large(df, max_rows=3000)

    features = df_work.select_dtypes(include=["number"]).copy()
    if features.shape[1] < 2:
        features = pd.get_dummies(df_work.select_dtypes(exclude=["number"]), drop_first=True)

    if features.empty or len(features) < 3:
        raise ValueError("Clustering requires at least three usable rows")

    features = features.fillna(features.median(numeric_only=True)).fillna(0)
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    n_clusters_actual = min(n_clusters, len(features) - 1)
    kmeans = KMeans(n_clusters=n_clusters_actual, random_state=42, n_init=10)
    kmeans_labels = kmeans.fit_predict(scaled)
    kmeans_score = silhouette_score(scaled, kmeans_labels) if len(set(kmeans_labels)) > 1 else 0.0

    dbscan = DBSCAN(eps=0.8, min_samples=3)
    dbscan_labels = dbscan.fit_predict(scaled)
    dbscan_clusters = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)

    # ── Save KMeans model + scaler to disk ──────────────────────────────────
    artifact_id = f"ds{dataset_id or 0}_kmeans_{uuid.uuid4().hex[:8]}"
    artifact_path: Path = settings.models_dir / f"{artifact_id}.pkl"
    joblib.dump(
        {
            "scaler": scaler,
            "kmeans": kmeans,
            "task": "clustering",
            "n_clusters": n_clusters_actual,
            "silhouette_score": float(kmeans_score),
            "feature_columns": list(features.columns),
        },
        artifact_path,
    )

    return {
        "task": "clustering",
        "best_model": "KMeans",
        "best_score": float(kmeans_score),
        "artifact_id": artifact_id,
        "artifact_filename": f"{artifact_id}.pkl",
        "model_results": [
            {"model": "KMeans", "silhouette_score": float(kmeans_score), "clusters": int(len(set(kmeans_labels)))},
            {"model": "DBSCAN", "clusters": int(dbscan_clusters)},
        ],
        "cluster_counts": {str(label): int((kmeans_labels == label).sum()) for label in set(kmeans_labels)},
    }
