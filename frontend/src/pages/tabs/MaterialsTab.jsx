import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUSES = ['Requested', 'Approved', 'Ordered', 'Received', 'Not Required'];

export default function MaterialsTab({ jobId }) {
  const [data, setData] = useState({ items: [], totalEstimatedCost: 0, notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/materials/${jobId}`).then(res => {
      if (res.data._id) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/materials/${jobId}`, data);
      setData(res.data);
      toast.success('Materials saved successfully');
    } catch {
      toast.error('Failed to save materials');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setData(d => ({
      ...d,
      items: [...d.items, { description: '', materialCode: '', quantity: 1, unit: 'Nos', unitCost: 0, status: 'Requested' }]
    }));
  };

  const removeItem = (idx) => {
    setData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setData(d => {
      const newItems = [...d.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      return { ...d, items: newItems };
    });
  };

  if (loading) return <div>Loading materials…</div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h2 style={{ fontSize:'1.1rem', fontWeight:800, color:'#1e293b' }}>🏪 Materials & Parts Store</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Saving…' : '💾 Save Materials'}</button>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div className="section-title" style={{ margin:0, border:0 }}>Requisition List</div>
          <button className="btn btn-outline btn-sm" onClick={addItem}>＋ Add Item</button>
        </div>

        {!data.items.length ? (
          <div className="empty-state" style={{ padding:'2rem' }}>No materials added yet.</div>
        ) : (
          <div className="table-wrap" style={{ marginBottom:'1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Description *</th>
                  <th>Mat. Code</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Cost (₹)</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i}>
                    <td><input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} style={{ padding:'0.3rem' }} placeholder="Part name" /></td>
                    <td><input value={item.materialCode||''} onChange={e=>updateItem(i,'materialCode',e.target.value)} style={{ padding:'0.3rem' }} /></td>
                    <td><input type="number" value={item.quantity} onChange={e=>updateItem(i,'quantity',Number(e.target.value))} style={{ padding:'0.3rem', width:70 }} min="1" /></td>
                    <td><input value={item.unit} onChange={e=>updateItem(i,'unit',e.target.value)} style={{ padding:'0.3rem', width:70 }} /></td>
                    <td><input type="number" value={item.unitCost} onChange={e=>updateItem(i,'unitCost',Number(e.target.value))} style={{ padding:'0.3rem', width:100 }} min="0" /></td>
                    <td>
                      <select value={item.status} onChange={e=>updateItem(i,'status',e.target.value)} style={{ padding:'0.3rem' }}>
                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><button className="btn btn-ghost btn-icon" onClick={()=>removeItem(i)} style={{ color:'var(--red)' }}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'1rem', padding:'1rem', background:'var(--surface2)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
          <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-muted)' }}>Estimated Total Cost:</span>
          <span style={{ fontSize:'1.25rem', fontWeight:800, color:'var(--primary)' }}>
            ₹ {data.items.reduce((s,i) => s + ((i.quantity||0)*(i.unitCost||0)), 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="section-title">Notes</div>
        <div className="form-group">
          <textarea value={data.notes||''} onChange={e=>setData(d=>({...d,notes:e.target.value}))} rows={3} placeholder="Additional notes for store / procurement…" />
        </div>
      </div>
    </div>
  );
}
