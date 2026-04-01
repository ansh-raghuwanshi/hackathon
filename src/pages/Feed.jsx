import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Activity, Filter, Search, MapPin } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ComplaintCard from '../components/ui/ComplaintCard';
import { SkeletonRow } from '../components/ui/Skeleton';

const CATEGORIES = ['All', 'Roads', 'Water', 'Electricity', 'Sanitation', 'Noise'];

export default function Feed() {
  const { user }  = useAuthStore();
  const [complaints,      setComplaints]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [categoryFilter,  setCategoryFilter]  = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'Complaints'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setComplaints(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toMillis() || Date.now()
      })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  if (!user)                                            return <Navigate to="/login"    replace />;
  if (user.role === 'Citizen' && (!user.age || !user.city)) return <Navigate to="/settings" replace />;

  const filtered = complaints.filter(c => {
    if (c.city?.toUpperCase() !== user.city?.toUpperCase()) return false;
    const q = searchTerm.toLowerCase();
    const matchSearch   = !q || c.title?.toLowerCase().includes(q) || c.locationText?.toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'All' || c.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 64px)' }}>
      {/* ── Sticky filter bar ── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 50,
        background: 'rgba(17,24,39,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 0',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              {user?.city ? `${user.city} Civic Feed` : 'City Feed'}
            </span>
            {!loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
                {filtered.length} issues
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 32, paddingTop: 6, paddingBottom: 6, width: 200, fontSize: '0.875rem' }}
                placeholder="Search issues…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                id="feed-search"
              />
            </div>

            {/* Category chips */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  id={`filter-${cat.toLowerCase()}`}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--r-full)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: `1px solid ${categoryFilter === cat ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    background: categoryFilter === cat ? 'var(--primary-light)' : 'var(--surface-2)',
                    color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                    transition: 'all 150ms',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feed list ── */}
      <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 720 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((c, i) => (
              <ComplaintCard key={c.id} complaint={c} animationDelay={i * 40} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', paddingTop: 64, paddingBottom: 64,
            background: 'var(--surface)', border: '1px dashed var(--border)',
            borderRadius: 'var(--r-xl)',
          }}>
            <MapPin size={40} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8 }}>No incidents found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              {searchTerm ? 'Try a different search term.' : 'Be the first to report an issue in your city.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
