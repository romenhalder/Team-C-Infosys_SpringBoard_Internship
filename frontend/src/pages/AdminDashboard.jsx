import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
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
  CpuChipIcon,
  BoltIcon,
  GlobeAltIcon,
  ClockIcon,
  DocumentCheckIcon,
  PlusCircleIcon,
  UserGroupIcon,
  TruckIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { fetchProducts } from '../features/products/productSlice';
import { fetchInventory, fetchLowStock } from '../features/inventory/inventorySlice';
import { fetchUnreadAlerts } from '../features/alerts/alertSlice';

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

const ModernStatCard = ({ title, rawValue, prefix = '', suffix = '', icon: Icon, accentColor, trend, delay = 0, onClick, description }) => {
  const numericValue = typeof rawValue === 'string' ? parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 0 : rawValue || 0;
  const { ref, value } = useCountUp(numericValue);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer group animate-fade-slide-up shadow-lg"
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-2">
            {prefix && <span className="text-3xl font-bold text-slate-300">{prefix}</span>}
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {value.toLocaleString('en-IN')}
            </span>
            {suffix && <span className="text-lg font-semibold text-slate-300">{suffix}</span>}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend >= 0 ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
              <span>{Math.abs(trend)}% vs last period</span>
            </div>
          )}
        </div>
        <div 
          className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Icon className="h-8 w-8" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
};

const AlertCard = ({ item, onNavigate }) => (
  <div 
    onClick={onNavigate}
    className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer group"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
        <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
      </div>
      <div>
        <p className="font-semibold text-rose-100 group-hover:text-white transition-colors">{item.productName}</p>
        <p className="text-sm text-rose-400/80">{item.message || 'Low stock alert'}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-2xl font-bold text-rose-500">{item.currentQuantity}</p>
      <p className="text-xs text-rose-500/50 uppercase tracking-wider font-bold">units left</p>
    </div>
  </div>
);

