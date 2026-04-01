import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowUp, MessageSquare, Clock, CheckCircle2, Zap, Droplets, Trash2, Volume2, Home, Activity, X, AlertTriangle, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const CATEGORY_META = {
  Roads:       { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  Icon: Activity },
  Water:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  Icon: Droplets },
  Electricity: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  Icon: Zap },
  Sanitation:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  Icon: Trash2 },
  Noise:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', Icon: Volume2 },
  Other:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', Icon: Home },
};

export default function ComplaintCard({ complaint, animationDelay = 0 }) {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [isUpvoting,  setIsUpvoting]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);

  const {
    id, title, category, locationText, priorityScore,
    urgency, status, commentCount, createdAt, imageUrl, upvoters = [], upvotes,
    userId
  } = complaint;

  const hasUpvoted     = user ? upvoters.includes(user.uid) : false;
  const displayUpvotes = upvoters.length > 0 ? upvoters.length : (upvotes || 0);
  const meta           = CATEGORY_META[category] || CATEGORY_META.Other;
  const CatIcon        = meta.Icon;
  const canDelete      = user && (user.uid === userId || user.role === 'Admin');

  // Overdue: pending (not Resolved) for more than 10 days
  const OVERDUE_MS  = 10 * 24 * 60 * 60 * 1000;
  const isPending   = status !== 'Resolved';
  const ageMs       = Date.now() - (createdAt || Date.now());
  const isOverdue   = isPending && ageMs > OVERDUE_MS;
  const daysOld     = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  const handleUpvote = async (e) => {
    e.preventDefault();
    if (!user)      return navigate('/login');
    if (isUpvoting) return;
    setIsUpvoting(true);
    try {
      const ref = doc(db, 'Complaints', id);
      if (hasUpvoted) {
        await updateDoc(ref, { upvoters: arrayRemove(user.uid), upvotes: increment(-1) });
      } else {
        await updateDoc(ref, { upvoters: arrayUnion(user.uid), upvotes: increment(1) });
      }
    } catch (err) { console.error(err); }
    finally { setIsUpvoting(false); }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'Complaints', id));
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <article
      className="complaint-card animate-fade-in"
      style={{
        '--cat-color': isOverdue ? '#f97316' : meta.color,
        '--cat-bg': isOverdue ? 'rgba(249,115,22,0.08)' : meta.bg,
        animationDelay: `${animationDelay}ms`,
        ...(isOverdue ? { boxShadow: '0 0 0 1.5px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.1)' } : {}),
      }}
    >
      {/* Left accent bar */}
      <div className="complaint-card-accent" />

      {/* Overdue banner */}
      {isOverdue && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(249,115,22,0.10)',
          border: '1px solid rgba(249,115,22,0.35)',
          borderRadius: 'var(--r-md)',
          padding: '7px 12px',
          marginBottom: 10,
          animation: 'pulse-overdue 2s ease-in-out infinite',
        }}>
          <Flame size={14} color="#f97316" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>
            ⏳ Overdue — pending {daysOld} day{daysOld !== 1 ? 's' : ''} with no resolution
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="complaint-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)', lineHeight: 1.3 }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <MapPin size={12} /> {locationText}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <Clock size={12} /> {formatDistanceToNow(new Date(createdAt || Date.now()), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span className="badge badge-status" data-status={status}>{status}</span>
          <span className="badge badge-priority" data-priority={urgency}>{urgency}</span>
        </div>
      </div>

      {/* Images */}
      {(imageUrl || complaint.resolvedImageUrl) && (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: imageUrl && complaint.resolvedImageUrl ? '1fr 1fr' : '1fr', marginBottom: 12 }}>
          {imageUrl && (
            <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.625rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Reported
              </span>
              <img src={imageUrl} alt={title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', transition: 'transform 600ms', }} 
                onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              />
            </div>
          )}
          {complaint.resolvedImageUrl && (
            <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--success)', boxShadow: '0 0 16px rgba(52,211,153,0.2)' }}>
              <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, background: 'var(--success)', color: '#fff', fontSize: '0.625rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={10} /> Verified
              </span>
              <img src={complaint.resolvedImageUrl} alt="Resolution" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', transition: 'transform 600ms' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              />
            </div>
          )}
        </div>
      )}

      {/* Tags row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}22` }}>
          <CatIcon size={11} /> {category}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(251,191,36,0.1)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.2)' }}>
          Score: {priorityScore || 0}
        </span>
      </div>

      {/* Delete confirmation banner */}
      {showConfirm && (
        <div style={{
          margin: '8px 0',
          padding: '12px 14px',
          borderRadius: 'var(--r-md)',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="#ef4444" />
            <span style={{ fontSize: '0.8125rem', color: '#ef4444', fontWeight: 600 }}>
              Delete this post permanently?
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              style={{
                padding: '4px 12px', borderRadius: 'var(--r-full)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              id={`delete-confirm-${id}`}
              style={{
                padding: '4px 12px', borderRadius: 'var(--r-full)',
                fontSize: '0.75rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer',
                background: '#ef4444', border: 'none',
                color: '#fff', fontFamily: 'inherit',
                opacity: isDeleting ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleUpvote}
            disabled={isUpvoting}
            className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
            title="Upvote"
          >
            <ArrowUp size={15} />
            <span>{displayUpvotes}</span>
          </button>

          <Link to={`/complaint/${id}`} className="action-pill" title="Comments">
            <MessageSquare size={15} />
            <span>{commentCount || 0}</span>
          </Link>

          {canDelete && !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              id={`delete-post-${id}`}
              className="action-pill"
              title="Delete post"
              style={{ color: 'var(--text-subtle)' }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <Link to={`/complaint/${id}`} className="btn btn-primary btn-sm">
          View Details
        </Link>
      </div>
    </article>
  );
}
