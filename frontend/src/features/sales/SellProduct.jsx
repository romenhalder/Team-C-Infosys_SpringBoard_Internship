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

           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <ShoppingCartIcon className="h-16 w-16 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cart Empty</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  <div className="px-4 py-2 bg-slate-950/40 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cart.length} Item{cart.length > 1 ? 's' : ''}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Subtotal</span>
                  </div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-slate-900/40 transition-colors group">
                      <div className="flex items-center justify-between gap-3">
                        {/* Remove Button */}
                        <button 
                          onClick={() => removeLineItem(idx)} 
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                        
                        {/* Name + Unit Price */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-200 truncate uppercase leading-tight">{item.productName}</p>
                          <p className="text-[9px] font-bold text-slate-600">₹{item.unitPrice} / unit</p>
                        </div>
                        
                        {/* Qty Controls - Compact */}
                        <div className="flex items-center bg-slate-950/60 rounded-lg border border-slate-800 flex-shrink-0">
                          <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded-l-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-[11px] font-black font-digit text-cyan-400">{item.quantity}</span>
                          <button onClick={() => updateQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center rounded-r-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                        
                        {/* Line Total */}
                        <span className="text-sm font-black text-white font-digit w-16 text-right flex-shrink-0">₹{item.totalPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
           <div className="max-w-lg w-full card-glass p-8 text-center space-y-6 border-t-4 border-t-emerald-500 shadow-glow-emerald">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center"><ClipboardDocumentCheckIcon className="h-10 w-10 text-emerald-500" /></div>
              <h3 className="text-2xl font-black text-white">Dispense Complete</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Invoice: #{lastCreatedSale?.orderNumber}</p>
              
              {/* Quick Summary */}
              {lastCreatedSale && (
                <div className="text-left bg-slate-950/40 rounded-xl p-4 border border-slate-800 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {lastCreatedSale.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-300 truncate mr-2">{item.medicationName || item.productName} <span className="text-cyan-400">x{item.quantity}</span></span>
                      <span className="text-white font-bold font-digit flex-shrink-0">₹{item.totalPrice}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase">Total</span>
                    <span className="text-lg font-black text-emerald-400 font-digit">₹{lastCreatedSale.totalAmount}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                 <button onClick={() => setShowReceiptModal(false)} className="btn-secondary h-12 text-[10px] font-black uppercase">New Session</button>
                 <button 
                  onClick={() => {
                    if (!lastCreatedSale) return;
                    const sale = lastCreatedSale;
                    const doc = new jsPDF();
                    const pw = doc.internal.pageSize.width;
                    let y = 14;

                    // === HEADER ===
                    doc.setFillColor(15, 23, 42);
                    doc.rect(0, 0, pw, 38, 'F');
                    doc.setTextColor(255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
                    doc.text('\u211e PharmaTrack Pro', 14, y + 6);
                    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                    doc.text('TAX INVOICE', pw - 14, y + 4, { align: 'right' });
                    doc.setFontSize(8);
                    doc.text(`Invoice #: ${sale.orderNumber}`, pw - 14, y + 10, { align: 'right' });
                    doc.text(`Date: ${new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pw - 14, y + 16, { align: 'right' });
                    doc.text('GSTIN: XXXXXXXXXXXX', 14, y + 16);
                    doc.text('Lic. No: XX-XXXXX', 14, y + 22);

                    y = 46;
                    doc.setTextColor(0);
                    
                    // === PATIENT INFO ===
                    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
                    doc.text('Bill To:', 14, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Patient: ${sale.customerName || 'Walk-in Customer'}`, 14, y + 5);
                    doc.text(`Mobile: ${sale.customerMobile || 'N/A'}`, 14, y + 10);
                    if (sale.doctorName) doc.text(`Dr. ${sale.doctorName} (Reg: ${sale.doctorRegNumber || 'N/A'})`, pw/2, y + 5);
                    doc.text(`Payment: ${sale.paymentMethod || 'CASH'}`, pw/2, y + 10);

                    y += 18;

                    // === ITEMS TABLE ===
                    const items = sale.items || [];
                    const tableBody = items.map((item, i) => [
                      String(i + 1),
                      item.medicationName || item.productName || 'Item',
                      item.hsnCode || '-',
                      String(item.quantity),
                      `\u20b9${Number(item.unitPrice || 0).toFixed(2)}`,
                      `${Number(item.gstSlab || 0)}%`,
                      `\u20b9${Number(item.totalPrice || 0).toFixed(2)}`,
                    ]);

                    doc.autoTable({
                      startY: y,
                      head: [['#', 'Medicine', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount']],
                      body: tableBody,
                      theme: 'grid',
                      headStyles: { fillColor: [6, 182, 212], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, halign: 'center' },
                      bodyStyles: { fontSize: 8 },
                      columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { cellWidth: 55 },
                        2: { halign: 'center', cellWidth: 18 },
                        3: { halign: 'center', cellWidth: 14 },
                        4: { halign: 'right', cellWidth: 22 },
                        5: { halign: 'center', cellWidth: 16 },
                        6: { halign: 'right', cellWidth: 25 },
                      },
                      margin: { left: 14, right: 14 },
                    });

                    y = doc.lastAutoTable.finalY + 8;

                    // === TOTALS ===
                    const subtotal = Number(sale.subtotal || sale.totalAmount || 0);
                    const cgst = Number(sale.cgstAmount || 0);
                    const sgst = Number(sale.sgstAmount || 0);
                    const discount = Number(sale.discountAmount || 0);
                    const total = Number(sale.totalAmount || 0);

                    const summaryX = pw - 80;
                    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                    doc.text('Subtotal:', summaryX, y); doc.text(`\u20b9${subtotal.toFixed(2)}`, pw - 14, y, { align: 'right' }); y += 5;
                    doc.text('CGST:', summaryX, y); doc.text(`\u20b9${cgst.toFixed(2)}`, pw - 14, y, { align: 'right' }); y += 5;
                    doc.text('SGST:', summaryX, y); doc.text(`\u20b9${sgst.toFixed(2)}`, pw - 14, y, { align: 'right' }); y += 5;
                    if (discount > 0) {
                      doc.text('Discount:', summaryX, y); doc.text(`-\u20b9${discount.toFixed(2)}`, pw - 14, y, { align: 'right' }); y += 5;
                    }
                    doc.setDrawColor(100); doc.line(summaryX, y, pw - 14, y); y += 4;
                    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
                    doc.text('Total:', summaryX, y); doc.text(`\u20b9${total.toFixed(2)}`, pw - 14, y, { align: 'right' }); y += 10;

                    // === FOOTER ===
                    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(130);
                    doc.text('GST is computed internally on Cost Price for compliance. Customer total = SP x Qty.', 14, y);
                    y += 5;
                    doc.text('This is a computer-generated invoice. Thank you for your trust in PharmaTrack Pro.', 14, y);

                    // Page footer
                    const ph = doc.internal.pageSize.height;
                    doc.setDrawColor(200); doc.line(14, ph - 12, pw - 14, ph - 12);
                    doc.setFontSize(7); doc.setTextColor(150); doc.setFont('helvetica', 'normal');
                    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, ph - 7);
                    doc.text('PharmaTrack Pro \u2022 Internal Use', pw - 14, ph - 7, { align: 'right' });

                    doc.save(`invoice_${sale.orderNumber}.pdf`);
                  }}
                  className="btn-success h-12 flex items-center justify-center space-x-2 text-[10px] font-black uppercase"
                 >
                   <PrinterIcon className="h-4 w-4" />
                   <span>Print Invoice</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SellProduct;
