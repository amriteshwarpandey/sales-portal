import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { adminApi, AdminStats } from '../api/adminApi';
import { employeeApi, EmployeeListQuery } from '../api/employeeApi';
import { errorMessage } from '../api/client';

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomerQuery {
  page?: number;
  limit?: number;
  q?: string;
  paymentStatus?: string;
}

interface AdminState {
  stats: { data: AdminStats | null; status: LoadStatus; error: string | null };
  employees: {
    items: any[];
    pagination: Pagination | null;
    query: Required<Omit<EmployeeListQuery, 'q'>> & { q: string };
    status: LoadStatus;
    error: string | null;
  };
  customers: {
    items: any[];
    pagination: Pagination | null;
    query: CustomerQuery;
    status: LoadStatus;
    error: string | null;
  };
}

const initialState: AdminState = {
  stats: { data: null, status: 'idle', error: null },
  employees: {
    items: [],
    pagination: null,
    query: { page: 1, limit: 10, sortField: 'createdAt', sortOrder: 'desc', q: '' },
    status: 'idle',
    error: null,
  },
  customers: { items: [], pagination: null, query: { page: 1, limit: 10, q: '', paymentStatus: '' }, status: 'idle', error: null },
};

export const fetchStats = createAsyncThunk<AdminStats, void, { rejectValue: string }>(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getStats();
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchEmployees = createAsyncThunk<any, Partial<EmployeeListQuery>, { state: { admin: AdminState }; rejectValue: string }>(
  'admin/fetchEmployees',
  async (changes, { getState, rejectWithValue }) => {
    const query = { ...getState().admin.employees.query, ...changes };
    try {
      const data = await employeeApi.fetchEmployees(query);
      return { ...data, query };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchAllCustomers = createAsyncThunk<any, Partial<CustomerQuery>, { state: { admin: AdminState }; rejectValue: string }>(
  'admin/fetchAllCustomers',
  async (changes, { getState, rejectWithValue }) => {
    const query = { ...getState().admin.customers.query, ...changes };
    try {
      const data = await adminApi.fetchCustomers(query);
      return { ...data, query };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.stats.status = 'loading';
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = { data: action.payload, status: 'succeeded', error: null };
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.stats.status = 'failed';
        state.stats.error = action.payload || 'Failed to load stats';
      })
      .addCase(fetchEmployees.pending, (state, action) => {
        state.employees.status = 'loading';
        state.employees.query = { ...state.employees.query, ...action.meta.arg };
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees.items = action.payload.employees;
        state.employees.pagination = action.payload.pagination;
        state.employees.status = 'succeeded';
        state.employees.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.employees.status = 'failed';
        state.employees.error = action.payload || 'Failed to load employees';
      })
      .addCase(fetchAllCustomers.pending, (state, action) => {
        state.customers.status = 'loading';
        state.customers.query = { ...state.customers.query, ...action.meta.arg };
      })
      .addCase(fetchAllCustomers.fulfilled, (state, action) => {
        state.customers.items = action.payload.customers;
        state.customers.pagination = action.payload.pagination;
        state.customers.status = 'succeeded';
        state.customers.error = null;
      })
      .addCase(fetchAllCustomers.rejected, (state, action) => {
        state.customers.status = 'failed';
        state.customers.error = action.payload || 'Failed to load customers';
      });
  },
});

export default adminSlice.reducer;
