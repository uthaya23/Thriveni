import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function DismantlingPage() {
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ jobNo:'', equipment:'', eqNo:'', technicianName:'', date:'', component:'', condition:'Good', findings:'', partsRemoved:'', notes:'' });
  const [files, setFiles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [filterJob, setFilterJob] = useState('');

  const fetch_ = async () => {
    try { const {data}=await api.get('/dismantling'+(filterJob?`?jobNo=${filterJob}`:'')); setRecords(data); }
    catch { toast.error('Failed to load'); }
  };
  useEffect(()=>{fetch_();},[filterJob]);

  const save = async () => {
    const fd = new FormData();
    Object.keys(form).forEach(k => fd.append(k, form[k]));
    files.forEach(f => fd.append('images', f));
    try {
      if (editId) await api.put(`/dismantling/${editId}`, form);
      else await api.post('/dismantling', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(editId ? 'Updated!' : 'Added!'); setShowModal(false); setEditId(null); setFiles([]); fetch_();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const del = async id => { if(!window.confirm('Delete?'))return; await api.delete(`/dismantling/${id}`); toast.success('Deleted'); fetch_(); };

  const openView = (r) => {
    setEditId(r._id);
    setForm({...r, date: r.date ? r.date.split('T')[0] : ''});
    setIsEditMode(false);
    setShowModal(true);
  };

  const openEdit = () => {
    setIsEditMode(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({jobNo:'',equipment:'',eqNo:'',technicianName:'',date:'',component:'',condition:'Good',findings:'',partsRemoved:'',notes:''});
    setFiles([]);
    setIsEditMode(true);
    setShowModal(true);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <div><h1 style={{fontSize:'1.3rem',fontWeight:800,color:'#1e293b'}}>Dismantling Records</h1><p style={{color:'#64748b',fontSize:'0.82rem'}}>Log all dismantling findings</p></div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add Record</button>
      </div>
      <div style={{marginBottom:'1rem',maxWidth:280}}>
        <input placeholder="Filter by Job No…" value={filterJob} onChange={e=>setFilterJob(e.target.value)}/>
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'auto'}}>
        {!records.length ? <div className="empty-state"><div className="empty-icon">🔧</div><p>No dismantling records yet.</p></div> : (
          <table>
            <thead><tr><th>#</th><th>Job No</th><th>Equipment</th><th>Component</th><th>Condition</th><th>Technician</th><th>Date</th><th>Findings</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map((r,i)=>(
                <tr key={r._id} onClick={()=>openView(r)} style={{cursor:'pointer'}}>
                  <td style={{color:'#94a3b8',fontSize:'0.75rem'}}>{i+1}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',color:'#1e40af',fontSize:'0.8rem',fontWeight:600}}>{r.jobNo}</td>
                  <td style={{fontSize:'0.8rem'}}>{r.equipment||'—'}</td>
                  <td style={{fontWeight:600}}>{r.component||'—'}</td>
                  <td><span style={{background:r.condition==='Good'?'#dcfce7':r.condition==='Replace'?'#fee2e2':'#fef3c7',color:r.condition==='Good'?'#16a34a':r.condition==='Replace'?'#dc2626':'#d97706',padding:'0.15rem 0.55rem',borderRadius:20,fontSize:'0.7rem',fontWeight:700}}>{r.condition}</span></td>
                  <td style={{fontSize:'0.8rem'}}>{r.technicianName||'—'}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.78rem',color:'#64748b'}}>{r.date ? r.date.split('T')[0] : '—'}</td>
                  <td style={{maxWidth:200,whiteSpace:'normal',fontSize:'0.78rem',color:'#475569'}}>{r.findings||'—'}</td>
                  <td><div style={{display:'flex',gap:'0.3rem'}} onClick={e=>e.stopPropagation()}>
                    <button title="Edit" onClick={()=>{setEditId(r._id);setForm({...r, date: r.date ? r.date.split('T')[0] : ''});setIsEditMode(true);setShowModal(true);}} style={{width:26,height:26,borderRadius:5,border:'1px solid #e2e8f0',background:'transparent',cursor:'pointer',fontSize:'0.75rem'}}>✏️</button>
                    <button title="Delete" onClick={()=>del(r._id)} style={{width:26,height:26,borderRadius:5,border:'1px solid #e2e8f0',background:'transparent',cursor:'pointer',fontSize:'0.75rem'}}>🗑️</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth: isEditMode ? '800px' : '600px'}}>
            <div className="modal-header">
              <div className="modal-title">{editId ? (isEditMode ? 'Edit Record' : 'Record Details') : 'Add Dismantling Record'}</div>
              <button className="close-btn" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            
            {isEditMode ? (
              <>
                <div className="form-grid">
                  {[['jobNo','Job No','text'],['equipment','Equipment','text'],['eqNo','Equipment No','text'],['technicianName','Technician','text'],['date','Date','date'],['component','Component','text']].map(([k,lbl,type])=>(
                    <div key={k} className="form-group"><label>{lbl}</label><input type={type} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
                  ))}
                  <div className="form-group"><label>Condition</label><select value={form.condition||'Good'} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}>
                    {['Good','Worn','Damaged','Replace'].map(o=><option key={o}>{o}</option>)}
                  </select></div>
                  <div className="form-group span3"><label>Findings</label><textarea value={form.findings||''} onChange={e=>setForm(f=>({...f,findings:e.target.value}))}/></div>
                  <div className="form-group span3"><label>Parts Removed</label><textarea value={form.partsRemoved||''} onChange={e=>setForm(f=>({...f,partsRemoved:e.target.value}))}/></div>
                  <div className="form-group span3"><label>Notes</label><textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
                  {!editId&&<div className="form-group span3"><label>Upload Images</label><input type="file" multiple accept="image/*" onChange={e=>setFiles([...e.target.files])} style={{padding:'0.4rem'}}/></div>}
                </div>
                <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'1.25rem'}}>
                  <button className="btn btn-outline" onClick={()=>{editId ? setIsEditMode(false) : setShowModal(false)}}>Cancel</button>
                  <button className="btn btn-primary" onClick={save}>💾 Save Changes</button>
                </div>
              </>
            ) : (
              <div style={{padding:'1rem 0'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'2rem'}}>
                  <div>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:'0.4rem'}}>Job Information</label>
                    <div style={{fontSize:'1.1rem',fontWeight:800,color:'#1e40af'}}>{form.jobNo}</div>
                    <div style={{fontSize:'0.9rem',color:'#475569',marginTop:'0.2rem'}}>{form.equipment} ({form.eqNo})</div>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:'0.4rem'}}>Technician & Date</label>
                    <div style={{fontSize:'0.95rem',fontWeight:700}}>{form.technicianName}</div>
                    <div style={{fontSize:'0.85rem',color:'#64748b'}}>{form.date}</div>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:'0.4rem'}}>Component</label>
                    <div style={{fontSize:'1rem',fontWeight:700}}>{form.component}</div>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:'0.4rem'}}>Condition</label>
                    <span style={{background:form.condition==='Good'?'#dcfce7':form.condition==='Replace'?'#fee2e2':'#fef3c7',color:form.condition==='Good'?'#16a34a':form.condition==='Replace'?'#dc2626':'#d97706',padding:'0.25rem 0.75rem',borderRadius:20,fontSize:'0.75rem',fontWeight:800}}>
                      {form.condition}
                    </span>
                  </div>
                </div>
                
                <div style={{spaceY:'1rem'}}>
                  <div style={{background:'#f8fafc',padding:'1rem',borderRadius:8,marginBottom:'1rem'}}>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#64748b',marginBottom:'0.5rem'}}>Detailed Findings</label>
                    <p style={{fontSize:'0.9rem',lineHeight:1.5,color:'#1e293b'}}>{form.findings || 'No findings recorded.'}</p>
                  </div>
                  <div style={{background:'#f8fafc',padding:'1rem',borderRadius:8,marginBottom:'1rem'}}>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#64748b',marginBottom:'0.5rem'}}>Parts Removed</label>
                    <p style={{fontSize:'0.9rem',lineHeight:1.5,color:'#1e293b'}}>{form.partsRemoved || 'No parts listed.'}</p>
                  </div>
                  {form.notes && (
                    <div style={{padding:'0 1rem'}}>
                      <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:'0.4rem'}}>Internal Notes</label>
                      <p style={{fontSize:'0.85rem',fontStyle:'italic',color:'#64748b'}}>{form.notes}</p>
                    </div>
                  )}
                </div>

                <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'2rem',paddingTop:'1rem',borderTop:'1px solid #e2e8f0'}}>
                  <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Close</button>
                  <button className="btn btn-primary" onClick={openEdit}>✏️ Edit Details</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
