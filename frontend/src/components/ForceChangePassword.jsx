import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function ForceChangePassword() {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await api.post('/auth/change-password', { newPassword: password });
      toast.success('Password updated successfully! Please log in again.');
      logout(); // Force them to log in with new password
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiLock className="text-blue-700 text-2xl" />
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Update Required</h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          Welcome, {user?.name}! Your current password is temporary. You must create a new password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <input 
                type={showConfirm ? 'text' : 'password'}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-blue-700/20 disabled:opacity-70 mt-4"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <button 
          onClick={logout}
          className="w-full mt-6 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600"
        >
          Cancel and Log Out
        </button>
      </div>
    </div>
  );
}
