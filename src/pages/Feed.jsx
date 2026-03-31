import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Activity, Filter, Search } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ComplaintCard from '../components/ui/ComplaintCard';

export default function Feed() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    // Real-time listener for complaints
    const q = query(collection(db, 'Complaints'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert firestore timestamp safely
        createdAt: doc.data().createdAt?.toMillis() || Date.now()
      }));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching complaints:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user && ((user.role === 'Citizen' && !user.age) || !user.city)) {
    return <Navigate to="/settings" replace />;
  }

  const filteredComplaints = complaints.filter(c => {
    // GEOGRAPHIC ISOLATION (Case Insensitive Match)
    if (c.city?.toUpperCase() !== user.city?.toUpperCase()) return false;

    const matchesSearch = c.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.locationText?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container py-8 max-w-3xl mx-auto animate-fade-in relative z-10">
      <div className="bg-card p-6 rounded-2xl border border-card-border shadow-md mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={24} className="text-primary" />
            <h2 className="text-xl font-bold text-text m-0">{user?.city ? `${user.city} Civic Feed` : 'Global Outbound'}</h2>
          </div>
          <p className="text-sm text-text-muted">Live community reports & situational updates.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-text-muted/60" />
            <input 
              type="text" 
              className="form-input w-full pl-9 bg-background shadow-inset border-none rounded-xl text-sm"
              placeholder="Search hotspots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-primary z-10 pointer-events-none" />
            <select 
              className="form-select pl-9 bg-primary/10 text-primary font-bold shadow-sm border-none rounded-xl text-sm cursor-pointer hover:bg-primary/20 transition-all appearance-none pr-8"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Sectors</option>
              <option value="Roads">Transport</option>
              <option value="Water">Supply</option>
              <option value="Electricity">Electricity</option>
              <option value="Sanitation">Sanitation</option>
            </select>
          </div>
        </div>
      </div>

      <div className="feed-list flex flex-col gap-2">
        {loading ? (
          <div className="text-center py-20">
            <div className="spinner mb-4 inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted">Loading active city complaints...</p>
          </div>
        ) : filteredComplaints.length > 0 ? (
          filteredComplaints.map(complaint => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))
        ) : (
          <div className="card text-center py-20 bg-background/50 border border-dashed shadow-none">
            <Activity size={48} className="mx-auto mb-4 opacity-20 text-primary" />
            <h3 className="text-xl font-bold opacity-80">No active incidents found</h3>
            <p className="text-muted text-sm mt-1">Be the first to secure your neighborhood by reporting an issue.</p>
          </div>
        )}
      </div>
    </div>
  );
}
