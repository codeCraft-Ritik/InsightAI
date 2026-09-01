import React, { useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import { Icon } from './Icon';

// Create custom Plotly component using the dist-min build
const Plot = createPlotlyComponent(Plotly);

interface PlotRendererProps {
  figure: Record<string, any>;
  title?: string;
  description?: string;
  height?: number | string;
  className?: string;
  allowFullscreen?: boolean;
}

export function PlotRenderer({
  figure,
  title,
  description,
  height = 420,
  className = '',
  allowFullscreen = true,
}: PlotRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!figure || !figure.data) {
    return (
      <div className="plot-fallback-box">
        <Icon name="chart" />
        <p>No visualization data available for this chart type.</p>
      </div>
    );
  }

  // Ensure dark/responsive layout defaults
  const layout = {
    autosize: true,
    height: isFullscreen ? undefined : typeof height === 'number' ? height : 420,
    paper_bgcolor: 'rgba(15, 23, 42, 0.95)',
    plot_bgcolor: 'rgba(15, 23, 42, 0.85)',
    font: { family: 'Inter, system-ui, sans-serif', color: '#cbd5e1', size: 12 },
    margin: { l: 55, r: 25, t: 45, b: 45 },
    ...figure.layout,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: (title || 'insightai_chart').toLowerCase().replace(/\s+/g, '_'),
      height: 800,
      width: 1200,
      scale: 2,
    },
    ...figure.config,
  };

  return (
    <div className={`plot-renderer-container ${isFullscreen ? 'plot-fullscreen-overlay' : ''} ${className}`}>
      <div className="plot-header-bar">
        <div className="plot-titles">
          {title && <h3 className="plot-main-title">{title}</h3>}
          {description && <p className="plot-description-text">{description}</p>}
        </div>
        <div className="plot-controls-right">
          {allowFullscreen && (
            <button
              className="plot-control-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
              type="button"
            >
              <Icon name={isFullscreen ? 'minimize' : 'fullscreen'} />
              <span>{isFullscreen ? 'Exit' : 'Expand'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="plot-chart-area" style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}>
        <Plot
          data={figure.data}
          layout={layout}
          config={config}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
