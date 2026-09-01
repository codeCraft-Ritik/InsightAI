from __future__ import annotations

import json
from typing import Any

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


# ── Modern dark theme for all charts ─────────────────────────────────────────

_DARK_TEMPLATE = dict(
    layout=dict(
        paper_bgcolor="rgba(15, 23, 42, 0.95)",
        plot_bgcolor="rgba(15, 23, 42, 0.85)",
        font=dict(family="Inter, system-ui, sans-serif", color="#c8d6e5", size=13),
        title=dict(font=dict(size=18, color="#e2e8f0"), x=0.02, xanchor="left"),
        margin=dict(l=60, r=30, t=60, b=50),
        xaxis=dict(
            gridcolor="rgba(148, 163, 184, 0.12)",
            zerolinecolor="rgba(148, 163, 184, 0.2)",
            tickfont=dict(size=11),
        ),
        yaxis=dict(
            gridcolor="rgba(148, 163, 184, 0.12)",
            zerolinecolor="rgba(148, 163, 184, 0.2)",
            tickfont=dict(size=11),
        ),
        legend=dict(bgcolor="rgba(30, 41, 59, 0.8)", bordercolor="rgba(148, 163, 184, 0.2)", borderwidth=1),
        colorway=[
            "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
            "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#3b82f6",
        ],
    )
)

_CHART_CONFIG = {
    "displayModeBar": True,
    "scrollZoom": True,
    "displaylogo": False,
    "modeBarButtonsToRemove": ["lasso2d", "select2d"],
    "toImageButtonOptions": {"format": "png", "filename": "insightai_chart", "height": 800, "width": 1200, "scale": 2},
}


def _apply_dark_theme(fig: go.Figure) -> go.Figure:
    fig.update_layout(**_DARK_TEMPLATE["layout"])
    return fig


def _figure_to_dict(figure: go.Figure) -> dict:
    try:
        return json.loads(figure.to_json())
    except Exception:
        return figure.to_dict()


def _make_chart_entry(fig: go.Figure, chart_type: str, title: str, description: str) -> dict[str, Any]:
    _apply_dark_theme(fig)
    return {
        "data": _figure_to_dict(fig),
        "config": _CHART_CONFIG,
        "chart_type": chart_type,
        "title": title,
        "description": description,
    }


# ── Chart builders ───────────────────────────────────────────────────────────

