import React from 'react';

const MetricCard = ({ title, value, unit, icon: Icon, trend, colorClass = "cyan" }) => {
  return (
    <div className={`metric-card glass-panel metric-${colorClass}`}>
      <div className="metric-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div className="status-pulse-success" style={{margin: 0, width: '6px', height: '6px'}}></div>
          <h3 className="metric-title">{title}</h3>
        </div>
        <div className="metric-icon">
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-body">
        <div className="metric-value">
          {value} <span className="metric-unit">{unit}</span>
        </div>
        {trend && (
          <div className={`metric-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
