import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HomeIcon,
  BeakerIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UsersIcon,
  CubeIcon,
  KeyIcon,
  CurrencyRupeeIcon,
  TagIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;

  const [openGroups, setOpenGroups] = useState({ medications: true, inventory: true, management: true });
  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (group) => {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const roleConfig = useMemo(() => {
    if (isAdmin) return { label: 'Admin', color: 'indigo', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-400' };
    if (isManager) return { label: 'Manager', color: 'teal', bgColor: 'bg-teal-500/20', borderColor: 'border-teal-500/30', textColor: 'text-teal-400' };
    return { label: 'Pharmacist', color: 'emerald', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400' };
  }, [isAdmin, isManager]);

  const navLinks = [
    { to: isAdminOrManager ? '/dashboard' : '/employee-dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/sell', icon: CurrencyRupeeIcon, label: 'Dispense', highlight: true },
  ];

  const catalogGroup = {
    label: 'Drug Catalog',
    icon: BeakerIcon,
    links: [
      { to: '/products', icon: BeakerIcon, label: 'All Medications' },
      { to: '/raw-materials', icon: CubeIcon, label: 'Generic Drugs' },
      ...(isAdminOrManager ? [
        { to: '/categories', icon: TagIcon, label: 'Categories' },
        { to: '/suppliers', icon: TruckIcon, label: 'Suppliers' },
      ] : []),
    ],
  };

  const inventoryLinks = [
    { to: '/inventory', icon: ArchiveBoxIcon, label: 'Inventory' },
    { to: '/batches', icon: ClipboardDocumentListIcon, label: 'Batch Records' },
    { to: '/alerts', icon: ExclamationTriangleIcon, label: 'Alerts' },
  ];

  const managementGroup = isAdminOrManager ? {
    label: 'Management',
    icon: ChartBarIcon,
    links: [
      { to: '/transactions', icon: ClipboardDocumentListIcon, label: 'Transactions' },
      { to: '/reports', icon: ChartBarIcon, label: 'Reports' },
      ...(isAdmin ? [
        { to: '/employees', icon: UsersIcon, label: 'Staff' },
        { to: '/password-reset-requests', icon: KeyIcon, label: 'Access Control' },
      ] : []),
    ],
  } : null;

  const renderLink = (link) => {
    const Icon = link.icon;
    const isActive = location.pathname === link.to || 
                   (link.to !== '/' && !['/dashboard', '/employee-dashboard'].includes(link.to) && location.pathname.startsWith(link.to));

    return (
      <NavLink
        key={link.to}
        to={link.to}
        className={({ isActive }) => `
          flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group border border-transparent
          ${collapsed ? 'justify-center px-0' : 'justify-start'}
          ${isActive 
            ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border-cyan-500/30 text-cyan-400 shadow-glow-cyan' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400 hover:border-slate-800/50'}
        `}
      >
        <div className="relative">
          <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'} transition-colors`} />
          {link.highlight && !isActive && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          )}
        </div>
        {!collapsed && <span className="ml-3 truncate font-medium">{link.label}</span>}
      </NavLink>
    );
  };

  const renderGroup = (group, groupKey) => {
    if (!group) return null;
    const isOpen = openGroups[groupKey] !== false;
    const GroupIcon = group.icon;
    const hasActiveChild = group.links.some(
      (link) => location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))
    );

    if (collapsed) {
      return (
        <div key={groupKey} className="space-y-1 px-2">
          {group.links.map(renderLink)}
        </div>
      );
    }

    return (
      <div key={groupKey} className="space-y-1 px-3">
        <button
          onClick={() => toggleGroup(groupKey)}
          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border border-transparent
            ${hasActiveChild ? 'text-cyan-400 bg-slate-800/50 border-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
          `}
        >
          <div className="flex items-center">
            <GroupIcon className="h-5 w-5 mr-3" />
            <span>{group.label}</span>
          </div>
          {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </button>
        {isOpen && (
          <div className="ml-4 space-y-1 border-l-2 border-slate-800 pl-4">
            {group.links.map(renderLink)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 z-40 bg-slate-900 overflow-hidden border-r border-slate-800`}
      style={{
        width: collapsed ? '80px' : '280px',
        height: '100vh',
      }}
    >
      {/* Top Accent Bar */}
      <div className={`h-1 w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500`} />

      {/* Collapse Action */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm italic">℞</span>
            </div>
            <span className="font-bold text-white text-sm">PharmaTrack</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-all border border-slate-800/50 hover:border-slate-800"
        >
          {collapsed ? <Bars3Icon className="h-5 w-5" /> : <XMarkIcon className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-2 custom-scrollbar">
        {/* Main Navigation */}
        <div className="space-y-1 px-3">
          {navLinks.map(renderLink)}
        </div>

        <div className="px-4 py-2">
          <div className="h-px bg-slate-800" />
        </div>

        {/* Catalog Group */}
        <div className="px-2">
          <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2 ${collapsed ? 'hidden' : ''}`}>Catalog</p>
          {renderGroup(catalogGroup, 'catalog')}
        </div>

        {/* Inventory Group */}
        <div className="px-2">
          <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2 ${collapsed ? 'hidden' : ''}`}>Stock</p>
          <div className="space-y-1 px-3">
            {inventoryLinks.map(renderLink)}
          </div>
        </div>

        {/* Management Group */}
        {managementGroup && (
          <>
            <div className="px-4 py-2">
              <div className="h-px bg-slate-800" />
            </div>
            <div className="px-2">
              <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2 ${collapsed ? 'hidden' : ''}`}>Management</p>
              {renderGroup(managementGroup, 'management')}
            </div>
          </>
        )}
      </nav>

      {/* Role Footer */}
      <div className={`p-4 border-t border-slate-800 bg-slate-900 transition-all ${collapsed ? 'items-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className={`w-10 h-10 rounded-xl ${roleConfig.bgColor} border ${roleConfig.borderColor} flex items-center justify-center ${roleConfig.textColor} font-bold text-sm`}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
              <p className={`text-xs font-medium ${roleConfig.textColor}`}>{roleConfig.label}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <ShieldCheckIcon className="h-4 w-4" />
              <span className="font-medium">GXP Compliant</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
