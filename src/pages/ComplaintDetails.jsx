import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, serverTimestamp, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, MapPin, ArrowUpCircle, MessageSquare, Clock, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    // Fetch Main Document Single Snapshot
    const fetchComplaint = async () => {
      try {
        const docRef = doc(db, 'Complaints', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setComplaint({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toMillis() || Date.now()
          });
        }
      } catch (error) {
        console.error("Error fetching complaint:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchComplaint();
  }, [id]);

  useEffect(() => {
    // Stream live Comments strictly for this document
    const commentsRef = collection(db, `Complaints/${id}/Comments`);
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now()
      }));
      setComments(data);
    });

    return () => unsubscribe();
  }, [id]);

  const hasUpvoted = user ? complaint?.upvoters?.includes(user?.uid) : false;
  const displayUpvotes = complaint?.upvoters && complaint.upvoters.length > 0 ? complaint.upvoters.length : (complaint?.upvotes || 0);

  const handleUpvote = async () => {
    if (!user) return alert("Please login to upvote");
    if (upvoting) return;

    setUpvoting(true);
    try {
      const docRef = doc(db, 'Complaints', id);
      if (hasUpvoted) {
         await updateDoc(docRef, {
           upvoters: arrayRemove(user.uid),
           upvotes: increment(-1)
         });
         setComplaint(prev => ({ 
           ...prev, 
           upvoters: prev.upvoters ? prev.upvoters.filter(uid => uid !== user.uid) : [] 
         }));
      } else {
         await updateDoc(docRef, {
           upvoters: arrayUnion(user.uid),
           upvotes: increment(1)
         });
         setComplaint(prev => ({ 
           ...prev, 
           upvoters: [...(prev.upvoters || []), user.uid] 
         }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpvoting(false);
    }
  };

  const handlePostComment = async () => {
    if (!user) return alert("Please login to join the discussion");
    if (!commentText.trim()) return;

    setPosting(true);
    try {
      const commentsRef = collection(db, `Complaints/${id}/Comments`);
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.name || 'Citizen Organizer',
        text: commentText.trim(),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'Complaints', id), {
        commentCount: increment(1)
      });
      setCommentText('');
    } catch(e) {
      console.error(e);
      alert("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!user || (user.role !== 'Organisation' && user.role !== 'NGO')) return;
    try {
      const docRef = doc(db, 'Complaints', id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setComplaint(prev => ({ ...prev, status: newStatus }));
      alert("Status updated successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  };

  const handleFeedback = async (isSatisfied) => {
    if (!feedbackText.trim()) return alert("Please write a small reasoning comment");
    try {
      const docRef = doc(db, 'Complaints', id);
      const newStatus = isSatisfied ? 'Resolved' : 'Escalated';
      await updateDoc(docRef, {
        citizenFeedback: feedbackText,
        isSatisfied: isSatisfied,
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setComplaint(prev => ({ ...prev, citizenFeedback: feedbackText, isSatisfied, status: newStatus }));
      alert(`Feedback submitted! Issue has been ${isSatisfied ? 'closed permanently' : 'flagged for Admin review'}.`);
    } catch(e) {
      console.error(e);
      alert("Failed to submit feedback");
    }
  };

  if (loading) return <div className="text-center py-20"><div className="spinner mx-auto inline-block border-4 border-primary border-t-transparent w-8 h-8 rounded-full animate-spin"></div></div>;
  if (!complaint) return <div className="text-center py-20"><h3 className="text-muted">Issue Not Found or Removed</h3></div>;

  return (
    <div className="container py-8 max-w-4xl mx-auto animate-fade-in relative z-10">
      <button onClick={() => navigate(-1)} className="btn btn-outline border hover:bg-card mb-6 shadow-sm">
        <ArrowLeft size={16} /> Return to Feed
      </button>

      <div className="card shadow-lg border border-card-border overflow-hidden mb-6 p-0 relative">
        {complaint.status === 'Resolved' && <div className="absolute top-0 left-0 w-full h-1.5 bg-success z-20"></div>}
        
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl mb-2 text-text font-bold leading-tight">{complaint.title}</h1>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1"><MapPin size={16}/> {complaint.locationText}</span>
                <span className="flex items-center gap-1"><Clock size={16}/> {formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end shrink-0">
              <span className="badge badge-status shadow-sm px-3 py-1 font-bold" data-status={complaint.status || "Registered"}>{complaint.status || "Registered"}</span>
              <span className="badge badge-priority shadow-sm px-3 py-1 font-bold" data-priority={complaint.urgency || "Low"}>{complaint.urgency || "Low"} Priority</span>
            </div>
          </div>
        </div>

        {(complaint.imageUrl || complaint.resolvedImageUrl) && (
          <div className={`px-6 my-4 grid gap-4 ${complaint.imageUrl && complaint.resolvedImageUrl ? 'md:grid-cols-2 grid-cols-1' : 'grid-cols-1'}`}>
            {complaint.imageUrl && (
              <div className="relative group overflow-hidden rounded-xl shadow-sm border border-card-border">
                <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 text-xs rounded-lg font-bold uppercase tracking-wider shadow-lg border border-white/20">Original Report Overview</div>
                <img src={complaint.imageUrl} alt={complaint.title} className="w-full h-80 object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            )}
            {complaint.resolvedImageUrl && (
              <div className="relative group overflow-hidden rounded-xl shadow-md border-2 border-success">
                <div className="absolute top-3 left-3 z-10 bg-success text-white px-3 py-1.5 text-xs rounded-lg font-bold uppercase tracking-wider shadow-[0_5px_15px_-3px_rgba(16,185,129,0.5)] border border-white/30 flex items-center gap-2">
                  <CheckCircle2 size={16} className="mb-[2px]"/> Verified Resolution Evidence
                </div>
                <img src={complaint.resolvedImageUrl} alt="Resolution Proof" className="w-full h-80 object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            )}
          </div>
        )}

        <div className="px-6 my-6">
          <h4 className="mb-3 text-text">Citizen Description</h4>
          <p className="text-text whitespace-pre-line bg-background shadow-inset p-5 rounded-xl border border-card-border/50 text-lg leading-relaxed">{complaint.description}</p>
        </div>

        <div className="px-6 flex flex-wrap gap-4 mb-6 pt-2">
          <span className="bg-primary-light text-primary px-4 py-2 rounded-xl font-bold shadow-sm border border-primary/20">{complaint.category} Infrastructure</span>
          <span className="bg-orange-light text-accent px-4 py-2 rounded-xl font-bold shadow-sm border border-warning/20">Civic Severity Score: {complaint.priorityScore || 0}</span>
        </div>

        {/* Global Action Bar */}
        <div className="bg-background border-t border-card-border p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
             {/* Interactive Main Upvote Button */}
             <button 
                onClick={handleUpvote} 
                disabled={upvoting}
                className={`flex items-center gap-2 transition-all p-2 px-6 rounded-xl font-bold border ${hasUpvoted ? 'bg-primary-light text-primary border-primary/40 shadow-sm' : 'bg-card text-text-muted hover:text-text border-card-border hover:shadow-sm'}`}
             >
                <ArrowUpCircle size={22} className={hasUpvoted ? "fill-primary text-white" : ""} />
                Upvote Priority ({displayUpvotes})
             </button>
          </div>
          
          {/* Internal Functional / Administrative Actions */}
          <div className="flex gap-3">
            {(user?.role === 'Organisation' && complaint.status === 'Registered') && (
              <button onClick={() => handleUpdateStatus('Assigned')} className="btn btn-secondary shadow-md">Dispatch Assignment / Start Fix</button>
            )}
            {(user?.role === 'NGO' && complaint.status === 'Registered') && (
              <button onClick={() => handleUpdateStatus('Assigned')} className="btn btn-secondary shadow-md">Adopt Complaint</button>
            )}
            {/* Note: Resolution is intentionally completely locked via the Dashboard Modals! */}
            {((user?.role === 'Organisation' || user?.role === 'NGO') && complaint.status === 'Assigned') && (
              <div className="text-xs text-text-muted flex items-center bg-card border rounded p-2 italic">
                 Note: Upload verified completion proof via your Operational Dashboard to resolve.
              </div>
            )}
          </div>
        </div>

        {/* Feedback Module */}
        {(user?.role === 'Citizen' && complaint.creatorId === user?.uid && complaint.status === 'Resolved' && !complaint.citizenFeedback) && (
           <div className="bg-success/5 border-t border-success/20 p-6">
              <h3 className="text-success font-bold flex items-center gap-2 mb-2"><CheckCircle2 /> Verify Resolution Reality</h3>
              <p className="text-sm text-text-muted mb-4">The assigned organization has attached photographic evidence demonstrating this issue is resolved. Do you accept this resolution, or protest the evidence?</p>
              
              <div className="flex flex-col md:flex-row gap-3 w-full bg-card p-4 rounded-xl border border-success/30 shadow-sm">
                <input type="text" className="form-input flex-1 bg-background shadow-inset" placeholder="Write final statement on the repair..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                <div className="flex gap-2 shrink-0">
                   <button onClick={() => handleFeedback(true)} className="btn bg-success text-white hover:opacity-90 shadow-md">Accept Fix</button>
                   <button onClick={() => handleFeedback(false)} className="btn bg-danger text-white hover:opacity-90 shadow-md">Unsatisfied (Escalate)</button>
                </div>
              </div>
           </div>
        )}

        {complaint.citizenFeedback && (
           <div className={`p-6 border-t ${complaint.isSatisfied ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
             <div className="bg-card p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${complaint.isSatisfied ? 'text-success' : 'text-danger'}`}>
                    Citizen Satisfaction Statement
                  </span>
                  <span className="font-medium text-lg text-text">"{complaint.citizenFeedback}"</span>
                </div>
                <span className={`badge shrink-0 shadow-md py-1.5 px-4 font-bold ${complaint.isSatisfied ? 'badge-success' : 'badge-danger'}`} style={{ backgroundColor: complaint.isSatisfied ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
                  {complaint.isSatisfied ? 'ACCEPTED BY CREATOR' : 'ESCALATED / DISPUTED'}
                </span>
             </div>
           </div>
        )}
      </div>

      {/* Audit Pipeline Box */}
      <div className="card shadow-sm mb-6 border border-card-border overflow-hidden p-0">
        <div className="bg-background px-6 py-4 border-b border-card-border">
          <h3 className="font-bold flex items-center gap-2 text-text"><ShieldCheck className="text-primary"/> Operational Log Pipeline</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 text-sm flex-wrap font-medium">
            <span className={complaint.status === 'Registered' ? 'text-primary' : 'text-success text-opacity-80'}>Registered</span>
            <span className="text-card-border/60 font-black tracking-[3px]">----&gt;</span>
            
            <span className={complaint.status === 'Assigned' ? 'text-warning' : (complaint.status === 'Registered' ? 'text-text-muted opacity-40' : 'text-success text-opacity-80')}>In-Progress Assignment</span>
            <span className="text-card-border/60 font-black tracking-[3px]">----&gt;</span>
            
            <span className={complaint.status === 'Resolved' ? 'text-success font-bold' : (complaint.status === 'Escalated' ? 'text-danger' : 'text-text-muted opacity-40')}>Photo Proof Uploaded</span>
            
            {complaint.citizenFeedback && (
              <>
                <span className="text-card-border/60 font-black tracking-[3px]">----&gt;</span>
                <span className={complaint.isSatisfied ? "text-success font-bold" : "text-danger font-bold"}>
                  {complaint.isSatisfied ? 'Permanently Validated' : 'Audited / Escalated'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Core Discussion Engine */}
      <div className="card shadow-lg mt-8 border border-card-border mb-20 overflow-hidden p-0 relative">
        <div className="bg-primary/5 px-6 py-4 border-b border-card-border/80 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2 text-primary"><MessageSquare /> Community Discussion Forum</h3>
          <span className="bg-card px-3 py-1 rounded-full text-sm font-bold shadow-sm">{comments.length} Comments</span>
        </div>
        
        <div className="p-6">
          {user ? (
            <div className="flex gap-3 mb-8 bg-background p-4 rounded-xl border border-card-border/60 shadow-inner">
              <input 
                type="text" 
                className="form-input flex-1 bg-card shadow-inset" 
                placeholder="Share your perspective or situational updates here..." 
                value={commentText}
                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                onChange={e => setCommentText(e.target.value)}
              />
              <button onClick={handlePostComment} disabled={posting || !commentText.trim()} className="btn btn-primary px-6 shadow-md">
                <Send size={18} className={posting ? 'animate-pulse' : ''} /> {posting ? 'Sync...' : 'Post'}
              </button>
            </div>
          ) : (
            <div className="bg-background p-4 rounded-xl border text-center text-text-muted font-medium mb-8">
              Launch your Civic account to participate in the conversation.
            </div>
          )}
          
          {comments.length > 0 ? (
            <div className="flex flex-col gap-4">
               {comments.map((comment, i) => (
                 <div key={comment.id} className="bg-card p-4 rounded-xl border border-card-border/40 shadow-sm flex flex-col hover:border-primary/30 transition">
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-text-muted flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white ${comment.userId === complaint.creatorId ? 'bg-primary' : 'bg-secondary'}`}>
                            {comment.userName.charAt(0).toUpperCase()}
                          </div>
                          {comment.userName} {comment.userId === complaint.creatorId && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Creator</span>}
                       </span>
                       <span className="text-xs text-text-muted/60">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-text pl-8">{comment.text}</p>
                 </div>
               ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-background/50 rounded-xl border border-dashed border-card-border">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20 text-primary" />
              <p className="text-lg text-text font-medium">Blank Canvas</p>
              <p className="text-muted text-sm mt-1">Be the first to analyze, comment, or contextualize this issue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
