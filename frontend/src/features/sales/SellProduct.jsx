import { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  MinusIcon, 
  TrashIcon, 
  ShoppingCartIcon, 
  UserCircleIcon, 
  IdentificationIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ArchiveBoxIcon,
  PrinterIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { fetchProducts } from '../products/productSlice';
import { createSale, clearSuccess } from './salesSlice';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SellProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const { loading: saleLoading, success: saleSuccess, lastCreatedSale } = useSelector((state) => state.sales);
  const { user } = useSelector((state) => state.auth);

  /* ─── State ─── */
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    customerName: '',
    customerMobile: '',
    doctorName: '',
    doctorRegNumber: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [prescriptionError, setPrescriptionError] = useState(false);

  /* ─── Fetch Data ─── */
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  /* ─── Success Handling ─── */
  useEffect(() => {
    if (saleSuccess) {
      setShowReceiptModal(true);
      setCart([]);
      setCustomerInfo({ customerName: '', customerMobile: '', doctorName: '', doctorRegNo: '' });
      dispatch(clearSuccess());
    }
  }, [saleSuccess, dispatch]);

  /* ─── Computed ─── */
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || p.categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    const cats = ['ALL', ...new Set(products.map(p => p.categoryName))].filter(Boolean);
    return cats;
  }, [products]);

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  /* ─── Cart Logic ─── */
  const addToCart = (product) => {
    // FIX: Using availableStock OR currentStock to bypass the "Dispensing not working" issue
    const available = product.availableStock !== undefined ? product.availableStock : product.currentStock;
    
    if (available <= 0) {
      alert(`Terminal Alert: ${product.name} is currently out of stock.`);
      return;
    }

    const existingIdx = cart.findIndex(item => item.medicationId === product.id);
    if (existingIdx > -1) {
      if (cart[existingIdx].quantity + 1 > available) {
        alert('Inventory Limit: Insufficient batch stock for this SKU.');
        return;
      }
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      newCart[existingIdx].totalPrice = newCart[existingIdx].quantity * newCart[existingIdx].unitPrice;
      setCart(newCart);
    } else {
      setCart([...cart, {
        medicationId: product.id,
        productName: product.name,
        unitPrice: product.mrp || product.price || 0,
        quantity: 1,
        totalPrice: product.mrp || product.price || 0,
        scheduleCategory: product.regulatorySchedule || product.scheduleCategory
      }]);
    }
  };

  const updateQuantity = (idx, delta) => {
    const newCart = [...cart];
    const product = products.find(p => p.id === newCart[idx].medicationId);
    const available = product.availableStock !== undefined ? product.availableStock : product.currentStock;

    if (newCart[idx].quantity + delta > available) {
      alert('Threshold Reached: Cannot dispense more than available inventory.');
      return;
    }
    
    newCart[idx].quantity += delta;
    if (newCart[idx].quantity <= 0) {
      removeLineItem(idx);
    } else {
      newCart[idx].totalPrice = newCart[idx].quantity * newCart[idx].unitPrice;
      setCart(newCart);
    }
  };

  const removeLineItem = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  /* ─── Execution ─── */
  const requiresPrescription = cart.some(item => 
    item.scheduleCategory === 'H' || item.scheduleCategory === 'H1' || item.scheduleCategory === 'X'
  );

  const handleCheckout = () => {
    if (cart.length === 0) return alert('Session Empty: No items staged for dispensing.');
    
    if (requiresPrescription && (!customerInfo.doctorName || !customerInfo.doctorRegNumber)) {
      setPrescriptionError(true);
      alert('Prescription Required: Scheduled drugs (H/H1/X) mandate Doctor Name and Reg Number.');
      return;
    }
    
    setPrescriptionError(false);
    const payload = {
      ...customerInfo,
      paymentMethod,
      items: cart.map(item => ({
        medicationId: item.medicationId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };
    
    dispatch(createSale(payload));
  };

  const ScheduleBadge = ({ schedule }) => {
    if (!schedule) return null;
    let style = "badge-neutral text-slate-400";
    if (schedule === 'H') style = "badge-schedule-H";
    if (schedule === 'H1') style = "badge-schedule-H1";
    if (schedule === 'X') style = "badge-schedule-X";
    if (schedule === 'G') style = "badge-schedule-G";
    if (schedule === 'OTC') style = "badge-schedule-OTC";
    
    return <span className={`badge ${style} ml-2`}>{schedule}</span>;
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 animate-fade-slide-up">
      
      {/* LEFT: Inventory Selector */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="card-glass p-0 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArchiveBoxIcon className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">Medical Inventory</h2>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-black text-cyan-500 uppercase">System Ready</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Scan SKU or Search Name..." 
                  className="input-field pl-12 h-12 !bg-slate-950/50 border-slate-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="input-field h-12 w-48 !bg-slate-950/50 border-slate-800"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 custom-scrollbar">
            {filteredProducts.map(product => {
              const available = product.availableStock !== undefined ? product.availableStock : product.currentStock;
              const isOut = available <= 0;
              return (
                <div 
                  key={product.id}
                  onClick={() => !isOut && addToCart(product)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-44 relative ${
                    isOut ? 'opacity-40 grayscale border-slate-800 bg-slate-900/20' : 
                    'bg-slate-900/40 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-mono text-slate-500 tracking-tighter">{product.sku}</span>
                      <ScheduleBadge schedule={product.regulatorySchedule || product.scheduleCategory} />
                    </div>
                    <h4 className="text-sm font-black text-slate-200 line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors uppercase">
                      {product.name}
                    </h4>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      <p className="text-label">Stock</p>
                      <p className={`text-xl font-black font-digit ${isOut ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {available}
                      </p>
                    </div>
                    <div className="text-right">
                       <p className="text-label">MRP</p>
                       <p className="text-lg font-black text-white font-digit">₹{product.mrp || product.price}</p>
                    </div>
                  </div>
                  {isOut && <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] uppercase text-rose-500 tracking-widest bg-slate-950/40">Out of Stock</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: POS Cart */}
      <div className="w-full lg:w-[450px] flex flex-col h-full overflow-hidden">
        <div className="card-glass p-0 h-full flex flex-col border-t-4 border-t-indigo-500">
           <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">Dispensing Cart</h2>
              <span className="text-[10px] font-mono text-slate-500">COUNTER-01</span>
           </div>

           <div className="p-6 border-b border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  className="input-field h-10 !bg-slate-950/30 border-slate-800 text-xs" 
                  placeholder="Patient Name"
                  value={customerInfo.customerName}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerName: e.target.value})}
                />
                <input 
                  className="input-field h-10 !bg-slate-950/30 border-slate-800 text-xs" 
                  placeholder="Patient Mobile"
                  value={customerInfo.customerMobile}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerMobile: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  className={`input-field h-10 !bg-slate-950/30 text-xs ${prescriptionError && !customerInfo.doctorName ? 'border-rose-500' : 'border-slate-800'}`} 
                  placeholder={requiresPrescription ? "Doctor Name *" : "Doctor Name"}
                  value={customerInfo.doctorName}
                  onChange={(e) => {
                    setCustomerInfo({...customerInfo, doctorName: e.target.value});
                    if (e.target.value) setPrescriptionError(false);
                  }}
                />
                <input 
                  className={`input-field h-10 !bg-slate-950/30 text-xs ${prescriptionError && !customerInfo.doctorRegNumber ? 'border-rose-500' : 'border-slate-800'}`} 
                  placeholder={requiresPrescription ? "Reg No. *" : "Reg No. (Optional)"}
                  value={customerInfo.doctorRegNumber}
                  onChange={(e) => {
                    setCustomerInfo({...customerInfo, doctorRegNumber: e.target.value});
                    if (e.target.value) setPrescriptionError(false);
                  }}
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {cart.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 group animate-fade-slide-up">
                  <div className="flex justify-between mb-3">
                    <h5 className="text-[13px] font-black text-slate-200 truncate uppercase">{item.productName}</h5>
                    <button onClick={() => removeLineItem(idx)} className="text-slate-600 hover:text-rose-500 transition-colors"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                      <button onClick={() => updateQuantity(idx, -1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800">
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-black font-digit text-cyan-400">{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800">
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-600 uppercase">Subtotal</p>
                       <p className="text-sm font-black text-white font-digit">₹{item.totalPrice}</p>
                    </div>
                  </div>
                </div>
              ))}
           </div>

           <div className="p-6 bg-slate-950/50 border-t border-slate-800 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                <span className="text-2xl font-black text-white font-digit tracking-tighter">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                {['CASH', 'UPI', 'CARD'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{m}</button>
                ))}
              </div>

              <button
                disabled={cart.length === 0 || saleLoading}
                onClick={handleCheckout}
                className="w-full h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 group"
              >
                {saleLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-white" /> : (
                  <>
                    <span className="text-sm font-black uppercase tracking-widest italic">Process Transaction</span>
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
           </div>
        </div>
      </div>

      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
           <div className="max-w-md w-full card-glass p-8 text-center space-y-6 border-t-4 border-t-emerald-500 shadow-glow-emerald">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center"><ClipboardDocumentCheckIcon className="h-10 w-10 text-emerald-500" /></div>
              <h3 className="text-2xl font-black text-white">Dispense Complete</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Order ID: #{lastCreatedSale?.orderNumber}</p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={() => setShowReceiptModal(false)} className="btn-secondary h-12 text-[10px] font-black uppercase">New Session</button>
                 <button 
                  onClick={() => {
                    const doc = new jsPDF();
                    doc.setFontSize(22);
                    doc.text('PharmaTrack Pro - Receipt', 20, 20);
                    doc.setFontSize(10);
                    doc.text(`Order: ${lastCreatedSale.orderNumber}`, 20, 30);
                    doc.text(`Patient: ${lastCreatedSale.customerName || 'N/A'}`, 20, 35);
                    doc.autoTable({
                      startY: 45,
                      head: [['Medication', 'Qty', 'Price', 'Total']],
                      body: lastCreatedSale.items.map(item => [item.productName, item.quantity, item.unitPrice, item.totalPrice]),
                    });
                    doc.text(`Total: Rs. ${lastCreatedSale.totalAmount}`, 150, doc.lastAutoTable.finalY + 10);
                    doc.save(`receipt_${lastCreatedSale.orderNumber}.pdf`);
                  }}
                  className="btn-success h-12 flex items-center justify-center space-x-2 text-[10px] font-black uppercase"
                 >
                   Download Bill
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SellProduct;
