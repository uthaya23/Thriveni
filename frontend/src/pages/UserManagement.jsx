import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', username:'', password:'', role:'technician', active:true });
  const [editId, setEditId] = useState(null);

  // New Password Reset State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordUserId, setPasswordUserId] = useState(null);

  // Password Visibility State
  const [showPass, setShowPass] = useState({ main: false, new1: false, new2: false });
  const togglePass = (field) => setShowPass(p => ({ ...p, [field]: !p[field] }));

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

  const openPasswordModal = (u) => {
    setPasswordUserId(u._id);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const savePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match or are empty');
      return;
    }
    try {
      await api.put(`/users/${passwordUserId}`, { password: passwordForm.newPassword });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordUserId(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error changing password');
    }
  };

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
                <button className="btn btn-secondary flex-1" onClick={()=>openPasswordModal(u)}>Password</button>
                <button className="btn btn-danger" onClick={()=>del(u._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all"
            style={{ animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                {editId ? 'Edit User Credentials' : 'Register New User'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <input 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
                  placeholder="johndoe123"
                />
              </div>

              {!editId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPass.main ? "text" : "password"} 
                      value={form.password} 
                      onChange={e => setForm({...form, password: e.target.value})}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
                      placeholder="Enter a strong password"
                    />
                    <button type="button" onClick={() => togglePass('main')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPass.main ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Role</label>
                <select 
                  value={form.role} 
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800 appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="manager">Manager (Reporting & View)</option>
                  <option value="technician">Technician (Data Entry)</option>
                </select>
              </div>

              {/* Modern Toggle Switch */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-slate-800">Active Account</div>
                  <div className="text-xs text-slate-500">Allow this user to log in to the system.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({...form, active: !form.active})}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${form.active ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end rounded-b-2xl">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={save}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
              >
                {editId ? 'Save Changes' : 'Register User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={e => e.target === e.currentTarget && setShowPasswordModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all"
            style={{ animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                Change Password
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input 
                    type={showPass.new1 ? "text" : "password"} 
                    value={passwordForm.newPassword} 
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => togglePass('new1')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass.new1 ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPass.new2 ? "text" : "password"} 
                    value={passwordForm.confirmPassword} 
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none font-medium text-slate-800"
                    placeholder="Confirm new password"
                    style={{ borderColor: passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? '#ef4444' : undefined }}
                  />
                  <button type="button" onClick={() => togglePass('new2')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass.new2 ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end rounded-b-2xl">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={savePassword}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
