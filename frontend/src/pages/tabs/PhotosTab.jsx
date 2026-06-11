import { useEffect, useState, useRef } from 'react';
import api, { getImageUrl } from '../../utils/api';
import toast from 'react-hot-toast';

const STAGES = ['Received','Inspection','Dismantling','Assembly','Testing','Final','Other'];

export default function PhotosTab({ jobId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [uploadStage, setUploadStage] = useState('Other');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/photos/${jobId}`);
      setPhotos(data);
    } catch { toast.error('Failed to load photos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPhotos(); }, [jobId]); // eslint-disable-line

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length === 0) return;
    setUploading(true);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }
    formData.append('stage', uploadStage);
    formData.append('caption', caption);

    api.post(`/photos/${jobId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      toast.success('Photos uploaded successfully');
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchPhotos();
    }).catch(err => {
      toast.error(err.response?.data?.message || 'Failed to upload photos');
    }).finally(() => setUploading(false));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.delete(`/photos/${id}`);
      toast.success('Photo deleted');
      fetchPhotos();
      if (preview?._id === id) setPreview(null);
    } catch { toast.error('Failed to delete photo'); }
  };

  const filteredPhotos = filter === 'All' ? photos : photos.filter(p => p.stage === filter);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontSize:'1.1rem', fontWeight:800, color:'#1e293b' }}>📸 Photo Documentation</h2>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {['All', ...STAGES].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`btn ${filter===s?'btn-primary':'btn-outline'} btn-sm`} style={{ borderRadius:20 }}>
              {s} {s==='All' ? photos.length : photos.filter(p=>p.stage===s).length}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1.5rem', alignItems:'start' }}>
        {/* GALLERY */}
        <div className="card">
          {loading ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'#64748b' }}>Loading photos…</div>
          ) : !filteredPhotos.length ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <p>No photos found for {filter}.</p>
            </div>
          ) : (
            <div className="photo-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'1rem', alignItems:'stretch' }}>
              {filteredPhotos.map(p => (
                <div key={p._id}
                     className="photo-card"
                     onClick={() => setPreview(p)}
                     style={{ position:'relative', width:'100%', aspectRatio:'1 / 1', overflow:'hidden', borderRadius:16, cursor:'pointer', minHeight:170, boxShadow:'0 12px 30px rgba(15,23,42,0.08)' }}>
                  <img src={getImageUrl(p.url)}
                       alt={p.caption||p.filename}
                       loading="lazy"
                       style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform 0.25s ease' }} />
                  <div className="photo-card-overlay" style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'linear-gradient(180deg,transparent,rgba(0,0,0,0.35))', opacity:0, transition:'opacity 0.2s ease' }}>
                    <div className="photo-card-actions" style={{ display:'flex', gap:'0.5rem', padding:'0.75rem' }}>
                      <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); setPreview(p); }} style={{ background:'rgba(255,255,255,0.22)', color:'#fff' }}>👁️</button>
                      <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }} style={{ background:'rgba(239,68,68,0.8)', color:'#fff' }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ position:'absolute', top:8, left:8 }}>
                    <span className="stage-badge" style={{ background:'rgba(15,23,42,0.7)', color:'#fff', padding:'0.15rem 0.5rem', fontSize:'11px' }}>{p.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UPLOAD PANEL */}
        <div className="card" style={{ position:'sticky', top:'5.5rem' }}>
          <div className="section-title" style={{ marginTop:0 }}>Upload New Photos</div>
          
          <div className="form-group" style={{ marginBottom:'1rem' }}>
            <label>Lifecycle Stage</label>
            <select value={uploadStage} onChange={e=>setUploadStage(e.target.value)}>
              {STAGES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom:'1.5rem' }}>
            <label>Caption (Optional, applies to all)</label>
            <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="e.g. Broken bearing housing" />
          </div>

          <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelect} style={{ display:'none' }} />
          
          <div className={`upload-zone ${uploading?'uploading':''}`} onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-over');}}
            onDragLeave={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');}}
            onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');if(!uploading)handleFileSelect({target:{files:e.dataTransfer.files}});}}
          >
            {uploading ? (
              <div style={{ padding:'2rem 0' }}>
                <div style={{ width:30, height:30, border:'3px solid #e2e8f0', borderTopColor:'#1e40af', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }} />
                <div className="upload-zone-text">Uploading files…</div>
              </div>
            ) : (
              <>
                <div className="upload-zone-icon">📥</div>
                <div className="upload-zone-text"><strong>Click to upload</strong> or drag and drop<br/>multiple images (JPG, PNG)</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX PREVIEW */}
      {preview && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setPreview(null)} style={{ padding:0, background:'rgba(15,23,42,0.9)', zIndex:1000, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(180deg, rgba(0,0,0,0.8), transparent)', width:'100%' }}>
            <div style={{ color:'#fff' }}>
              <span className="stage-badge" style={{ background:'rgba(255,255,255,0.2)', color:'#fff' }}>{preview.stage}</span>
              <span style={{ marginLeft:'1rem', fontSize:'0.9rem' }}>{preview.caption || preview.originalName}</span>
              <span style={{ marginLeft:'1rem', fontSize:'0.75rem', opacity:0.6 }}>{new Date(preview.createdAt).toLocaleString()}</span>
            </div>
            <button className="close-btn" style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'none' }} onClick={() => setPreview(null)}>✕</button>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflow:'hidden' }}>
            <img src={getImageUrl(preview.url)} alt={preview.caption} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain' }} />
          </div>
        </div>
      )}
    </div>
  );
}
