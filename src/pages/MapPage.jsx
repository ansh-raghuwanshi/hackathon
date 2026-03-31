import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Layers, Activity } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Mock locations strictly for visualization if database coordinates are absent
// In a real app we'd trigger a reverse geocode from text or exact coordinates.
const generateMockCoordinates = () => {
  // Near NYC center
  return [40.7128 + (Math.random() - 0.5) * 0.1, -74.0060 + (Math.random() - 0.5) * 0.1];
};

export default function MapPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'Complaints'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        if(!item.lat || !item.lng) {
            const [lat, lng] = generateMockCoordinates();
            return { id: doc.id, ...item, lat, lng };
        }
        return { id: doc.id, ...item };
      });
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-center py-20">Loading Map Data...</div>;

  // New York City center default
  const position = [40.7128, -74.0060];

  return (
    <div className="container py-8 flex flex-col min-h-[calc(100vh-72px)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <MapIcon size={28} color="var(--primary)" />
          <h2>City Analytics Map</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline bg-white flex items-center gap-2">
            <Layers size={16} /> Terrain
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Activity size={16} /> Toggle Heatmap
          </button>
        </div>
      </div>

      <div className="flex-1 card p-0 overflow-hidden relative border-0 shadow-lg min-h-[600px] z-0">
        <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {complaints.map(c => (
            <Marker key={c.id} position={[c.lat, c.lng]}>
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
           <h4 className="mb-2">Area Insights</h4>
           <p className="text-sm flex justify-between text-muted border-b pb-1 mb-1">
             <span>Total Pins:</span> <span className="font-bold text-text">{complaints.length}</span>
           </p>
           <p className="text-sm flex justify-between text-muted border-b pb-1 mb-1">
             <span>High Priority:</span> <span className="font-bold text-danger">{complaints.filter(c => c.urgency === 'High').length}</span>
           </p>
           <p className="text-sm flex justify-between text-muted">
             <span>Resolved:</span> <span className="font-bold text-success">{complaints.filter(c => c.status === 'Completed' || c.status === 'Closed').length}</span>
           </p>
        </div>
      </div>
    </div>
  );
}
