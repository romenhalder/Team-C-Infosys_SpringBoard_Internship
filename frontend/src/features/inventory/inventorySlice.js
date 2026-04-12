import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/inventory');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const fetchInventoryByProduct = createAsyncThunk(
  'inventory/fetchByProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/inventory/product/${productId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async (submitData, { rejectWithValue }) => {
    try {
      // Ensure expiryDate is just a date string (YYYY-MM-DD) for backend LocalDate
      if (submitData.expiryDate && submitData.expiryDate.includes('T')) {
        submitData.expiryDate = submitData.expiryDate.split('T')[0];
      }
      
      const response = await api.post('/inventory/update', submitData);
      return response.data;
    } catch (error) {
      // Better error extraction
      const message = error.response?.data?.message || 
                     error.response?.data?.errors?.[0] || 
                     error.response?.data?.error || 
                     'Failed to update stock';
      return rejectWithValue(message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'inventory/fetchTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/inventory/transactions');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchTransactionsByProduct = createAsyncThunk(
  'inventory/fetchTransactionsByProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/inventory/transactions/product/${productId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchLowStock = createAsyncThunk(
  'inventory/fetchLowStock',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/inventory/low-stock');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch low stock items');
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    inventory: [],
    transactions: [],
    lowStock: [],
    currentInventory: null,
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.inventory = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch by product
      .addCase(fetchInventoryByProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryByProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInventory = action.payload;
      })
      .addCase(fetchInventoryByProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update stock
      .addCase(updateStock.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.inventory.findIndex(
          (i) => i.productId === action.payload.productId
        );
        if (index !== -1) {
          state.inventory[index] = action.payload;
        } else {
          state.inventory.push(action.payload);
        }
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch transactions by product
      .addCase(fetchTransactionsByProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionsByProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactionsByProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch low stock
      .addCase(fetchLowStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.loading = false;
        state.lowStock = action.payload;
      })
      .addCase(fetchLowStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccess } = inventorySlice.actions;
export default inventorySlice.reducer;