const QuickActionButton = ({ icon: Icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300 group shadow-md"
  >
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors" style={{ backgroundColor: `${color}15` }}>
      <Icon className="h-6 w-6" style={{ color }} />
    </div>
    <p className="text-sm font-semibold text-slate-300 group-hover:text-cyan-400">{label}</p>
  </button>
);

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
  const [currentTime, setCurrentTime] = useState(new Date());

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

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [dispatch]);

  const fetchPasswordResetCount = async () => {
    try { const r = await axios.get(`${API_URL}/password-reset/requests/count`, { headers: { Authorization: `Bearer ${token}` } }); setPasswordResetCount(r.data.count); } catch (err) { console.error(err); }
  };
  const fetchTodaySales = async () => {
    try { const r = await axios.get(`${API_URL}/sales/summary/today`, { headers: { Authorization: `Bearer ${token}` } }); setTodaySales(r.data); } catch (err) { console.error(err); }
  };
  const fetchRecentSales = async () => {
    try { const r = await axios.get(`${API_URL}/sales/recent?limit=5`, { headers: { Authorization: `Bearer ${token}` } }); setRecentSales(r.data); } catch (err) { console.error(err); }
  };

  const getStockStatus = () => {
    const outOfStock = products.filter(p => p.currentStock === 0 || p.isOutOfStock).length;
    const lowStockItems = products.filter(p => p.currentStock > 0 && (p.isLowStock || p.currentStock <= p.minStockLevel)).length;
    const inStock = products.length - outOfStock - lowStockItems;
    return { outOfStock, lowStockItems, inStock };
  };
  const stockStatus = getStockStatus();

  return (
    <div className="space-y-8 pb-10">
      {/* Modern Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-fade-slide-up">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-glow-cyan" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Live Dashboard</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">{user?.fullName?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 font-medium flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && passwordResetCount > 0 && (
            <Link
              to="/password-reset-requests"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 hover:bg-amber-500/20 transition-all shadow-glow-amber"
            >
              <KeyIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">{passwordResetCount} Reset Requests</span>
            </Link>
          )}
          <button
            onClick={() => navigate('/sell')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl shadow-glow-cyan hover:-translate-y-0.5 transition-all"
          >
            <PlusCircleIcon className="h-5 w-5" />
            <span>New Dispense</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid - Modern Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatCard 
          title="Today's Revenue" 
          rawValue={todaySales.totalSales} 
          prefix="₹" 
          icon={CurrencyRupeeIcon} 
          accentColor="#14B8A6"
          trend={12.5}
          delay={0}
          onClick={() => navigate('/sell')}
          description="Total sales today"
        />
        <ModernStatCard 
          title="Prescriptions" 
          rawValue={todaySales.transactionCount || 0} 
          icon={DocumentCheckIcon} 
          accentColor="#3B82F6"
          trend={8.2}
          delay={1}
          onClick={() => navigate('/transactions')}
          description="Orders processed"
        />
        <ModernStatCard 
          title="Total Products" 
          rawValue={products.length} 
          icon={BeakerIcon} 
          accentColor="#8B5CF6"
          delay={2}
          onClick={() => navigate('/products')}
          description="In formulary"
        />
        <ModernStatCard 
          title="Active Alerts" 
          rawValue={lowStock.length} 
          icon={ExclamationTriangleIcon} 
          accentColor={lowStock.length > 0 ? "#F43F5E" : "#10B981"}
          delay={3}
          onClick={() => navigate('/alerts')}
          description={lowStock.length > 0 ? 'Require attention' : 'All systems normal'}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-glow-emerald transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ArchiveBoxIcon className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stockStatus.inStock}</p>
            <p className="text-sm text-emerald-400 font-medium">In Stock</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-glow-amber transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stockStatus.lowStockItems}</p>
            <p className="text-sm text-amber-400 font-medium">Low Stock</p>
          </div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-glow-rose transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <ArchiveBoxIcon className="h-6 w-6 text-rose-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stockStatus.outOfStock}</p>
            <p className="text-sm text-rose-400 font-medium">Out of Stock</p>
          </div>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-glow-cyan transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <BellAlertIcon className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{unreadAlerts?.length || 0}</p>
            <p className="text-sm text-cyan-400 font-medium">Unread Alerts</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Sales Table */}
        <div className="lg:col-span-2 card-glass p-0 overflow-hidden animate-fade-slide-up" style={{ animationDelay: '320ms' }}>
          <div className="px-6 py-5 border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 shadow-glow-cyan flex items-center justify-center">
                <ClipboardDocumentListIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                <p className="text-sm text-slate-400">Latest dispensing records</p>
              </div>
            </div>
            <Link to="/transactions" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View All
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <ClipboardDocumentListIcon className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-semibold text-slate-400">No transactions yet</p>
                <p className="text-sm">Start a new dispense to see records here</p>
              </div>
            ) : (
              <table className="table-dark w-full border-none !shadow-none !rounded-none">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-cyan-400">{sale.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200">{sale.customerName || 'Walk-in'}</p>
                        <p className="text-xs text-slate-500">{sale.customerMobile || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {sale.items?.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="text-xs font-semibold text-slate-300">
                              {item.medicationName || 'Product'} <span className="text-cyan-400">x{item.quantity}</span>
                            </span>
                          ))}
                          {sale.items?.length > 2 && (
                            <span className="text-[10px] text-slate-500 mt-0.5">+{sale.items.length - 2} more...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-400">₹{sale.totalAmount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-400">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>        {/* Right Column - Quick Actions & System Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card-glass animate-fade-slide-up" style={{ animationDelay: '400ms' }}>
            <h3 className="text-lg font-bold text-white mb-5">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton icon={BeakerIcon} label="Add Product" onClick={() => navigate('/products/add')} color="#8B5CF6" />
              <QuickActionButton icon={ArchiveBoxIcon} label="Update Stock" onClick={() => navigate('/inventory/update')} color="#3B82F6" />
              <QuickActionButton icon={UserGroupIcon} label="Staff" onClick={() => navigate('/employees')} color="#22D3EE" />
              <QuickActionButton icon={TruckIcon} label="Suppliers" onClick={() => navigate('/suppliers')} color="#F59E0B" />
            </div>
          </div>

          {/* System Health */}
          <div className="card-glass animate-fade-slide-up" style={{ animationDelay: '480ms' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">System Status</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-emerald" />
                <span className="text-xs font-semibold text-emerald-400">Operational</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Database Connection', status: 'Connected', color: 'emerald' },
                { label: 'Inventory Sync', status: lowStock.length === 0 ? 'Synced' : 'Needs Attention', color: lowStock.length === 0 ? 'emerald' : 'amber' },
                { label: 'Compliance Status', status: 'GXP Compliant', color: 'cyan' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <span className="text-sm font-medium text-slate-300">{item.label}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                    item.color === 'amber' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      {lowStock.length > 0 && (
        <div className="bg-slate-900/50 rounded-2xl border border-rose-500/30 overflow-hidden shadow-glow-rose animate-fade-slide-up">
          <div className="px-6 py-5 border-b border-rose-500/20 bg-gradient-to-r from-rose-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Stock Alerts</h2>
                <p className="text-sm text-slate-400">{lowStock.length} items require attention</p>
              </div>
            </div>
            <button onClick={() => navigate('/alerts')} className="text-sm font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
              Resolve All
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStock.slice(0, 6).map((item) => (
              <AlertCard 
                key={item.id} 
                item={item} 
                onNavigate={() => navigate(`/inventory/update?productId=${item.productId}`)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
