import React from 'react';

/**
 * Skeleton shimmer placeholder.
 * Props:
 *   w  – width  (CSS value, default '100%')
 *   h  – height (CSS value, default '14px')
 *   r  – border-radius (CSS value, default 'var(--r-sm)')
 *   className – extra classes
 */
export function Skeleton({ w = '100%', h = '14px', r = 'var(--r-sm)', className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
      aria-hidden="true"
    />
  );
}

/** A pre-built skeleton card matching a StatCard's dimensions */
export function SkeletonStatCard() {
  return (
    <div className="stat-card-widget">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton w="40px" h="40px" r="var(--r-md)" />
        <Skeleton w="56px" h="20px" />
      </div>
      <Skeleton w="50%" h="32px" r="var(--r-sm)" />
      <Skeleton w="70%" h="12px" />
    </div>
  );
}

/** A pre-built skeleton for a list row */
export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', padding: 'var(--sp-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <Skeleton w="36px" h="36px" r="var(--r-full)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton w="60%" h="14px" />
        <Skeleton w="40%" h="11px" />
      </div>
      <Skeleton w="64px" h="22px" r="var(--r-full)" />
    </div>
  );
}

export default Skeleton;
