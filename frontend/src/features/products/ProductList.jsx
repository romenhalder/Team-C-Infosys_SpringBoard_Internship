import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { fetchProducts, deleteProduct, searchProducts, clearSuccess, fetchCategories } from './productSlice';

const THERAPEUTIC_CLASSES = ['Antibiotic', 'Antihypertensive', 'Analgesic', 'Antidiabetic', 'Antipyretic', 'Antifungal', 'Cardiovascular', 'Gastrointestinal', 'Dermatological', 'Respiratory', 'CNS', 'Ophthalmic'];
const SCHEDULE_CATEGORIES = ['OTC', 'H', 'H1', 'X', 'G'];

const SCHEDULE_BADGE_MAP = {
  H: 'badge-schedule-H',
  H1: 'badge-schedule-H1',
  X: 'badge-schedule-X',
  G: 'badge-schedule-G',
  OTC: 'badge-schedule-OTC',
};

/* ─── Shimmer Skeleton ─── */
const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i} style={{ padding: '0.75rem 1rem' }}>
        <div className="skeleton skeleton-text" style={{ width: `${50 + Math.random() * 40}%` }} />
      </td>
    ))}
  </tr>
);

const ProductList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, categories, loading, success } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canEdit = isAdmin || isManager;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTherapeutic, setFilterTherapeutic] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    return () => { dispatch(clearSuccess()); };
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) dispatch(searchProducts(searchTerm));
    else dispatch(fetchProducts());
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      dispatch(deleteProduct(id));
    }
  };

  const clearFilters = () => {
    setFilterType('ALL'); setFilterCategory(''); setFilterTherapeutic(''); setFilterSchedule('');
    setMinPrice(''); setMaxPrice('');
    dispatch(fetchProducts());
  };

  const filteredProducts = products.filter((product) => {
    if (filterType !== 'ALL' && product.productType !== filterType) return false;
    if (filterCategory && product.categoryId !== parseInt(filterCategory)) return false;
    if (filterTherapeutic && product.therapeuticClass !== filterTherapeutic) return false;
    if (filterSchedule && product.scheduleCategory !== filterSchedule) return false;
    if (minPrice && (!product.price || product.price < parseFloat(minPrice))) return false;
    if (maxPrice && (!product.price || product.price > parseFloat(maxPrice))) return false;
    return true;
  });

  const getStockStatus = (product) => {
    if (product.currentStock === 0 || product.isOutOfStock || product.currentStock < 0) {
      return { text: 'Out of Stock', class: 'badge-danger' };
    } else if (product.isLowStock || product.currentStock <= product.minStockLevel) {
      return { text: 'Low Stock', class: 'badge-warning' };
    }
    return { text: 'In Stock', class: 'badge-success' };
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === 'newest') return (b.id || 0) - (a.id || 0);
    return (a.id || 0) - (b.id || 0);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center animate-fade-slide-up stagger-1">
        <h1 className="text-3xl font-bold text-gradient-cyan">Medications</h1>
        {canEdit && (
          <button onClick={() => navigate('/products/add')} className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Add Medication</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card animate-fade-slide-up stagger-2">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-0">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#475569' }} />
            <input
              type="text"
              placeholder="Search by name, molecule, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="btn-secondary flex items-center space-x-1 whitespace-nowrap"
          >
            <span>{sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <FunnelIcon className="h-5 w-5" /><span>Filters</span>
          </button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-4 mt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field text-sm">
                <option value="ALL">All Types</option>
                <option value="FINISHED_GOOD">Branded</option>
                <option value="RAW_MATERIAL">Generic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field text-sm">
                <option value="">All Categories</option>
                {categories && categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Therapeutic Class</label>
              <select value={filterTherapeutic} onChange={(e) => setFilterTherapeutic(e.target.value)} className="input-field text-sm">
                <option value="">All Classes</option>
                {THERAPEUTIC_CLASSES.map((tc) => (<option key={tc} value={tc}>{tc}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Schedule</label>
              <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className="input-field text-sm">
                <option value="">All Schedules</option>
                {SCHEDULE_CATEGORIES.map((sc) => (<option key={sc} value={sc}>{sc}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Min Price</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="input-field text-sm" placeholder="Min" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Max Price</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="input-field text-sm" placeholder="Max" />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <button type="button" onClick={clearFilters} className="text-sm font-medium" style={{ color: '#fb7185' }}>
                <XMarkIcon className="h-4 w-4 inline mr-1" />Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm" style={{ color: '#64748b' }}>
        Showing {sortedProducts.length} of {products.length} medications
      </div>

      {/* Medications Table */}
      <div className="card overflow-hidden animate-fade-slide-up stagger-3" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Medication</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Schedule</th>
                <th>Manufacturer</th>
                <th>MRP</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state py-8">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <h3>No medications found</h3>
                      <p>Try adjusting your search or filters</p>
                      {canEdit && (
                        <button onClick={() => navigate('/products/add')} className="btn-primary mt-3 text-sm">
                          Add Medication
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const scheduleClass = SCHEDULE_BADGE_MAP[product.scheduleCategory] || SCHEDULE_BADGE_MAP.OTC;
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center">
                          {product.imageUrl && (
                            <img
                              src={`http://localhost:8080/uploads/${product.imageUrl}`}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                              style={{ border: '1px solid var(--border-default)' }}
                            />
                          )}
                          <div>
                            <div className="font-medium" style={{ color: '#f1f5f9' }}>{product.name}</div>
                            <div className="text-xs" style={{ color: '#475569' }}>{product.chemicalName || product.productCode || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{product.sku || '—'}</td>
                      <td>{product.categoryName}</td>
                      <td>
                        <span className={`badge ${scheduleClass}`}>
                          {product.scheduleCategory || 'OTC'}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: '#cbd5e1' }}>{product.manufacturer || '—'}</div>
                        <div className="text-xs" style={{ color: '#475569' }}>{product.strength || ''}</div>
                      </td>
                      <td>
                        <div className="font-medium" style={{ color: '#f1f5f9' }}>₹{product.price || 0}</div>
                        <div className="text-xs" style={{ color: '#475569' }}>Cost: ₹{product.costPrice || 0}</div>
                      </td>
                      <td>{product.currentStock} {product.unitOfMeasure}</td>
                      <td><span className={`badge ${stockStatus.class}`}>{stockStatus.text}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end space-x-2">
                          {canEdit && (
                            <button
                              onClick={() => navigate(`/products/edit/${product.id}`)}
                              title="Edit"
                              style={{ color: '#22d3ee' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#67e8f9'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#22d3ee'; }}
                            >
                              <PencilIcon className="h-4.5 w-4.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              title="Delete"
                              style={{ color: '#fb7185' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#f43f5e'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#fb7185'; }}
                            >
                              <TrashIcon className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
