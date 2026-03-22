import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BellIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { logout } from '../features/auth/authSlice';
import { fetchUnreadAlerts } from '../features/alerts/alertSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { unreadAlerts } = useSelector((state) => state.alerts);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const profileRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    dispatch(fetchUnreadAlerts());
    const interval = setInterval(() => dispatch(fetchUnreadAlerts()), 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setShowProfileMenu(false);
  };

  // Role-based accent colors
  const getRoleConfig = () => {
    if (isAdmin) return { text: 'Admin', accent: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' };
    if (isManager) return { text: 'Manager', accent: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)' };
    return { text: 'Pharmacist', accent: '#2dd4bf', bg: 'rgba(45,212,191,0.15)', border: 'rgba(45,212,191,0.3)' };
  };

  const roleConfig = getRoleConfig();
  const dashboardPath = isAdminOrManager ? '/dashboard' : '/employee-dashboard';

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        }}
      >
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center" style={{ height: '56px' }}>
            {/* Logo & Brand */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate(dashboardPath)}
                className="flex items-center space-x-2.5 group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                    boxShadow: '0 4px 12px rgba(34,211,238,0.25)',
                  }}
                >
                  <span className="text-lg font-black text-slate-900">℞</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold tracking-tight text-slate-100">PharmaTrack</span>
                  <span className="text-cyan-400 font-bold ml-1">Pro</span>
                </div>
              </button>

              {/* Quick Nav */}
              <div className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: (location.pathname === dashboardPath || location.pathname === '/') ? 'rgba(34,211,238,0.1)' : 'transparent',
                    color: (location.pathname === dashboardPath || location.pathname === '/') ? '#22d3ee' : '#94a3b8',
                  }}
                  onMouseEnter={(e) => { if (location.pathname !== dashboardPath && location.pathname !== '/') e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { if (location.pathname !== dashboardPath && location.pathname !== '/') e.target.style.background = 'transparent'; }}
                >
                  <HomeIcon className="h-4 w-4 inline mr-1" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/sell')}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: location.pathname === '/sell' ? 'rgba(34,211,238,0.1)' : 'transparent',
                    color: location.pathname === '/sell' ? '#22d3ee' : '#94a3b8',
                  }}
                  onMouseEnter={(e) => { if (location.pathname !== '/sell') e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { if (location.pathname !== '/sell') e.target.style.background = 'transparent'; }}
                >
                  <CurrencyRupeeIcon className="h-4 w-4 inline mr-1" />
                  Dispensing
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Alerts */}
              <button
                onClick={() => navigate('/alerts')}
                className="relative p-2 rounded-full transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <BellIcon className="h-5 w-5" />
                {unreadAlerts && unreadAlerts.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold text-white rounded-full animate-subtle-pulse"
                    style={{ background: '#f43f5e', minWidth: '18px', height: '18px' }}
                  >
                    {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                  </span>
                )}
              </button>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-1.5 rounded-lg transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${roleConfig.accent}, ${roleConfig.accent}88)`,
                      boxShadow: `0 2px 8px ${roleConfig.accent}40`,
                    }}
                  >
                    <span className="text-sm font-bold text-slate-900">
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-200 leading-tight">{user?.fullName}</p>
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                      style={{ background: roleConfig.bg, color: roleConfig.accent, border: `1px solid ${roleConfig.border}` }}
                    >
                      {roleConfig.text}
                    </span>
                  </div>
                </button>

                {showProfileMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl py-1 z-50 overflow-hidden animate-fade-slide-up"
                    style={{
                      background: 'rgba(30, 41, 59, 0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <p className="text-sm font-semibold text-slate-100">{user?.fullName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                      <span
                        className="inline-block mt-1.5 px-2 py-0.5 text-xs font-bold rounded"
                        style={{ background: roleConfig.bg, color: roleConfig.accent, border: `1px solid ${roleConfig.border}` }}
                      >
                        {roleConfig.text}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-3 text-sm transition-colors"
                      style={{ color: '#fb7185' }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(244,63,94,0.1)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Progress Bar */}
        <div
          className="h-[2px] transition-all duration-150"
          style={{
            width: `${scrollProgress}%`,
            background: 'linear-gradient(90deg, #22d3ee, #10b981)',
            opacity: scrollProgress > 0 ? 1 : 0,
          }}
        />
      </nav>
    </>
  );
};

export default Navbar;
