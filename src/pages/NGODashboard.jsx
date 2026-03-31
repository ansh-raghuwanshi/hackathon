import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Activity, MapPin, ShieldCheck, HeartPulse, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function NGODashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orphan'); // orphan | active | history
  
  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [targetResolvedId, setTargetResolvedId] = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Show complaints that NGOs can adopt or have adopted
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

  const handleAdopt = async (complaintId) => {
    try {
      await updateDoc(doc(db, 'Complaints', complaintId), {
        status: 'Assigned',
        updatedAt: serverTimestamp(),
        ngoId: user.uid,
        ngoName: user.name
      });
      alert("Successfully adopted complaint!");
    } catch (e) {
      console.error(e);
      alert("Failed to adopt complaint");
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
          resolvedImageUrl: data.secure_url
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

  const adoptable = complaints.filter(c => c.city?.toUpperCase() === user?.city?.toUpperCase() && c.status === 'Registered');
  const myAdopted = complaints.filter(c => c.city?.toUpperCase() === user?.city?.toUpperCase() && c.status === 'Assigned' && c.ngoId === user?.uid);
  const myCompleted = complaints.filter(c => c.city?.toUpperCase() === user?.city?.toUpperCase() && c.status === 'Resolved' && c.ngoId === user?.uid);

  return (
    <div className="dashboard-layout animate-fade-in relative z-10">
      <aside className="sidebar">
        <div className="flex flex-col gap-2 mb-6 text-center pt-4">
          <div className="mx-auto bg-primary-light p-3 rounded-full mb-2">
            <HeartPulse size={32} color="var(--primary)" />
          </div>
          <h4 className="text-lg">{user?.name || 'NGO Partner'}</h4>
          <span className="badge mx-auto bg-primary text-white shadow-sm">Verified NGO Access</span>
        </div>
        
        <nav className="flex flex-col gap-3 mt-4">
          <button 
            className={`btn w-full justify-start ${activeTab === 'orphan' ? 'btn-primary shadow-md' : 'btn-outline border bg-background hover:bg-card hover:shadow-sm'}`}
            onClick={() => setActiveTab('orphan')}
          >
            <Activity size={18} /> Orphan Center
            {adoptable.length > 0 && <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${activeTab === 'orphan' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{adoptable.length}</span>}
          </button>
          
          <button 
            className={`btn w-full justify-start mt-2 ${activeTab === 'active' ? 'btn-primary shadow-md' : 'btn-outline border bg-background hover:bg-card hover:shadow-sm'}`}
            onClick={() => setActiveTab('active')}
          >
            <ShieldCheck size={18} /> Active Missions
            {myAdopted.length > 0 && <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${activeTab === 'active' ? 'bg-white text-primary' : 'bg-warning text-white'}`}>{myAdopted.length}</span>}
          </button>
          
          <button 
            className={`btn w-full justify-start mt-2 ${activeTab === 'history' ? 'bg-success text-white border-success shadow-md' : 'btn-outline border bg-background hover:bg-card border-success/30 text-success hover:border-success hover:shadow-sm'}`}
            onClick={() => setActiveTab('history')}
          >
            <CheckCircle size={18} /> Verified Impact
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <h2 className="mb-6">{user?.city ? `${user.city} City` : 'Regional'} NGO Command Sector</h2>
        
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="card text-center">
            <h3 className="text-primary text-4xl font-bold">{adoptable.length}</h3>
            <p className="text-muted mt-2 font-medium">Orphan Complaints</p>
          </div>
          <div className="card text-center border-warning/20">
            <h3 className="text-warning text-4xl font-bold">{myAdopted.length}</h3>
            <p className="text-muted mt-2 font-medium">Active Missions</p>
          </div>
          <div className="card text-center border-success/20">
            <h3 className="text-success text-4xl font-bold">{myCompleted.length}</h3>
            <p className="text-muted mt-2 font-medium">Historic Impact</p>
          </div>
        </div>

        {activeTab === 'orphan' && (
          <div className="bg-card rounded-xl border p-6 shadow-md transition">
            <h3 className="mb-6 pb-4 border-b text-primary flex items-center gap-2"><Activity /> Available for Adoption</h3>
            {loading ? (
              <p className="text-muted text-center py-4">Scanning region...</p>
            ) : adoptable.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
                {adoptable.map(c => (
                  <div key={c.id} className="border p-5 rounded-xl bg-background flex flex-col gap-3 relative hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-text text-lg">{c.title}</h4>
                        <p className="text-sm my-1 text-text-muted flex items-center gap-1"><MapPin size={14}/>{c.locationText}</p>
                      </div>
                      <span className="badge badge-status" data-status={c.status}>{c.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-t border-card-border pt-4 mt-2">
                      <Link to={`/complaint/${c.id}`} className="text-primary text-sm font-medium hover:underline">View Thread Details</Link>
                      <button onClick={() => handleAdopt(c.id)} className="btn btn-primary text-sm px-6">Adopt Case <HeartPulse size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShieldCheck size={48} className="mx-auto text-success/50 mb-4" />
                <h3 className="text-lg text-text">No cases currently need adoption.</h3>
                <p className="text-muted mt-2">The region is stable! Check back later.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="bg-card rounded-xl border border-warning/30 p-6 shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-warning"></div>
            <h3 className="mb-6 pb-4 border-b text-warning flex items-center gap-2"><ShieldCheck /> Active Missions</h3>
            {myAdopted.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
                {myAdopted.map(c => (
                  <div key={c.id} className="border border-warning/20 p-5 rounded-xl bg-orange-50/10 flex flex-col gap-3 relative hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-text text-lg">{c.title}</h4>
                        <p className="text-sm my-1 text-text-muted flex items-center gap-1"><MapPin size={14}/>{c.locationText}</p>
                      </div>
                      <span className="badge badge-status shadow-sm" data-status={c.status}>{c.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-t border-warning/20 pt-4 mt-2">
                      <Link to={`/complaint/${c.id}`} className="text-primary text-sm font-medium hover:underline">View Thread Details</Link>
                      <button onClick={() => openResolveModal(c.id)} className="btn bg-success text-white text-sm px-6 hover:opacity-90 shadow-sm border-none">Secure Verified Proof</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HeartPulse size={48} className="mx-auto text-muted/30 mb-4" />
                <h3 className="text-lg text-text">No active missions.</h3>
                <p className="text-muted mt-2">Head over to the Orphan Center to adopt a case.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-card rounded-xl border border-success/30 p-6 shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-success"></div>
            <h3 className="mb-6 pb-4 border-b text-success flex items-center gap-2"><CheckCircle /> Verified Impact History</h3>
            {myCompleted.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
                {myCompleted.map(c => (
                  <div key={c.id} className="border border-success/20 p-5 rounded-xl bg-green-50/10 flex flex-col gap-3 relative hover:shadow-md transition">
                     <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-text text-lg">{c.title}</h4>
                        <p className="text-sm my-1 text-text-muted flex items-center gap-1"><MapPin size={14}/>{c.locationText}</p>
                        {c.resolvedImageUrl && <p className="text-xs text-success font-bold flex items-center gap-1 mt-2">✓ Has Verified Proof</p>}
                      </div>
                      <span className="badge badge-status shadow-sm" data-status={c.status}>{c.status}</span>
                    </div>
                    
                    {c.citizenFeedback && (
                      <div className={`mt-2 p-3 text-sm rounded-lg border ${c.isSatisfied ? 'bg-green-50/50 border-success/30' : 'bg-red-50/50 border-danger/30'}`}>
                        <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">Citizen Feedback</span>
                        <span className="italic">"{c.citizenFeedback}"</span>
                      </div>
                    )}

                    <div className="border-t border-success/20 pt-3 mt-1">
                      <Link to={`/complaint/${c.id}`} className="text-primary text-sm font-medium hover:underline">View Thread History</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-success/30 mb-4" />
                <h3 className="text-lg text-text">No impact verified yet.</h3>
                <p className="text-muted mt-2">Adopt and physically resolve a case to build your historic impact report.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Resolution Proof Modal */}
      {resolveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setResolveModalOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', transform: 'scale(1)' }} onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold flex gap-2"><CheckCircle className="text-success" /> Verified Proof Upload</h3>
               <X className="cursor-pointer text-muted hover:text-danger hover:scale-110 transition" onClick={() => setResolveModalOpen(false)} />
             </div>
             
             <p className="text-sm text-text-muted mb-6">As an NGO resolving public issues, you must legally attach verified photographic evidence of your team's work to permanently close this case.</p>
             
             <form onSubmit={handleResolveSubmit}>
              <div className={`form-group p-6 rounded-xl border-2 border-dashed text-center transition shadow-inset ${resolveImage ? 'bg-green-50/20 border-success' : 'bg-background border-card-border hover:border-success'}`}>
                 <label className="form-label mb-0 cursor-pointer flex flex-col items-center w-full">
                    {resolveImage ? <CheckCircle size={32} className="text-success mb-2" /> : <ImageIcon size={32} className="text-primary mb-2 opacity-80"/>}
                    <span className={`text-sm ${resolveImage ? 'text-success font-bold' : 'text-text font-medium'}`}>
                      {resolveImage ? 'Evidence Attached Successfully' : 'Tap to Upload Proof (.png, .jpg)'}
                    </span>
                    <input required type="file" accept="image/*" className="hidden" onChange={e => setResolveImage(e.target.files[0])} />
                 </label>
                 {resolveImage && <p className="text-xs text-text-muted mt-2 truncate w-full">{resolveImage.name}</p>}
               </div>
               
               <button type="submit" className="btn btn-primary w-full mt-6 shadow-lg" disabled={!resolveImage || isUploading}>
                 {isUploading ? 'Securing Audit Trail...' : 'Confirm verified Resolution'}
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
