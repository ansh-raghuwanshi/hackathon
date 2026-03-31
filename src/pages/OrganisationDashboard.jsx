import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Activity, MapPin, Search, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function OrganisationDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active | resolved
  
  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [targetResolvedId, setTargetResolvedId] = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Show complaints that are new ('Registered') or assigned to this org ('Assigned' / 'Resolved')
    const q = query(collection(db, 'Complaints'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await updateDoc(doc(db, 'Complaints', complaintId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        assigneeId: user.uid, // Claim the complaint
        assigneeName: user.name
      });
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  };

  const openResolveModal = (complaintId) => {
    setTargetResolvedId(complaintId);
    setResolveImage(null);
    setResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveImage) return alert("You must upload an evidence image to prove resolution!");
    
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', resolveImage);
      uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      uploadData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        await updateDoc(doc(db, 'Complaints', targetResolvedId), {
          status: 'Resolved',
          updatedAt: serverTimestamp(),
          resolvedImageUrl: data.secure_url,
          assigneeId: user.uid,
          assigneeName: user.name
        });
        
        setResolveModalOpen(false);
        setTargetResolvedId(null);
        setResolveImage(null);
        alert("Case officially marked as resolved and proof securely attached!");
      } else {
        throw new Error("Cloudinary upload failed");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to upload proof of resolution.");
    } finally {
      setIsUploading(false);
    }
  };

  // ONBOARDING GATE
  if (user && !user.city) {
    return <Navigate to="/settings" replace />;
  }

  const actionableComplaints = complaints.filter(c => 
    c.city?.toUpperCase() === user?.city?.toUpperCase() && // GEOGRAPHIC ISOLATION
    (user?.orgCategory ? c.category === user.orgCategory : true) && 
    (c.status === 'Registered' || (c.status === 'Assigned' && c.assigneeId === user?.uid))
  );
  const myCompleted = complaints.filter(c => 
    c.city?.toUpperCase() === user?.city?.toUpperCase() && // GEOGRAPHIC ISOLATION
    (user?.orgCategory ? c.category === user.orgCategory : true) && 
    c.status === 'Resolved' && c.assigneeId === user?.uid
  );

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <div className="flex flex-col gap-2 mb-6 text-center pt-4">
          <div className="mx-auto bg-primary-light p-3 rounded-full mb-2">
            <User size={32} color="var(--primary)" />
          </div>
          <h4 className="text-lg">{user?.name || 'Organisation'}</h4>
          <span className="badge badge-priority mx-auto" data-priority="High">{user?.role} {user?.orgCategory ? `• ${user.orgCategory}` : ''}</span>
        </div>
        
        <nav className="flex flex-col gap-3 mt-4">
          <button 
            className={`btn w-full justify-start ${activeTab === 'active' ? 'btn-primary' : 'btn-outline border bg-background hover:bg-card'}`}
            onClick={() => setActiveTab('active')}
          >
            <Activity size={18} /> Active Work
          </button>
          <button 
            className={`btn w-full justify-start ${activeTab === 'resolved' ? 'btn-primary' : 'btn-outline border bg-background hover:bg-card mt-4'}`}
            style={activeTab === 'resolved' ? {backgroundColor: 'var(--success)', color: 'white'} : {}}
            onClick={() => setActiveTab('resolved')}
          >
            <CheckCircle size={18} /> Past Resolutions
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <h2 className="mb-6">Organisation Duty Board</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="card text-center shadow-sm">
            <h3 className="text-primary text-4xl">{actionableComplaints.length}</h3>
            <p className="text-muted mt-2 font-medium">Pending Action</p>
          </div>
          <div className="card text-center shadow-sm">
            <h3 className="text-success text-4xl">{myCompleted.length}</h3>
            <p className="text-muted mt-2 font-medium">My Resolved Cases</p>
          </div>
        </div>

        {activeTab === 'active' ? (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="mb-6 pb-4 border-b">Incoming & Assigned Complaints</h3>
            
            {loading ? (
               <p className="text-muted text-center py-4">Loading data...</p>
            ) : actionableComplaints.length > 0 ? (
              <div className="flex flex-col gap-4">
                {actionableComplaints.map(c => (
                  <div key={c.id} className="border p-4 rounded-lg bg-background flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{c.title}</h4>
                        <p className="text-sm text-text-muted flex items-center gap-1 mt-1"><MapPin size={14}/> {c.locationText}</p>
                        <p className="text-sm text-text-muted mt-1 inline-block px-2 py-1 rounded border shadow-sm bg-card">Category: {c.category} | Urgency: {c.urgency}</p>
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-t pt-3 mt-2">
                      <Link to={`/complaint/${c.id}`} className="text-primary font-medium hover:underline text-sm">View Full Details &rarr;</Link>
                      <div className="flex gap-2">
                         {c.status === 'Registered' && (
                           <button onClick={() => handleUpdateStatus(c.id, 'Assigned')} className="btn btn-secondary text-sm px-4">Accept & Assign</button>
                         )}
                         {c.status === 'Assigned' && c.assigneeId === user?.uid && (
                           <button onClick={() => openResolveModal(c.id)} className="btn hover:bg-green-600 transition" style={{backgroundColor: 'var(--success)', color: 'white'}}>Submit & Mark Resolved</button>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <CheckCircle size={40} className="mx-auto text-success opacity-50 mb-4" />
                <p className="text-muted text-lg">No pending issues requiring your attention.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-6 shadow-sm border-success">
            <h3 className="mb-6 pb-4 border-b text-success flex items-center gap-2"><CheckCircle /> Past Resolutions</h3>
            
            {myCompleted.length > 0 ? (
              <div className="flex flex-col gap-4">
                {myCompleted.map(c => (
                  <div key={c.id} className="border p-4 rounded-lg bg-green-50/10 flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{c.title}</h4>
                        <p className="text-sm text-text-muted flex items-center gap-1 mt-1"><MapPin size={14}/> {c.locationText}</p>
                        {c.resolvedImageUrl && <p className="text-xs text-success font-medium flex items-center gap-1 mt-2">✓ Has Verified Proof</p>}
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    
                    {c.citizenFeedback && (
                      <div className={`mt-2 p-3 text-sm rounded border ${c.isSatisfied ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <strong>Citizen Feedback:</strong> {c.isSatisfied ? 'Satisfied' : 'Unsatisfied'} - "{c.citizenFeedback}"
                      </div>
                    )}

                    <div className="border-t pt-2 mt-1">
                      <Link to={`/complaint/${c.id}`} className="text-primary font-medium hover:underline text-sm">View Thread History &rarr;</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">You haven't resolved any issues yet.</p>
            )}
          </div>
        )}
      </main>

      {/* Resolution Proof Modal */}
      {resolveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setResolveModalOpen(false)}>
          <div className="auth-card" style={{ width: '100%', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold flex gap-2"><CheckCircle className="text-success" /> Upload Proof</h3>
               <X className="cursor-pointer text-muted hover:text-text cursor-pointer" onClick={() => setResolveModalOpen(false)} />
             </div>
             
             <p className="text-sm text-text-muted mb-6">You must physically prove this issue was resolved by uploading a verified photograph taken at the scene.</p>
             
             <form onSubmit={handleResolveSubmit}>
              <div className={`form-group p-6 rounded-xl border-2 border-dashed text-center transition ${resolveImage ? 'bg-green-50/10 border-success' : 'bg-background border-card-border hover:border-success'}`}>
                 <label className="form-label mb-0 cursor-pointer flex flex-col items-center w-full">
                    {resolveImage ? <CheckCircle size={32} className="text-success mb-2" /> : <ImageIcon size={32} className="text-success mb-2 opacity-80"/>}
                    <span className={`text-sm ${resolveImage ? 'text-success font-bold' : 'text-text font-medium'}`}>
                      {resolveImage ? 'Verified Proof Attached' : 'Tap to Upload Proof (.png, .jpg)'}
                    </span>
                    <input required type="file" accept="image/*" className="hidden" onChange={e => setResolveImage(e.target.files[0])} />
                 </label>
                 {resolveImage && <p className="text-xs text-text-muted mt-2 truncate w-full">{resolveImage.name}</p>}
               </div>
               
               <button type="submit" className="btn w-full mt-6 flex justify-center py-3" style={{backgroundColor: 'var(--success)', color: 'white'}} disabled={!resolveImage || isUploading}>
                 {isUploading ? 'Securing Audit Trail...' : 'Confirm Resolution'}
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
