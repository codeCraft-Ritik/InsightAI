import { useState, useEffect, useMemo, useRef, DragEvent, ChangeEvent } from 'react';
import type { User, UploadResponse, ColumnDetail, ChartItem, DatasetPreviewResponse, MlResponse } from './types';
import {
  uploadDataset,
  askChat,
  fetchMe,
  fetchDashboardDatasets,
  fetchDatasetCharts,
  fetchDatasetPreview,
  generateReport,
  downloadReportUrl,
  downloadModelUrl,
  trainModel,
} from './api';
import { Icon } from './Icon';
import { PlotRenderer } from './PlotRenderer';

interface DashboardPageProps {
  user: User | null;
  token: string;
  onSignOut?: () => void;
}

type TabState = 'overview' | 'sources' | 'insights' | 'reports';

interface DatasetItem {
  id: string;
  name: string;
  type: 'CSV' | 'JSON' | 'SQL' | 'XLSX';
  records: string;
  lastUpdated: string;
  status: 'Complete' | 'Processing AI' | 'Failed';
}

export function DashboardPage({ user, token, onSignOut }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabState>('overview');

  // Resolved user — prop > localStorage > API fetch
  const [resolvedUser, setResolvedUser] = useState<User | null>(() => {
    if (user) return user;
    try {
      const stored = localStorage.getItem('insightai-user');
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      setResolvedUser(user);
      localStorage.setItem('insightai-user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (!resolvedUser && token) {
      fetchMe(token)
        .then((fetchedUser) => {
          setResolvedUser(fetchedUser);
          localStorage.setItem('insightai-user', JSON.stringify(fetchedUser));
        })
        .catch(() => {
          // Silently ignore
        });
    }
  }, []);

  const avatarInitial = resolvedUser?.name?.trim()
    ? resolvedUser.name.trim().charAt(0).toUpperCase()
    : '?';

  // Live Cloud Demo Pop-Up Modal State
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('insightai_cloud_demo_seen');
      if (!hasSeen) {
        setDemoModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismissDemoModal = () => {
    setDemoModalOpen(false);
    try {
      localStorage.setItem('insightai_cloud_demo_seen', 'true');
    } catch {
      // ignore
    }
  };

  // Datasets State
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Upload & Active Dataset State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // AI Chat State (AI Insights Lab)
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([]);

  // Report Generation State
  const [generatingReport, setGeneratingReport] = useState<'pdf' | 'csv' | 'excel' | null>(null);

  // Fetch initial summary & datasets from backend on mount
  useEffect(() => {
    if (token && token !== 'preview') {
      fetchDashboardDatasets(token)
        .then(async (res) => {
          if (res.datasets && res.datasets.length > 0) {
            const mapped: DatasetItem[] = res.datasets.map((d) => ({
              id: String(d.id),
              name: d.filename,
              type: d.filename.endsWith('.json')
                ? 'JSON'
                : d.filename.endsWith('.sql')
                ? 'SQL'
                : d.filename.endsWith('.xlsx') || d.filename.endsWith('.xls')
                ? 'XLSX'
                : 'CSV',
              records: d.row_count.toLocaleString(),
              lastUpdated: new Date(d.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              status: 'Complete',
            }));
            setDatasets(mapped);

            const latest = res.datasets[0];
            try {
              const extra = await fetchDatasetCharts(token, latest.id);
              setUploadResult({
                dataset_id: latest.id,
                filename: latest.filename,
                row_count: latest.row_count,
                column_count: latest.column_count,
                missing_count: latest.missing_count,
                duplicate_count: latest.duplicate_count,
                outlier_count: latest.outlier_count,
                cleaning_report: (latest.summary as any)?.cleaning_report || {},
                statistics: latest.stats || {},
                insights: latest.insights || [],
                charts: extra.charts || {},
                column_details: extra.column_details || [],
                anomaly_summary: extra.anomaly_summary || {},
                data_quality_score: extra.data_quality_score || (latest.stats as any)?.data_quality,
              });
            } catch {
              setUploadResult({
                dataset_id: latest.id,
                filename: latest.filename,
                row_count: latest.row_count,
                column_count: latest.column_count,
                missing_count: latest.missing_count,
                duplicate_count: latest.duplicate_count,
                outlier_count: latest.outlier_count,
                cleaning_report: {},
                statistics: latest.stats || {},
                insights: latest.insights || [],
                charts: {},
                column_details: (latest.stats as any)?.column_details || [],
                anomaly_summary: (latest.stats as any)?.anomaly_summary || {},
                data_quality_score: (latest.stats as any)?.data_quality,
              });
            }
          }
        })
        .catch(() => {
          // No datasets uploaded yet
        });
    }
  }, [token]);

  function handleFiles(files: FileList | null) {
    const file = files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setError('');
      setStatus(`Selected file: ${file.name}`);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  async function handleUpload() {
    if (!token || !selectedFile) {
      setError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setError('');
    setStatus(`Uploading and processing "${selectedFile.name}" with InsightAI Neural Core...`);

    try {
      if (token === 'preview') {
        setTimeout(() => {
          const newDs: DatasetItem = {
            id: String(Date.now()),
            name: selectedFile.name,
            type: selectedFile.name.endsWith('.json')
              ? 'JSON'
              : selectedFile.name.endsWith('.sql')
              ? 'SQL'
              : selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
              ? 'XLSX'
              : 'CSV',
            records: '12,482',
            lastUpdated: 'Just now',
            status: 'Complete',
          };
          setDatasets((prev) => [newDs, ...prev]);
          setStatus(`Dataset ${selectedFile.name} processed successfully.`);
          setIsUploading(false);
          setSelectedFile(null);
          setActiveTab('overview');
        }, 1200);
        return;
      }

      const response = await uploadDataset(token, selectedFile);
      setUploadResult(response);
      const newDs: DatasetItem = {
        id: String(response.dataset_id),
        name: response.filename,
        type: response.filename.endsWith('.json')
          ? 'JSON'
          : response.filename.endsWith('.sql')
          ? 'SQL'
          : response.filename.endsWith('.xlsx') || response.filename.endsWith('.xls')
          ? 'XLSX'
          : 'CSV',
        records: response.row_count.toLocaleString(),
        lastUpdated: 'Just now',
        status: 'Complete',
      };
      setDatasets((prev) => [newDs, ...prev.filter((d) => d.id !== String(response.dataset_id))]);
      setStatus(`Dataset "${response.filename}" successfully analyzed and visualized!`);
      setSelectedFile(null);
      setActiveTab('overview');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Upload failed');
      setStatus('');
    } finally {
      if (token !== 'preview') setIsUploading(false);
    }
  }

  async function handleSelectDataset(datasetId: string) {
    setStatus(`Loading analytics for dataset #${datasetId}...`);
    try {
      const extra = await fetchDatasetCharts(token, Number(datasetId));
      const found = datasets.find((d) => d.id === datasetId);
      setUploadResult((prev) => ({
        dataset_id: Number(datasetId),
        filename: found?.name || `Dataset #${datasetId}`,
        row_count: prev?.row_count || 0,
        column_count: prev?.column_count || 0,
        missing_count: prev?.missing_count || 0,
        duplicate_count: prev?.duplicate_count || 0,
        outlier_count: prev?.outlier_count || 0,
        cleaning_report: prev?.cleaning_report || {},
        statistics: prev?.statistics || {},
        insights: prev?.insights || [],
        charts: extra.charts || {},
        column_details: extra.column_details || [],
        anomaly_summary: extra.anomaly_summary || {},
        data_quality_score: extra.data_quality_score,
      }));
      setStatus('');
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch dataset');
    }
  }

  async function handleGenerateInsight(promptOverride?: string) {
    const q = promptOverride || chatPrompt;
    if (!q.trim()) return;

    const datasetId = uploadResult ? uploadResult.dataset_id : 1;
    setChatLoading(true);
    setError('');
    try {
      const res = await askChat(token, q, datasetId);
      setChatHistory((prev) => [{ q: res.question, a: res.answer }, ...prev]);
      setChatPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query AI');
    } finally {
      setChatLoading(false);
    }
  }

  async function handleDownloadReport(format: 'pdf' | 'csv' | 'excel') {
    if (!uploadResult) {
      setError('Please upload a dataset before generating reports.');
      return;
    }
    setGeneratingReport(format);
    setError('');
    try {
      const res = await generateReport(token, uploadResult.dataset_id, format);
      const url = downloadReportUrl(res.report_name);
      window.open(url, '_blank');
      setStatus(`Generated ${format.toUpperCase()} report successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to generate ${format} report`);
    } finally {
      setGeneratingReport(null);
    }
  }

  return (
    <div className="layout-container">
      {/* ── Dynamic Top Navbar ── */}
      <div className="dash-navbar-wrap">
        <nav className="dash-navbar">
          {/* Brand */}
          <div className="dash-nav-brand">
            <div className="dash-brand-icon">
              <Icon name="spark" />
            </div>
            <div className="dash-brand-text">
              <span className="dash-brand-name">InsightAI</span>
              <span className="dash-brand-sub">AUTONOMOUS ENGINE</span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="dash-nav-tabs">
            <button
              className={`dash-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="dash-tab-icon"><Icon name="grid" /></span>
              Overview &amp; Studio
            </button>
            <button
              className={`dash-nav-tab ${activeTab === 'sources' ? 'active' : ''}`}
              onClick={() => setActiveTab('sources')}
            >
              <span className="dash-tab-icon"><Icon name="database" /></span>
              Data Sources
            </button>
            <button
              className={`dash-nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <span className="dash-tab-icon"><Icon name="flask" /></span>
              AI Insights Lab
            </button>
            <button
              className={`dash-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className="dash-tab-icon"><Icon name="archive" /></span>
              Reports Archive
            </button>
          </div>

          {/* Right: Avatar + Sign Out */}
          <div className="dash-nav-right">
            <button
              type="button"
              className="cloud-demo-nav-btn"
              onClick={() => setDemoModalOpen(true)}
              title="Cloud Demo Details & RAM Info"
            >
              <Icon name="spark" />
              <span>Live Cloud Demo</span>
            </button>

            <div className="dash-avatar-circle" title={resolvedUser?.name ?? 'User'}>
              {avatarInitial}
            </div>
            {onSignOut && (
              <button className="dash-signout-btn" onClick={onSignOut} title="Sign Out">
                <Icon name="signout" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* ── LIVE CLOUD DEMO POP-UP MODAL ── */}
      {demoModalOpen && (
        <div className="demo-modal-overlay" onClick={handleDismissDemoModal}>
          <div className="demo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="demo-modal-header">
              <div className="demo-modal-badge">
                <Icon name="spark" /> RENDER CLOUD LIVE PREVIEW
              </div>
              <button className="demo-modal-close" onClick={handleDismissDemoModal} title="Close">✕</button>
            </div>

            <h2 className="demo-modal-title">Welcome to InsightAI Studio</h2>
            <p className="demo-modal-desc">
              You are exploring the live deployment hosted on <strong>Render Cloud Free Tier (512MB RAM)</strong>.
            </p>

            <div className="demo-modal-features-grid">
              <div className="demo-feat-item">
                <div className="feat-icon green"><Icon name="check-circle" /></div>
                <div>
                  <strong>Autonomous Data Cleaning &amp; EDA</strong>
                  <p>Upload CSV / Excel files for automatic schema inference, deduplication, and outlier IQR normalization.</p>
                </div>
              </div>

              <div className="demo-feat-item">
                <div className="feat-icon blue"><Icon name="check-circle" /></div>
                <div>
                  <strong>Interactive Visual Analytics</strong>
                  <p>Plotly correlation matrices, distribution histograms, and column summaries.</p>
                </div>
              </div>

              <div className="demo-feat-item">
                <div className="feat-icon purple"><Icon name="check-circle" /></div>
                <div>
                  <strong>AutoML Training Studio &bull; .pkl Export</strong>
                  <p>Train Classification, Regression, and Clustering pipelines with downloadable model artifacts.</p>
                </div>
              </div>

              <div className="demo-feat-item note">
                <div className="feat-icon amber"><Icon name="warning" /></div>
                <div>
                  <strong>Local Ollama AI Chat Notice</strong>
                  <p>Render's 512MB RAM container cannot load 8GB local neural models (Llama 3). For full offline RAG AI chat, clone the repo and run locally in 3 steps!</p>
                </div>
              </div>
            </div>

            <div className="demo-modal-actions">
              <a
                href="https://github.com/codeCraft-Ritik/InsightAI"
                target="_blank"
                rel="noreferrer"
                className="demo-github-btn"
              >
                <Icon name="spark" /> Star on GitHub &rarr;
              </a>
              <button
                type="button"
                className="demo-explore-btn"
                onClick={handleDismissDemoModal}
              >
                🚀 Continue Exploring Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="dash-main">
        <main className="content-body">
          {error && <div className="banner-alert error">{error}</div>}
          {status && <div className="banner-alert success">{status}</div>}

          {activeTab === 'overview' && (
            <OverviewTab
              uploadResult={uploadResult}
              token={token}
              onNavigate={setActiveTab}
              onUploadClick={() => setActiveTab('sources')}
              onDownloadReport={handleDownloadReport}
            />
          )}

          {activeTab === 'sources' && (
            <DataSourcesTab
              datasets={datasets}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedFile={selectedFile}
              dragActive={dragActive}
              isUploading={isUploading}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleFiles={handleFiles}
              handleUpload={handleUpload}
              onSelectDataset={handleSelectDataset}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsLabTab
              uploadResult={uploadResult}
              chatPrompt={chatPrompt}
              setChatPrompt={setChatPrompt}
              chatLoading={chatLoading}
              chatHistory={chatHistory}
              handleGenerateInsight={handleGenerateInsight}
              onUploadClick={() => setActiveTab('sources')}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsArchiveTab
              uploadResult={uploadResult}
              generatingReport={generatingReport}
              handleDownloadReport={handleDownloadReport}
              onUploadClick={() => setActiveTab('sources')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   Overview Tab Component — Comprehensive 8-Section Power Suite
   ============================================================ */
function OverviewTab({
  uploadResult,
  token,
  onNavigate,
  onUploadClick,
  onDownloadReport,
}: {
  uploadResult: UploadResponse | null;
  token: string;
  onNavigate: (tab: TabState) => void;
  onUploadClick: () => void;
  onDownloadReport: (format: 'pdf' | 'csv' | 'excel') => void;
}) {
  // Empty State
  if (!uploadResult) {
    return (
      <div className="tab-view overview-empty-view anim-fade-in">
        <div className="empty-hero-card">
          <div className="empty-hero-badge">
            <span className="ollama-live-indicator"></span>
            <Icon name="spark" />
            <span>InsightAI Connected &bull; Autonomous Analytics</span>
          </div>

          <h1 className="empty-hero-title">Autonomous Data Intelligence Engine</h1>
          <p className="empty-hero-sub">
            Upload any CSV, Excel, or JSON dataset. InsightAI will autonomously clean missing values, isolate
            outliers, build rich interactive charts, profile column distributions, detect anomalies, and generate boardroom-ready PDF reports.
          </p>

          <div className="empty-hero-actions">
            <button className="primary-action-btn" onClick={onUploadClick}>
              <Icon name="upload" /> Upload Dataset to Begin
            </button>
          </div>

          <div className="capability-grid">
            <div className="cap-card">
              <div className="cap-icon-wrap blue"><Icon name="database" /></div>
              <h3>1. Smart Ingestion &amp; Quality Audit</h3>
              <p>Automated schema parsing, type inference, deduplication, and missing value imputation.</p>
            </div>
            <div className="cap-card">
              <div className="cap-icon-wrap purple"><Icon name="chart" /></div>
              <h3>2. Interactive Chart Studio</h3>
              <p>Histograms, box plots, scatter regression, donut shares, trend lines, area plots, and correlation heatmaps.</p>
            </div>
            <div className="cap-card">
              <div className="cap-icon-wrap green"><Icon name="spark" /></div>
              <h3>3. AI Insights &amp; Boardroom Reports</h3>
              <p>Extract key drivers, correlation pairs, anomaly detection, and export executive PDF reports.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract statistical structures
  const numericStats = (uploadResult.statistics?.numeric as Record<string, Record<string, number>>) || {};
  const numericColumns = Object.keys(numericStats);
  const categoricalStats = (uploadResult.statistics?.categorical as Record<string, Record<string, unknown>>) || {};
  const categoricalColumns = Object.keys(categoricalStats);
  const columnDetails: ColumnDetail[] = uploadResult.column_details || (uploadResult.statistics?.column_details as ColumnDetail[]) || [];
  const anomalySummary = uploadResult.anomaly_summary || (uploadResult.statistics?.anomaly_summary as Record<string, any>) || {};
  const dataQuality = uploadResult.data_quality_score || (uploadResult.statistics?.data_quality as any) || {
    overall: 98.5,
    completeness: 100,
    uniqueness: 100,
    consistency: 96,
  };
  const shapeInfo = (uploadResult.statistics?.shape_info as any) || {};

  // Extract charts
  const chartsPayload = uploadResult.charts || {};
  const allCharts: ChartItem[] = useMemo(() => {
    if (Array.isArray(chartsPayload.all_charts)) return chartsPayload.all_charts;
    // Fallback if charts is direct dict of figures
    return Object.entries(chartsPayload).map(([key, fig]: [string, any]) => ({
      data: fig,
      chart_type: key,
      title: fig?.layout?.title?.text || key.toUpperCase(),
      description: `Interactive ${key} chart representation.`,
    }));
  }, [chartsPayload]);

  const availableChartTypes = useMemo(() => {
    const types = new Set(allCharts.map((c) => c.chart_type));
    return ['all', ...Array.from(types)];
  }, [allCharts]);

  const [selectedChartType, setSelectedChartType] = useState<string>('all');
  const [activeChartIndex, setActiveChartIndex] = useState<number>(0);

  const filteredCharts = useMemo(() => {
    if (selectedChartType === 'all') return allCharts;
    return allCharts.filter((c) => c.chart_type === selectedChartType);
  }, [allCharts, selectedChartType]);

  const activeChart = filteredCharts[activeChartIndex] || filteredCharts[0] || allCharts[0];

  // Column Statistics Filter & Sort State
  const [colSearch, setColSearch] = useState('');
  const [colTypeFilter, setColTypeFilter] = useState<'all' | 'numeric' | 'categorical' | 'datetime'>('all');
  const [expandedCol, setExpandedCol] = useState<string | null>(null);

  const filteredColumns = useMemo(() => {
    return columnDetails.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(colSearch.toLowerCase());
      const matchesType = colTypeFilter === 'all' || c.display_type === colTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [columnDetails, colSearch, colTypeFilter]);

  // Dataset Explorer State (Live Pagination)
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewData, setPreviewData] = useState<DatasetPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  useEffect(() => {
    if (token && uploadResult.dataset_id && token !== 'preview') {
      setPreviewLoading(true);
      fetchDatasetPreview(token, uploadResult.dataset_id, previewPage, 25)
        .then((res) => {
          setPreviewData(res);
        })
        .catch(() => {
          // Fallback to initial upload preview if available
          if (uploadResult.data_preview) {
            setPreviewData({
              rows: uploadResult.data_preview.slice(0, 25),
              columns: Object.keys(uploadResult.data_preview[0] || {}),
              total_rows: uploadResult.row_count,
              page: 1,
              page_size: 25,
              total_pages: Math.ceil(uploadResult.row_count / 25),
            });
          }
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    }
  }, [token, uploadResult.dataset_id, previewPage]);

  // ML Quick Training Modal State
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [mlTargetCol, setMlTargetCol] = useState<string>(numericColumns[0] || '');
  const [mlTask, setMlTask] = useState<string>('auto');
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState<MlResponse | null>(null);
  const [mlError, setMlError] = useState('');
  const [mlProgress, setMlProgress] = useState(0);
  const [mlPhase, setMlPhase] = useState('');
  const [mlElapsed, setMlElapsed] = useState(0);
  const [mlTrainSteps, setMlTrainSteps] = useState<Array<{label: string; done: boolean; active: boolean}>>([]);
  const mlResultsRef = useRef<HTMLDivElement>(null);

  async function handleTrainMl() {
    if (!uploadResult || !token) return;
    setMlLoading(true);
    setMlError('');
    setMlResult(null);
    setMlProgress(0);
    setMlElapsed(0);

    const phases = [
      { label: 'Preprocessing & Feature Engineering', pct: 15 },
      { label: 'Splitting Train / Test Sets (80/20)', pct: 25 },
      { label: 'Fitting Model Candidates', pct: 50 },
      { label: 'Cross-Validation & Scoring', pct: 70 },
      { label: 'Selecting Optimal Model', pct: 88 },
      { label: 'Finalising & Saving Artifact', pct: 97 },
    ];

    setMlTrainSteps(phases.map((p) => ({ label: p.label, done: false, active: false })));

    const startTime = Date.now();

    // Elapsed timer — ticks every second
    const elapsedInterval = setInterval(() => {
      setMlElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Progress animation — advances through phases keeping the last one
    // active until the backend actually responds (no early completion).
    // Each phase gets ~15% of the timeline up to 97%, then holds.
    let phaseIdx = 0;
    const PHASE_INTERVAL_MS = 650; // smooth snappy animation across ~3.9s

    const activatePhase = (idx: number) => {
      const current = phases[idx];
      setMlPhase(current.label);
      setMlProgress(current.pct);
      setMlTrainSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          done: i < idx,
          active: i === idx,
        }))
      );
    };

    activatePhase(phaseIdx);
    phaseIdx++;

    const phaseInterval = setInterval(() => {
      if (phaseIdx < phases.length) {
        activatePhase(phaseIdx);
        phaseIdx++;
      }
      // Once all phases are shown we hold at the last one (97%) until backend responds
    }, PHASE_INTERVAL_MS);

    try {
      const res = await trainModel(token, uploadResult.dataset_id, mlTargetCol, mlTask === 'auto' ? undefined : mlTask);
      clearInterval(phaseInterval);
      clearInterval(elapsedInterval);
      setMlElapsed(Math.floor((Date.now() - startTime) / 1000));
      setMlProgress(100);
      setMlPhase('Training Complete ✓');
      // Mark ALL phases done
      setMlTrainSteps(phases.map((p) => ({ label: p.label, done: true, active: false })));
      setMlResult(res);
      // Auto-scroll to results after a short delay
      setTimeout(() => {
        mlResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err) {
      clearInterval(phaseInterval);
      clearInterval(elapsedInterval);
      setMlError(err instanceof Error ? err.message : 'Training failed');
      setMlProgress(0);
      setMlTrainSteps(phases.map((p) => ({ label: p.label, done: false, active: false })));
    } finally {
      setMlLoading(false);
    }
  }

  // Correlation top pairs
  const correlationData = (uploadResult.statistics?.correlation as any) || {};
  const correlationPairs = correlationData.top_pairs || [];

  return (
    <div className="tab-view overview-view anim-fade-in">
      {/* ── SECTION 1: HERO STATS COMMAND CENTER (6 KPI CARDS) ── */}
      <div className="hero-kpi-grid">
        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">Total Records</span>
            <div className="kpi-icon-badge blue"><Icon name="database" /></div>
          </div>
          <div className="kpi-val">{uploadResult.row_count.toLocaleString()}</div>
          <div className="kpi-foot positive">
            <Icon name="check-circle" /> {uploadResult.filename}
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">Feature Dimensions</span>
            <div className="kpi-icon-badge purple"><Icon name="grid" /></div>
          </div>
          <div className="kpi-val">{uploadResult.column_count} Cols</div>
          <div className="kpi-foot">
            {numericColumns.length} Numeric &bull; {categoricalColumns.length} Categorical
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">Data Health Score</span>
            <div className="kpi-icon-badge green"><Icon name="gauge" /></div>
          </div>
          <div className="kpi-val">{dataQuality.overall || 100}%</div>
          <div className="kpi-foot positive">
            <Icon name="check-circle" /> {uploadResult.missing_count} Missing Cleaned
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">Anomalies Detected</span>
            <div className="kpi-icon-badge amber"><Icon name="warning" /></div>
          </div>
          <div className="kpi-val">{uploadResult.outlier_count} Outliers</div>
          <div className="kpi-foot neutral">
            IQR Normalized &amp; Isolated
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">AI Insights Extracted</span>
            <div className="kpi-icon-badge cyan"><Icon name="spark" /></div>
          </div>
          <div className="kpi-val">{uploadResult.insights?.length || 0} Key Drivers</div>
          <div className="kpi-foot purple">
            Engine: InsightAI Neural Core
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-card-top">
            <span className="kpi-label">Memory &amp; Format</span>
            <div className="kpi-icon-badge pink"><Icon name="layers" /></div>
          </div>
          <div className="kpi-val">{shapeInfo.memory_human || 'Optimized'}</div>
          <div className="kpi-foot">
            Deduplicated: {uploadResult.duplicate_count}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: INTERACTIVE CHART STUDIO & VISUALIZER (PLOTLY) ── */}
      <div className="card-panel chart-studio-panel">
        <div className="card-panel-header">
          <div>
            <h2 className="panel-title">
              <Icon name="chart" /> Interactive Visualization Studio
            </h2>
            <span className="panel-subtitle">
              Dynamic Plotly charts with zoom, hover tooltips, multi-series legend, and high-res download
            </span>
          </div>

          <div className="studio-header-actions">
            <span className="chart-counter-badge">{filteredCharts.length} Charts Available</span>
          </div>
        </div>

        {/* Chart Type Filter Strip */}
        <div className="chart-type-tabs-strip">
          {availableChartTypes.map((type) => (
            <button
              key={type}
              className={`chart-type-pill ${selectedChartType === type ? 'active' : ''}`}
              onClick={() => {
                setSelectedChartType(type);
                setActiveChartIndex(0);
              }}
            >
              {type === 'all' && <Icon name="grid" />}
              {type === 'histogram' && <Icon name="chart" />}
              {type === 'box' && <Icon name="trend" />}
              {type === 'scatter' && <Icon name="spark" />}
              {type === 'bar' && <Icon name="chart" />}
              {type === 'donut' && <Icon name="pie" />}
              {type === 'line' && <Icon name="trend" />}
              {type === 'area' && <Icon name="layers" />}
              {type === 'heatmap' && <Icon name="correlation" />}
              {type === 'violin' && <Icon name="trend" />}
              {type === 'pair_plot' && <Icon name="grid" />}
              <span>{type.toUpperCase().replace('_', ' ')}</span>
            </button>
          ))}
        </div>

        {/* Sub-selector if multiple charts in this category */}
        {filteredCharts.length > 1 && (
          <div className="chart-subselector-bar">
            <span className="subselector-label">Select View:</span>
            <div className="subselector-pills">
              {filteredCharts.map((c, idx) => (
                <button
                  key={idx}
                  className={`sub-pill ${activeChartIndex === idx ? 'selected' : ''}`}
                  onClick={() => setActiveChartIndex(idx)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Active Plotly Chart */}
        <div className="main-plot-wrapper">
          {activeChart ? (
            <PlotRenderer
              figure={activeChart.data}
              title={activeChart.title}
              description={activeChart.description}
              height={480}
            />
          ) : (
            <div className="empty-chart-box">
              <Icon name="chart" />
              <p>No charts generated for this type.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: DATA QUALITY & AUTOMATED HYGIENE AUDIT ── */}
      <div className="card-panel quality-audit-panel">
        <div className="card-panel-header">
          <div>
            <h2 className="panel-title">
              <Icon name="gauge" /> Automated Data Health &amp; Hygiene Audit
            </h2>
            <span className="panel-subtitle">Comprehensive assessment of dataset completeness, integrity, and cleaning transformations</span>
          </div>
          <div className="quality-overall-pill">
            <span>Overall Score:</span> <strong>{dataQuality.overall || 100}%</strong>
          </div>
        </div>

        <div className="quality-metrics-row">
          {/* Gauge 1: Completeness */}
          <div className="quality-gauge-card">
            <div className="gauge-circle-wrap">
              <div
                className="gauge-circle"
                style={{
                  background: `conic-gradient(#4f6ef7 ${dataQuality.completeness || 100}%, rgba(79, 110, 247, 0.15) 0)`,
                }}
              >
                <div className="gauge-circle-inner">{dataQuality.completeness || 100}%</div>
              </div>
            </div>
            <h4>Completeness</h4>
            <p>{dataQuality.missing_cells || 0} missing cells resolved</p>
          </div>

          {/* Gauge 2: Uniqueness */}
          <div className="quality-gauge-card">
            <div className="gauge-circle-wrap">
              <div
                className="gauge-circle"
                style={{
                  background: `conic-gradient(#10b981 ${dataQuality.uniqueness || 100}%, rgba(16, 185, 129, 0.15) 0)`,
                }}
              >
                <div className="gauge-circle-inner">{dataQuality.uniqueness || 100}%</div>
              </div>
            </div>
            <h4>Uniqueness</h4>
            <p>{uploadResult.duplicate_count} duplicates removed</p>
          </div>

          {/* Gauge 3: Consistency */}
          <div className="quality-gauge-card">
            <div className="gauge-circle-wrap">
              <div
                className="gauge-circle"
                style={{
                  background: `conic-gradient(#8b5cf6 ${dataQuality.consistency || 98}%, rgba(139, 92, 246, 0.15) 0)`,
                }}
              >
                <div className="gauge-circle-inner">{dataQuality.consistency || 98}%</div>
              </div>
            </div>
            <h4>Consistency</h4>
            <p>Data types unified &amp; normalized</p>
          </div>

          {/* Cleaning Transformation Card */}
          <div className="cleaning-summary-box">
            <h4>Cleaning Pipeline Summary</h4>
            <ul className="cleaning-checklist">
              <li>
                <Icon name="check-circle" />
                <span>Null imputation via median/mode fallback: <strong>100% complete</strong></span>
              </li>
              <li>
                <Icon name="check-circle" />
                <span>Duplicate records purged: <strong>{uploadResult.duplicate_count} rows</strong></span>
              </li>
              <li>
                <Icon name="check-circle" />
                <span>IQR outlier boundary isolation: <strong>{uploadResult.outlier_count} values</strong></span>
              </li>
              <li>
                <Icon name="check-circle" />
                <span>Feature headers standardized to snake_case</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: DEEP COLUMN-WISE STATISTICAL PROFILER ── */}
      <div className="card-panel column-profiler-panel">
        <div className="card-panel-header">
          <div>
            <h2 className="panel-title">
              <Icon name="table" /> Column-Wise Statistical Profiler
            </h2>
            <span className="panel-subtitle">
              Inspect data types, quartiles, mean, std dev, missing rates, and sample values
            </span>
          </div>

          <div className="profiler-controls">
            <div className="profiler-search-box">
              <Icon name="search" />
              <input
                type="text"
                placeholder="Filter columns..."
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
              />
            </div>

            <div className="type-filter-group">
              {(['all', 'numeric', 'categorical'] as const).map((t) => (
                <button
                  key={t}
                  className={`type-filter-btn ${colTypeFilter === t ? 'active' : ''}`}
                  onClick={() => setColTypeFilter(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="column-stats-table-wrap">
          <table className="column-stats-table">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Type</th>
                <th>Completeness</th>
                <th>Unique</th>
                <th>Mean / Mode</th>
                <th>Std Dev</th>
                <th>Min &rarr; Max</th>
                <th>Sample Values</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredColumns.map((col) => (
                <tr key={col.name} className={expandedCol === col.name ? 'expanded-row' : ''}>
                  <td className="col-name-cell">
                    <strong>{col.name}</strong>
                  </td>
                  <td>
                    <span className={`dtype-pill ${col.display_type}`}>{col.dtype}</span>
                  </td>
                  <td>
                    <div className="completeness-bar-wrap" title={`${col.completeness}% Non-Null`}>
                      <div className="completeness-bar-fill" style={{ width: `${col.completeness}%` }}></div>
                      <span className="completeness-pct">{col.completeness}%</span>
                    </div>
                  </td>
                  <td>{col.unique_count.toLocaleString()}</td>
                  <td>
                    {col.display_type === 'numeric'
                      ? typeof col.mean === 'number'
                        ? col.mean.toFixed(2)
                        : '--'
                      : String(col.mode || '--')}
                  </td>
                  <td>
                    {col.display_type === 'numeric' && typeof col.std_dev === 'number'
                      ? col.std_dev.toFixed(2)
                      : '--'}
                  </td>
                  <td>
                    {col.display_type === 'numeric'
                      ? `${col.min ?? '--'} → ${col.max ?? '--'}`
                      : '--'}
                  </td>
                  <td className="samples-cell">
                    <div className="sample-chips">
                      {col.sample_values?.slice(0, 3).map((val, i) => (
                        <span key={i} className="sample-chip">
                          {val}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      className="col-inspect-btn"
                      onClick={() => setExpandedCol(expandedCol === col.name ? null : col.name)}
                    >
                      {expandedCol === col.name ? 'Collapse' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inline Drawer for expanded column detail */}
        {expandedCol && (() => {
          const detail = columnDetails.find((c) => c.name === expandedCol);
          if (!detail) return null;
          return (
            <div className="expanded-column-drawer anim-fade-in">
              <div className="drawer-header">
                <h3>Feature Detail: {detail.name}</h3>
                <button className="drawer-close-btn" onClick={() => setExpandedCol(null)}>✕</button>
              </div>
              <div className="drawer-grid">
                <div className="drawer-card">
                  <span className="drawer-card-label">Data Type</span>
                  <span className="drawer-card-val">{detail.dtype} ({detail.display_type})</span>
                </div>
                <div className="drawer-card">
                  <span className="drawer-card-label">Non-Null Observations</span>
                  <span className="drawer-card-val">{detail.non_null_count} / {detail.total_count} ({detail.completeness}%)</span>
                </div>
                <div className="drawer-card">
                  <span className="drawer-card-label">Distinct Cardinality</span>
                  <span className="drawer-card-val">{detail.unique_count} Unique Values</span>
                </div>
                {detail.display_type === 'numeric' && (
                  <>
                    <div className="drawer-card">
                      <span className="drawer-card-label">Median / Mean</span>
                      <span className="drawer-card-val">Med: {detail.median?.toFixed(2)} | Avg: {detail.mean?.toFixed(2)}</span>
                    </div>
                    <div className="drawer-card">
                      <span className="drawer-card-label">Standard Deviation</span>
                      <span className="drawer-card-val">{detail.std_dev?.toFixed(3)}</span>
                    </div>
                    <div className="drawer-card">
                      <span className="drawer-card-label">Range [Min, Max]</span>
                      <span className="drawer-card-val">[{detail.min}, {detail.max}]</span>
                    </div>
                  </>
                )}
                {detail.top_values && (
                  <div className="drawer-card full-width">
                    <span className="drawer-card-label">Top Categorical Frequencies</span>
                    <div className="freq-pills-row">
                      {Object.entries(detail.top_values).map(([k, v]) => (
                        <span key={k} className="freq-pill">
                          <strong>{k}:</strong> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── SECTION 5 & 6: CORRELATION MATRIX & ANOMALY DETECTION (TWO-COL) ── */}
      <div className="overview-two-col-grid">
        {/* Left: Correlation Matrix */}
        <div className="card-panel correlation-panel">
          <div className="card-panel-header">
            <div>
              <h2 className="panel-title">
                <Icon name="correlation" /> Feature Correlation Matrix
              </h2>
              <span className="panel-subtitle">Pairwise Pearson linear dependency between numeric attributes</span>
            </div>
          </div>

          {correlationPairs.length > 0 ? (
            <div className="correlation-pairs-list">
              <div className="pairs-table-head">
                <span>Feature Pair</span>
                <span>Correlation (r)</span>
                <span>Strength</span>
              </div>
              {correlationPairs.slice(0, 6).map((pair: any, idx: number) => (
                <div key={idx} className="correlation-pair-row">
                  <div className="pair-cols">
                    <span className="col-pill">{pair.col_a}</span>
                    <span className="pair-arrow">↔</span>
                    <span className="col-pill">{pair.col_b}</span>
                  </div>
                  <div className="pair-val">
                    <strong>{pair.value > 0 ? `+${pair.value}` : pair.value}</strong>
                  </div>
                  <div className="pair-badge">
                    <span className={`strength-pill ${pair.strength || 'moderate'}`}>
                      {pair.strength || 'Moderate'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel-notice">
              <p>Requires at least 2 numeric features to calculate Pearson correlation pairs.</p>
            </div>
          )}
        </div>

        {/* Right: Anomaly Detection */}
        <div className="card-panel anomaly-panel">
          <div className="card-panel-header">
            <div>
              <h2 className="panel-title">
                <Icon name="warning" /> Anomaly &amp; Outlier Profiler
              </h2>
              <span className="panel-subtitle">Identified statistical outliers using Interquartile Range (IQR)</span>
            </div>
          </div>

          {Object.keys(anomalySummary).length > 0 ? (
            <div className="anomalies-list">
              {Object.entries(anomalySummary).slice(0, 5).map(([col, data]: [string, any]) => (
                <div key={col} className="anomaly-item-card">
                  <div className="anomaly-card-top">
                    <span className="anomaly-col-name">{col}</span>
                    <span className={`severity-tag ${data.severity || 'medium'}`}>
                      {data.severity ? data.severity.toUpperCase() : 'MEDIUM'} SEVERITY
                    </span>
                  </div>
                  <div className="anomaly-stats-row">
                    <span>Outliers: <strong>{data.outlier_count}</strong> ({data.outlier_pct}%)</span>
                    <span>IQR: {data.iqr}</span>
                  </div>
                  <div className="anomaly-bounds-row">
                    <span>Lower Bound: &lt; {data.lower_bound}</span>
                    <span>Upper Bound: &gt; {data.upper_bound}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel-notice">
              <Icon name="check-circle" />
              <p>No high-severity outliers detected in numerical feature ranges.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 7: DATASET EXPLORER & LIVE DATA INSPECTOR ── */}
      <div className="card-panel dataset-explorer-panel">
        <div className="card-panel-header">
          <div>
            <h2 className="panel-title">
              <Icon name="table" /> Dataset Explorer &amp; Live Data Inspector
            </h2>
            <span className="panel-subtitle">
              Browse cleaned rows, search cell contents, and inspect raw records
            </span>
          </div>

          <div className="explorer-controls">
            <div className="explorer-search">
              <Icon name="search" />
              <input
                type="text"
                placeholder="Search table rows..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
              />
            </div>

            <button
              className="action-pill-btn blue"
              onClick={() => onDownloadReport('csv')}
              title="Download Clean CSV"
            >
              <Icon name="download" /> Export CSV
            </button>
          </div>
        </div>

        <div className="explorer-table-scroll">
          {previewLoading ? (
            <div className="table-loading-spinner">
              <div className="spinner"></div>
              <span>Loading dataset records...</span>
            </div>
          ) : previewData && previewData.rows.length > 0 ? (
            <table className="explorer-table">
              <thead>
                <tr>
                  <th className="th-index">#</th>
                  {previewData.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows
                  .filter((row) =>
                    !previewSearch.trim()
                      ? true
                      : Object.values(row).some((val) =>
                          String(val).toLowerCase().includes(previewSearch.toLowerCase())
                        )
                  )
                  .map((row, idx) => (
                    <tr key={idx}>
                      <td className="td-index">{(previewPage - 1) * 25 + idx + 1}</td>
                      {previewData.columns.map((col) => (
                        <td key={col} className="td-cell">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-explorer-notice">
              <p>No preview rows available.</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {previewData && (
          <div className="explorer-pagination-bar">
            <span className="pagination-info">
              Showing page {previewData.page} of {previewData.total_pages} ({previewData.total_rows.toLocaleString()} total records)
            </span>
            <div className="pagination-btns">
              <button
                className="page-btn"
                disabled={previewPage <= 1 || previewLoading}
                onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span className="current-page-num">{previewPage}</span>
              <button
                className="page-btn"
                disabled={previewPage >= previewData.total_pages || previewLoading}
                onClick={() => setPreviewPage((p) => p + 1)}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 8: AI STRATEGIC INSIGHTS & ACTION LAUNCHPAD ── */}
      <div className="overview-two-col-grid bottom-hub">
        {/* Left: AI Insights Cards */}
        <div className="card-panel ai-insights-cards-panel">
          <div className="card-panel-header">
            <div>
              <h2 className="panel-title">
                <Icon name="spark" /> InsightAI Strategic Insights
              </h2>
              <span className="panel-subtitle">Autonomous key findings and pattern interpretations</span>
            </div>
            <button className="view-all-link-btn" onClick={() => onNavigate('insights')}>
              Open AI Lab &rarr;
            </button>
          </div>

          <div className="insights-card-grid">
            {uploadResult.insights && uploadResult.insights.length > 0 ? (
              uploadResult.insights.map((insight, idx) => (
                <div key={idx} className="ai-insight-card">
                  <div className="insight-card-icon">
                    <Icon name="spark" />
                  </div>
                  <div className="insight-card-content">
                    <span className="insight-idx">Finding #{idx + 1}</span>
                    <p>{insight}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-panel-notice">
                <p>Dataset verified and indexed for natural language interrogation.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Hub & ML Trigger */}
        <div className="card-panel action-hub-panel">
          <div className="card-panel-header">
            <div>
              <h2 className="panel-title">
                <Icon name="spark" /> Action Launchpad
              </h2>
              <span className="panel-subtitle">Autonomous workflows and machine learning pipelines</span>
            </div>
          </div>

          <div className="launchpad-grid">
            {/* Launchpad 1: Machine Learning */}
            <div
              className={`launchpad-card ${mlModalOpen ? 'active-launcher' : ''}`}
              onClick={() => setMlModalOpen(!mlModalOpen)}
            >
              <div className="launch-icon-wrap purple"><Icon name="brain" /></div>
              <div className="launch-text">
                <h4>Train Machine Learning</h4>
                <p>Auto-train classification, regression, or KMeans clustering models</p>
              </div>
              <button className="launch-action-btn" type="button">
                {mlModalOpen ? 'Close Studio ▲' : 'Launch Studio ▼'}
              </button>
            </div>

            {/* Launchpad 2: Natural Language Query */}
            <div className="launchpad-card" onClick={() => onNavigate('insights')}>
              <div className="launch-icon-wrap blue"><Icon name="chat" /></div>
              <div className="launch-text">
                <h4>Chat with Data</h4>
                <p>Ask freeform questions in natural language with InsightAI RAG</p>
              </div>
              <button className="launch-action-btn" type="button">Ask AI &rarr;</button>
            </div>

            {/* Launchpad 3: PDF Boardroom Report */}
            <div className="launchpad-card" onClick={() => onDownloadReport('pdf')}>
              <div className="launch-icon-wrap green"><Icon name="file-text" /></div>
              <div className="launch-text">
                <h4>Executive PDF Report</h4>
                <p>Generate professional boardroom summary with charts &amp; audit</p>
              </div>
              <button className="launch-action-btn" type="button">Download &rarr;</button>
            </div>

            {/* Launchpad 4: Multi-sheet Excel */}
            <div className="launchpad-card" onClick={() => onDownloadReport('excel')}>
              <div className="launch-icon-wrap amber"><Icon name="archive" /></div>
              <div className="launch-text">
                <h4>Excel Statistical Audit</h4>
                <p>Export multi-tab workbook with correlations and distributions</p>
              </div>
              <button className="launch-action-btn" type="button">Export &rarr;</button>
            </div>
          </div>

          {/* ── INLINE MACHINE LEARNING STUDIO WORKBENCH (UPGRADED) ── */}
          {mlModalOpen && (
            <div className="ml-inline-workbench anim-fade-in">
              {/* Header */}
              <div className="ml-workbench-header">
                <div className="ml-workbench-title">
                  <Icon name="brain" />
                  <span>ML Training Studio &bull; {uploadResult.filename}</span>
                </div>
                <button
                  className="ml-close-btn"
                  onClick={() => { setMlModalOpen(false); setMlResult(null); setMlProgress(0); setMlElapsed(0); setMlTrainSteps([]); }}
                  title="Close ML Studio"
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="ml-workbench-body">
                {/* Config Row */}
                <div className="ml-config-section">
                  <div className="ml-config-grid">
                    <div className="ml-form-field">
                      <label className="ml-field-label">Target Column</label>
                      <select
                        className="ml-select-input"
                        value={mlTargetCol}
                        onChange={(e) => setMlTargetCol(e.target.value)}
                        disabled={mlLoading}
                      >
                        {columnDetails.map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.display_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ml-form-field">
                      <label className="ml-field-label">Algorithm Mode</label>
                      <select
                        className="ml-select-input"
                        value={mlTask}
                        onChange={(e) => setMlTask(e.target.value)}
                        disabled={mlLoading}
                      >
                        <option value="auto">🤖 Auto-Infer (Classification or Regression)</option>
                        <option value="classification">📊 Classification (RandomForest, Logistic, SVM, DecisionTree)</option>
                        <option value="regression">📈 Regression (Linear, Ridge, RandomForest, SVR)</option>
                        <option value="clustering">🔵 Unsupervised Clustering (KMeans &amp; DBSCAN)</option>
                      </select>
                    </div>

                    <div className="ml-action-col">
                      <label className="ml-field-label">&nbsp;</label>
                      <button
                        className={`ml-execute-btn ${mlLoading ? 'ml-execute-btn--running' : ''}`}
                        onClick={handleTrainMl}
                        disabled={mlLoading}
                        type="button"
                      >
                        {mlLoading ? (
                          <><span className="ml-btn-spinner" />&nbsp;Training…</>
                        ) : (
                          <>⚡ Launch Training Pipeline</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {mlError && <div className="banner-alert error">{mlError}</div>}

                {/* Training Progress UI — visible while loading or after completion */}
                {(mlLoading || (mlTrainSteps.length > 0 && !mlError)) && (
                  <div className="ml-training-progress-panel anim-fade-in">
                    {/* Left: Circular Ring + Timer */}
                    <div className="ml-ring-col">
                      <div className="ml-ring-wrap">
                        <svg className="ml-ring-svg" viewBox="0 0 120 120">
                          {/* Background circle */}
                          <circle
                            cx="60" cy="60" r="50"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="10"
                          />
                          {/* Progress arc */}
                          <circle
                            cx="60" cy="60" r="50"
                            fill="none"
                            stroke="url(#mlGrad)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 50}`}
                            strokeDashoffset={`${2 * Math.PI * 50 * (1 - mlProgress / 100)}`}
                            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)', transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                          />
                          <defs>
                            <linearGradient id="mlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                          {/* Center text */}
                          <text x="60" y="55" textAnchor="middle" className="ml-ring-pct-text">
                            {mlProgress}%
                          </text>
                          <text x="60" y="72" textAnchor="middle" className="ml-ring-label-text">
                            {mlProgress === 100 ? 'DONE' : 'Training'}
                          </text>
                        </svg>
                      </div>

                      <div className="ml-timer-badge">
                        <span className="ml-timer-icon">⏱</span>
                        <span className="ml-timer-val">{mlElapsed}s elapsed</span>
                      </div>

                      {mlProgress === 100 && (
                        <div className="ml-complete-badge">
                          <span>✓</span> Training Complete
                        </div>
                      )}
                    </div>

                    {/* Right: Phase Steps */}
                    <div className="ml-phases-col">
                      <p className="ml-phase-header">Pipeline Phases</p>
                      <div className="ml-phases-list">
                        {mlTrainSteps.map((step, i) => (
                          <div
                            key={i}
                            className={`ml-phase-row ${
                              step.done ? 'ml-phase-row--done' : step.active ? 'ml-phase-row--active' : ''
                            }`}
                          >
                            <div className="ml-phase-dot">
                              {step.done ? '✓' : step.active ? <span className="ml-dot-pulse" /> : i + 1}
                            </div>
                            <span className="ml-phase-label">{step.label}</span>
                          </div>
                        ))}
                      </div>

                      {mlLoading && mlPhase && (
                        <div className="ml-current-phase-strip">
                          <span className="ml-phase-spinner" />
                          <span>{mlPhase}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Results Panel */}
                {mlResult && (
                  <div ref={mlResultsRef} className="ml-results-card anim-fade-in">
                    {/* Best Model Banner */}
                    <div className="ml-best-model-banner">
                      <div className="ml-best-left">
                        <span className="ml-trophy">🏆</span>
                        <div>
                          <p className="ml-best-label">Optimal Model Selected</p>
                          <p className="ml-best-name">{mlResult.best_model}</p>
                        </div>
                      </div>
                      <div className="ml-best-score-chip">
                        <span className="ml-score-num">
                          {typeof mlResult.best_score === 'number'
                            ? (mlResult.best_score <= 1
                                ? `${(mlResult.best_score * 100).toFixed(1)}%`
                                : mlResult.best_score.toFixed(3))
                            : mlResult.best_score}
                        </span>
                        <span className="ml-score-label">Best Score</span>
                      </div>
                    </div>

                    {/* Model Score Bars */}
                    <div className="ml-model-bars">
                      <p className="ml-bars-title">All Candidate Models</p>
                      {mlResult.model_results.map((m, i) => {
                        const rawScore = m.accuracy ?? m.r2 ?? m.silhouette_score ?? 0;
                        const pct = rawScore <= 1 ? rawScore * 100 : Math.min(rawScore, 100);
                        const isBest = m.model === mlResult.best_model;
                        return (
                          <div key={i} className={`ml-model-bar-row ${isBest ? 'ml-model-bar-row--best' : ''}`}>
                            <div className="ml-model-bar-header">
                              <span className="ml-model-name">
                                {isBest && <span className="ml-star">★</span>} {m.model}
                              </span>
                              <div className="ml-model-metrics">
                                {m.accuracy !== undefined && (
                                  <span className="ml-metric-chip green">Acc {(m.accuracy * 100).toFixed(1)}%</span>
                                )}
                                {m.r2 !== undefined && (
                                  <span className="ml-metric-chip blue">R² {m.r2.toFixed(3)}</span>
                                )}
                                {m.silhouette_score !== undefined && (
                                  <span className="ml-metric-chip purple">Sil {m.silhouette_score.toFixed(3)}</span>
                                )}
                                {m.precision !== undefined && (
                                  <span className="ml-metric-chip amber">Prec {(m.precision * 100).toFixed(1)}%</span>
                                )}
                                {m.rmse !== undefined && (
                                  <span className="ml-metric-chip red">RMSE {m.rmse.toFixed(2)}</span>
                                )}
                                {m.clusters !== undefined && (
                                  <span className="ml-metric-chip grey">{m.clusters} clusters</span>
                                )}
                                {m.error && <span className="ml-metric-chip red">Failed</span>}
                              </div>
                            </div>
                            <div className="ml-score-bar-track">
                              <div
                                className="ml-score-bar-fill"
                                style={{ width: `${Math.max(pct, 2)}%`, background: isBest ? 'linear-gradient(90deg,#6366f1,#a855f7)' : '#cbd5e1' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Download Model Artifact */}
                {mlResult?.artifact_id && (
                  <div className="ml-artifact-panel anim-fade-in">
                    <div className="ml-artifact-left">
                      <div className="ml-artifact-icon">
                        <Icon name="archive" />
                      </div>
                      <div>
                        <p className="ml-artifact-label">Trained Model Artifact Saved</p>
                        <p className="ml-artifact-filename">{mlResult.artifact_filename}</p>
                        <p className="ml-artifact-desc">
                          Scikit-learn Pipeline saved via joblib — load it with{' '}
                          <code>joblib.load("model.pkl")</code> to make predictions on new data.
                        </p>
                      </div>
                    </div>
                    <a
                      className="ml-download-btn"
                      href={downloadModelUrl(mlResult.artifact_id, token)}
                      download={mlResult.artifact_filename}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="download" />
                      Download .pkl Model
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Data Sources Tab Component
   ============================================================ */
function DataSourcesTab({
  datasets,
  searchTerm,
  setSearchTerm,
  selectedFile,
  dragActive,
  isUploading,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  handleFiles,
  handleUpload,
  onSelectDataset,
}: {
  datasets: DatasetItem[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedFile: File | null;
  dragActive: boolean;
  isUploading: boolean;
  handleDrop: (e: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleFiles: (files: FileList | null) => void;
  handleUpload: () => void;
  onSelectDataset: (id: string) => void;
}) {
  const filteredDatasets = datasets.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="tab-view sources-view anim-fade-in">
      <div className="view-header">
        <h1 className="view-title">Data Sources</h1>
        <p className="view-description">Manage and monitor uploaded datasets for autonomous AI processing.</p>
      </div>

      <div
        className={`upload-dropzone-box ${dragActive ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="cloud-icon-circle">
          <Icon name="cloud" />
        </div>
        <h2 className="dropzone-heading">Drag &amp; Drop Datasets</h2>
        <p className="dropzone-subtext">
          Upload CSV, Excel, JSON, or SQL files. InsightAI will automatically clean data, map schemas, and generate interactive charts and reports.
        </p>

        <div className="dropzone-actions-row">
          <label className="browse-files-btn" htmlFor="dataset-file-input">
            Browse Files
          </label>
          <input
            id="dataset-file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.json,.sql"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />

          {selectedFile && (
            <button className="confirm-upload-btn" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Processing with InsightAI...' : `Upload & Analyze "${selectedFile.name}"`}
            </button>
          )}
        </div>
      </div>

      <div className="table-card">
        <div className="table-header-controls">
          <div className="search-input-wrap">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls-right">
            <span className="count-label">Showing {filteredDatasets.length} datasets</span>
          </div>
        </div>

        <div className="table-scroll-wrapper">
          {filteredDatasets.length > 0 ? (
            <table className="datasets-table">
              <thead>
                <tr>
                  <th>Dataset Name</th>
                  <th>Type</th>
                  <th>Records</th>
                  <th>Ingestion Time</th>
                  <th>Status</th>
                  <th className="th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDatasets.map((item) => (
                  <tr key={item.id}>
                    <td className="td-name">
                      <span className="file-type-icon"><Icon name="grid" /></span>
                      <span className="file-name-text">{item.name}</span>
                    </td>
                    <td className="td-type">{item.type}</td>
                    <td className="td-records">{item.records}</td>
                    <td className="td-updated">{item.lastUpdated}</td>
                    <td className="td-status">
                      <span className="status-pill complete">&bull; Complete</span>
                    </td>
                    <td className="td-actions">
                      <button className="view-ds-btn" onClick={() => onSelectDataset(item.id)}>
                        View Analytics &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-table-placeholder">
              <Icon name="database" />
              <h3>No datasets uploaded yet</h3>
              <p>Drag and drop a file above to begin autonomous AI analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AI Insights Lab Tab Component
   ============================================================ */
function InsightsLabTab({
  uploadResult,
  chatPrompt,
  setChatPrompt,
  chatLoading,
  chatHistory,
  handleGenerateInsight,
  onUploadClick,
}: {
  uploadResult: UploadResponse | null;
  chatPrompt: string;
  setChatPrompt: (s: string) => void;
  chatLoading: boolean;
  chatHistory: Array<{ q: string; a: string }>;
  handleGenerateInsight: (p?: string) => void;
  onUploadClick: () => void;
}) {
  const numericCols = Object.keys(uploadResult?.statistics?.numeric || {});
  const firstCol = numericCols[0] || 'records';
  const secondCol = numericCols[1] || 'variance';

  return (
    <div className="tab-view insights-lab-view anim-fade-in">
      <div className="lab-two-column-layout">
        <div className="lab-main-col">
          <div className="lab-hero-header">
            <h1 className="lab-title">InsightAI Intelligence Lab</h1>
            <p className="lab-subtitle">
              {uploadResult
                ? `Connected to "${uploadResult.filename}" via InsightAI Neural Core.`
                : 'Upload a dataset to ask questions and extract instant correlations.'}
            </p>
          </div>

          <div className="prompt-box-card">
            <textarea
              className="prompt-textarea"
              rows={3}
              placeholder={
                uploadResult
                  ? `Ask InsightAI anything about ${uploadResult.filename} (e.g. "What are the key drivers?", "Summarize anomalies in ${firstCol}")...`
                  : 'Upload a dataset first to begin querying with InsightAI...'
              }
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateInsight();
                }
              }}
            />

            <div className="prompt-box-actions">
              <div className="action-icons-left">
                <span className="ollama-tag"><Icon name="spark" /> InsightAI Engine</span>
              </div>

              <button
                className="generate-insight-btn"
                onClick={() => handleGenerateInsight()}
                disabled={chatLoading || !chatPrompt.trim()}
              >
                {chatLoading ? 'Analyzing with InsightAI...' : 'Ask InsightAI'} <Icon name="spark" />
              </button>
            </div>
          </div>

          {chatHistory.length > 0 && (
            <div className="chat-history-feed">
              {chatHistory.map((item, index) => (
                <div key={index} className="chat-msg-card">
                  <div className="chat-msg-question">
                    <strong>Question:</strong> {item.q}
                  </div>
                  <div className="chat-msg-answer">
                    <Icon name="spark" />
                    <span>{item.a}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="smart-explorations-section">
            <div className="section-small-title">
              <Icon name="spark" /> SUGGESTED SMART EXPLORATIONS
            </div>

            <div className="explorations-grid">
              <div
                className="exploration-card"
                onClick={() =>
                  handleGenerateInsight(
                    uploadResult
                      ? `Provide an executive summary of key statistical patterns in ${uploadResult.filename}`
                      : 'Summarize overall data distribution'
                  )
                }
              >
                <div className="exp-icon"><Icon name="trend" /></div>
                <span className="exp-badge">Recommended</span>
                <h4 className="exp-title">Executive Summary</h4>
                <p className="exp-desc">
                  {uploadResult ? `Synthesize key trends and metrics across ${uploadResult.filename}` : 'Analyze key patterns'}
                </p>
              </div>

              <div
                className="exploration-card"
                onClick={() =>
                  handleGenerateInsight(
                    uploadResult
                      ? `Explain the distribution, outliers, and variance in '${firstCol}' and '${secondCol}'`
                      : 'Analyze column variance'
                  )
                }
              >
                <div className="exp-icon"><Icon name="chart" /></div>
                <h4 className="exp-title">Feature Distribution</h4>
                <p className="exp-desc">Investigate range and standard deviation across numerical attributes.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lab-sidebar-col">
          <div className="pinned-panel-card">
            <div className="pinned-panel-header">
              <h3>Active AI Findings</h3>
              <Icon name="pin" />
            </div>

            <div className="pinned-items-list">
              {uploadResult && uploadResult.insights && uploadResult.insights.length > 0 ? (
                uploadResult.insights.map((insight, idx) => (
                  <div key={idx} className="pinned-item blue-border">
                    <div className="pinned-meta blue-icon">
                      <Icon name="spark" /> InsightAI Finding #{idx + 1}
                    </div>
                    <p className="pinned-sub">{insight}</p>
                  </div>
                ))
              ) : (
                <div className="empty-pinned-notice">
                  <p>Upload a dataset to generate real-time pinned findings from InsightAI.</p>
                  <button className="small-action-btn" onClick={onUploadClick}>
                    Upload Dataset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Reports Archive Tab Component
   ============================================================ */
function ReportsArchiveTab({
  uploadResult,
  generatingReport,
  handleDownloadReport,
  onUploadClick,
}: {
  uploadResult: UploadResponse | null;
  generatingReport: 'pdf' | 'csv' | 'excel' | null;
  handleDownloadReport: (fmt: 'pdf' | 'csv' | 'excel') => void;
  onUploadClick: () => void;
}) {
  if (!uploadResult) {
    return (
      <div className="tab-view reports-archive-view anim-fade-in">
        <div className="view-header">
          <h1 className="view-title">Reports Archive</h1>
          <p className="view-description">Access automatically generated executive summaries and analytical reports.</p>
        </div>

        <div className="empty-reports-box">
          <Icon name="archive" />
          <h2>No Reports Generated Yet</h2>
          <p>Once you ingest a dataset, InsightAI will generate executive PDF summaries, normalized CSVs, and Excel audits.</p>
          <button className="primary-action-btn" onClick={onUploadClick}>
            <Icon name="upload" /> Upload Dataset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-view reports-archive-view anim-fade-in">
      <div className="view-header">
        <h1 className="view-title">Reports Archive</h1>
        <p className="view-description">
          Generated boardroom-ready executive summaries for <strong>{uploadResult.filename}</strong>.
        </p>
      </div>

      <div className="reports-archive-grid">
        {/* PDF Executive Report */}
        <div className="archive-report-card">
          <div className="arc-icon"><Icon name="file-text" /></div>
          <div className="arc-content">
            <h3>Executive AI Intelligence Brief</h3>
            <p>Comprehensive PDF report detailing dataset statistics, data quality audit, and InsightAI key drivers.</p>
            <span className="arc-date">Dataset: {uploadResult.filename}</span>
          </div>
          <button
            className="arc-download-btn"
            onClick={() => handleDownloadReport('pdf')}
            disabled={generatingReport === 'pdf'}
          >
            {generatingReport === 'pdf' ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>

        {/* Cleaned CSV Export */}
        <div className="archive-report-card">
          <div className="arc-icon"><Icon name="database" /></div>
          <div className="arc-content">
            <h3>Normalized Clean Dataset</h3>
            <p>Export preprocessed CSV with resolved missing values, deduplicated entries, and normalized headers.</p>
            <span className="arc-date">{uploadResult.row_count.toLocaleString()} Clean Rows</span>
          </div>
          <button
            className="arc-download-btn"
            onClick={() => handleDownloadReport('csv')}
            disabled={generatingReport === 'csv'}
          >
            {generatingReport === 'csv' ? 'Exporting CSV...' : 'Download Clean CSV'}
          </button>
        </div>

        {/* Excel XLSX Audit */}
        <div className="archive-report-card">
          <div className="arc-icon"><Icon name="chart" /></div>
          <div className="arc-content">
            <h3>Statistical Metrics &amp; Audit</h3>
            <p>Multi-tab Excel workbook containing full numeric distributions, quartiles, and correlation matrices.</p>
            <span className="arc-date">XLSX Format</span>
          </div>
          <button
            className="arc-download-btn"
            onClick={() => handleDownloadReport('excel')}
            disabled={generatingReport === 'excel'}
          >
            {generatingReport === 'excel' ? 'Exporting Excel...' : 'Download Excel Audit'}
          </button>
        </div>
      </div>
    </div>
  );
}
