import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BeakerIcon,
  TruckIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';

const API = 'http://localhost:8080';

// ── Expiry color coding (30-60-90 Rule) ──────────────────────────────────────
const getExpiryStyle = (daysUntilExpiry, isQuarantined, isExpired) => {
  if (isQuarantined || isExpired) {
    return { bg: 'bg-rose-900/30', border: 'border-rose-700/50', badge: 'bg-rose-500/20 text-rose-400', label: '🔴 QUARANTINED', text: 'text-rose-400' };
  }
  if (daysUntilExpiry <= 30) {
    return { bg: 'bg-rose-900/20', border: 'border-rose-700/30', badge: 'bg-rose-500/20 text-rose-400', label: '🔴 CRITICAL (<30d)', text: 'text-rose-400' };
  }
  if (daysUntilExpiry <= 60) {
    return { bg: 'bg-orange-900/20', border: 'border-orange-700/30', badge: 'bg-orange-500/20 text-orange-400', label: '🟠 RETURN (30-60d)', text: 'text-orange-400' };
  }
  if (daysUntilExpiry <= 90) {
    return { bg: 'bg-amber-900/20', border: 'border-amber-700/30', badge: 'bg-amber-500/20 text-amber-400', label: '🟡 CLEARANCE (60-90d)', text: 'text-amber-400' };
  }
  return { bg: 'bg-slate-700/30', border: 'border-slate-700/50', badge: 'bg-emerald-500/20 text-emerald-400', label: '🟢 GOOD', text: 'text-emerald-400' };
};

const defaultBatchForm = {
  medicationId: '',
  batchNumber: '',
  manufacturerDate: '',
  expiryDate: '',
  mrp: '',
  ptr: '',
  pts: '',
  initialStock: '',
  locationInStore: '',
  supplierId: '',
};

