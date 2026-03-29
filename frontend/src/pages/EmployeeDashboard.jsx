import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  ArrowRightIcon,
  BoltIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { fetchProducts } from '../features/products/productSlice';
import { fetchInventory, fetchLowStock } from '../features/inventory/inventorySlice';
import { fetchUnreadAlerts } from '../features/alerts/alertSlice';

/* ─── Count-Up Hook ─── */
const useCountUp = (end, duration = 1000) => {
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
      const eased = 1 - Math.pow(1 - progress, 4); // Quartic ease out
      setValue(Math.floor(numEnd * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  useEffect(() => {
    startedRef.current = false;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) startAnimation(); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startAnimation]);

  return { ref, value };
};

const StatCard = ({ title, rawValue, prefix = '', icon: Icon, accentColor, delay = 0, trend }) => {
  const { ref, value } = useCountUp(rawValue || 0);
  return (
    <div
      ref={ref}
      className={`card-glass p-6 animate-fade-slide-up stagger-${delay + 1} group hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-label uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-black text-white font-digit tracking-tighter">
              {prefix}{value.toLocaleString('en-IN')}
            </h3>
            {trend && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: accentColor }} />
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
  }, [dispatch, token]);

  const fetchMySales = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/sales/recent?limit=20`, {
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
  }, [token]);

  const stockStats = useMemo(() => {
    const outOfStock = products.filter(p => p.currentStock === 0 || p.isOutOfStock).length;
    const lowStockItems = products.filter(p => p.currentStock > 0 && (p.isLowStock || p.currentStock <= p.minStockLevel)).length;
    const inStock = products.length - outOfStock - lowStockItems;
    return { outOfStock, lowStockItems, inStock, total: products.length || 1 };
  }, [products]);

  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="space-y-8 pb-10">
      {/* Dynamic Header */}
      <div className="animate-fade-slide-up flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-glow-cyan" />
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Pharmacist Active Terminal</p>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none italic">
            Good {greeting}, <span className="text-gradient-cyan">{user?.fullName?.split(' ')[0]}</span>
          </h1>
          <div className="flex items-center space-x-4">
             <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase">
                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
             </div>
             <div className="flex items-center text-[10px] font-bold text-emerald-500 uppercase">
                <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" />
                GXP Certified Access
             </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
           <button 
            onClick={() => navigate('/sell')}
            className="h-12 px-6 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center group"
          >
             <CurrencyRupeeIcon className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
             Dispensing Terminal
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
            title="Today's Dispensing" 
            rawValue={mySalesSummary.totalSales} 
            prefix="₹" 
            icon={CurrencyRupeeIcon} 
            accentColor="#22d3ee" 
            trend={12} 
            delay={0} 
          />
         <StatCard 
            title="Active Inventory" 
            rawValue={products.length} 
            icon={BeakerIcon} 
            accentColor="#10b981" 
            delay={1} 
          />
         <StatCard 
            title="Active Alerts" 
            rawValue={unreadAlerts.length} 
            icon={ExclamationTriangleIcon} 
            accentColor={unreadAlerts.length > 0 ? '#f43f5e' : '#64748b'} 
            delay={2} 
          />
         <StatCard 
            title="Batch Count" 
            rawValue={inventory.length} 
            icon={ArchiveBoxIcon} 
            accentColor="#a78bfa" 
            delay={3} 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Command Center */}
        <div className="card-glass p-0 flex flex-col overflow-hidden animate-fade-slide-up stagger-4">
           <div className="p-6 border-b border-slate-800 bg-slate-900/40">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center">
                 <BoltIcon className="h-4 w-4 mr-2 text-cyan-400" />
                 Command Center
              </h2>
           </div>
           <div className="p-4 space-y-2">
              {[
                { icon: CurrencyRupeeIcon, label: 'Start POS', desc: 'Open dispensing counter', to: '/sell', color: 'indigo' },
                { icon: PlusIcon, label: 'Stock In', desc: 'Record batch arrival', to: '/inventory/update', state: { defaultType: 'STOCK_IN' }, color: 'emerald' },
                { icon: MinusIcon, label: 'Stock Out', desc: 'Wastage or returns', to: '/inventory/update', state: { defaultType: 'STOCK_OUT' }, color: 'rose' },
                { icon: BeakerIcon, label: 'Drug Catalog', desc: 'Search medications', to: '/products', color: 'cyan' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to, action.state ? { state: action.state } : undefined)}
                  className="w-full flex items-center p-4 rounded-2xl bg-slate-950/40 border border-slate-900 hover:border-slate-700 hover:bg-slate-900/60 transition-all group"
                >
                  <div className={`p-3 rounded-xl bg-${action.color}-500/10 text-${action.color}-500 group-hover:bg-${action.color}-500 group-hover:text-slate-950 transition-all`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-black text-slate-100 group-hover:text-white transition-colors uppercase">{action.label}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{action.desc}</p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 ml-auto text-slate-700 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
                </button>
              ))}
           </div>
        </div>

        {/* Live Transaction Log */}
        <div className="lg:col-span-2 card-glass p-0 flex flex-col overflow-hidden animate-fade-slide-up stagger-5 border-t-4 border-t-indigo-500">
           <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center">
                 <ClockIcon className="h-4 w-4 mr-2 text-indigo-400" />
                 Live Dispensing Feed
              </h2>
              <button onClick={fetchMySales} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <BoltIcon className="h-4 w-4 text-slate-500" />
              </button>
           </div>
           <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40">
                       <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient / Mobile</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Items Dispensed</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                       <th className="px-6 py-4 text-right"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                    {mySales.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-900/40 transition-colors group">
                        <td className="px-6 py-4">
                           <p className="text-xs font-black text-slate-300">
                             {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                           <p className="text-[10px] text-slate-600 font-bold uppercase">{sale.orderNumber}</p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 mr-3">
                                {(sale.customerName || 'W').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-200 uppercase">{sale.customerName || 'Walk-in'}</p>
                                <p className="text-[10px] text-slate-600 font-bold">{sale.customerMobile || '—'}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                             {sale.items?.slice(0, 2).map((item, idx) => (
                               <span key={idx} className="text-[11px] font-bold text-slate-300">
                                 {item.medicationName || 'Product'} <span className="text-emerald-400 font-digit">x{item.quantity}</span>
                               </span>
                             ))}
                             {sale.items?.length > 2 && (
                               <span className="text-[9px] font-black text-slate-500 mt-0.5 tracking-widest uppercase">+{sale.items.length - 2} more...</span>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-white font-digit">
                           ₹{sale.totalAmount?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="p-2 rounded-lg bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-500 hover:text-slate-950">
                             <ClipboardDocumentListIcon className="h-4 w-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {mySales.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-20 text-center">
                           <div className="flex flex-col items-center opacity-20">
                              <ArchiveBoxIcon className="h-12 w-12 mb-4" />
                              <p className="text-xs font-black uppercase tracking-[0.3em]">No Transactions Registered</p>
                           </div>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* Inventory Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-slide-up stagger-6">
         <div className="card-glass p-6">
            <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest mb-6 flex items-center">
               <ChartBarIcon className="h-4 w-4 mr-2 text-emerald-400" />
               Stock Distribution
            </h2>
            <div className="space-y-6">
               {[
                 { label: 'In Stock', val: stockStats.inStock, color: 'emerald' },
                 { label: 'Low Stock', val: stockStats.lowStockItems, color: 'amber' },
                 { label: 'Critically Out', val: stockStats.outOfStock, color: 'rose' },
               ].map((s, i) => {
                 const percent = Math.round((s.val / stockStats.total) * 100);
                 return (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                        <span className={`text-sm font-black text-${s.color}-500 font-digit`}>{s.val} Units [{percent}%]</span>
                     </div>
                     <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden border border-slate-900">
                        <div 
                          className={`h-full bg-${s.color}-500 rounded-full transition-all duration-1000 delay-500 shadow-glow-${s.color}`}
                          style={{ width: `${percent}%` }}
                        />
                     </div>
                   </div>
                 );
               })}
            </div>
         </div>

         <div className="card-glass p-6 border-t-4 border-t-rose-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center">
                 <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-rose-500" />
                 Low Stock Alerts
              </h2>
              <button className="text-[10px] font-black text-rose-500 uppercase hover:underline">View All</button>
            </div>
            <div className="space-y-3">
               {lowStock.slice(0, 5).map((item, i) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900 group">
                    <div className="flex items-center">
                       <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-4 animate-pulse" />
                       <span className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-rose-400 transition-colors leading-none">{item.productName}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                       <span className="text-[10px] font-black text-slate-600 font-digit">{item.currentQuantity}/{item.minStockLevel}</span>
                       <button 
                        onClick={() => navigate('/inventory/update', { state: { productId: item.productId, defaultType: 'STOCK_IN' } })}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                      >
                         <PlusIcon className="h-4 w-4" />
                       </button>
                    </div>
                 </div>
               ))}
               {lowStock.length === 0 && (
                 <div className="py-10 text-center opacity-30">
                    <CheckCircleIcon className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Stock Integrity Optimal</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
