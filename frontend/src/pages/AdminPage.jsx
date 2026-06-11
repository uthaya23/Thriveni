import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [machines, setMachines] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [form, setForm] = useState({ name: '', make: '', category: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        api.get('/admin/machine-models'),
        api.get('/admin/component-types')
      ]);
      setMachines(mRes.data);
      setComponents(cRes.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const openModal = (type, item = null) => {
    setEditItem(item);
    setForm(item ? { ...item } : { name: '', make: '', category: '', description: '' });
    if (type === 'machine') setShowMachineModal(true);
    else setShowComponentModal(true);
  };
  
  const closeModal = () => {
    setShowMachineModal(false);
    setShowComponentModal(false);
    setEditItem(null);
  };

  const handleSave = async (type) => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const endpoint = type === 'machine' ? '/admin/machine-models' : '/admin/component-types';
    try {
      if (editItem) {
        await api.put(`${endpoint}/${editItem._id}`, form);
        toast.success('Updated successfully');
      } else {
        await api.post(endpoint, form);
        toast.success('Added successfully');
      }
      closeModal();
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving data'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    const endpoint = type === 'machine' ? '/admin/machine-models' : '/admin/component-types';
    try {
      await api.delete(`${endpoint}/${id}`);
      toast.success('Deleted successfully');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Master Data...</div>;

  return (
    <div className="grid-canvas">
      <div className="col-span-12 mb-4">
        <h1 className="text-2xl">Workshop Administration</h1>
        <p className="text-muted">Manage global machine models and component registries.</p>
      </div>

      {/* MACHINE MODELS */}
      <div className="col-span-6 panel">
        <div className="panel-header">
          <span>🚛 Machine Models</span>
          <button className="btn btn-primary" onClick={() => openModal('machine')}>+ Add Model</button>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Make</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 700 }}>{m.name}</td>
                    <td>{m.make || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" onClick={()=>openModal('machine', m)} style={{ padding: '0.2rem 0.5rem', marginRight: '0.5rem' }}>Edit</button>
                      <button className="btn btn-danger" onClick={()=>handleDelete('machine', m._id)} style={{ padding: '0.2rem 0.5rem' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* COMPONENT TYPES */}
      <div className="col-span-6 panel">
        <div className="panel-header">
          <span>🔩 Component Types</span>
          <button className="btn btn-primary" onClick={() => openModal('component')}>+ Add Component</button>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Component Name</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {components.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>{c.category || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" onClick={()=>openModal('component', c)} style={{ padding: '0.2rem 0.5rem', marginRight: '0.5rem' }}>Edit</button>
                      <button className="btn btn-danger" onClick={()=>handleDelete('component', c._id)} style={{ padding: '0.2rem 0.5rem' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {(showMachineModal || showComponentModal) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="panel-header">
              <span>{editItem ? 'Edit' : 'Add'} {showMachineModal ? 'Machine Model' : 'Component Type'}</span>
              <button className="btn btn-secondary" onClick={closeModal}>✕</button>
            </div>
            <div className="panel-body flex" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Enter name" />
              </div>
              {showMachineModal && (
                <div className="form-group">
                  <label>Make</label>
                  <input value={form.make} onChange={e=>set('make',e.target.value)} placeholder="e.g. HITACHI" />
                </div>
              )}
              <div className="form-group">
                <label>Category</label>
                <input value={form.category} onChange={e=>set('category',e.target.value)} placeholder="e.g. Dumper" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3} />
              </div>
              <div className="flex justify-between mt-4">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSave(showMachineModal ? 'machine' : 'component')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
