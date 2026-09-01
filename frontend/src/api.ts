import type {
  SignupResponse,
  AuthResponse,
  ChatResponse,
  DashboardSummary,
  DatasetRecord,
  MlResponse,
  ReportResponse,
  User,
  UploadResponse,
  DatasetPreviewResponse,
  DatasetChartsResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(token: string | null) {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function requestJson<T>(path: string, options: RequestInit = {}, token: string | null = null): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const authorizationHeaders = authHeaders(token);
  authorizationHeaders.forEach((value, key) => headers.set(key, value));

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    const detail = error?.detail;
    if (Array.isArray(detail)) {
      const message = detail
        .map((item: { loc?: Array<string | number>; msg?: string }) => {
          const field = item.loc?.filter((part) => part !== 'body').join('.') ?? 'request';
          return `${field}: ${item.msg ?? 'invalid value'}`;
        })
        .join('; ');
      throw new Error(message || 'Request failed');
    }
    if (typeof detail === 'string') {
      throw new Error(detail);
    }
    throw new Error('Request failed');
  }

  return response.json() as Promise<T>;
}

export async function signup(email: string, password: string): Promise<SignupResponse> {
  return requestJson<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function registerAccount(payload: {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  location: string;
  password: string;
}): Promise<SignupResponse> {
  return requestJson<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp }),
  });
}

export async function resendOtp(email: string, password: string): Promise<SignupResponse> {
  return requestJson<SignupResponse>('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function fetchMe(token: string): Promise<User> {
  return requestJson('/auth/me', { method: 'GET' }, token);
}

export async function fetchDashboardSummary(token: string, datasetId?: number): Promise<DashboardSummary> {
  const suffix = datasetId ? `?dataset_id=${datasetId}` : '';
  return requestJson<DashboardSummary>(`/dashboard/summary${suffix}`, { method: 'GET' }, token);
}

export async function fetchDashboardDatasets(token: string): Promise<{ datasets: DatasetRecord[] }> {
  return requestJson<{ datasets: DatasetRecord[] }>('/dashboard/datasets', { method: 'GET' }, token);
}

export async function fetchDatasetPreview(
  token: string,
  datasetId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<DatasetPreviewResponse> {
  return requestJson<DatasetPreviewResponse>(
    `/dashboard/dataset/${datasetId}/preview?page=${page}&page_size=${pageSize}`,
    { method: 'GET' },
    token
  );
}

export async function fetchDatasetCharts(token: string, datasetId: number): Promise<DatasetChartsResponse> {
  return requestJson<DatasetChartsResponse>(
    `/dashboard/dataset/${datasetId}/charts`,
    { method: 'GET' },
    token
  );
}

export async function uploadDataset(token: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    const detail = error?.detail;
    if (Array.isArray(detail)) {
      const message = detail
        .map((item: { loc?: Array<string | number>; msg?: string }) => {
          const field = item.loc?.filter((part) => part !== 'body').join('.') ?? 'request';
          return `${field}: ${item.msg ?? 'invalid value'}`;
        })
        .join('; ');
      throw new Error(message || 'Upload failed');
    }
    if (typeof detail === 'string') {
      throw new Error(detail);
    }
    throw new Error('Upload failed. Please check file format.');
  }

  return response.json() as Promise<UploadResponse>;
}

export async function trainModel(token: string, datasetId: number, targetColumn: string, task?: string): Promise<MlResponse> {
  return requestJson<MlResponse>(
    '/ml/train',
    {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, target_column: targetColumn || null, task: task || null }),
    },
    token,
  );
}

export async function askDataset(token: string, datasetId: number, question: string): Promise<ChatResponse> {
  return requestJson<ChatResponse>(
    '/chat/ask',
    {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, question }),
    },
    token,
  );
}

export async function askChat(token: string, question: string, datasetId?: number): Promise<ChatResponse> {
  return requestJson<ChatResponse>(
    '/chat/ask',
    {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId || 1, question }),
    },
    token,
  );
}

export async function generateReport(token: string, datasetId: number, format: 'csv' | 'excel' | 'pdf'): Promise<ReportResponse> {
  return requestJson<ReportResponse>(
    '/report/generate',
    {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, format }),
    },
    token,
  );
}

export function downloadReportUrl(reportName: string): string {
  return `${API_BASE}/report/download/${encodeURIComponent(reportName)}`;
}

export function downloadModelUrl(artifactId: string, token: string): string {
  // We open this URL directly — the browser will trigger a file download.
  // We append the token as a query param because FileResponse doesn't support
  // Authorization headers from window.open().
  return `${API_BASE}/ml/download/${encodeURIComponent(artifactId)}?token=${encodeURIComponent(token)}`;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function verifyResetOtp(email: string, otp: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp }),
  });
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp, new_password: newPassword }),
  });
}
