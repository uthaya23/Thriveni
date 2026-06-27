import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
      toast.success('Access Granted');
    } catch {
      toast.error('Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ height: 60, marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Thriveni Logo" style={{ height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--thriveni-blue)', letterSpacing: '-0.02em' }}>REBUILT CENTER</h1>
          <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.5rem' }}>Workshop Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="Enter username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group relative">
            <label>Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={form.password} 
                onChange={e => setForm({ ...form, password: e.target.value })} 
                required 
                style={{ paddingRight: '2.5rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.85rem', width: '100%', fontSize: '1rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <p className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            THRIVENI ENTERPRISE © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
