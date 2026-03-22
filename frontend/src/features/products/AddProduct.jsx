import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  CurrencyRupeeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { createProduct, updateProduct, fetchProductById, clearSuccess, clearError, fetchCategories } from './productSlice';

// ── Enum-safe options (values match Spring Boot enums exactly) ───────────────

const PRODUCT_TYPE_OPTIONS = [
  { value: 'BRANDED',      label: '💊 Branded Drug (Finished Product)' },
  { value: 'GENERIC',      label: '🧪 Generic Drug / API' },
  { value: 'RAW_MATERIAL', label: '⚗️ Raw Material' },
];

const DOSAGE_FORM_OPTIONS = [
  { value: 'TABLET',      label: 'Tablet' },
  { value: 'CAPSULE',     label: 'Capsule' },
  { value: 'SYRUP',       label: 'Syrup' },
  { value: 'INJECTION',   label: 'Injection' },
  { value: 'OINTMENT',    label: 'Ointment' },
  { value: 'DROPS',       label: 'Drops' },
  { value: 'INHALER',     label: 'Inhaler' },
  { value: 'CREAM',       label: 'Cream' },
  { value: 'GEL',         label: 'Gel' },
  { value: 'POWDER',      label: 'Powder' },
  { value: 'SUSPENSION',  label: 'Suspension' },
  { value: 'SOLUTION',    label: 'Solution' },
];

const SCHEDULE_OPTIONS = [
  { value: 'OTC', label: 'OTC — Over the Counter' },
  { value: 'G',   label: 'G — General' },
  { value: 'H',   label: 'H — Schedule H (Rx Required)' },
  { value: 'H1',  label: 'H1 — Schedule H1 (Strict Rx)' },
  { value: 'X',   label: 'X — Narcotic / Schedule X' },
];

const STORAGE_OPTIONS = [
  { value: 'ROOM_TEMP',   label: 'Room Temperature' },
  { value: 'REFRIGERATED', label: 'Refrigerated (2–8°C)' },
  { value: 'FROZEN',      label: 'Frozen (−20°C)' },
];

const GST_SLABS = ['0', '5', '12', '18', '28'];

const UNIT_OPTIONS = [
  { value: 'STRIP', label: 'Strip' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'BOX', label: 'Box' },
  { value: 'VIAL', label: 'Vial' },
  { value: 'TUBE', label: 'Tube' },
  { value: 'PIECE', label: 'Piece' },
  { value: 'ML', label: 'ml' },
  { value: 'GRAM', label: 'Gram' },
  { value: 'KG', label: 'KG' },
];

const THERAPEUTIC_CLASSES = [
  'Antibiotic', 'Antihypertensive', 'Analgesic', 'Antidiabetic', 'Antipyretic',
  'Antifungal', 'Cardiovascular', 'Gastrointestinal', 'Dermatological',
  'Respiratory', 'CNS', 'Ophthalmic', 'Hormonal', 'Immunological', 'Vitamins & Supplements',
];

const MANUFACTURER_OPTIONS = [
  'Sun Pharmaceutical', 'Cipla', "Dr. Reddy's", 'Lupin', 'Aurobindo Pharma',
  'Zydus Lifesciences', 'Torrent Pharma', 'Biocon', 'Glenmark', 'Cadila Healthcare',
  'Alkem Laboratories', 'Mankind Pharma', 'Abbott India', 'Pfizer India', 'GSK India',
];

// ── Wizard steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, name: 'Basic Info',       icon: BeakerIcon },
  { id: 2, name: 'Clinical Data',   icon: ShieldCheckIcon },
  { id: 3, name: 'Pricing & Stock', icon: CurrencyRupeeIcon },
  { id: 4, name: 'Review',          icon: ClipboardDocumentCheckIcon },
];

