export type AuthMode = 'login' | 'signup';
export type AppView = 'intro' | 'auth' | 'dashboard';
export type Gender = 'Male' | 'Female' | 'Other';

export interface User {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  email: string;
  location: string;
  verified: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  email: string;
  verification_required: boolean;
  otp_code?: string | null;
}

export interface DashboardSummary {
  total_rows: number;
  total_columns: number;
  missing_values: number;
  duplicates: number;
  datasets: number;
  latest_dataset: DatasetRecord | null;
}

export interface DatasetRecord {
  id: number;
  filename: string;
  row_count: number;
  column_count: number;
  missing_count: number;
  duplicate_count: number;
  outlier_count: number;
  summary: Record<string, unknown>;
  stats: Record<string, unknown>;
  insights: string[];
  created_at: string;
}

export interface ColumnDetail {
  name: string;
  dtype: string;
  display_type: 'numeric' | 'categorical' | 'datetime';
  total_count: number;
  non_null_count: number;
  null_count: number;
  null_pct: number;
  unique_count: number;
  completeness: number;
  sample_values?: string[];
  mean?: number;
  median?: number;
  std_dev?: number;
  min?: number;
  max?: number;
  mode?: string | number;
  top_values?: Record<string, number>;
}

export interface AnomalyInfo {
  outlier_count: number;
  outlier_pct: number;
  lower_bound: number;
  upper_bound: number;
  q1: number;
  q3: number;
  iqr: number;
  severity: 'low' | 'medium' | 'high';
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  uniqueness: number;
  consistency: number;
  missing_cells?: number;
  total_cells?: number;
  duplicate_rows?: number;
}

export interface ChartItem {
  data: Record<string, any>;
  config?: Record<string, any>;
  chart_type: string;
  title: string;
  description: string;
}

export interface VisualizationsPayload {
  all_charts: ChartItem[];
  charts_by_type: Record<string, ChartItem[]>;
  available_types: string[];
  total_count: number;
}

export interface UploadResponse {
  dataset_id: number;
  filename: string;
  row_count: number;
  column_count: number;
  missing_count: number;
  duplicate_count: number;
  outlier_count: number;
  cleaning_report: Record<string, unknown>;
  statistics: Record<string, unknown>;
  insights: string[];
  charts: VisualizationsPayload | Record<string, any>;
  column_details?: ColumnDetail[];
  anomaly_summary?: Record<string, AnomalyInfo>;
  data_quality_score?: DataQualityScore;
  data_preview?: Array<Record<string, any>>;
}

export interface DatasetPreviewResponse {
  rows: Array<Record<string, any>>;
  columns: string[];
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DatasetChartsResponse {
  charts: VisualizationsPayload | Record<string, any>;
  column_details: ColumnDetail[];
  anomaly_summary: Record<string, AnomalyInfo>;
  data_quality_score: DataQualityScore;
}

export interface ModelResult {
  model: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  r2?: number;
  mae?: number;
  rmse?: number;
  error?: string | null;
  silhouette_score?: number;
  clusters?: number;
}

export interface MlResponse {
  task: string;
  best_model: string;
  best_score: number;
  model_results: ModelResult[];
  feature_importance?: Record<string, number>;
  cluster_counts?: Record<string, number>;
  artifact_id?: string;
  artifact_filename?: string;
}

export interface ChatResponse {
  question: string;
  answer: string;
}

export interface ReportResponse {
  report_name: string;
  report_path: string;
}
