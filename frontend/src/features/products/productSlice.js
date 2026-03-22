import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Async thunks — now targeting /medications
export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/medications');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medications');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/medications/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medication');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (productData, { rejectWithValue }) => {
    try {
      const response = await api.post('/medications', productData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create medication');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/medications/${id}`, productData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update medication');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/medications/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete medication');
    }
  }
);

export const searchProducts = createAsyncThunk(
  'products/search',
  async (keyword, { rejectWithValue }) => {
    try {
      const response = await api.get(`/medications/search?keyword=${keyword}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  'products/fetchByCategory',
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/medications/category/${categoryId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medications');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const filterProducts = createAsyncThunk(
  'products/filter',
  async ({ categoryId, therapeuticClass, scheduleCategory, productType, minPrice, maxPrice }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (therapeuticClass) params.append('therapeuticClass', therapeuticClass);
      if (scheduleCategory) params.append('scheduleCategory', scheduleCategory);
      if (productType) params.append('productType', productType);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const response = await api.get(`/medications/filter?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to filter medications');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    categories: [],
    currentProduct: null,
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSuccess: (state) => { state.success = false; },
    setCurrentProduct: (state, action) => { state.currentProduct = action.payload; },
    clearCurrentProduct: (state) => { state.currentProduct = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchProductById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProductById.fulfilled, (state, action) => { state.loading = false; state.currentProduct = action.payload; })
      .addCase(fetchProductById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createProduct.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(createProduct.fulfilled, (state, action) => { state.loading = false; state.products.push(action.payload); state.success = true; })
      .addCase(createProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(updateProduct.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.products[index] = action.payload;
        state.currentProduct = action.payload;
        state.success = true;
      })
      .addCase(updateProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload; state.success = false; })
      .addCase(deleteProduct.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteProduct.fulfilled, (state, action) => { state.loading = false; state.products = state.products.filter((p) => p.id !== action.payload); })
      .addCase(deleteProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(searchProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(searchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchProductsByCategory.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchProductsByCategory.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchCategories.pending, (state) => { state.loading = true; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.loading = false; state.categories = action.payload; })
      .addCase(fetchCategories.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(filterProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(filterProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(filterProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearError, clearSuccess, setCurrentProduct, clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;