def _build_histograms(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    for col in numeric_cols[:4]:
        try:
            fig = px.histogram(
                df, x=col, nbins=30,
                title=f"Distribution of {col}",
                color_discrete_sequence=["#6366f1"],
                opacity=0.85,
            )
            fig.update_traces(marker_line_width=0.5, marker_line_color="rgba(255,255,255,0.3)")
            charts.append(_make_chart_entry(fig, "histogram", f"Distribution of {col}", f"Frequency distribution showing the spread of values in '{col}'."))
        except Exception:
            pass
    return charts


def _build_box_plots(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    cols_to_plot = numeric_cols[:6]
    if len(cols_to_plot) > 1:
        try:
            melted = df[cols_to_plot].melt(var_name="Feature", value_name="Value")
            fig = px.box(melted, x="Feature", y="Value", color="Feature", title="Box Plots — Numeric Features")
            charts.append(_make_chart_entry(fig, "box", "Box Plots — Numeric Features", "Quartile distributions, medians, and outlier detection across numeric columns."))
        except Exception:
            pass
    elif len(cols_to_plot) == 1:
        try:
            fig = px.box(df, y=cols_to_plot[0], title=f"Box Plot — {cols_to_plot[0]}", color_discrete_sequence=["#8b5cf6"])
            charts.append(_make_chart_entry(fig, "box", f"Box Plot — {cols_to_plot[0]}", f"Quartile distribution and outliers for '{cols_to_plot[0]}'."))
        except Exception:
            pass
    return charts


def _build_scatter_plots(df: pd.DataFrame, numeric_cols: list[str], cat_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if len(numeric_cols) < 2:
        return charts
    x_col, y_col = numeric_cols[0], numeric_cols[1]
    try:
        color_col = cat_cols[0] if cat_cols and df[cat_cols[0]].nunique() <= 10 else None
        fig = px.scatter(
            df, x=x_col, y=y_col, color=color_col,
            title=f"{x_col} vs {y_col}",
            opacity=0.7, trendline="ols" if len(df) > 5 else None,
        )
        charts.append(_make_chart_entry(fig, "scatter", f"{x_col} vs {y_col}", f"Scatter analysis showing relationship between '{x_col}' and '{y_col}'."))
    except Exception:
        try:
            fig = px.scatter(df, x=x_col, y=y_col, title=f"{x_col} vs {y_col}", opacity=0.7)
            charts.append(_make_chart_entry(fig, "scatter", f"{x_col} vs {y_col}", f"Scatter analysis of '{x_col}' and '{y_col}'."))
        except Exception:
            pass
    return charts


def _build_bar_charts(df: pd.DataFrame, numeric_cols: list[str], cat_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if not cat_cols or not numeric_cols:
        return charts
    first_cat = cat_cols[0]
    first_num = numeric_cols[0]
    try:
        agg_df = df.groupby(first_cat, dropna=False)[first_num].mean().reset_index().sort_values(first_num, ascending=False).head(15)
        fig = px.bar(
            agg_df, x=first_cat, y=first_num,
            title=f"Average {first_num} by {first_cat}",
            color=first_num, color_continuous_scale="Viridis",
        )
        charts.append(_make_chart_entry(fig, "bar", f"Average {first_num} by {first_cat}", f"Bar chart showing mean '{first_num}' grouped by '{first_cat}'."))
    except Exception:
        pass
    return charts


def _build_donut_chart(df: pd.DataFrame, cat_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if not cat_cols:
        return charts
    first_cat = cat_cols[0]
    try:
        pie_data = df[first_cat].fillna("Unknown").value_counts().head(10).reset_index()
        pie_data.columns = [first_cat, "count"]
        fig = px.pie(
            pie_data, names=first_cat, values="count",
            title=f"{first_cat} — Category Distribution",
            hole=0.45,
        )
        fig.update_traces(textposition="inside", textinfo="percent+label")
        charts.append(_make_chart_entry(fig, "donut", f"{first_cat} Distribution", f"Donut chart showing proportional breakdown of '{first_cat}'."))
    except Exception:
        pass
    return charts


def _build_line_chart(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if not numeric_cols:
        return charts
    col = numeric_cols[0]
    try:
        plot_df = df[[col]].copy().reset_index(drop=True)
        plot_df["index"] = range(len(plot_df))
        fig = px.line(plot_df, x="index", y=col, title=f"Trend — {col}", color_discrete_sequence=["#06b6d4"])
        fig.update_traces(line_width=2)
        charts.append(_make_chart_entry(fig, "line", f"Trend — {col}", f"Line chart showing the sequential trend of '{col}' across rows."))
    except Exception:
        pass
    return charts


def _build_area_chart(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if len(numeric_cols) < 2:
        return charts
    cols = numeric_cols[:3]
    try:
        plot_df = df[cols].copy().reset_index(drop=True)
        plot_df["index"] = range(len(plot_df))
        fig = px.area(plot_df, x="index", y=cols, title="Area Chart — Numeric Trends")
        charts.append(_make_chart_entry(fig, "area", "Area Chart — Numeric Trends", "Stacked area chart showing concurrent trends across numeric features."))
    except Exception:
        pass
    return charts


def _build_heatmap(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if len(numeric_cols) < 2:
        return charts
    try:
        corr = df[numeric_cols].corr(numeric_only=True).fillna(0.0).round(4)
        fig = go.Figure(data=go.Heatmap(
            z=corr.values.tolist(),
            x=list(corr.columns),
            y=list(corr.columns),
            colorscale="RdBu_r",
            zmin=-1, zmax=1,
            text=corr.round(2).values.tolist(),
            texttemplate="%{text}",
            textfont=dict(size=11),
            hovertemplate="%{x} ↔ %{y}: %{z:.3f}<extra></extra>",
        ))
        fig.update_layout(title="Correlation Matrix Heatmap")
        charts.append(_make_chart_entry(fig, "heatmap", "Correlation Matrix", "Heatmap showing pairwise correlations between numeric features. Blue = positive, Red = negative."))
    except Exception:
        pass
    return charts


def _build_violin_plot(df: pd.DataFrame, numeric_cols: list[str], cat_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if not numeric_cols:
        return charts
    col = numeric_cols[0]
    try:
        color_col = cat_cols[0] if cat_cols and df[cat_cols[0]].nunique() <= 8 else None
        if color_col:
            fig = px.violin(df, y=col, color=color_col, box=True, points="outliers", title=f"Violin Plot — {col} by {color_col}")
        else:
            fig = px.violin(df, y=col, box=True, points="outliers", title=f"Violin Plot — {col}", color_discrete_sequence=["#10b981"])
        charts.append(_make_chart_entry(fig, "violin", f"Violin — {col}", f"Violin plot showing distribution density and quartiles for '{col}'."))
    except Exception:
        pass
    return charts


def _build_pair_plot(df: pd.DataFrame, numeric_cols: list[str]) -> list[dict[str, Any]]:
    charts = []
    if len(numeric_cols) < 2:
        return charts
    cols = numeric_cols[:4]
    try:
        fig = px.scatter_matrix(df[cols].dropna().head(300), dimensions=cols, title="Pair Plot — Numeric Features")
        fig.update_traces(diagonal_visible=True, marker=dict(size=3, opacity=0.5))
        charts.append(_make_chart_entry(fig, "pair_plot", "Pair Plot", "Scatter matrix showing all pairwise relationships between numeric features."))
    except Exception:
        pass
    return charts


# ── Main Entry Point ─────────────────────────────────────────────────────────

def build_visualizations(df: pd.DataFrame) -> dict[str, Any]:
    numeric_columns = list(df.select_dtypes(include=["number"]).columns)
    categorical_columns = list(df.select_dtypes(exclude=["number"]).columns)

    all_charts: list[dict[str, Any]] = []

    # Build all chart types
    all_charts.extend(_build_histograms(df, numeric_columns))
    all_charts.extend(_build_box_plots(df, numeric_columns))
    all_charts.extend(_build_scatter_plots(df, numeric_columns, categorical_columns))
    all_charts.extend(_build_bar_charts(df, numeric_columns, categorical_columns))
    all_charts.extend(_build_donut_chart(df, categorical_columns))
    all_charts.extend(_build_line_chart(df, numeric_columns))
    all_charts.extend(_build_area_chart(df, numeric_columns))
    all_charts.extend(_build_heatmap(df, numeric_columns))
    all_charts.extend(_build_violin_plot(df, numeric_columns, categorical_columns))
    all_charts.extend(_build_pair_plot(df, numeric_columns))

    # Group by chart_type for easy frontend tab switching
    charts_by_type: dict[str, list[dict]] = {}
    for chart in all_charts:
        ct = chart["chart_type"]
        if ct not in charts_by_type:
            charts_by_type[ct] = []
        charts_by_type[ct].append(chart)

    return {
        "all_charts": all_charts,
        "charts_by_type": charts_by_type,
        "available_types": list(charts_by_type.keys()),
        "total_count": len(all_charts),
    }
