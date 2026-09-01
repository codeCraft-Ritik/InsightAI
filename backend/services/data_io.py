import json
from pathlib import Path
import pandas as pd


def load_dataset(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()

    if suffix in {".csv", ".txt", ".tsv"}:
        # Try multiple common encodings with Python auto-separator detection first
        for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252", "iso-8859-1"]:
            try:
                df = pd.read_csv(path, encoding=enc, sep=None, engine="python")
                if not df.empty or len(df.columns) > 0:
                    return df
            except Exception:
                try:
                    df = pd.read_csv(path, encoding=enc)
                    if not df.empty or len(df.columns) > 0:
                        return df
                except Exception:
                    continue

        # Final fallback for CSV: skip malformed lines if necessary
        try:
            return pd.read_csv(path, encoding="latin1", on_bad_lines="skip")
        except Exception as exc:
            raise ValueError(f"Could not parse CSV file: {exc}") from exc

    if suffix in {".xlsx", ".xls"}:
        try:
            return pd.read_excel(path)
        except Exception as exc:
            raise ValueError(f"Could not parse Excel spreadsheet: {exc}") from exc

    if suffix == ".json":
        try:
            return pd.read_json(path)
        except Exception:
            try:
                raw_text = path.read_text(encoding="utf-8", errors="replace")
                data = json.loads(raw_text)
                if isinstance(data, list):
                    return pd.json_normalize(data)
                elif isinstance(data, dict):
                    for v in data.values():
                        if isinstance(v, list) and v and isinstance(v[0], dict):
                            return pd.json_normalize(v)
                    return pd.json_normalize([data])
            except Exception as exc:
                raise ValueError(f"Could not parse JSON dataset: {exc}") from exc

    if suffix in {".parquet", ".pq"}:
        try:
            return pd.read_parquet(path)
        except Exception as exc:
            raise ValueError(f"Could not read Parquet file: {exc}") from exc

    # If unknown extension, attempt fallback CSV reader
    try:
        return pd.read_csv(path, encoding="latin1", sep=None, engine="python")
    except Exception:
        raise ValueError(f"Unsupported file format '{suffix}'. Please upload a CSV, Excel (.xlsx/.xls), or JSON file.")


def save_cleaned_dataset(df: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def file_type_from_name(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")
