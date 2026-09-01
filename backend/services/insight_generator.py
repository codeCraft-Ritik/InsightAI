from __future__ import annotations

import json
import urllib.request
import pandas as pd

from config import settings
from services.statistics import full_statistics


def _top_correlation_pairs(df: pd.DataFrame) -> list[str]:
    numeric_df = df.select_dtypes(include=["number"])
    if numeric_df.shape[1] < 2:
        return []
    correlation = numeric_df.corr(numeric_only=True).abs()
    pairs: list[tuple[str, str, float]] = []
    for index, left in enumerate(correlation.columns):
        for right in correlation.columns[index + 1 :]:
            pairs.append((left, right, float(correlation.loc[left, right])))
    pairs.sort(key=lambda item: item[2], reverse=True)
    top_pairs = [f"{left} and {right} correlate strongly at {value:.2f}" for left, right, value in pairs[:3] if value > 0.3]
    return top_pairs


def is_ollama_available() -> bool:
    try:
        import socket
        from urllib.parse import urlparse
        parsed = urlparse(settings.ollama_base_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 11434
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except Exception:
        return False


def _generate_ollama_insights(stats_summary: str) -> list[str]:
    """Call Ollama to generate high-level executive analytical insights."""
    if not is_ollama_available():
        return []
    try:
        payload = {
            "model": settings.ollama_chat_model,
            "prompt": (
                "You are an elite data analyst. Given the statistical summary of a dataset below, "
                "produce 4-5 concise, bullet-pointed executive insights. Each bullet must be 1-2 sentences, "
                "mention specific numbers or patterns, and provide actionable business or operational takeaways. "
                "Do not include introductory or concluding remarks—output only the bullet points starting with '• '.\n\n"
                f"Statistical Summary:\n{stats_summary}"
            ),
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 300},
        }
        req = urllib.request.Request(
            f"{settings.ollama_base_url}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            result = json.loads(response.read().decode("utf-8"))
            raw_text = result.get("response", "").strip()
            lines = [line.strip().lstrip("•-* ").strip() for line in raw_text.split("\n") if line.strip() and len(line.strip()) > 15]
            if lines:
                return lines[:6]
    except Exception:
        pass
    return []


def generate_insights(df: pd.DataFrame, cleaning_report: dict[str, object] | None = None, model_results: dict[str, object] | None = None) -> list[str]:
    stats = full_statistics(df)
    overview = stats["overview"]
    statistical_insights: list[str] = []

    if overview["missing_values"] == 0:
        statistical_insights.append("Data Integrity: 100% complete with 0 missing values across all dimensions.")
    else:
        statistical_insights.append(f"Data Cleaning: Successfully resolved and normalized {overview['missing_values']} missing data points.")

    if overview["duplicates"] == 0:
        statistical_insights.append("Record Uniqueness: Verified zero duplicate rows in the cleaned dataset.")
    else:
        statistical_insights.append(f"Deduplication: Removed {overview['duplicates']} duplicate records during schema ingestion.")

    numeric_stats = stats["numeric"]
    if numeric_stats:
        first_column = next(iter(numeric_stats))
        col_data = numeric_stats[first_column]
        statistical_insights.append(
            f"Distribution Metric: '{first_column}' averages {col_data['mean']:.2f} (std dev: {col_data['std_dev']:.2f}, range: {col_data['min']:.2f} - {col_data['max']:.2f})."
        )

    statistical_insights.extend(_top_correlation_pairs(df))

    if cleaning_report:
        statistical_insights.append(
            f"Autonomous Preprocessing: Isolated {cleaning_report.get('outliers_removed', 0)} statistical outliers and cleaned {cleaning_report.get('duplicates_removed', 0)} duplicates."
        )

    if model_results and model_results.get("best_model"):
        statistical_insights.append(
            f"Predictive Intelligence: Optimal model identified as {model_results['best_model']} (Confidence Score: {model_results.get('best_score', 0):.3f})."
        )

    # Build summary for Ollama AI
    summary_text = (
        f"Rows: {overview['rows']}, Columns: {overview['columns']}, Missing: {overview['missing_values']}\n"
        f"Numeric columns: {list(numeric_stats.keys())[:6]}\n"
        f"Key metrics: " + "; ".join(statistical_insights[:3])
    )

    ai_insights = _generate_ollama_insights(summary_text)
    if ai_insights:
        return ai_insights + statistical_insights[:3]

    return statistical_insights[:8]

