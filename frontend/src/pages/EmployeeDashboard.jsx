import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  BeakerIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  ClipboardDocumentListIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
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
    const numEnd = typeof end === 'number' ? end : 0;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
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

const StatCard = ({ title, rawValue, prefix = '', icon: Icon, accentColor, delay = 0, onClick }) => {
  const { ref, value } = useCountUp(rawValue || 0);
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
        <div className="p-3 rounded-xl" style={{ background: `${accentColor}15` }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { products } = useSelector((state) => state.products);
  const { inventory, lowStock } = useSelector((state) => state.inventory);
  const { unreadAlerts } = useSelector((state) => state.alerts);
  const [mySales, setMySales] = useState([]);
  const [mySalesSummary, setMySalesSummary] = useState({ totalSales: 0, count: 0 });

  const API_URL = 'http://localhost:8080';

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchInventory());
    dispatch(fetchLowStock());
    dispatch(fetchUnreadAlerts());
    fetchMySales();
  }, [dispatch]);

  const fetchMySales = async () => {
    try {
      const response = await fetch(`${API_URL}/sales/recent?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMySales(data);
        const today = new Date().toDateString();
        const todaySales = data.filter(s => new Date(s.createdAt).toDateString() === today);
        const total = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        setMySalesSummary({ totalSales: total, count: todaySales.length });
      }
    } catch (err) {
      console.error('Failed to fetch my sales', err);
    }
  };

  const getStockStatus = () => {
    const outOfStock = products.filter(p => p.currentStock === 0 || p.isOutOfStock).length;
    const lowStockItems = products.filter(p => p.currentStock > 0 && (p.isLowStock || p.currentStock <= p.minStockLevel)).length;
    const inStock = products.length - outOfStock - lowStockItems;
    return { outOfStock, lowStockItems, inStock };
  };

  const stockStatus = getStockStatus();
  const totalProducts = products.length || 1;
  const inStockPercent = Math.round((stockStatus.inStock / totalProducts) * 100);
  const lowStockPercent = Math.round((stockStatus.lowStockItems / totalProducts) * 100);
  const outOfStockPercent = Math.round((stockStatus.outOfStock / totalProducts) * 100);

  const getItemStockBadge = (item) => {
    if (item.currentQuantity === 0 || item.currentQuantity <= 0) {
      return { text: 'Out of Stock', class: 'badge-danger' };
    }
    return { text: 'Low Stock', class: 'badge-warning' };
  };

  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div
        className="card-glass animate-fade-slide-up stagger-1"
        style={{ borderLeft: '3px solid #2dd4bf' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm" style={{ color: '#64748b' }}>Good {greeting}! 👋</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: '#f1f5f9' }}>{user?.fullName}</h1>
            <span
              className="inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full"
              style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)' }}
            >
              💊 {user?.role === 'EMPLOYEE' ? 'Pharmacist' : user?.role}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: '#64748b' }}>My Dispensing Today</p>
            <p className="text-3xl font-bold" style={{ color: '#22d3ee' }}>₹{mySalesSummary.totalSales}</p>
            <p className="text-xs" style={{ color: '#475569' }}>{mySalesSummary.count} transactions</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Medications" rawValue={products.length} icon={BeakerIcon} accentColor="#38bdf8" delay={1} onClick={() => navigate('/products')} />
        <StatCard title="Inventory" rawValue={inventory.length} icon={ArchiveBoxIcon} accentColor="#10b981" delay={2} onClick={() => navigate('/inventory')} />
        <StatCard title="Alerts" rawValue={unreadAlerts.length} icon={ExclamationTriangleIcon} accentColor={unreadAlerts.length > 0 ? '#f43f5e' : '#64748b'} delay={3} onClick={() => navigate('/alerts')} />
        <div
          className="stat-card animate-fade-slide-up stagger-5 cursor-pointer"
          onClick={() => navigate('/sell')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Dispensing</p>
              <p className="stat-value" style={{ color: '#22d3ee' }}>POS</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(167,139,250,0.15)' }}>
              <CurrencyRupeeIcon className="h-5 w-5" style={{ color: '#a78bfa' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card animate-fade-slide-up stagger-5">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>⚡ Quick Actions</h2>
          <div className="space-y-2">
            {[
              { icon: CurrencyRupeeIcon, label: 'Dispense', desc: 'Open dispensing counter', to: '/sell', accent: '#10b981' },
              { icon: PlusIcon, label: 'Stock In', desc: 'Add received items', to: '/inventory/update', state: { defaultType: 'STOCK_IN' }, accent: '#38bdf8' },
              { icon: MinusIcon, label: 'Stock Out', desc: 'Record usage or wastage', to: '/inventory/update', state: { defaultType: 'STOCK_OUT' }, accent: '#f43f5e' },
              { icon: BeakerIcon, label: 'View Medications', desc: 'Browse all drugs', to: '/products', accent: '#a78bfa' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to, action.state ? { state: action.state } : undefined)}
                className="flex items-center w-full p-3 rounded-lg transition-all"
                style={{ background: `${action.accent}08`, border: `1px solid ${action.accent}15` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${action.accent}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${action.accent}08`; }}
              >
                <action.icon className="h-5 w-5 mr-3" style={{ color: action.accent }} />
                <div className="text-left">
                  <span className="font-medium text-sm" style={{ color: action.accent }}>{action.label}</span>
                  <p className="text-xs" style={{ color: '#475569' }}>{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* My Recent Sales */}
        <div className="card lg:col-span-2 animate-fade-slide-up stagger-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>📋 My Recent Dispensing</h2>
          {mySales.length === 0 ? (
            <div className="empty-state py-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(34,211,238,0.1)' }}>
                <CurrencyRupeeIcon className="h-6 w-6" style={{ color: '#22d3ee' }} />
              </div>
              <h3>No sales yet</h3>
              <p>Start dispensing to see your transactions here</p>
              <button onClick={() => navigate('/sell')} className="btn-primary mt-3 text-sm">
                Open POS
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {mySales.slice(0, 8).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors"
                  style={{ background: 'rgba(15,23,42,0.4)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.4)'; }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <CheckCircleIcon className="h-4 w-4" style={{ color: '#10b981' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                        {sale.customerName || sale.customerMobile || 'Walk-in'}
                      </p>
                      <p className="text-xs" style={{ color: '#475569' }}>
                        {sale.items?.length || 0} items • {new Date(sale.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold" style={{ color: '#22d3ee' }}>₹{sale.totalAmount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Overview & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Overview */}
        <div className="card animate-fade-slide-up">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>📊 Stock Overview</h2>
          <div className="space-y-4">
            {[
              { label: 'In Stock', value: stockStatus.inStock, percent: inStockPercent, color: '#10b981' },
              { label: 'Low Stock', value: stockStatus.lowStockItems, percent: lowStockPercent, color: '#f59e0b' },
              { label: 'Out of Stock', value: stockStatus.outOfStock, percent: outOfStockPercent, color: '#f43f5e' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: '#94a3b8' }}>{s.label}</span>
                  <span className="font-medium" style={{ color: s.color }}>{s.value} ({s.percent}%)</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(15,23,42,0.6)' }}>
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${s.percent}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="card animate-fade-slide-up">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f1f5f9' }}>📌 Pending Tasks</h2>
          {lowStock.length === 0 ? (
            <div className="empty-state py-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CheckCircleIcon className="h-6 w-6" style={{ color: '#10b981' }} />
              </div>
              <h3>All Good!</h3>
              <p>No urgent tasks at the moment</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {lowStock.slice(0, 6).map((item) => {
                const badge = getItemStockBadge(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{item.productName}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>Current: {item.currentQuantity} | Min: {item.minStockLevel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${badge.class}`}>{badge.text}</span>
                      <button
                        onClick={() => navigate('/inventory/update', { state: { productId: item.productId, defaultType: 'STOCK_IN' } })}
                        className="btn-success px-2 py-1 text-xs"
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