// ── Default form state ────────────────────────────────────────────────────────
const defaultForm = {
  name: '',
  chemicalName: '',
  description: '',
  productCode: '',
  hsnCode: '',
  categoryId: '',
  productType: 'BRANDED',
  unitOfMeasure: 'STRIP',
  manufacturer: '',
  therapeuticClass: '',
  scheduleCategory: 'OTC',
  dosageForm: 'TABLET',
  strength: '',
  gstSlab: '12',
  storageCondition: 'ROOM_TEMP',
  initialStock: '',
  costPrice: '',
  price: '',
  minStockLevel: 10,
  maxStockLevel: 1000,
  reorderPoint: 20,
  expiryDays: '',
  isActive: true,
  isSellable: true,
  supplierId: '',
  image: null,
  requiresPrescription: false,
};

// ─────────────────────────────────────────────────────────────────────────────
const AddProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { currentProduct, loading, success, error, categories } = useSelector((state) => state.products);

  const [mode, setMode] = useState('quick'); // 'quick' | 'wizard'
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(defaultForm);

  // ── Fetch Suppliers & Categories ────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCategories());
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8080/suppliers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSuppliers(await res.json());
      } catch (e) { console.error('Failed to load suppliers', e); }
    })();
  }, [dispatch]);

  // ── Load existing product in edit mode ──────────────────────────────────────
  useEffect(() => {
    if (isEditMode) dispatch(fetchProductById(id));
    return () => { dispatch(clearSuccess()); dispatch(clearError()); };
  }, [isEditMode, id, dispatch]);

  useEffect(() => {
    if (isEditMode && currentProduct) {
      setForm({
        ...defaultForm,
        ...currentProduct,
        categoryId: currentProduct.categoryId || '',
        scheduleCategory: currentProduct.scheduleCategory || 'OTC',
        dosageForm: currentProduct.dosageForm || 'TABLET',
        storageCondition: currentProduct.storageCondition || 'ROOM_TEMP',
        productType: currentProduct.productType || 'BRANDED',
        initialStock: currentProduct.currentStock || '',
        gstSlab: currentProduct.gstSlab?.toString() || '12',
        image: null,
      });
      setMode('wizard');
    }
  }, [isEditMode, currentProduct]);

  useEffect(() => { if (success) navigate('/products'); }, [success, navigate]);

  // ── Field change handler ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm((f) => ({ ...f, [name]: files[0] || null }));
    } else if (type === 'checkbox') {
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
    // Auto-set prescription flag for scheduled drugs
    if (name === 'scheduleCategory') {
      setForm((f) => ({ ...f, scheduleCategory: value, requiresPrescription: ['H', 'H1', 'X'].includes(value) }));
    }
  };

  // ── Build FormData for multipart submission ─────────────────────────────────
  const buildFormData = () => {
    const data = new FormData();
    const isRaw = form.productType === 'RAW_MATERIAL';

    const fields = {
      name: form.name,
      categoryId: form.categoryId,
      productType: form.productType,         // ← BRANDED | GENERIC | RAW_MATERIAL
      dosageForm: form.dosageForm,           // ← TABLET | CAPSULE | SYRUP | ...
      scheduleCategory: form.scheduleCategory,
      storageCondition: form.storageCondition,
      unitOfMeasure: form.unitOfMeasure,
      manufacturer: form.manufacturer,
      therapeuticClass: form.therapeuticClass,
      strength: form.strength,
      chemicalName: form.chemicalName,
      description: form.description,
      productCode: form.productCode,
      hsnCode: form.hsnCode,
      gstSlab: form.gstSlab,
      costPrice: form.costPrice,
      price: form.price,
      minStockLevel: form.minStockLevel || 10,
      maxStockLevel: form.maxStockLevel || 1000,
      reorderPoint: form.reorderPoint || 20,
      expiryDays: form.expiryDays,
      initialStock: form.initialStock || 0,
      isActive: form.isActive,
      isSellable: isRaw ? false : form.isSellable,
      requiresPrescription: form.requiresPrescription,
      supplierId: form.supplierId,
    };

    Object.entries(fields).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') data.append(k, v);
    });

    if (form.image) data.append('image', form.image);
    return data;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const productData = buildFormData();
    if (isEditMode) dispatch(updateProduct({ id, productData }));
    else dispatch(createProduct(productData));
  };

  const canProceed = () => {
    if (mode === 'quick') return form.name && form.categoryId && form.costPrice;
    if (step === 1) return form.name && form.categoryId;
    return true;
  };

  const scheduleColor = { OTC: 'text-emerald-400', G: 'text-sky-400', H: 'text-amber-400', H1: 'text-orange-400', X: 'text-rose-400' };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gradient-cyan">
            {isEditMode ? 'Edit Medication' : 'Add New Medication'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">GXP Compliant Data Entry Terminal</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <ShieldCheckIcon className="h-4 w-4" />
          <span>VALIDATED DATA SOURCE</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          ⚠️ {error}
        </div>
      )}

      {/* Mode Selector */}
      {!isEditMode && (
        <div className="card-glass p-1 animate-fade-slide-up">
          <div className="grid grid-cols-2 rounded-lg overflow-hidden">
            {[['quick', '⚡ QUICK ENTRY'], ['wizard', '📝 WIZARD MODE']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setMode(m); setStep(1); }}
                className={`py-3 px-4 font-bold text-sm transition-all ${mode === m ? 'bg-cyan-500 text-slate-900 shadow-glow-cyan' : 'text-slate-400 hover:bg-slate-800'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wizard Stepper */}
      {(mode === 'wizard' || isEditMode) && (
        <div className="flex items-center justify-between px-2 animate-fade-slide-up">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="relative flex flex-col items-center">
                <button type="button" onClick={() => setStep(s.id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s.id ? 'bg-cyan-500 text-slate-900 shadow-glow-cyan' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  <s.icon className="h-6 w-6" />
                </button>
                <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider ${step >= s.id ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {s.name}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-500 ${step > s.id ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-glass p-8 space-y-8 animate-fade-slide-up" style={{ marginTop: (mode === 'wizard' || isEditMode) ? '2.5rem' : '0' }}>

        {/* ── QUICK ENTRY ─────────────────────────────────────────────────── */}
        {mode === 'quick' && !isEditMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-5">
              <Field label="Brand / Generic Name *">
                <input name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="e.g., Amoxicillin 500mg" />
              </Field>
              <Field label="Category *">
                <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="input-field">
                  <option value="">Select Category</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type *">
                  <select name="productType" value={form.productType} onChange={handleChange} className="input-field">
                    {PRODUCT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Dosage Form">
                  <select name="dosageForm" value={form.dosageForm} onChange={handleChange} className="input-field">
                    {DOSAGE_FORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Schedule">
                  <select name="scheduleCategory" value={form.scheduleCategory} onChange={handleChange} className={`input-field font-bold ${scheduleColor[form.scheduleCategory]}`}>
                    {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Strength">
                  <input name="strength" value={form.strength} onChange={handleChange} className="input-field" placeholder="e.g., 500mg" />
                </Field>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cost Price (PTR) *">
                  <input name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={handleChange} required className="input-field" placeholder="₹ 0.00" />
                </Field>
                <Field label="Selling Price (MRP)">
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} className="input-field" placeholder="₹ 0.00" />
                </Field>
              </div>
              <Field label="GST Slab (%)">
                <select name="gstSlab" value={form.gstSlab} onChange={handleChange} className="input-field">
                  {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
                </select>
              </Field>
              <Field label="Initial Stock Qty">
                <input name="initialStock" type="number" min="0" value={form.initialStock} onChange={handleChange} className="input-field" placeholder="0" />
              </Field>
              <Field label="Supplier">
                <select name="supplierId" value={form.supplierId} onChange={handleChange} className="input-field">
                  <option value="">No Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Min Stock">
                  <input name="minStockLevel" type="number" min="0" value={form.minStockLevel} onChange={handleChange} className="input-field" />
                </Field>
                <Field label="Max Stock">
                  <input name="maxStockLevel" type="number" min="0" value={form.maxStockLevel} onChange={handleChange} className="input-field" />
                </Field>
                <Field label="Reorder At">
                  <input name="reorderPoint" type="number" min="0" value={form.reorderPoint} onChange={handleChange} className="input-field" />
                </Field>
              </div>
            </div>

            {/* Quick form submit */}
            <div className="md:col-span-2 flex items-center gap-4 pt-4 border-t border-white/5">
              <button type="button" onClick={() => navigate('/products')} className="btn-secondary px-6 py-3 flex items-center gap-2">
                <ArrowLeftIcon className="h-4 w-4" /> Cancel
              </button>
              <button type="submit" disabled={loading || !canProceed()}
                className="flex-1 btn-primary py-3 shadow-glow-cyan flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><PlusIcon className="h-5 w-5" /> Add Medication</>}
              </button>
            </div>
          </div>
        )}

        {/* ── WIZARD STEPS ────────────────────────────────────────────────── */}
        {(mode === 'wizard' || isEditMode) && (
          <>
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <SectionTitle>Basic Information</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Brand / Generic Name *">
                    <input name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="e.g., Paracetamol 500mg" />
                  </Field>
                  <Field label="Chemical / Generic Name">
                    <input name="chemicalName" value={form.chemicalName} onChange={handleChange} className="input-field" placeholder="e.g., Acetaminophen" />
                  </Field>
                  <Field label="Category *">
                    <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="input-field">
                      <option value="">Select Category</option>
                      {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Product Type *">
                    <select name="productType" value={form.productType} onChange={handleChange} className="input-field">
                      {PRODUCT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Manufacturer">
                    <select name="manufacturer" value={form.manufacturer} onChange={handleChange} className="input-field">
                      <option value="">Select Manufacturer</option>
                      {MANUFACTURER_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Unit of Measure">
                    <select name="unitOfMeasure" value={form.unitOfMeasure} onChange={handleChange} className="input-field">
                      {UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Product Code">
                    <input name="productCode" value={form.productCode} onChange={handleChange} className="input-field" placeholder="e.g., PCM-500" />
                  </Field>
                  <Field label="HSN Code">
                    <input name="hsnCode" value={form.hsnCode} onChange={handleChange} className="input-field" placeholder="e.g., 3004" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Description">
                      <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="input-field" placeholder="Brief description of this medication" />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Product Image">
                      <input name="image" type="file" accept="image/*" onChange={handleChange} className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-400" />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Clinical Data */}
            {step === 2 && (
              <div className="space-y-6">
                <SectionTitle>Clinical & Regulatory Data</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Schedule Category">
                    <select name="scheduleCategory" value={form.scheduleCategory} onChange={handleChange} className={`input-field font-bold ${scheduleColor[form.scheduleCategory]}`}>
                      {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Dosage Form">
                    <select name="dosageForm" value={form.dosageForm} onChange={handleChange} className="input-field">
                      {DOSAGE_FORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Therapeutic Class">
                    <select name="therapeuticClass" value={form.therapeuticClass} onChange={handleChange} className="input-field">
                      <option value="">Select Class</option>
                      {THERAPEUTIC_CLASSES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Strength">
                    <input name="strength" value={form.strength} onChange={handleChange} className="input-field" placeholder="e.g., 500mg, 10mg/5ml" />
                  </Field>
                  <Field label="Storage Condition">
                    <select name="storageCondition" value={form.storageCondition} onChange={handleChange} className="input-field">
                      {STORAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Expiry Duration (days)">
                    <input name="expiryDays" type="number" min="1" value={form.expiryDays} onChange={handleChange} className="input-field" placeholder="e.g., 730" />
                  </Field>
                  <div className="md:col-span-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="requiresPrescription" checked={form.requiresPrescription} onChange={handleChange} className="w-4 h-4 accent-amber-500" />
                      <div>
                        <p className="text-sm font-bold text-amber-400">Requires Prescription (Rx)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Auto-enabled for H, H1, and X schedule drugs</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Pricing & Stock */}
            {step === 3 && (
              <div className="space-y-6">
                <SectionTitle>Pricing, Tax & Stock Levels</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Cost Price / PTR (₹) *">
                    <input name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={handleChange} className="input-field" placeholder="Price you paid" />
                  </Field>
                  <Field label="Selling Price / MRP (₹)">
                    <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} className="input-field" placeholder="Price to customer" />
                  </Field>
                  <Field label="GST Slab (%)">
                    <select name="gstSlab" value={form.gstSlab} onChange={handleChange} className="input-field">
                      {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
                    </select>
                  </Field>
                  <Field label="Supplier">
                    <select name="supplierId" value={form.supplierId} onChange={handleChange} className="input-field">
                      <option value="">No Supplier</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Initial Opening Stock">
                    <input name="initialStock" type="number" min="0" value={form.initialStock} onChange={handleChange} className="input-field" placeholder="0" />
                  </Field>
                  <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <Field label="Min Stock Alert">
                      <input name="minStockLevel" type="number" min="0" value={form.minStockLevel} onChange={handleChange} className="input-field" />
                    </Field>
                    <Field label="Max Stock">
                      <input name="maxStockLevel" type="number" min="0" value={form.maxStockLevel} onChange={handleChange} className="input-field" />
                    </Field>
                    <Field label="Reorder At">
                      <input name="reorderPoint" type="number" min="0" value={form.reorderPoint} onChange={handleChange} className="input-field" />
                    </Field>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 accent-cyan-500" />
                      <span className="text-sm text-slate-300">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isSellable" checked={form.isSellable} onChange={handleChange} className="w-4 h-4 accent-cyan-500" disabled={form.productType === 'RAW_MATERIAL'} />
                      <span className="text-sm text-slate-300">Sellable</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <SectionTitle>Review & Confirm</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Name', form.name],
                    ['Category', categories?.find((c) => String(c.id) === String(form.categoryId))?.name || '—'],
                    ['Type', PRODUCT_TYPE_OPTIONS.find((o) => o.value === form.productType)?.label || form.productType],
                    ['Dosage Form', DOSAGE_FORM_OPTIONS.find((o) => o.value === form.dosageForm)?.label || form.dosageForm],
                    ['Schedule', SCHEDULE_OPTIONS.find((o) => o.value === form.scheduleCategory)?.label || form.scheduleCategory],
                    ['Strength', form.strength || '—'],
                    ['Manufacturer', form.manufacturer || '—'],
                    ['Storage', STORAGE_OPTIONS.find((o) => o.value === form.storageCondition)?.label || form.storageCondition],
                    ['Cost Price (PTR)', form.costPrice ? `₹${form.costPrice}` : '—'],
                    ['Selling Price (MRP)', form.price ? `₹${form.price}` : '—'],
                    ['GST', `${form.gstSlab}%`],
                    ['Initial Stock', form.initialStock || '0'],
                    ['Requires Rx', form.requiresPrescription ? '✅ Yes' : '❌ No'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
                      <span className="text-sm font-bold text-slate-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wizard Navigation */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/5">
              <button type="button" onClick={() => step > 1 ? setStep((s) => s - 1) : navigate('/products')}
                className="btn-secondary px-6 py-3 flex items-center gap-2">
                <ArrowLeftIcon className="h-4 w-4" /> {step > 1 ? 'Back' : 'Cancel'}
              </button>
              <div className="flex-1" />
              {step < 4 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
                  className="btn-primary px-8 py-3 shadow-glow-cyan flex items-center gap-2 font-bold uppercase tracking-widest">
                  Next <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="btn-primary px-10 py-3 shadow-glow-cyan flex items-center gap-2 font-bold uppercase tracking-widest">
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><CheckCircleIcon className="h-5 w-5" />{isEditMode ? 'Save Changes' : 'Create Medication'}</>}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
};

// ── Helper components ─────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">{children}</h3>
);

export default AddProduct;
