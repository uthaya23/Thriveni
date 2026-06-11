import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiShield, FiCalendar, FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          
          {/* Header/Avatar Area */}
          <div className="bg-slate-900 p-10 text-center relative">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-slate-900 -mb-20 relative z-10">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          <div className="pt-16 pb-10 px-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{user?.name}</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{user?.role} • Workshop Personnel</p>
          </div>

          <div className="px-8 pb-10 space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                <FiMail size={18} />
              </div>
              <div className="text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Email Address</label>
                <div className="text-xs font-bold text-slate-700">{user?.email || 'N/A'}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                <FiShield size={18} />
              </div>
              <div className="text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Access Level</label>
                <div className="text-xs font-bold text-slate-700 uppercase">{user?.role || 'Technician'}</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full mt-6 bg-red-50 text-red-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-red-100 hover:bg-red-100 transition-all"
            >
              <FiLogOut size={18} />
              Sign Out from Device
            </button>
          </div>

        </div>
        
        <p className="text-center mt-10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Thriveni Workshop Management System v1.2
        </p>
      </div>
    </div>
  );
}