// ─────────────────────────────────────────────────────────────────────────────
const BatchManagement = () => {
  const { token } = useSelector((s) => s.auth);
  const headers = { Authorization: `Bearer ${token}` };

  const [medications, setMedications] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [batches, setBatches] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [quarantinedBatches, setQuarantinedBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('byMed'); // 'byMed' | 'expiring' | 'quarantined'
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(defaultBatchForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Fetch initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchMedications();
    fetchSuppliers();
    fetchExpiringBatches();
    fetchQuarantinedBatches();
  }, []);

  const fetchMedications = async () => {
    try {
      const res = await fetch(`${API}/medications`, { headers });
      if (res.ok) setMedications(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API}/suppliers`, { headers });
      if (res.ok) setSuppliers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchExpiringBatches = async () => {
    try {
      const res = await fetch(`${API}/batches/expiring-soon?days=90`, { headers });
      if (res.ok) setExpiringBatches(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchQuarantinedBatches = async () => {
    try {
      const res = await fetch(`${API}/batches/quarantined`, { headers });
      if (res.ok) setQuarantinedBatches(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchBatchesByMedication = async (medId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/batches/medication/${medId}`, { headers });
      if (res.ok) setBatches(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSelectMedication = (med) => {
    setSelectedMed(med);
    setForm((f) => ({ ...f, medicationId: med.id }));
    fetchBatchesByMedication(med.id);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        medicationId: Number(form.medicationId),
        batchNumber: form.batchNumber,
        manufacturerDate: form.manufacturerDate || null,
        expiryDate: form.expiryDate,
        mrp: form.mrp ? parseFloat(form.mrp) : null,
        ptr: form.ptr ? parseFloat(form.ptr) : null,
        pts: form.pts ? parseFloat(form.pts) : null,
        initialStock: form.initialStock ? parseInt(form.initialStock) : 0,
        locationInStore: form.locationInStore || null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };

      const res = await fetch(`${API}/batches`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess('✅ Batch added successfully!');
        setShowAddModal(false);
        setForm({ ...defaultBatchForm, medicationId: selectedMed?.id || '' });
        if (selectedMed) fetchBatchesByMedication(selectedMed.id);
        fetchExpiringBatches();
        fetchQuarantinedBatches();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to add batch');
      }
    } catch (e) {
      setError('Network error - please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setForm({ ...defaultBatchForm, medicationId: selectedMed?.id || '' });
    setError('');
    setShowAddModal(true);
  };

  const filteredMeds = medications.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.manufacturer?.toLowerCase().includes(search.toLowerCase())
  );

  const tabBatches = activeTab === 'expiring' ? expiringBatches : activeTab === 'quarantined' ? quarantinedBatches : batches;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-slide-up">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gradient-cyan">Batch Management</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">FEFO · 30-60-90 Expiry Rule · Auto-Quarantine</p>
        </div>
        <button onClick={openAddModal}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 font-bold text-sm shadow-glow-cyan">
          <PlusIcon className="h-5 w-5" /> Add Batch
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 animate-fade-slide-up">
          <CheckCircleIcon className="h-5 w-5" /> {success}
        </div>
      )}

      {/* Expiry Risk Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Expiring in 90d', count: expiringBatches.length, color: 'amber', icon: CalendarDaysIcon },
          { label: 'Quarantined', count: quarantinedBatches.length, color: 'rose', icon: ExclamationTriangleIcon },
          { label: 'Total Medications', count: medications.length, color: 'cyan', icon: BeakerIcon },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className={`card-glass p-4 border border-${color}-500/20 bg-${color}-500/5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-black text-${color}-400`}>{count}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{label}</p>
              </div>
              <Icon className={`h-8 w-8 text-${color}-500/50`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Medication Selector */}
        <div className="card-glass p-4 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medications..."
              className="input-field pl-9 text-sm" />
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {filteredMeds.map((m) => (
              <button key={m.id} onClick={() => { handleSelectMedication(m); setActiveTab('byMed'); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${selectedMed?.id === m.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-700/50 border border-transparent'}`}>
                <p className="font-bold truncate">{m.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{m.manufacturer || 'Unknown Mfr'}</p>
              </button>
            ))}
            {filteredMeds.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">No medications found</p>
            )}
          </div>
        </div>

        {/* Right: Batch List */}
        <div className="md:col-span-2 card-glass p-4 space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {[
              { key: 'byMed', label: `📦 ${selectedMed ? selectedMed.name : 'Select Medication'}` },
              { key: 'expiring', label: `⚠️ Expiring Soon (${expiringBatches.length})` },
              { key: 'quarantined', label: `🔴 Quarantined (${quarantinedBatches.length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 py-2 px-2 text-[11px] font-bold transition-all truncate ${activeTab === key ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Batch Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-500" />
            </div>
          ) : tabBatches.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">
                {activeTab === 'byMed' ? (selectedMed ? 'No batches for this medication yet.' : 'Select a medication to view its batches.') : 'No batches in this category.'}
              </p>
              {activeTab === 'byMed' && selectedMed && (
                <button onClick={openAddModal} className="mt-4 btn-primary px-4 py-2 text-sm">
                  + Add First Batch
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {tabBatches.map((batch) => {
                const style = getExpiryStyle(batch.daysUntilExpiry, batch.isQuarantined, batch.isExpired);
                return (
                  <div key={batch.id} className={`p-4 rounded-xl border ${style.bg} ${style.border} transition-all`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white font-mono text-sm">#{batch.batchNumber}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                          {batch.isQuarantined && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">QUARANTINED</span>}
                        </div>
                        {activeTab !== 'byMed' && (
                          <p className="text-sm font-bold text-slate-300 mt-1">{batch.medicationName}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-[11px]">
                          <InfoRow icon={CalendarDaysIcon} label="Expiry" value={batch.expiryDate} highlight={style.text} />
                          <InfoRow icon={CalendarDaysIcon} label="MFG Date" value={batch.manufacturerDate || '—'} />
                          <InfoRow icon={ArchiveBoxIcon} label="Stock" value={`${batch.availableStock ?? batch.currentStock} / ${batch.currentStock}`} />
                          <InfoRow icon={CurrencyRupeeIcon} label="MRP" value={batch.mrp ? `₹${batch.mrp}` : '—'} />
                          <InfoRow icon={CurrencyRupeeIcon} label="PTR" value={batch.ptr ? `₹${batch.ptr}` : '—'} />
                          <InfoRow icon={MapPinIcon} label="Location" value={batch.locationInStore || '—'} />
                          {batch.supplierName && <InfoRow icon={TruckIcon} label="Supplier" value={batch.supplierName} />}
                        </div>
                        {batch.quarantineReason && (
                          <p className="mt-2 text-[10px] text-rose-400 font-bold">⚠️ {batch.quarantineReason}</p>
                        )}
                      </div>
                      <div className={`text-right flex-shrink-0`}>
                        <p className={`text-2xl font-black ${style.text}`}>{batch.daysUntilExpiry}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">days left</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 30-60-90 Legend */}
      <div className="card-glass p-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">📊 Expiry Management Rule</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: 'emerald', label: '> 90 Days', action: 'Normal Sales' },
            { color: 'amber', label: '60–90 Days', action: 'Start Clearance / Suggest to Doctors' },
            { color: 'orange', label: '30–60 Days', action: 'Contact Supplier for Return Credit' },
            { color: 'rose', label: '< 30 Days / Expired', action: 'Quarantine Zone — Stop Sales' },
          ].map(({ color, label, action }) => (
            <div key={label} className={`p-3 rounded-lg bg-${color}-500/5 border border-${color}-500/20`}>
              <p className={`text-xs font-black text-${color}-400`}>{label}</p>
              <p className="text-[10px] text-slate-500 mt-1">{action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-glass w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Add New Batch</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 rounded-lg text-sm border border-rose-500/20">{error}</div>
            )}

            <form onSubmit={handleAddBatch} className="space-y-4">
              <Field label="Medication *">
                <select name="medicationId" value={form.medicationId} onChange={handleFormChange} required className="input-field">
                  <option value="">Select Medication</option>
                  {medications.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Batch Number *">
                  <input name="batchNumber" value={form.batchNumber} onChange={handleFormChange} required className="input-field font-mono" placeholder="e.g., A-102" />
                </Field>
                <Field label="Initial Stock Qty *">
                  <input name="initialStock" type="number" min="0" value={form.initialStock} onChange={handleFormChange} className="input-field" placeholder="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Manufacturing Date">
                  <input name="manufacturerDate" type="date" value={form.manufacturerDate} onChange={handleFormChange} className="input-field" />
                </Field>
                <Field label="Expiry Date *">
                  <input name="expiryDate" type="date" value={form.expiryDate} onChange={handleFormChange} required className="input-field border-amber-500/30 focus:border-amber-500" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="MRP (₹)">
                  <input name="mrp" type="number" step="0.01" value={form.mrp} onChange={handleFormChange} className="input-field" placeholder="0.00" />
                </Field>
                <Field label="PTR (₹)">
                  <input name="ptr" type="number" step="0.01" value={form.ptr} onChange={handleFormChange} className="input-field" placeholder="0.00" />
                </Field>
                <Field label="PTS (₹)">
                  <input name="pts" type="number" step="0.01" value={form.pts} onChange={handleFormChange} className="input-field" placeholder="0.00" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Rack / Location">
                  <input name="locationInStore" value={form.locationInStore} onChange={handleFormChange} className="input-field" placeholder="e.g., Shelf A-3" />
                </Field>
                <Field label="Supplier">
                  <select name="supplierId" value={form.supplierId} onChange={handleFormChange} className="input-field">
                    <option value="">Auto / None</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-6 py-3 flex-1">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="btn-primary px-8 py-3 flex-1 shadow-glow-cyan font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><PlusIcon className="h-5 w-5" /> Save Batch</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helpers
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, highlight }) => (
  <div className="flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
    <span className="text-slate-500">{label}:</span>
    <span className={`font-bold ${highlight || 'text-slate-300'} truncate`}>{value}</span>
  </div>
);

export default BatchManagement;
