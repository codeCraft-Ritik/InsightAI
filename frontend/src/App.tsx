import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { AuthPage } from './AuthPage';
import { DashboardPage } from './DashboardPage';
import type { User } from './types';

export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('insightai-token'));
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('insightai-user');
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  // Persisting wrapper — always keeps localStorage in sync
  function setUser(u: User | null) {
    setUserState(u);
    if (u) {
      localStorage.setItem('insightai-user', JSON.stringify(u));
    } else {
      localStorage.removeItem('insightai-user');
    }
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<IntroPage token={token} />} />
        <Route path="/auth" element={<AuthRoute token={token} setToken={setToken} setUser={setUser} />} />
        <Route path="/dashboard" element={
          token ? <DashboardRoute user={user} token={token} setToken={setToken} setUser={setUser} /> : <Navigate to="/auth" />
        } />
        <Route path="/dashboard-preview" element={<DashboardPage user={null} token="preview" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function IntroPage({ token }: { token: string | null }) {
  const navigate = useNavigate();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Icon name="spark" /></span>
          <span className="brand-name">InsightAI</span>
        </div>
        <div className="topbar-actions">
          <button className="text-button" type="button" onClick={() => navigate('/auth')}>
            Sign In
          </button>
          <button className="primary-button" type="button" onClick={() => navigate('/auth')}>
            Get Started
          </button>
        </div>
      </header>

      <main className="intro-main">
        <div className="intro-hero">
          {/* Floating particles */}
          <div className="intro-particles">
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} className="intro-particle" />
            ))}
          </div>

          <div className="intro-container intro-hero-grid">
            <div className="intro-hero-copy">
              <span className="intro-eyebrow">Enterprise Intelligence</span>
              <h1>Stop searching for answers. Let the data speak.</h1>
              <p>
                InsightAI is the autonomous engine that turns raw datasets into
                executive-grade decisions. No coding, no complex queries. Just 
                upload and uncover what matters.
              </p>
              <div className="intro-cta-row">
                <button className="primary-button intro-get-started" type="button" onClick={() => navigate('/auth')}>
                  Get Started for Free
                </button>
                <button className="secondary-button intro-demo-button" type="button" onClick={() => navigate('/auth')}>
                  Request a Demo
                </button>
              </div>
            </div>

            <div className="intro-hero-visual">
              <div className="intro-visual-backdrop"></div>
              <div className="intro-chart-wrap" aria-label="Revenue velocity chart">
                <div className="intro-chart-tooltip">
                  <span className="intro-growth-pill">+24% Growth Peak</span>
                </div>
                <div className="intro-chart-bars">
                  {[45, 60, 50, 95, 65].map((height, index) => (
                    <span
                      key={index}
                      className={index === 3 ? 'intro-bar intro-bar-accent' : 'intro-bar'}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="intro-recommendation">
                <div className="intro-reco-icon"><Icon name="spark" /></div>
                <p>
                  <strong>Autonomous Recommendation</strong>
                  <span>
                    &ldquo;Detected a pattern of churn in Enterprise Segment B. Reallocating marketing spend to Retention
                    Campaign 2 could yield a 12% increase in ARR.&rdquo;
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Live Stats Counter */}
          <div className="intro-container">
            <div className="intro-stats-bar">
              <div className="stat-counter">
                <span className="stat-counter-val">500<span className="accent">+</span></span>
                <span className="stat-counter-label">Enterprises Powered</span>
              </div>
              <div className="stat-counter">
                <span className="stat-counter-val">1.2<span className="accent">M+</span></span>
                <span className="stat-counter-label">Data Points Analyzed</span>
              </div>
              <div className="stat-counter">
                <span className="stat-counter-val">98<span className="accent">%</span></span>
                <span className="stat-counter-label">Prediction Accuracy</span>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="intro-container">
            <section className="intro-how-it-works">
              <h2>How It Works</h2>
              <p>Three simple steps to transform your data into actionable intelligence.</p>
              <div className="how-steps">
                <div className="how-step">
                  <div className="how-step-icon"><Icon name="upload" /></div>
                  <h3>Upload Your Data</h3>
                  <p>Drop a CSV, Excel, or JSON file. Our AI handles the rest — cleaning, normalizing, and structuring.</p>
                </div>
                <div className="how-step">
                  <div className="how-step-icon"><Icon name="spark" /></div>
                  <h3>AI Analyzes &amp; Learns</h3>
                  <p>Autonomous agents run EDA, train ML models, detect patterns, and surface hidden correlations.</p>
                </div>
                <div className="how-step">
                  <div className="how-step-icon"><Icon name="report" /></div>
                  <h3>Get Actionable Insights</h3>
                  <p>Receive executive-ready reports, interactive visualizations, and strategic recommendations instantly.</p>
                </div>
              </div>
            </section>
          </div>

          <div className="intro-container">
            <section className="intro-feature-block">
              <h2>Enterprise Intelligence,<br />Simplified</h2>

              <div className="intro-feature-list">
                <article className="intro-feature-card">
                  <div className="intro-feature-icon"><Icon name="spark" /></div>
                  <div>
                    <h3>Auto-Cleaning &amp; Prep</h3>
                    <p>Forget spreadsheets. Our AI automatically detects anomalies, handles missing data, and normalizes sets in seconds.</p>
                  </div>
                </article>

                <article className="intro-feature-card">
                  <div className="intro-feature-icon"><Icon name="chat" /></div>
                  <div>
                    <h3>Instant ML Training</h3>
                    <p>Deploy predictive models without a PhD. Choose your goal, and InsightAI handles the feature engineering and selection.</p>
                  </div>
                </article>

                <article className="intro-feature-card">
                  <div className="intro-feature-icon"><Icon name="report" /></div>
                  <div>
                    <h3>Business Reports</h3>
                    <p>Beautiful, executive-ready reports generated automatically. Narrative summaries that explain the &ldquo;why&rdquo; behind the numbers.</p>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>

        <section className="intro-callout">
          <div className="intro-container">
            <h2>Ready to Outpace the<br />Competition?</h2>
            <p>Join 500+ enterprises using InsightAI<br />to drive smarter decisions every single<br />day.</p>

            <div className="intro-cta-row">
              <button className="primary-button intro-get-started-alt" type="button" onClick={() => navigate('/auth')}>
                Get Started for Free
              </button>
              <button className="secondary-button intro-demo-button" type="button" onClick={() => navigate('/auth')}>
                Request a Demo
              </button>
            </div>
          </div>
        </section>

        <footer className="intro-footer">
          <div className="intro-brand intro-brand-footer">
            <span className="brand-mark intro-brand-mark"><Icon name="spark" /></span>
            <span className="intro-brand-name">InsightAI</span>
          </div>

          <div className="intro-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Security</a>
            <a href="#">API Documentation</a>
          </div>

          <div className="intro-copyright">© 2024 InsightAI Autonomous Intelligence. All rights reserved.</div>
        </footer>
      </main>
    </>
  );
}

function AuthRoute({ token, setToken, setUser }: { 
  token: string | null, 
  setToken: (t: string) => void, 
  setUser: (u: User) => void 
}) {
  const navigate = useNavigate();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthPage 
      onAuthSuccess={(newToken, newUser) => {
        localStorage.setItem('insightai-token', newToken);
        setToken(newToken);
        setUser(newUser);
        navigate('/dashboard');
      }}
      onBack={() => navigate('/')}
    />
  );
}

function DashboardRoute({ user, token, setToken, setUser }: {
  user: User | null,
  token: string,
  setToken: (t: string | null) => void,
  setUser: (u: User | null) => void
}) {
  const navigate = useNavigate();

  function handleSignOut() {
    localStorage.removeItem('insightai-token');
    setToken(null as unknown as string);
    setUser(null);
    navigate('/');
  }

  return (
    <DashboardPage user={user} token={token} onSignOut={handleSignOut} />
  );
}

export default App;
