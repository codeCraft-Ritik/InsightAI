import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export function Icon({ name, className = '', size }: IconProps) {
  const renderSvg = () => {
    switch (name) {
      case 'spark':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
            <path d="M19 14l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9L19 14z" />
          </svg>
        );
      case 'grid':
      case 'overview':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        );
      case 'database':
      case 'sources':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        );
      case 'flask':
      case 'insights-lab':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6" />
            <path d="M10 9V3" />
            <path d="M14 9V3" />
            <path d="M10 9L4.5 19.5C3.8 20.7 4.7 22 6.1 22h11.8c1.4 0 2.3-1.3 1.6-2.5L14 9z" />
            <path d="M7 16h10" />
          </svg>
        );
      case 'archive':
      case 'reports-archive':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" rx="1" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        );
      case 'plus':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        );
      case 'logout':
      case 'signout':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        );
      case 'search':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );
      case 'filter':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        );
      case 'dots':
      case 'more':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        );
      case 'lightbulb':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.62 2.96 1.63 4 .76.76 1.23 1.52 1.41 2.5" />
          </svg>
        );
      case 'pin':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14l-1.5-6H6.5L5 17z" />
            <path d="M9 11V4a3 3 0 0 1 6 0v7" />
          </svg>
        );
      case 'paperclip':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        );
      case 'mic':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'trend':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        );
      case 'file-text':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'upload':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v11" />
            <path d="M8 8l4-4 4 4" />
            <path d="M5 14v5h14v-5" />
          </svg>
        );
      case 'cloud':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 18h9.7a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6-1.5A3.8 3.8 0 0 0 7.5 18z" />
          </svg>
        );
      case 'sql':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5.5" rx="7" ry="3.5" />
            <path d="M5 5.5v9c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-9" />
            <path d="M5 10.5c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5" />
          </svg>
        );
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19h16" />
            <path d="M6 15V9" />
            <path d="M11 15V6" />
            <path d="M16 15v-5" />
          </svg>
        );
      case 'pie':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        );
      case 'report':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h7l5 5v13H7z" />
            <path d="M14 3v5h5" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
        );
      case 'chat':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v10H8l-4 4z" />
          </svg>
        );
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.9a7.8 7.8 0 0 0-1.8-1l-.4-2.6H9.7L9.3 5.9a7.8 7.8 0 0 0-1.8 1L5 6l-2 3.5 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.9c.6.4 1.2.7 1.8 1l.4 2.6h4.6l.4-2.6c.6-.3 1.2-.6 1.8-1l2.4.9 2-3.5-2-1.5c.1-.3.1-.6.1-1z" />
          </svg>
        );
      case 'bell':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17h12l-1.5-2V11a4.5 4.5 0 0 0-9 0v4z" />
            <path d="M10 18a2 2 0 0 0 4 0" />
          </svg>
        );
      case 'user':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        );
      case 'menu':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        );
      case 'shield':
      case 'check':
      case 'check-circle':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'chevron-left':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        );
      case 'chevron-right':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        );
      case 'eye':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case 'eye-off':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        );
      case 'gauge':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M20 12h2" />
            <path d="M17.66 6.34l1.41-1.41" />
            <path d="M2 12h2" />
            <path d="M20.66 17.66A9.97 9.97 0 0 0 22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 2.14.67 4.12 1.82 5.74" />
            <path d="M13.41 10.59l4.95-4.95" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case 'table':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        );
      case 'correlation':
      case 'layers':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        );
      case 'anomaly':
      case 'warning':
      case 'alert':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'expand':
      case 'fullscreen':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        );
      case 'minimize':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        );
      case 'download':
      case 'download-image':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );
      case 'sort-asc':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        );
      case 'sort-desc':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        );
      case 'brain':
      case 'ml':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z" />
          </svg>
        );
      case 'refresh':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      case 'copy':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        );
      default:
        return null;
    }
  };

  const svgContent = renderSvg();
  if (!svgContent) return null;

  return (
    <span
      className={`app-icon-wrap icon-${name} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size ? (typeof size === 'number' ? `${size}px` : size) : '1.2em',
        height: size ? (typeof size === 'number' ? `${size}px` : size) : '1.2em',
        verticalAlign: 'middle',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {React.cloneElement(svgContent, {
        style: { width: '100%', height: '100%', display: 'block' },
      })}
    </span>
  );
}
