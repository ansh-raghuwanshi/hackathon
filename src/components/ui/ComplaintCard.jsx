import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowUpCircle, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ComplaintCard({ complaint }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isUpvoting, setIsUpvoting] = useState(false);

  const {
    id, title, category, locationText, priorityScore, urgency, 
    status, commentCount, createdAt, imageUrl, upvoters = [], upvotes
  } = complaint;

  const hasUpvoted = user ? upvoters.includes(user.uid) : false;
  // Fallback to old upvotes integer if upvoters array hasn't been backfilled yet
  const displayUpvotes = upvoters.length > 0 ? upvoters.length : (upvotes || 0);

  const handleUpvote = async (e) => {
    e.preventDefault(); // Prevent accidental navigation if nested in Link
    if (!user) return navigate('/login');
    if (isUpvoting) return;

    setIsUpvoting(true);
    try {
      const docRef = doc(db, 'Complaints', id);
      if (hasUpvoted) {
         await updateDoc(docRef, {
           upvoters: arrayRemove(user.uid),
           upvotes: increment(-1)
         });
      } else {
         await updateDoc(docRef, {
           upvoters: arrayUnion(user.uid),
           upvotes: increment(1)
         });
      }
    } catch (error) {
      console.error("Upvote failed:", error);
    } finally {
      setIsUpvoting(false);
    }
  };

  return (
    <div className="card max-w-2xl mx-auto mb-6 hover:shadow-lg transition-all duration-300 relative border border-card-border overflow-hidden">
      {status === 'Resolved' && <div className="absolute top-0 left-0 w-full h-1 bg-success"></div>}
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl mb-1 text-text">{title}</h3>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span className="flex items-center gap-1"><MapPin size={14}/> {locationText}</span>
            <span className="flex items-center gap-1"><Clock size={14}/> {formatDistanceToNow(new Date(createdAt || Date.now()), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className="badge badge-status shadow-sm" data-status={status || "Submitted"}>{status || "Submitted"}</span>
          <span className="badge badge-priority shadow-sm" data-priority={urgency || "Low"}>{urgency || "Low"} Priority</span>
        </div>
      </div>

      {(imageUrl || complaint.resolvedImageUrl) && (
        <div className={`mb-5 grid gap-3 ${imageUrl && complaint.resolvedImageUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border shadow-sm group">
              <span className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-white/20"><MapPin size={10} className="inline mr-1 mb-[1px]"/>Reported</span>
              <img src={imageUrl} alt={title} className="w-full h-64 object-cover transition-transform hover:scale-105 duration-700" />
            </div>
          )}
          {complaint.resolvedImageUrl && (
            <div className="relative rounded-xl overflow-hidden border-2 border-success shadow-[0_5px_15px_-3px_rgba(16,185,129,0.3)] group">
              <span className="absolute top-3 left-3 z-10 bg-success text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-white/20 shadow-md"><CheckCircle2 size={10} className="inline mr-1 mb-[1px]"/>Verified Fix</span>
              <img src={complaint.resolvedImageUrl} alt="Resolution" className="w-full h-64 object-cover transition-transform hover:scale-105 duration-700" />
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex gap-2 mb-5">
        <span className="bg-primary-light text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20">{category}</span>
        <span className="bg-orange-light text-accent px-3 py-1 rounded-full text-xs font-medium border border-warning/20">Score: {priorityScore || 0}</span>
      </div>

      <div className="flex justify-between items-center border-t border-card-border pt-4 mt-2">
        <div className="flex gap-4">
          {/* Active Interactive Upvote Button */}
          <button 
             onClick={handleUpvote} 
             disabled={isUpvoting}
             className={`flex items-center gap-1.5 transition-all p-1.5 px-3 rounded-full ${hasUpvoted ? 'bg-primary-light text-primary font-bold shadow-sm' : 'text-text-muted hover:bg-card-border hover:text-text font-medium'}`}
          >
            <ArrowUpCircle size={20} className={hasUpvoted ? "fill-primary text-white" : ""} />
            <span>{displayUpvotes}</span>
          </button>
          
          <Link to={`/complaint/${id}`} className="flex items-center gap-1.5 text-text-muted hover:bg-card-border hover:text-text transition-all p-1.5 px-3 rounded-full font-medium">
            <MessageSquare size={20} />
            <span>{commentCount || 0}</span>
          </Link>
        </div>
        
        <div className="flex gap-3">
          <Link to={`/complaint/${id}`} className="btn btn-primary text-sm py-1.5 px-4 shadow-md">View Details</Link>
        </div>
      </div>
    </div>
  );
}
