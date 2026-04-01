import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Activity, Flame, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';

// Fix leaflet default marker paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Per-category colour palette ───────────────────────────────────────
const CATEGORY_COLORS = {
  Roads:       { pin: '#475569', heat: { 0.2: '#94a3b8', 0.6: '#64748b', 1.0: '#1e293b' }, emoji: '🛣️'  },
  Water:       { pin: '#3b82f6', heat: { 0.2: '#93c5fd', 0.6: '#3b82f6', 1.0: '#1d4ed8' }, emoji: '💧'  },
  Electricity: { pin: '#06b6d4', heat: { 0.2: '#a5f3fc', 0.6: '#06b6d4', 1.0: '#0e7490' }, emoji: '⚡'  },
  Sanitation:  { pin: '#22c55e', heat: { 0.2: '#86efac', 0.6: '#22c55e', 1.0: '#15803d' }, emoji: '🌿'  },
  Noise:       { pin: '#a855f7', heat: { 0.2: '#d8b4fe', 0.6: '#a855f7', 1.0: '#7e22ce' }, emoji: '🔊'  },
  Other:       { pin: '#f59e0b', heat: { 0.2: '#fde68a', 0.6: '#f59e0b', 1.0: '#b45309' }, emoji: '📌'  },
};
const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

const URGENCY_WEIGHT = { High: 1.0, Medium: 0.6, Low: 0.3 };

// ── One leaflet.heat layer per category ──────────────────────────────
function CategoryHeatLayer({ complaints, category, visible }) {
  const map      = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    const points = complaints
      .filter(c => c.lat && c.lng && (c.category || 'Other') === category)
      .map(c => [parseFloat(c.lat), parseFloat(c.lng), URGENCY_WEIGHT[c.urgency] ?? 0.5]);

    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }

    if (visible && points.length > 0) {
      layerRef.current = L.heatLayer(points, {
        radius: 35, blur: 22, maxZoom: 17, max: 1.0,
        gradient: CATEGORY_COLORS[category]?.heat || CATEGORY_COLORS.Other.heat,
      }).addTo(map);
    }

    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
  }, [map, complaints, category, visible]);

  return null;
}

