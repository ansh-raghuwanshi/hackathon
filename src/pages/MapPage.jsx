import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Layers, Activity, Flame, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Priority weights for heatmap intensity
const URGENCY_WEIGHT = { High: 1.0, Medium: 0.6, Low: 0.3 };

/**
 * Inner component that manages the leaflet.heat layer.
 * Must be a child of MapContainer so it can access the map instance via useMap().
 */
function HeatmapLayer({ complaints, visible }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    // Build heatmap points: [lat, lng, intensity]
    const points = complaints
      .filter(c => c.lat && c.lng)
      .map(c => [
        parseFloat(c.lat),
        parseFloat(c.lng),
        URGENCY_WEIGHT[c.urgency] ?? 0.5,
      ]);

    // Remove existing layer first
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (visible && points.length > 0) {
      heatLayerRef.current = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.2: '#4ade80',   // green – low density
          0.5: '#facc15',   // yellow – medium
          0.75: '#f97316',  // orange – high
          1.0: '#ef4444',   // red – very high
        },
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, complaints, visible]);

  return null;
}

/**
 * Re-centers the map whenever complaint data loads so it doesn't stay on a hard-coded location.
 */
function AutoCenter({ center }) {
  const map = useMap();
  const didCenter = useRef(false);

  useEffect(() => {
    if (!didCenter.current && center) {
      map.setView(center, 12);
      didCenter.current = true;
    }
  }, [map, center]);

  return null;
}

export default function MapPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'Complaints'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        // Only keep complaints that have real GPS coordinates
        .filter(item => item.lat && item.lng);

      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error('Firestore error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Derive a smart map center from actual complaint data
  // Falls back to centre of India if no data yet
  const mapCenter = React.useMemo(() => {
    if (complaints.length === 0) return [20.5937, 78.9629]; // India center
    const avgLat = complaints.reduce((s, c) => s + parseFloat(c.lat), 0) / complaints.length;
    const avgLng = complaints.reduce((s, c) => s + parseFloat(c.lng), 0) / complaints.length;
    return [avgLat, avgLng];
  }, [complaints]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Flame size={40} style={{ color: 'var(--primary)', opacity: 0.7 }} />
        <p className="text-muted">Loading heatmap data…</p>
      </div>
    );
  }

  return (
    <div className="container py-8 flex flex-col min-h-[calc(100vh-72px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <MapIcon size={28} color="var(--primary)" />
          <h2>City Analytics Map</h2>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline bg-white flex items-center gap-2"
            onClick={() => setShowHeatmap(false)}
            style={!showHeatmap ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}}
          >
            <MapPin size={16} /> Pins
          </button>
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowHeatmap(true)}
            style={showHeatmap ? {} : { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
          >
            <Flame size={16} /> Heatmap
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 card p-0 overflow-hidden relative border-0 shadow-lg min-h-[600px] z-0">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%', minHeight: 600 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Auto-center when data loads */}
          <AutoCenter center={mapCenter} />

          {/* Heatmap layer — always mounted; visibility toggled internally */}
          <HeatmapLayer complaints={complaints} visible={showHeatmap} />

          {/* Marker pins — only shown when NOT in heatmap mode */}
          {!showHeatmap && complaints.map(c => (
            <Marker key={c.id} position={[parseFloat(c.lat), parseFloat(c.lng)]}>
              <Popup>
                <div className="min-w-[200px]">
                  <h4 className="font-semibold">{c.title}</h4>
                  <p className="text-sm mt-1">{c.locationText}</p>
                  <div className="mt-2 flex justify-between">
                    <span className="badge badge-priority" data-priority={c.urgency}>{c.urgency}</span>
                    <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Analytics Overlay */}
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[1000] w-64 border">
          <h4 className="mb-3 flex items-center gap-2">
            <Activity size={16} color="var(--primary)" /> Area Insights
          </h4>
          <p className="text-sm flex justify-between text-muted border-b pb-1 mb-1">
            <span>Mapped Pins:</span>
            <span className="font-bold text-text">{complaints.length}</span>
          </p>
          <p className="text-sm flex justify-between text-muted border-b pb-1 mb-1">
            <span>High Priority:</span>
            <span className="font-bold text-danger">{complaints.filter(c => c.urgency === 'High').length}</span>
          </p>
          <p className="text-sm flex justify-between text-muted border-b pb-1 mb-1">
            <span>Medium Priority:</span>
            <span className="font-bold" style={{ color: 'var(--warning)' }}>{complaints.filter(c => c.urgency === 'Medium').length}</span>
          </p>
          <p className="text-sm flex justify-between text-muted">
            <span>Resolved:</span>
            <span className="font-bold text-success">{complaints.filter(c => c.status === 'Completed' || c.status === 'Closed' || c.status === 'Resolved').length}</span>
          </p>

          {/* Heatmap legend */}
          {showHeatmap && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-muted mb-2">Intensity Legend</p>
              <div style={{
                height: 10,
                borderRadius: 6,
                background: 'linear-gradient(to right, #4ade80, #facc15, #f97316, #ef4444)',
                marginBottom: 4,
              }} />
              <div className="flex justify-between text-xs text-muted">
                <span>Low</span><span>High</span>
              </div>
            </div>
          )}
        </div>

        {/* Empty state overlay */}
        {complaints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-xl text-center">
              <MapPin size={36} className="mx-auto mb-3" style={{ color: 'var(--primary)', opacity: 0.6 }} />
              <p className="font-semibold text-lg">No location data yet</p>
              <p className="text-sm text-muted mt-1">Complaints with GPS coordinates will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
