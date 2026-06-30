// WorkDetailsPage.jsx
import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function WorkDetailsPage() {
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ jobNo:'', equipment:'', eqNo:'', date:'', workType:'Inspection', description:'', technicianName:'', hoursSpent:'', partsUsed:'', status:'In Progress', notes:'' });
  const [files, setFiles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [filterJob, setFilterJob] = useState('');

  const fetch_ = async () => {
    try { const {data}=await api.get('/workdetails'+(filterJob?`?jobNo=${filterJob}`:'')); setRecords(data); }
    catch { toast.error('Failed to load'); }
  };
  useEffect(()=>{fetch_();},[filterJob]);

  const save = async () => {
    const fd = new FormData();
    Object.keys(form).forEach(k=>fd.append(k,form[k]));
    files.forEach(f=>fd.append('images',f));
    try {
      if(editId) await api.put(`/workdetails/${editId}`,form);
      else await api.post('/workdetails',fd,{headers:{'Content-Type':'multipart/form-data'}});
      toast.success(editId?'Updated!':'Added!'); setShowModal(false); setEditId(null); setFiles([]); fetch_();
    } catch(e){ toast.error(e.response?.data?.message||'Error'); }
  };
  const del = async id=>{ if(!window.confirm('Delete?'))return; await api.delete(`/workdetails/${id}`); toast.success('Deleted'); fetch_(); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <div><h1 style={{fontSize:'1.3rem',fontWeight:800,color:'#1e293b'}}>Work Details</h1><p style={{color:'#64748b',fontSize:'0.82rem'}}>Upload and track daily work progress</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setEditId(null);setForm({jobNo:'',equipment:'',eqNo:'',date:'',workType:'Inspection',description:'',technicianName:'',hoursSpent:'',partsUsed:'',status:'In Progress',notes:''});setFiles([]);setShowModal(true);}}>＋ Add Work Detail</button>
      </div>
      <div style={{marginBottom:'1rem',maxWidth:280}}>
        <input placeholder="Filter by Job No…" value={filterJob} onChange={e=>setFilterJob(e.target.value)}/>
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'auto'}}>
        {!records.length?<div className="empty-state"><div className="empty-icon">📸</div><p>No work details yet.</p></div>:(
          <table>
            <thead><tr><th>#</th><th>Job No</th><th>Equipment</th><th>Work Type</th><th>Description</th><th>Technician</th><th>Date</th><th>Hrs</th><th>Status</th><th>Images</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map((r,i)=>(
                <tr key={r._id}>
                  <td style={{color:'#94a3b8',fontSize:'0.75rem'}}>{i+1}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',color:'#1e40af',fontSize:'0.8rem',fontWeight:600}}>{r.jobNo}</td>
                  <td style={{fontSize:'0.8rem'}}>{r.equipment||'—'}</td>
                  <td><span style={{background:'#dbeafe',color:'#2563eb',padding:'0.15rem 0.55rem',borderRadius:20,fontSize:'0.7rem',fontWeight:700}}>{r.workType}</span></td>
                  <td style={{maxWidth:180,whiteSpace:'normal',fontSize:'0.78rem',color:'#475569'}}>{r.description||'—'}</td>
                  <td style={{fontSize:'0.8rem'}}>{r.technicianName||'—'}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.78rem',color:'#64748b'}}>{r.date ? r.date.split('T')[0] : '—'}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.78rem'}}>{r.hoursSpent||'—'}</td>
                  <td><span style={{background:r.status==='Completed'?'#dcfce7':'#dbeafe',color:r.status==='Completed'?'#16a34a':'#2563eb',padding:'0.15rem 0.55rem',borderRadius:20,fontSize:'0.7rem',fontWeight:700}}>{r.status}</span></td>
                  <td style={{fontSize:'0.78rem',color:'#64748b'}}>{r.images?.length?`📷 ${r.images.length}`:'—'}</td>
                  <td><div style={{display:'flex',gap:'0.3rem'}}>
                    <button onClick={()=>{setEditId(r._id);setForm({...r, date: r.date ? r.date.split('T')[0] : ''});setShowModal(true);}} style={{width:26,height:26,borderRadius:5,border:'1px solid #e2e8f0',background:'transparent',cursor:'pointer',fontSize:'0.75rem'}}>✏️</button>
                    <button onClick={()=>del(r._id)} style={{width:26,height:26,borderRadius:5,border:'1px solid #e2e8f0',background:'transparent',cursor:'pointer',fontSize:'0.75rem'}}>🗑️</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">{editId?'Edit Work Detail':'Add Work Detail'}</div><button className="close-btn" onClick={()=>setShowModal(false)}>✕</button></div>
            <div className="form-grid">
              {[['jobNo','Job No','text'],['equipment','Equipment','text'],['eqNo','Equipment No','text'],['date','Date','date'],['technicianName','Technician','text'],['hoursSpent','Hours Spent','number']].map(([k,lbl,type])=>(
                <div key={k} className="form-group"><label>{lbl}</label><input type={type} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
              <div className="form-group"><label>Work Type</label><select value={form.workType||'Inspection'} onChange={e=>setForm(f=>({...f,workType:e.target.value}))}>
                {['Disassembly','Inspection','Repair','Assembly','Testing','Other'].map(o=><option key={o}>{o}</option>)}
              </select></div>
              <div className="form-group"><label>Status</label><select value={form.status||'In Progress'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {['In Progress','Completed'].map(o=><option key={o}>{o}</option>)}
              </select></div>
              <div className="form-group span3"><label>Description</label><textarea value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <div className="form-group span3"><label>Parts Used</label><textarea value={form.partsUsed||''} onChange={e=>setForm(f=>({...f,partsUsed:e.target.value}))}/></div>
              <div className="form-group span3"><label>Notes</label><textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
              {!editId&&<div className="form-group span3"><label>Upload Images / Documents</label><input type="file" multiple accept="image/*,application/pdf" onChange={e=>setFiles([...e.target.files])} style={{padding:'0.4rem'}}/></div>}
            </div>
            <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'1.25rem'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkDetailsPage;
