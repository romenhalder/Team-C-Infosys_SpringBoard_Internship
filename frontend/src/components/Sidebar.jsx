import { useState } from 'react';
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
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;

  const [openGroups, setOpenGroups] = useState({ medications: true, management: true });
  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (group) => {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Role-based accent
  const getRoleAccent = () => {
    if (isAdmin) return { accent: '#a78bfa', label: 'Administrator', dot: 'bg-purple-400' };
    if (isManager) return { accent: '#38bdf8', label: 'Manager', dot: 'bg-sky-400' };
    return { accent: '#2dd4bf', label: 'Pharmacist', dot: 'bg-teal-400' };
  };
  const role = getRoleAccent();

  const dashboardLink = isAdminOrManager
    ? { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' }
    : { to: '/employee-dashboard', icon: HomeIcon, label: 'Dashboard' };

  const sellLink = { to: '/sell', icon: CurrencyRupeeIcon, label: 'Dispensing (POS)' };

  const medicationGroup = {
    label: 'Medications',
    icon: BeakerIcon,
    links: [
      { to: '/products', icon: BeakerIcon, label: 'Branded Drugs' },
      { to: '/raw-materials', icon: CubeIcon, label: 'Generic Drugs' },
      ...(isAdminOrManager ? [
        { to: '/categories', icon: TagIcon, label: 'Categories' },
        { to: '/suppliers', icon: TruckIcon, label: 'Suppliers' },
      ] : []),
    ],
  };

  const inventoryLinks = [
    { to: '/inventory', icon: ArchiveBoxIcon, label: 'Inventory & Stock' },
    { to: '/batches', icon: ClipboardDocumentListIcon, label: 'Batch Management' },
    { to: '/alerts', icon: ExclamationTriangleIcon, label: 'Alerts & Expiry' },
  ];

  const managementGroup = isAdminOrManager ? {
    label: 'Management',
    icon: ChartBarIcon,
    links: [
      { to: '/transactions', icon: ClipboardDocumentListIcon, label: 'Transaction Log' },
      { to: '/reports', icon: ChartBarIcon, label: 'Reports & Analytics' },
      ...(isAdmin ? [
        { to: '/employees', icon: UsersIcon, label: 'Staff' },
        { to: '/password-reset-requests', icon: KeyIcon, label: 'Access Requests' },
      ] : []),
    ],
  } : null;

  const renderLink = (link) => {
    const Icon = link.icon;
    const isActive = location.pathname === link.to ||
      (link.to !== '/' && link.to !== '/dashboard' && link.to !== '/employee-dashboard' && location.pathname.startsWith(link.to));

    return (
      <NavLink
        key={link.to}
        to={link.to}
        title={collapsed ? link.label : undefined}
        className="flex items-center rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          padding: collapsed ? '0.625rem' : '0.625rem 0.75rem',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: isActive ? 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(6,182,212,0.08))' : 'transparent',
          color: isActive ? '#22d3ee' : '#94a3b8',
          border: isActive ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(34,211,238,0.06)';
            e.currentTarget.style.color = '#22d3ee';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="ml-3">{link.label}</span>}
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
        <div key={groupKey} className="space-y-1">
          {group.links.map(renderLink)}
        </div>
      );
    }

    return (
      <div key={groupKey} className="space-y-1">
        <button
          onClick={() => toggleGroup(groupKey)}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: hasActiveChild ? 'rgba(34,211,238,0.05)' : 'transparent',
            color: hasActiveChild ? '#67e8f9' : '#64748b',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = hasActiveChild ? 'rgba(34,211,238,0.05)' : 'transparent'; }}
        >
          <div className="flex items-center">
            <GroupIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span>{group.label}</span>
          </div>
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-4 space-y-0.5 pl-2" style={{ borderLeft: '2px solid rgba(34,211,238,0.1)' }}>
            {group.links.map(renderLink)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="flex flex-col transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '240px',
        minHeight: 'calc(100vh - 58px)',
        background: '#0f172a',
        borderRight: '1px solid rgba(148, 163, 184, 0.08)',
      }}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          {collapsed ? <Bars3Icon className="h-5 w-5" /> : <XMarkIcon className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {renderLink(dashboardLink)}
        {renderLink(sellLink)}

        <div className="py-2">
          <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }} />
        </div>

        {renderGroup(medicationGroup, 'medications')}

        <div className="py-2">
          <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }} />
        </div>

        {inventoryLinks.map(renderLink)}

        {managementGroup && (
          <>
            <div className="py-2">
              <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }} />
            </div>
            {renderGroup(managementGroup, 'management')}
          </>
        )}
      </nav>

      {/* Footer: Role & Compliance */}
      {!collapsed && (
        <div className="p-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${role.dot}`} />
            <span className="text-sm font-medium" style={{ color: role.accent }}>
              {role.label}
            </span>
          </div>
          <p className="text-xs mt-1 truncate" style={{ color: '#475569' }}>{user?.email}</p>
          <div className="mt-2 flex items-center text-[10px] font-semibold" style={{ color: '#10b981' }}>
            <ShieldCheckIcon className="h-3 w-3 mr-1" />
            DL Compliant
          </div>
        </div>
      )}

      {collapsed && (
        <div className="p-2 flex justify-center" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
          <div className={`w-2.5 h-2.5 rounded-full ${role.dot}`} title={role.label} />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;