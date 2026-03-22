import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  BeakerIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  KeyIcon,
  CurrencyRupeeIcon,
  EyeIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { fetchProducts } from '../features/products/productSlice';
import { fetchInventory, fetchLowStock } from '../features/inventory/inventorySlice';
import { fetchUnreadAlerts } from '../features/alerts/alertSlice';

/* ─── Count-Up Hook ─── */
const useCountUp = (end, duration = 800) => {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const startedRef = useRef(false);

  const startAnimation = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const numEnd = typeof end === 'string' ? parseFloat(end.replace(/[^0-9.]/g, '')) || 0 : end || 0;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(numEnd * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  useEffect(() => {
    startedRef.current = false;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) startAnimation(); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startAnimation]);

  return { ref, value };
};

/* ─── Stat Card Component ─── */
const StatCard = ({ title, rawValue, prefix = '', icon: Icon, accentColor, link, delay = 0, onClick }) => {
  const numericValue = typeof rawValue === 'string' ? parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 0 : rawValue || 0;
  const { ref, value } = useCountUp(numericValue);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`stat-card animate-fade-slide-up stagger-${delay + 1} cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value">{prefix}{value.toLocaleString('en-IN')}</p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: `${accentColor}15` }}
        >
          <Icon className="h-6 w-6" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  const { products } = useSelector((state) => state.products);
  const { lowStock } = useSelector((state) => state.inventory);
  const { unreadAlerts } = useSelector((state) => state.alerts);
  const [passwordResetCount, setPasswordResetCount] = useState(0);
  const [todaySales, setTodaySales] = useState({ totalSales: 0, transactionCount: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchInventory());
    dispatch(fetchLowStock());
    dispatch(fetchUnreadAlerts());
    if (isAdmin) fetchPasswordResetCount();
    fetchTodaySales();
    fetchRecentSales();
  }, [dispatch]);

  const fetchPasswordResetCount = async () => {
    try { const r = await axios.get(`${API_URL}/password-reset/requests/count`, { headers: { Authorization: `Bearer ${token}` } }); setPasswordResetCount(r.data.count); } catch (err) { console.error(err); }
  };
  const fetchTodaySales = async () => {
    try { const r = await axios.get(`${API_URL}/sales/summary/today`, { headers: { Authorization: `Bearer ${token}` } }); setTodaySales(r.data); } catch (err) { console.error(err); }
  };
  const fetchRecentSales = async () => {
    try { const r = await axios.get(`${API_URL}/sales/recent?limit=10`, { headers: { Authorization: `Bearer ${token}` } }); setRecentSales(r.data); } catch (err) { console.error(err); }
  };

  const stats = [
    { title: "Today's Revenue", rawValue: todaySales.totalSales || 0, prefix: '₹', icon: CurrencyRupeeIcon, accentColor: '#22d3ee', link: '/sell' },
    { title: 'Prescriptions Today', rawValue: todaySales.transactionCount || 0, icon: ChartBarIcon, accentColor: '#38bdf8', link: '/transactions' },
    { title: 'Total Medications', rawValue: products.length, icon: BeakerIcon, accentColor: '#a78bfa', link: '/products' },
    { title: 'Low Stock / Expiry', rawValue: lowStock.length, icon: ExclamationTriangleIcon, accentColor: lowStock.length > 0 ? '#f43f5e' : '#10b981', link: '/alerts' },
    ...(isAdmin ? [{ title: 'Access Requests', rawValue: passwordResetCount, icon: KeyIcon, accentColor: passwordResetCount > 0 ? '#f59e0b' : '#64748b', link: '/password-reset-requests' }] : []),
  ];

  const getStockStatus = () => {
    const outOfStock = products.filter(p => p.currentStock === 0 || p.isOutOfStock).length;
    const lowStockItems = products.filter(p => p.currentStock > 0 && (p.isLowStock || p.currentStock <= p.minStockLevel)).length;
    const inStock = products.length - outOfStock - lowStockItems;
    return { outOfStock, lowStockItems, inStock };
  };
  const stockStatus = getStockStatus();

  const getItemStockBadge = (item) => {
    if (item.currentQuantity === 0 || item.currentQuantity <= 0) return { text: 'Out of Stock', class: 'badge-danger' };
    return { text: 'Low Stock', class: 'badge-warning' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-slide-up stagger-1">
        <div>
          <h1 className="text-3xl font-bold text-gradient-cyan">
            {isAdmin ? 'Admin' : 'Manager'} Dashboard
          </h1>
          <p style={{ color: '#64748b' }}>Welcome back, {user?.fullName}!</p>
        </div>
        <button
          onClick={() => navigate('/sell')}
          className="btn-primary flex items-center space-x-2 px-5 py-2.5"
        >
          <span className="text-lg">℞</span>
          <span>New Dispensing</span>
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={i}
            onClick={() => navigate(stat.link)}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="card lg:col-span-2 animate-fade-slide-up stagger-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Recent Transactions</h2>
            <button
              onClick={() => navigate('/transactions')}
              className="text-sm font-medium"
              style={{ color: '#22d3ee' }}
            >
              View All →
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="empty-state py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(34,211,238,0.1)' }}>
                <ClipboardDocumentListIcon className="h-6 w-6" style={{ color: '#22d3ee' }} />
              </div>
              <h3>No transactions today</h3>
              <p>Start dispensing to see transactions here</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Patient</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Pharmacist</th>
                    <th>Payment</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <>
                      <tr key={sale.id}>
                        <td className="font-medium" style={{ color: '#f1f5f9' }}>{sale.orderNumber}</td>
                        <td>
                          <div style={{ color: '#cbd5e1' }}>{sale.customerName || '—'}</div>
                          {sale.customerMobile && <div className="text-xs" style={{ color: '#475569' }}>{sale.customerMobile}</div>}
                        </td>
                        <td>{sale.items?.length || 0} meds</td>
                        <td className="font-semibold" style={{ color: '#22d3ee' }}>₹{sale.totalAmount}</td>
                        <td>{sale.soldByName || '—'}</td>
                        <td>
                          <span className="badge badge-info">{sale.paymentMethod || 'CASH'}</span>
                        </td>
                        <td style={{ color: '#64748b' }}>
                          {new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                            className="transition-colors"
                            style={{ color: '#64748b' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#22d3ee'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedSale === sale.id && sale.items && (
                        <tr key={`${sale.id}-details`}>
                          <td colSpan="8" style={{ background: 'rgba(34,211,238,0.03)', padding: '0.75rem 1rem' }}>
                            <div className="text-xs font-medium mb-2" style={{ color: '#64748b' }}>Dispensed Items:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs px-3 py-1.5 rounded" style={{ background: 'rgba(15,23,42,0.5)' }}>
                                  <span style={{ color: '#cbd5e1' }}>{item.productName}</span>
                                  <span style={{ color: '#64748b' }}>
                                    {item.quantity} × ₹{item.unitPrice} = <span className="font-semibold" style={{ color: '#22d3ee' }}>₹{item.totalPrice}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions & Status */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="card animate-fade-slide-up stagger-5">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BeakerIcon, label: 'Add Medication', to: '/products/add', accent: '#22d3ee' },
                { icon: ArchiveBoxIcon, label: 'Update Stock', to: '/inventory/update', accent: '#38bdf8' },
                { icon: ExclamationTriangleIcon, label: 'Alerts & Expiry', to: '/alerts', accent: '#f59e0b', count: lowStock.length },
                { icon: CurrencyRupeeIcon, label: 'Dispensing', to: '/sell', accent: '#a78bfa' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to)}
                  className="relative p-3 rounded-lg text-center transition-all"
                  style={{ background: `${action.accent}08`, border: `1px solid ${action.accent}20` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${action.accent}15`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${action.accent}08`; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <action.icon className="h-6 w-6 mx-auto mb-1" style={{ color: action.accent }} />
                  <span className="text-xs font-medium" style={{ color: action.accent }}>{action.label}</span>
                  {action.count > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ background: '#f43f5e' }}>
                      {action.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Status */}
          <div className="card animate-fade-slide-up stagger-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>Inventory Status</h2>
            <div className="space-y-3">
              {[
                { label: 'In Stock', value: stockStatus.inStock, color: '#10b981' },
                { label: 'Low Stock', value: stockStatus.lowStockItems, color: '#f59e0b' },
                { label: 'Out of Stock', value: stockStatus.outOfStock, color: '#f43f5e' },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{s.label}</span>
                  </div>
                  <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/products')}
              className="w-full mt-4 text-sm font-medium"
              style={{ color: '#22d3ee' }}
            >
              View All Medications →
            </button>
          </div>

          {/* Pending Resets */}
          {isAdmin && passwordResetCount > 0 && (
            <div
              className="card animate-fade-slide-up stagger-6"
              style={{ borderLeft: '3px solid #f59e0b' }}
            >
              <div className="flex items-center space-x-3 mb-2">
                <KeyIcon className="h-5 w-5" style={{ color: '#f59e0b' }} />
                <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>Pending Resets</h2>
              </div>
              <p className="text-sm mb-3" style={{ color: '#64748b' }}>
                {passwordResetCount === 1 ? '1 pending' : `${passwordResetCount} pending`} password reset request(s).
              </p>
              <Link to="/password-reset-requests" className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                Review Requests →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStock.length > 0 && (
        <div className="card animate-fade-slide-up" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6" style={{ color: '#f59e0b' }} />
            <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Stock & Expiry Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Current Stock</th>
                  <th>Min Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 5).map((item) => {
                  const badge = getItemStockBadge(item);
                  return (
                    <tr key={item.id}>
                      <td className="font-medium" style={{ color: '#f1f5f9' }}>{item.productName}</td>
                      <td>{item.currentQuantity}</td>
                      <td>{item.minStockLevel}</td>
                      <td><span className={`badge ${badge.class}`}>{badge.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lowStock.length > 5 && (
            <button onClick={() => navigate('/inventory')} className="mt-4 text-sm font-medium" style={{ color: '#22d3ee' }}>
              View all {lowStock.length} stock alerts →
            </button>
          )}
        </div>
      )}
    </div>
  );
};


export default AdminDashboard;
