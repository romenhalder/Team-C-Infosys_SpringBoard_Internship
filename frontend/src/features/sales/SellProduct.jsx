import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ShoppingBagIcon, 
  UserIcon, 
  IdentificationIcon, 
  TrashIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { fetchProducts, searchProducts } from '../products/productSlice';
import {
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createSale,
  fetchTodaySummary,
  clearError,
  clearSuccess
} from '../sales/salesSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SCHEDULE_BADGE_MAP = {
  H: 'badge-schedule-H',
  H1: 'badge-schedule-H1',
  X: 'badge-schedule-X',
  G: 'badge-schedule-G',
  OTC: 'badge-schedule-OTC',
};

const SellProduct = () => {
  const dispatch = useDispatch();
  const searchInputRef = useRef(null);
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const { cart, loading: salesLoading, error, success, todaySummary } = useSelector((state) => state.sales);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNumber, setDoctorRegNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [showBill, setShowBill] = useState(false);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [billCart, setBillCart] = useState([]);
  const [billTotal, setBillTotal] = useState(0);

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchTodaySummary());
    fetchRecentCustomers();
  }, [dispatch]);

  useEffect(() => {
    if (success && currentSale) {
      setShowPaymentAnimation(true);
      setTimeout(() => {
        setShowPaymentAnimation(false);
        setShowBill(true);
      }, 2500);
      dispatch(fetchTodaySummary());
    }
  }, [success, dispatch]);

  useEffect(() => {
    return () => { dispatch(clearError()); dispatch(clearSuccess()); };
  }, [dispatch]);

  const fetchRecentCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/sales/recent?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const sales = await response.json();
        const uniqueCustomers = [...new Map(sales.map(s => [s.customerMobile, s]))
          .values()].filter(s => s.customerMobile);
        setRecentCustomers(uniqueCustomers.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch recent customers', err);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) dispatch(searchProducts(term));
    else if (term.length === 0) dispatch(fetchProducts());
  };

  const handleAddToCart = (product, quantity = 1) => {
    if (!product.isSellable || product.availableStock <= 0) return;
    dispatch(addToCart({ product, quantity }));
  };

  const handleQuantityChange = (medicationId, quantity, newQty) => {
    const product = products.find(p => p.id === medicationId);
    if (newQty > 0 && newQty <= (product?.availableStock || 0)) {
      dispatch(updateCartItem({ medicationId, quantity: newQty }));
    } else if (newQty <= 0) {
      dispatch(removeFromCart(medicationId));
    }
  };

  const handleRemoveFromCart = (medicationId) => dispatch(removeFromCart(medicationId));
  const handleClearCart = () => { 
    dispatch(clearCart()); 
    setCustomerName(''); 
    setCustomerMobile(''); 
    setDoctorName(''); 
    setDoctorRegNumber(''); 
  };

  const handleCustomerMobileChange = (e) => {
    const mobile = e.target.value;
    setCustomerMobile(mobile);
    const existingCustomer = recentCustomers.find(c => c.customerMobile === mobile);
    if (existingCustomer?.customerName) setCustomerName(existingCustomer.customerName);
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const calculateItemCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const needsPrescription = cart.some(item =>
    item.requiresPrescription || ['H', 'H1', 'X'].includes(item.scheduleCategory)
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (needsPrescription && !doctorName) {
      alert('⚠️ Prescription drugs (Schedule H/H1/X) require Doctor details.');
      return;
    }

    setBillCart([...cart]);
    setBillTotal(calculateTotal());
    setCurrentSale({ orderNumber: 'RX-' + Date.now().toString().slice(-8) });

    const saleData = {
      customerName,
      customerMobile,
      doctorName: doctorName || null,
      doctorRegNumber: doctorRegNumber || null,
      paymentMethod,
      items: cart.map(item => ({
        medicationId: item.medicationId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    dispatch(createSale(saleData));
  };

  const handleNewSale = () => {
    setShowBill(false);
    setShowPaymentAnimation(false);
    setCurrentSale(null);
    setBillCart([]);
    setBillTotal(0);
    dispatch(clearCart());
    dispatch(clearSuccess());
    setCustomerName('');
    setCustomerMobile('');
    setDoctorName('');
    setDoctorRegNumber('');
    dispatch(fetchProducts());
    dispatch(fetchTodaySummary());
  };

  const downloadBillPDF = () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.width;
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, w, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PharmaTrack Pro', w / 2, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text('GXP COMPLIANT TAX INVOICE', w / 2, 26, { align: 'center' });

    let y = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice #:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(currentSale?.orderNumber || 'N/A', 40, y);
    doc.text(new Date().toLocaleString(), w - 14, y, { align: 'right' });
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['Product', 'Sch.', 'Qty', 'Unit Price', 'Total']],
      body: billCart.map(item => [
        item.productName,
        item.scheduleCategory || 'OTC',
        item.quantity,
        '₹' + item.unitPrice.toFixed(2),
        '₹' + item.totalPrice.toFixed(2)
      ]),
      headStyles: { fillColor: [6, 182, 212] },
    });

    y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ₹${billTotal.toFixed(2)}`, w - 14, y, { align: 'right' });
    doc.save(`Invoice_${currentSale?.orderNumber}.pdf`);
  };

  const filteredProducts = products.filter(p =>
    p.isActive && p.isSellable && (p.availableStock > 0 || p.currentStock > 0)
  );

  const formatCurrency = (amount) => '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5 h-[calc(100vh-120px)] flex flex-col">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-4 gap-4 animate-fade-slide-up">
        <div className="card-glass py-3 px-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Revenue</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(todaySummary?.totalSales)}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><CurrencyRupeeIcon className="h-6 w-6" /></div>
        </div>
        <div className="card-glass py-3 px-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Bills</p>
            <p className="text-xl font-bold text-cyan-400">{todaySummary?.transactionCount || 0}</p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500"><ShoppingBagIcon className="h-6 w-6" /></div>
        </div>
        <div className="card-glass py-3 px-5 col-span-2 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Pharmacist</p>
            <p className="text-sm font-bold text-slate-200">{user?.fullName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Station ID</p>
            <p className="text-sm font-mono text-cyan-400">COUNTER-01-RX</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* Product Catalog - Left */}
        <div className="flex-[2] flex flex-col min-w-0">
          <div className="card-glass p-4 mb-4 flex gap-4 items-center animate-fade-slide-up stagger-1">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search medication by name, molecule or SKU... (Ctrl+K)"
                value={searchTerm}
                onChange={handleSearch}
                className="input-field pl-10 h-11"
              />
            </div>
            <button onClick={() => dispatch(fetchProducts())} className="btn-secondary h-11 px-4">
              <ArrowPathIcon className={`h-5 w-5 ${productsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 animate-fade-slide-up stagger-2 custom-scrollbar">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state py-20">
                <BeakerIcon className="h-16 w-16 text-slate-700 mb-4" />
                <h3>No Sellable Medications Found</h3>
                <p>Ensure products are marked as 'Sellable' and have stock.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const inCart = cart.find(c => c.medicationId === product.id);
                  const scheduleClass = SCHEDULE_BADGE_MAP[product.scheduleCategory] || 'badge-schedule-OTC';
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      className={`group relative card-glass p-4 cursor-pointer transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-500/5 ${inCart ? 'ring-2 ring-cyan-500 border-transparent bg-cyan-500/10' : ''}`}
                    >
                      {inCart && (
                        <div className="absolute -top-2 -right-2 bg-cyan-500 text-slate-900 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-glow-cyan z-10">
                          {inCart.quantity}
                        </div>
                      )}
                      
                      <div className="mb-3 flex justify-between items-start">
                        <span className={`badge ${scheduleClass} text-[9px]`}>
                          {product.scheduleCategory || 'OTC'}
                        </span>
                        <span className={`text-[9px] font-bold ${product.availableStock <= 10 ? 'text-rose-400' : 'text-slate-500'}`}>
                          STOCK: {product.availableStock || product.currentStock}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-200 text-sm truncate group-hover:text-cyan-400 transition-colors">{product.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate mb-3">{product.manufacturer || 'General'}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black text-emerald-400">{formatCurrency(product.price)}</span>
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-500 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                          <PlusIcon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart & Patient Details - Right */}
        <div className="flex-1 flex flex-col min-w-[380px] animate-fade-slide-up stagger-3">
          <div className="card-glass p-6 flex-1 flex flex-col min-h-0 border-l-4 border-l-cyan-500">
            <h2 className="text-xl font-black text-slate-100 mb-6 flex items-center space-x-2">
              <ShoppingBagIcon className="h-6 w-6 text-cyan-400" />
              <span>TERMINAL CART</span>
              {cart.length > 0 && <span className="ml-auto text-xs font-bold text-slate-500">{cart.length} ITEMS</span>}
            </h2>

            {/* Patient Section */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Patient Mobile / ID" 
                  value={customerMobile}
                  onChange={handleCustomerMobileChange}
                  className="input-field pl-11 !bg-slate-900/50" 
                />
              </div>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Patient Full Name" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-field pl-11 !bg-slate-900/50" 
                />
              </div>

              {needsPrescription && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3 animate-pulse-subtle">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" /> Prescription Required
                  </p>
                  <input 
                    type="text" 
                    placeholder="Doctor Name (e.g. Dr. Satish)*" 
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className={`input-field h-9 text-xs !bg-slate-900/50 ${!doctorName ? 'border-amber-500/50' : ''}`} 
                  />
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <ShoppingBagIcon className="h-20 w-20 mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.medicationId} className="flex flex-col p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 pr-4">
                          <h5 className="font-bold text-slate-200 text-sm truncate">{item.productName}</h5>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${SCHEDULE_BADGE_MAP[item.scheduleCategory] || 'badge-schedule-OTC'}`}>
                            {item.scheduleCategory || 'OTC'}
                          </span>
                        </div>
                        <button onClick={() => handleRemoveFromCart(item.medicationId)} className="text-slate-600 hover:text-rose-400 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-1">
                          <button onClick={() => handleQuantityChange(item.medicationId, item.quantity, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600">-</button>
                          <span className="w-6 text-center text-xs font-bold text-slate-200">{item.quantity}</span>
                          <button onClick={() => handleQuantityChange(item.medicationId, item.quantity, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600">+</button>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500">{formatCurrency(item.unitPrice)}</div>
                          <div className="text-sm font-black text-emerald-400">{formatCurrency(item.totalPrice)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="pt-6 border-t border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Payable</span>
                <span className="text-3xl font-black text-cyan-400 drop-shadow-glow-cyan">{formatCurrency(calculateTotal())}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || salesLoading || (needsPrescription && !doctorName)}
                className="btn-primary w-full py-4 text-base font-black tracking-widest shadow-glow-cyan disabled:opacity-50"
              >
                {salesLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto" /> : 'VALIDATE & DISPENSE ℞'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showPaymentAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="text-center">
            <div className="w-32 h-32 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-glow-emerald animate-bounce">
              <CheckBadgeIcon className="h-20 w-20 text-slate-900" />
            </div>
            <h2 className="text-4xl font-black text-slate-100 mb-2">Prescription Filled</h2>
            <p className="text-slate-500 font-mono tracking-widest">SYNCING WITH RELEVANT DRUG REGISTRIES...</p>
          </div>
        </div>
      )}

      {/* Modern Bill Modal */}
      {showBill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="card-glass max-w-lg w-full p-8 space-y-8 animate-fade-slide-up">
            <div className="text-center border-b border-slate-800 pb-6">
              <div className="text-4xl font-black text-gradient-cyan mb-2">℞ PharmaTrack Pro</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">OFFICIAL TAX INVOICE</p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Invoice ID</p>
                <p className="font-mono text-slate-200">{currentSale?.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Date/Time</p>
                <p className="text-slate-200">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Patient</p>
                <p className="text-slate-200">{customerName || 'Walk-in Patient'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Mobile</p>
                <p className="text-slate-200">{customerMobile || '—'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-600 uppercase border-b border-slate-800 pb-2">Line Items</div>
              {billCart.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">{item.productName} <span className="text-[10px] text-slate-600">x{item.quantity}</span></span>
                  <span className="font-bold text-slate-200">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xl font-black">
                <span className="text-slate-400">GRAND TOTAL</span>
                <span className="text-emerald-400">{formatCurrency(billTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button 
                onClick={downloadBillPDF}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                <DocumentArrowDownIcon className="h-5 w-5 text-cyan-500" />
                <span>SAVE PDF</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                <PrinterIcon className="h-5 w-5 text-emerald-500" />
                <span>PRINT BILL</span>
              </button>
              <button 
                onClick={handleNewSale}
                className="col-span-2 py-4 rounded-xl bg-cyan-500 text-slate-900 font-black text-sm shadow-glow-cyan hover:scale-[1.02] transition-transform"
              >
                START NEW DISPENSING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellProduct;
