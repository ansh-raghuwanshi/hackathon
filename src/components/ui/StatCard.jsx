import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard – KPI widget for dashboards.
 *
 * Props:
 *   icon      – Lucide icon component
 *   label     – string below the number
 *   value     – number or string
 *   accentColor – CSS color for bottom bar & icon bg (default: var(--primary))
 *   trend     – 'up' | 'down' | 'neutral' (optional)
 *   trendLabel – string describing the trend (optional)
 *   danger    – if true, applies danger color accent
 *   onClick   – optional click handler
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  accentColor,
  trend,
  trendLabel,
  danger = false,
  onClick,
}) {
  const color = danger ? 'var(--danger)' : (accentColor || 'var(--primary)');
  const bgColor = danger ? 'var(--danger-bg)' : (accentColor
    ? `${accentColor}18`
    : 'var(--primary-light)');

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-subtle)';

  return (
    <div
      className="stat-card-widget"
      style={{ '--stat-accent': color, '--stat-accent-bg': bgColor, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="stat-icon-wrap" style={{ '--stat-accent-bg': bgColor }}>
          {Icon && <Icon size={20} style={{ color }} />}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: trendColor }}>
            <TrendIcon size={14} />
            {trendLabel && <span>{trendLabel}</span>}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>
          {value ?? 0}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
