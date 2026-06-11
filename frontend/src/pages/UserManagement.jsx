import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', username:'', password:'', role:'technician', active:true });
  const [editId, setEditId] = useState(null);

  const fetch_ = async () => { try { const {data}=await api.get('/users'); setUsers(data); } catch { toast.error('Failed to load'); } };
  useEffect(()=>{fetch_();},[]);

  const save = async () => {
    try {
      if(editId) await api.put(`/users/${editId}`,form);
      else await api.post('/users',form);
      toast.success(editId?'Updated!':'User created!'); setShowModal(false); setEditId(null); fetch_();
    } catch(e){ toast.error(e.response?.data?.message||'Error'); }
  };
  const del = async id=>{ if(!window.confirm('Delete user?'))return; await api.delete(`/users/${id}`); toast.success('Deleted'); fetch_(); };
  const open = (u=null)=>{ setEditId(u?._id||null); setForm(u?{name:u.name,username:u.username,password:'',role:u.role,active:u.active}:{name:'',username:'',password:'',role:'technician',active:true}); setShowModal(true); };

  return (
    <div className="grid-canvas">
      <div className="col-span-12 flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl">Access & Security</h1>
          <p className="text-muted">Manage workshop personnel access levels and account status.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>open()}>+ Register User</button>
      </div>

      {users.length === 0 ? (
        <div className="col-span-12 panel">
          <div className="panel-body text-center text-muted" style={{ padding: '4rem' }}>
            No users found in the system.
          </div>
        </div>
      ) : (
        users.map(u => (
          <div key={u._id} className="col-span-4 panel">
            <div className="panel-body">
              <div className="flex items-center gap-4 mb-4">
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--thriveni-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{u.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>@{u.username}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span className={`status ${u.role === 'admin' ? 'dismantling' : u.role === 'manager' ? 'assembly' : 'completed'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: u.active ? '#16a34a' : '#dc2626' }}>{u.active ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>

              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={()=>open(u)}>Edit</button>
                <button className="btn btn-danger" onClick={()=>del(u._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="panel" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="panel-header">
              {editId ? 'Edit User Credentials' : 'Register New User'}
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)} style={{ padding: '0.2rem 0.5rem' }}>✕</button>
            </div>
            <div className="panel-body flex" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label>Username</label><input value={form.username} onChange={e=>setForm({...form, username: e.target.value})} /></div>
              <div className="form-group">
                <label>{editId ? 'New Password (Optional)' : 'Password'}</label>
                <input type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} placeholder={editId ? "Leave blank to keep current" : ""} />
              </div>
              <div className="form-group">
                <label>System Role</label>
                <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active: e.target.checked})} id="active-check" style={{ width: 'auto' }} />
                <label htmlFor="active-check" style={{ margin: 0 }}>Active Account</label>
              </div>
              <div className="flex justify-between mt-4">
                <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
