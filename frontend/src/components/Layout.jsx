import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiList, FiFileText, FiUser, FiLogOut, FiSettings, FiUsers, FiCalendar, FiTrendingUp, FiBox, FiLayout } from 'react-icons/fi';

const BOTTOM_NAV = [
  { to: '/',                   icon: FiHome,       label: 'Dashboard',   end: true },
  { to: '/jobs',               icon: FiList,       label: 'Jobs',        end: false },
  { to: '/reports',            icon: FiFileText,   label: 'Reports',     end: false },
  { to: '/production-planning',icon: FiLayout,     label: 'Production Planning', end: false },
  { to: '/inventory',          icon: FiBox,        label: 'Inventory',   end: false },
  { to: '/admin',              icon: FiSettings,   label: 'More',        end: false, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── TOP HEADER ── */}
      <header className="app-header">
        <div className="header-left">
          <img src="/logo.png" alt="Thriveni" className="header-logo" />
          <span className="header-title desktop-only">REBUILT CENTER</span>
        </div>

        <div className="header-right">
          {/* Desktop Navigation — uses CSS class to hide on mobile */}
          <nav className="desktop-nav desktop-only">
            {BOTTOM_NAV.filter(n => !n.adminOnly || user?.role === 'admin').map(n => (
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
            {user?.role === 'admin' && (
              <NavLink
                to="/users"
                className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
              >
                <FiUsers size={16} />
                <span>Users</span>
              </NavLink>
            )}
          </nav>

          {/* User avatar + name (desktop only) */}
          <div className="header-user desktop-only">
            <div className="header-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="header-username">{user?.name}</span>
          </div>

          <button onClick={handleLogout} className="header-logout-btn" title="Logout">
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
        {BOTTOM_NAV.filter(n => !n.adminOnly || user?.role === 'admin').map(n => {
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