// ── Auto-center on data load ──────────────────────────────────────────
function AutoCenter({ center }) {
  const map      = useMap();
  const didCenter = useRef(false);
  useEffect(() => {
    if (!didCenter.current && center) { map.setView(center, 12); didCenter.current = true; }
  }, [map, center]);
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────
export default function MapPage() {
  const [complaints,       setComplaints]       = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showHeatmap,      setShowHeatmap]      = useState(true);
  const [activeCategories, setActiveCategories] = useState(new Set(ALL_CATEGORIES));

  useEffect(() => {
    const q    = query(collection(db, 'Complaints'));
    const unsub = onSnapshot(q, snap => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.lat && c.lng));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const mapCenter = React.useMemo(() => {
    if (complaints.length === 0) return [20.5937, 78.9629];
    const avgLat = complaints.reduce((s, c) => s + parseFloat(c.lat), 0) / complaints.length;
    const avgLng = complaints.reduce((s, c) => s + parseFloat(c.lng), 0) / complaints.length;
    return [avgLat, avgLng];
  }, [complaints]);

  const toggleCategory = cat => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const visibleComplaints = complaints.filter(c => activeCategories.has(c.category || 'Other'));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
        <Flame size={40} style={{ color: 'var(--primary)', opacity: 0.7 }} />
        <p className="text-muted">Loading map data…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 'calc(100vh - 72px)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapIcon size={28} color="var(--primary)" />
          <div>
            <h2 style={{ margin: 0, marginBottom: 2 }}>City Analytics Map</h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {visibleComplaints.length} complaints plotted · colour-coded by category
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowHeatmap(false)}
            style={!showHeatmap ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}}
          >
            <MapPin size={16} /> Pins
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowHeatmap(true)}
            style={showHeatmap ? {} : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <Flame size={16} /> Heatmap
          </button>
        </div>
      </div>

      {/* ── Category filter chips ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
          Filter:
        </span>
        <button
          onClick={() => setActiveCategories(activeCategories.size === ALL_CATEGORIES.length ? new Set() : new Set(ALL_CATEGORIES))}
          style={{
            padding: '4px 12px', borderRadius: 'var(--r-full)', fontSize: '0.8125rem', fontWeight: 700,
            border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface-2)',
            color: 'var(--text-muted)', fontFamily: 'inherit',
          }}
        >
          {activeCategories.size === ALL_CATEGORIES.length ? 'Deselect All' : 'Select All'}
        </button>
        {ALL_CATEGORIES.map(cat => {
          const meta   = CATEGORY_COLORS[cat];
          const active = activeCategories.has(cat);
          const count  = complaints.filter(c => (c.category || 'Other') === cat).length;
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--r-full)', fontSize: '0.8125rem', fontWeight: 600,
                border:      `1.5px solid ${active ? meta.pin : 'var(--border)'}`,
                background:  active ? `${meta.pin}18` : 'var(--surface-2)',
                color:       active ? meta.pin : 'var(--text-subtle)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: count === 0 ? 0.4 : 1,
              }}
            >
              {meta.emoji} {cat}
              <span style={{
                background: active ? meta.pin : 'var(--border)',
                color: '#fff', fontSize: '0.6875rem', fontWeight: 700,
                padding: '0px 5px', borderRadius: 'var(--r-full)', minWidth: 18, textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Map container ── */}
      <div style={{
        flex: 1, borderRadius: 'var(--r-xl)', overflow: 'hidden',
        position: 'relative', minHeight: 560,
        boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)',
      }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', minHeight: 560 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <AutoCenter center={mapCenter} />

          {/* One heatmap layer per category */}
          {showHeatmap && ALL_CATEGORIES.map(cat => (
            <CategoryHeatLayer
              key={cat} complaints={complaints} category={cat}
              visible={activeCategories.has(cat)}
            />
          ))}

          {/* Coloured circle-pin markers */}
          {!showHeatmap && visibleComplaints.map(c => {
            const meta   = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other;
            const radius = c.urgency === 'High' ? 10 : c.urgency === 'Medium' ? 8 : 6;
            return (
              <CircleMarker
                key={c.id}
                center={[parseFloat(c.lat), parseFloat(c.lng)]}
                radius={radius}
                pathOptions={{ color: meta.pin, fillColor: meta.pin, fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{c.title}</strong>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: 8 }}>{c.locationText}</p>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: `${meta.pin}20`, color: meta.pin,
                        fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${meta.pin}40`,
                      }}>{c.category}</span>
                      <span className="badge badge-status"   data-status={c.status}>{c.status}</span>
                      <span className="badge badge-priority" data-priority={c.urgency}>{c.urgency}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* ── Side analytics panel ── */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000, width: 224,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--r-lg)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          border: '1px solid #e2e8f0', padding: '14px 16px',
        }}>
          <h4 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a', fontSize: '0.875rem' }}>
            <Activity size={15} color="var(--primary)" /> Category Breakdown
          </h4>

          {ALL_CATEGORIES.map(cat => {
            const meta  = CATEGORY_COLORS[cat];
            const count = complaints.filter(c => (c.category || 'Other') === cat).length;
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: meta.pin, flexShrink: 0,
                  boxShadow: `0 0 5px ${meta.pin}70`,
                }} />
                <span style={{ fontSize: '0.8125rem', color: '#475569', flex: 1 }}>{meta.emoji} {cat}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{count}</span>
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
              <span>High Priority</span>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>{complaints.filter(c => c.urgency === 'High').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
              <span>Resolved</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{complaints.filter(c => c.status === 'Resolved').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
              <span>Total Mapped</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{complaints.length}</span>
            </div>
          </div>

          {/* Colour gradient key (heatmap mode only) */}
          {showHeatmap && (
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 10, paddingTop: 10 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 8 }}>
                Colour Key
              </p>
              {ALL_CATEGORIES.filter(cat => activeCategories.has(cat)).map(cat => {
                const meta = CATEGORY_COLORS[cat];
                const vals = Object.values(meta.heat);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: `linear-gradient(to right, ${vals[0]}, ${vals[1]}, ${vals[2]})`,
                    }} />
                    <span style={{ fontSize: '0.72rem', color: '#475569', whiteSpace: 'nowrap' }}>{meta.emoji} {cat}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty state */}
        {visibleComplaints.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '24px 32px', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-4)', textAlign: 'center' }}>
              <MapPin size={36} style={{ color: 'var(--primary)', opacity: 0.5, margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>No complaints visible</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Try enabling more categories above.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
