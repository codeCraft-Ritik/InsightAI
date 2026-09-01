import { useState } from 'react';
import type { AuthMode, Gender, SignupResponse, User, AuthResponse } from './types';
import { registerAccount, login, verifyOtp, resendOtp, forgotPassword, verifyResetOtp, resetPassword } from './api';
import { Icon } from './Icon';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: User) => void;
  onBack: () => void;
}

const defaultPassword = import.meta.env.VITE_DEMO_PASSWORD ?? '';

export function AuthPage({ onAuthSuccess, onBack }: AuthPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Form State
  const [signupName, setSignupName] = useState('');
  const [signupAge, setSignupAge] = useState('');
  const [signupGender, setSignupGender] = useState<Gender>('Male');
  const [signupLocation, setSignupLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup OTP State
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingSignup, setPendingSignup] = useState<SignupResponse | null>(null);

  // Forgot Password State
  type ResetStep = 'request' | 'otp' | 'newpass';
  const [forgotMode, setForgotMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI State
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  function clearMessages() { setError(''); setStatus(''); }

  function switchTab(mode: AuthMode) {
    setAuthMode(mode);
    setPassword('');
    setShowPassword(false);
    clearMessages();
  }

  function openForgot() {
    setForgotMode(true);
    setResetStep('request');
    setResetEmail(email);
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    clearMessages();
  }

  function closeForgot() {
    setForgotMode(false);
    setResetStep('request');
    clearMessages();
  }

  async function handleAuth() {
    setIsBusy(true);
    clearMessages();
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) throw new Error('Email is required.');
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');

      if (authMode === 'signup') {
        const name = signupName.trim();
        const age = Number(signupAge);
        const location = signupLocation.trim();
        if (name.length < 2) throw new Error('Name is required.');
        if (!Number.isFinite(age) || age < 13 || age > 120) throw new Error('Age must be between 13 and 120.');
        if (!location) throw new Error('Location is required.');

        const signupResponse = await registerAccount({ name, age, gender: signupGender, email: trimmedEmail, location, password });
        setPendingSignup(signupResponse);
        setPendingEmail(trimmedEmail);
        setOtp('');
        setStatus(signupResponse.message);
        setAuthMode('login');
      } else {
        const authResponse: AuthResponse = await login(trimmedEmail, password);
        onAuthSuccess(authResponse.access_token, authResponse.user);
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Authentication failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!pendingEmail) { setError('Create an account first.'); return; }
    if (otp.trim().length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setIsBusy(true);
    clearMessages();
    try {
      const authResponse = await verifyOtp(pendingEmail, otp.trim());
      setPendingSignup(null);
      onAuthSuccess(authResponse.access_token, authResponse.user);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'OTP verification failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResendOtp() {
    if (!pendingEmail) { setError('Create an account first.'); return; }
    setIsBusy(true);
    clearMessages();
    try {
      const result = await resendOtp(pendingEmail, password);
      setPendingSignup(result);
      setOtp('');
      setStatus(result.message);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Unable to resend OTP');
    } finally {
      setIsBusy(false);
    }
  }

  // ── Forgot-password handlers ────────────────────────────────────
  async function handleForgotRequest() {
    const trimmed = resetEmail.trim();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    setIsBusy(true);
    clearMessages();
    try {
      const res = await forgotPassword(trimmed);
      setStatus(res.message);
      setResetStep('otp');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Failed to send reset code');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerifyResetOtp() {
    if (resetOtp.trim().length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setIsBusy(true);
    clearMessages();
    try {
      await verifyResetOtp(resetEmail.trim(), resetOtp.trim());
      setResetStep('newpass');
      setStatus('Code verified! Choose your new password.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Invalid or expired code');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    setIsBusy(true);
    clearMessages();
    try {
      const res = await resetPassword(resetEmail.trim(), resetOtp.trim(), newPassword);
      setStatus(res.message);
      setTimeout(() => { setForgotMode(false); setResetStep('request'); setPassword(''); clearMessages(); }, 2200);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Failed to reset password');
    } finally {
      setIsBusy(false);
    }
  }

  const authButtonLabel = isBusy ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account';

  return (
    <main className="auth-page-container anim-fade-in">
      {/* Left side: Form */}
      <section className="auth-form-section anim-slide-right">
        <button className="auth-back-button" onClick={onBack} aria-label="Go back">
          <Icon name="chevron-left" /> Back
        </button>

        <div className="auth-form-wrapper anim-fade-up delay-1">
          <div className="auth-brand">
            <span className="brand-mark"><Icon name="spark" /></span>
            <span className="brand-name">InsightAI</span>
          </div>

          {/* ── FORGOT PASSWORD FLOW ── */}
          {forgotMode ? (
            <div className="auth-forgot-flow">
              <button className="auth-back-link" onClick={closeForgot}>
                <Icon name="chevron-left" /> Back to Sign In
              </button>

              {resetStep === 'request' && (
                <>
                  <div className="auth-header">
                    <h1>Reset your password</h1>
                    <p>Enter your account email and we'll send you a 6-digit reset code.</p>
                  </div>
                  {error && <div className="auth-alert error">{error}</div>}
                  {status && <div className="auth-alert success">{status}</div>}
                  <div className="auth-form-fields">
                    <label>
                      Email address
                      <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="analyst@company.com" autoComplete="email" />
                    </label>
                  </div>
                  <button className="auth-primary-btn" onClick={handleForgotRequest} disabled={isBusy}>
                    {isBusy ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </>
              )}

              {resetStep === 'otp' && (
                <>
                  <div className="auth-header">
                    <h1>Check your inbox</h1>
                    <p>We sent a 6-digit code to <strong>{resetEmail}</strong>. Enter it below.</p>
                  </div>
                  {error && <div className="auth-alert error">{error}</div>}
                  {status && <div className="auth-alert success">{status}</div>}
                  <div className="auth-form-fields">
                    <label>
                      Reset Code
                      <input value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} className="otp-input" />
                    </label>
                  </div>
                  <div className="auth-otp-actions">
                    <button className="auth-primary-btn" onClick={handleVerifyResetOtp} disabled={isBusy}>
                      {isBusy ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button className="auth-secondary-btn" onClick={handleForgotRequest} disabled={isBusy}>
                      Resend Code
                    </button>
                  </div>
                </>
              )}

              {resetStep === 'newpass' && (
                <>
                  <div className="auth-header">
                    <h1>Set new password</h1>
                    <p>Choose a strong password for your account.</p>
                  </div>
                  {error && <div className="auth-alert error">{error}</div>}
                  {status && <div className="auth-alert success">{status}</div>}
                  <div className="auth-form-fields">
                    <label>
                      New Password
                      <div className="password-input-wrap">
                        <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} />
                        <button type="button" className="toggle-password-btn" onClick={() => setShowNewPassword((v) => !v)} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                          <Icon name={showNewPassword ? 'eye-off' : 'eye'} />
                        </button>
                      </div>
                    </label>
                    <label>
                      Confirm New Password
                      <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" minLength={8} />
                    </label>
                  </div>
                  <button className="auth-primary-btn" onClick={handleResetPassword} disabled={isBusy}>
                    {isBusy ? 'Saving...' : 'Save New Password'}
                  </button>
                </>
              )}
            </div>

          ) : !pendingSignup ? (
            /* ── MAIN LOGIN / SIGNUP FORM ── */
            <>
              <div className="auth-header">
                <h1>{authMode === 'login' ? 'Welcome back' : 'Create an account'}</h1>
                <p>{authMode === 'login' ? 'Enter your details to access your workspace.' : 'Join InsightAI to unlock autonomous data analysis.'}</p>
              </div>

              <div className="auth-tabs">
                <button className={authMode === 'login' ? 'active' : ''} onClick={() => switchTab('login')}>Log In</button>
                <button className={authMode === 'signup' ? 'active' : ''} onClick={() => switchTab('signup')}>Sign Up</button>
              </div>

              {error && <div className="auth-alert error">{error}</div>}
              {status && <div className="auth-alert success">{status}</div>}

              <div className="auth-form-fields">
                {authMode === 'signup' && (
                  <div className="auth-form-grid-2">
                    <label>Name<input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="John Doe" autoComplete="name" /></label>
                    <label>Age<input type="number" value={signupAge} onChange={(e) => setSignupAge(e.target.value)} placeholder="25" min={13} max={120} /></label>
                    <label>Gender<select value={signupGender} onChange={(e) => setSignupGender(e.target.value as Gender)}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
                    <label>Location<input value={signupLocation} onChange={(e) => setSignupLocation(e.target.value)} placeholder="New York, USA" /></label>
                  </div>
                )}

                <label>
                  Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@company.com" autoComplete="email" />
                </label>

                <label>
                  Password
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      minLength={8}
                    />
                    <button type="button" className="toggle-password-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      <Icon name={showPassword ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                </label>
              </div>

              {authMode === 'login' && (
                <div className="auth-forgot-row">
                  <button type="button" className="forgot-password-link" onClick={openForgot}>Forgot password?</button>
                </div>
              )}

              <button className="auth-primary-btn" onClick={handleAuth} disabled={isBusy}>{authButtonLabel}</button>
            </>

          ) : (
            /* ── SIGNUP OTP VERIFICATION ── */
            <div className="auth-otp-step">
              <div className="auth-header">
                <h1>Verify your email</h1>
                <p>Complete your registration for <strong>{pendingEmail}</strong>.</p>
              </div>

              {/* RENDER CLOUD DEMO OTP POP-UP CARD */}
              {(pendingSignup?.otp_code || '123456') && (
                <div className="otp-demo-popup-card">
                  <div className="otp-demo-popup-top">
                    <div className="otp-demo-badge">
                      <Icon name="spark" /> RENDER CLOUD LIVE NOTICE
                    </div>
                  </div>
                  <p className="otp-demo-cloud-note">
                    <strong>Render Free Tier Note:</strong> Because Render's cloud container restricts outbound email ports, your 6-digit verification code is generated directly below for instant access:
                  </p>
                  <div className="otp-demo-digits-row">
                    {(pendingSignup?.otp_code || '123456').split('').map((digit, idx) => (
                      <div key={idx} className="otp-demo-digit">{digit}</div>
                    ))}
                  </div>
                  <div className="otp-demo-actions-row">
                    <button
                      type="button"
                      className="otp-demo-fill-btn"
                      onClick={() => {
                        const code = pendingSignup?.otp_code || '123456';
                        setOtp(code);
                        setCopiedOtp(true);
                        setTimeout(() => setCopiedOtp(false), 2000);
                      }}
                    >
                      <Icon name="spark" /> Auto-Fill Code
                    </button>
                    <button
                      type="button"
                      className="otp-demo-copy-btn"
                      onClick={() => {
                        const code = pendingSignup?.otp_code || '123456';
                        navigator.clipboard.writeText(code);
                        setCopiedOtp(true);
                        setTimeout(() => setCopiedOtp(false), 2000);
                      }}
                    >
                      {copiedOtp ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              )}

              {error && <div className="auth-alert error">{error}</div>}
              {status && !error && <div className="auth-alert success">{status}</div>}

              <div className="auth-form-fields">
                <label>Verification Code<input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} className="otp-input" autoFocus /></label>
              </div>
              <div className="auth-otp-actions">
                <button className="auth-primary-btn" onClick={handleVerifyOtp} disabled={isBusy}>Verify &amp; Continue</button>
                <button className="auth-secondary-btn" onClick={handleResendOtp} disabled={isBusy}>Resend Code</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right side: Visual */}

      <section className="auth-visual-section anim-fade-scale">
        <div className="auth-visual-content anim-fade-up delay-2">
          <div className="auth-visual-badge"><Icon name="spark" /> AUTONOMOUS ENGINE</div>
          <h2>Transform Data into Strategy</h2>
          <p>InsightAI automates data cleaning, builds predictive models, and generates boardroom-ready reports in seconds.</p>
          <div className="auth-visual-graphic">
            <div className="graphic-circle graphic-circle-1"></div>
            <div className="graphic-circle graphic-circle-2"></div>
            <div className="graphic-circle graphic-circle-3"></div>
            <div className="graphic-glass-card">
              <div className="glass-row">
                <div className="glass-icon"><Icon name="upload" /></div>
                <div><div className="glass-title">Data Ingested</div><div className="glass-sub">1M+ Rows Processed</div></div>
              </div>
              <div className="glass-row">
                <div className="glass-icon accent"><Icon name="spark" /></div>
                <div><div className="glass-title">Insights Found</div><div className="glass-sub">4 Key Drivers Identified</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
