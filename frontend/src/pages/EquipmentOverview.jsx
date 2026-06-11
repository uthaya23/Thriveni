import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function EquipmentOverview() {
  const [equipment, setEquipment] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type:'830E DC', equipNo:'', name:'', serialNo:'', site:'', status:'Active', totalLifeHrs:'', lastService:'', notes:'' });
  const [editId, setEditId] = useState(null);
  
  const EQ_COLORS = { '830E DC':'#f59e0b','830E AC':'#3b82f6','EH5000':'#22c55e','EH4500':'#eab308','BELAZ':'#ef4444' };

  const fetch_ = async () => { try { const {data}=await api.get('/equipment'); setEquipment(data); } catch { toast.error('Failed to load'); } };
  useEffect(()=>{fetch_();},[]);

  const save = async () => {
    try {
      if(editId) await api.put(`/equipment/${editId}`,form); else await api.post('/equipment',form);
      toast.success(editId?'Updated!':'Added!'); setShowModal(false); setEditId(null); fetch_();
    } catch(e){ toast.error(e.response?.data?.message||'Error'); }
  };
  const del = async id => { if(!window.confirm('Delete?'))return; await api.delete(`/equipment/${id}`); toast.success('Deleted'); fetch_(); };
  const open = (eq=null)=>{ setEditId(eq?._id||null); setForm(eq?{...eq}:{type:'830E DC',equipNo:'',name:'',serialNo:'',site:'',status:'Active',totalLifeHrs:'',lastService:'',notes:''}); setShowModal(true); };

  return (
    <div className="grid-canvas">
      <div className="col-span-12 flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl">Equipment Fleet</h1>
          <p className="text-muted">Manage all registered workshop equipment assets.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>open()}>+ Register Equipment</button>
      </div>

      {equipment.length === 0 ? (
        <div className="col-span-12 panel">
          <div className="panel-body text-center text-muted" style={{ padding: '4rem' }}>
            No equipment added yet.
          </div>
        </div>
      ) : (
        equipment.map(eq => (
          <div key={eq._id} className="col-span-4 panel" style={{ borderTop: `4px solid ${EQ_COLORS[eq.type] || '#ccc'}` }}>
            <div className="panel-body">
              <div className="flex justify-between mb-4">
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{eq.equipNo}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{eq.type}</div>
                </div>
                <span className={`status ${eq.status === 'Active' ? 'completed' : 'dismantling'}`}>{eq.status}</span>
              </div>
              <div className="grid-2" style={{ gap: '0.5rem' }}>
                <div><span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Site</span><span style={{ fontWeight: 600 }}>{eq.site || '-'}</span></div>
                <div><span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Serial</span><span style={{ fontWeight: 600 }}>{eq.serialNo || '-'}</span></div>
                <div><span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Life Hrs</span><span style={{ fontWeight: 600 }}>{eq.totalLifeHrs || '-'}</span></div>
                <div><span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Last Service</span><span style={{ fontWeight: 600 }}>{eq.lastService || '-'}</span></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary flex-1" onClick={()=>open(eq)}>Edit</button>
                <button className="btn btn-danger" onClick={()=>del(eq._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="panel" style={{ width: '100%', maxWidth: '600px' }}>
            <div className="panel-header">
              {editId ? 'Edit Equipment' : 'Register Equipment'}
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)} style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>
            <div className="panel-body grid-2" style={{ padding: '1.5rem', gap: '1rem' }}>
              <div className="col-span-6 form-group"><label>Type</label>
                <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})}>
                  {Object.keys(EQ_COLORS).map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="col-span-6 form-group"><label>Equip No</label><input value={form.equipNo} onChange={e=>setForm({...form, equipNo: e.target.value})} /></div>
              <div className="col-span-6 form-group"><label>Name / Tag</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
              <div className="col-span-6 form-group"><label>Serial No</label><input value={form.serialNo} onChange={e=>setForm({...form, serialNo: e.target.value})} /></div>
              <div className="col-span-6 form-group"><label>Site</label><input value={form.site} onChange={e=>setForm({...form, site: e.target.value})} /></div>
              <div className="col-span-6 form-group"><label>Status</label>
                <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})}>
                  <option>Active</option><option>Under Maintenance</option>
                </select>
              </div>
              <div className="col-span-6 form-group"><label>Total Life Hrs</label><input value={form.totalLifeHrs} onChange={e=>setForm({...form, totalLifeHrs: e.target.value})} /></div>
              <div className="col-span-6 form-group"><label>Last Service</label><input type="date" value={form.lastService} onChange={e=>setForm({...form, lastService: e.target.value})} /></div>
              <div className="col-span-12 form-group"><label>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} /></div>
              <div className="col-span-12 flex justify-between mt-4">
                <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save Equipment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
