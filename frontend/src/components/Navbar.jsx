import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BellIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    dispatch(fetchUnreadAlerts());
    const interval = setInterval(() => dispatch(fetchUnreadAlerts()), 30000);
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

  const handleLogout = () => {
    dispatch(logout());
    setShowProfileMenu(false);
  };

  const roleConfig = {
    ADMIN: { label: 'Admin', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
    MANAGER: { label: 'Manager', color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
    EMPLOYEE: { label: 'Pharmacist', color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' }
  }[user?.role] || { label: 'Staff', color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-600', borderColor: 'border-slate-200' };

  const dashboardPath = isAdminOrManager ? '/dashboard' : '/employee-dashboard';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/employee-dashboard') return 'Dashboard';
    if (path === '/sell') return 'Dispense';
    if (path === '/products') return 'Products';
    if (path === '/products/add') return 'Add Product';
    if (path === '/raw-materials') return 'Generic Drugs';
    if (path === '/inventory') return 'Inventory';
    if (path === '/inventory/update') return 'Update Stock';
    if (path === '/batches') return 'Batch Records';
    if (path === '/alerts') return 'Alerts';
    if (path === '/categories') return 'Categories';
    if (path === '/suppliers') return 'Suppliers';
    if (path === '/transactions') return 'Transactions';
    if (path === '/reports') return 'Reports';
    if (path === '/employees') return 'Staff';
    if (path === '/employee-management') return 'Employee Management';
    if (path === '/password-reset-requests') return 'Access Control';
    return 'PharmaTrack Pro';
  };

  return (
    <nav className="sticky top-0 z-[100] h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 flex items-center justify-between shadow-sm shadow-cyan-500/5 transition-all">
      {/* Left Section - Logo & Page Title */}
      <div className="flex items-center space-x-6">
        <button 
          onClick={() => navigate(dashboardPath)}
          className="flex items-center space-x-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-all">
            <span className="text-xl font-black text-white italic">℞</span>
          </div>
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center space-x-3 border-l border-slate-800 pl-6 h-8">
          <div className={`w-2 h-2 rounded-full ${unreadAlerts?.length > 0 ? 'bg-rose-500 animate-pulse shadow-glow-rose' : 'bg-emerald-500 shadow-glow-emerald'}`} />
          <span className="text-sm font-semibold text-slate-300">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right Section - Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Search Toggle */}
        <button 
          onClick={() => setShowSearch(!showSearch)}
          className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-all border border-slate-800/50 hover:border-slate-700"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>

        {/* Quick Dispense Button */}
        <button 
          onClick={() => navigate('/sell')}
          className="hidden sm:flex items-center px-4 h-10 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 rounded-xl font-bold text-sm shadow-glow-cyan hover:-translate-y-0.5 transition-all"
        >
          <PlusCircleIcon className="h-4 w-4 mr-2" />
          New Dispense
        </button>

        {/* Alerts */}
        <button 
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all border border-slate-800/50"
        >
          <BellIcon className="h-5 w-5" />
          {unreadAlerts?.length > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-glow-rose">
              {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
            </span>
          )}
        </button>

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-3 p-1.5 rounded-xl bg-slate-800/50 border border-slate-800 hover:bg-slate-800 transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg ${roleConfig.bgColor.replace('100', '500/20')} ${roleConfig.borderColor.replace('200', '500/30')} border flex items-center justify-center`}>
              <UserCircleIcon className={`h-6 w-6 ${roleConfig.textColor.replace('600', '400')}`} />
            </div>
            <div className="hidden md:block text-left pr-2">
              <p className="text-sm font-semibold text-slate-200 leading-none group-hover:text-white transition-colors">{user?.fullName?.split(' ')[0]}</p>
              <p className={`text-[10px] font-semibold ${roleConfig.textColor.replace('600', '400')} mt-0.5`}>{roleConfig.label}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-72 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden animate-fade-slide-up origin-top-right z-[100]">
               <div className="p-5 bg-gradient-to-b from-slate-800/50 to-slate-900 border-b border-slate-800">
                 <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${roleConfig.bgColor.replace('100', '500/20')} ${roleConfig.borderColor.replace('200', '500/30')}`}>
                     <span className={`text-lg font-bold ${roleConfig.textColor.replace('600', '400')}`}>
                       {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                     </span>
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-white">{user?.fullName}</p>
                     <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                   </div>
                 </div>
                 <div className="mt-4 flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-lg border text-xs font-semibold ${roleConfig.bgColor.replace('100', '500/10')} ${roleConfig.textColor.replace('600', '400')} ${roleConfig.borderColor.replace('200', '500/20')}`}>{roleConfig.label}</span>
                    <span className="flex items-center text-xs font-medium text-emerald-400">
                       <ShieldCheckIcon className="h-4 w-4 mr-1" /> Verified
                    </span>
                 </div>
               </div>
               <div className="p-2 space-y-1">
                 <button 
                   onClick={() => { navigate(dashboardPath); setShowProfileMenu(false); }}
                   className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-all"
                 >
                    <HomeIcon className="h-5 w-5 mr-3" /> Dashboard
                 </button>
                 <button className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-all">
                    <Cog6ToothIcon className="h-5 w-5 mr-3" /> Settings
                 </button>
                 <button 
                   onClick={handleLogout}
                   className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
                 >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" /> Sign Out
                 </button>
               </div>
               <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Version 4.0 • GXP Compliant</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
