import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiList, FiDatabase, FiUser, FiLogOut, FiSettings, FiUsers, FiBox, FiLayout, FiChevronDown, FiGrid, FiActivity, FiCode } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';

const BOTTOM_NAV = [
  { to: '/',                   icon: FiHome,       label: 'Dashboard',   end: true },
  { to: '/jobs',               icon: FiList,       label: 'Jobs',        end: false },
  { to: '/reports',            icon: FiDatabase,   label: 'Master Data', end: false },
  { to: '/production-planning',icon: FiLayout,     label: 'Planning',    end: false, notTechnician: true },
  { to: '/inventory',          icon: FiBox,        label: 'Inventory',   end: false, notTechnician: true },
  { to: '/admin',              icon: FiSettings,   label: 'More',        end: false, adminOnly: true },
];

const DESKTOP_MAIN = [
  { to: '/',                   icon: FiHome,       label: 'Dashboard',   end: true },
  { to: '/jobs',               icon: FiList,       label: 'Jobs',        end: false },
  { to: '/reports',            icon: FiDatabase,   label: 'Master Data', end: false },
];

const DESKTOP_MORE = [
  { to: '/production-planning',icon: FiLayout,     label: 'Planning',    end: false, notTechnician: true },
  { to: '/inventory',          icon: FiBox,        label: 'Inventory',   end: false, notTechnician: true },
  { to: '/assets',             icon: FiDatabase,   label: 'Assets',      end: false, notTechnician: true },
  { to: '/users',              icon: FiUsers,      label: 'Users',       end: false, adminOnly: true },
  { to: '/templates',          icon: FiCode,       label: 'Templates',   end: false, adminOnly: true },
  { to: '/audit',              icon: FiActivity,   label: 'Audit Log',   end: false, adminOnly: true },
  { to: '/admin',              icon: FiSettings,   label: 'Settings',    end: false, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper for RBAC visibility
  const canSeeRoute = (navItem) => {
    if (navItem.adminOnly && user?.role !== 'admin') return false;
    if (navItem.notTechnician && user?.role === 'technician') return false;
    return true;
  };

  // Check if any "More" item is active to highlight the dropdown trigger
  const isMoreActive = DESKTOP_MORE.filter(canSeeRoute).some(n => 
    (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── TOP HEADER ── */}
      <header className="app-header">
        <div className="header-left">
          <img src="/logo.png" alt="Thriveni" className="header-logo" />
          <span className="header-title desktop-only">REBUILT CENTER</span>
        </div>

        <div className="header-right relative">
          {/* Desktop Navigation */}
          <nav className="desktop-nav desktop-only flex items-center gap-2">
            {DESKTOP_MAIN.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
              >
                <n.icon size={16} />
                <span>{n.label}</span>
              </NavLink>
            ))}

            {/* Dropdown for More Items */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`desktop-nav-link flex items-center gap-1 ${isMoreActive ? 'active' : ''}`}
              >
                <FiGrid size={16} />
                <span>Apps</span>
                <FiChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {DESKTOP_MORE.filter(canSeeRoute).map(n => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      onClick={() => setDropdownOpen(false)}
                      className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors ${
                        isActive ? 'text-blue-700 bg-blue-50/50' : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                      }`}
                    >
                      <n.icon size={16} />
                      <span>{n.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* User avatar + name (desktop only) */}
          <div className="header-user desktop-only ml-4 border-l border-slate-200 pl-4">
            <div className="header-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="header-username">{user?.name}</span>
          </div>

          <button onClick={handleLogout} className="header-logout-btn ml-2" title="Logout">
            <FiLogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, position: 'relative' }}>
        <Outlet />
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav className="bottom-nav mobile-only">
        {BOTTOM_NAV.filter(canSeeRoute).map(n => {
          const isActive = n.end
            ? location.pathname === n.to
            : location.pathname.startsWith(n.to);
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <n.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{n.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/profile"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <FiUser size={22} strokeWidth={1.5} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
