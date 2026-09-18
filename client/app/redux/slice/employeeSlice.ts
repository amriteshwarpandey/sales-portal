import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { employeeApi } from '../api/employeeApi';
import { errorMessage } from '../api/client';

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface EmployeeState {
  profile: any | null;
  totals: { totalCustomers: number; paidCustomers: number } | null;
  customers: any[];
  status: LoadStatus;
  customersStatus: LoadStatus;
  error: string | null;
}

const initialState: EmployeeState = {
  profile: null,
  totals: null,
  customers: [],
  status: 'idle',
  customersStatus: 'idle',
  error: null,
};

/** Loads the profile, customer totals and customers for one employee. */
export const fetchEmployeeDashboard = createAsyncThunk<any, { id: string; asAdmin?: boolean }, { rejectValue: string }>(
  'employee/fetchDashboard',
  async ({ id, asAdmin }, { rejectWithValue }) => {
    try {
      const [profile, totals, customers] = await Promise.all([
        asAdmin ? employeeApi.adminView(id) : employeeApi.getEmployee(id),
        employeeApi.totalCustomers(id),
        employeeApi.customers(id),
      ]);
      return { profile: profile.employee, totals, customers: customers.customers };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchEmployeeCustomers = createAsyncThunk<any, { id: string; paymentStatus?: string }, { rejectValue: string }>(
  'employee/fetchCustomers',
  async ({ id, paymentStatus }, { rejectWithValue }) => {
    try {
      const [customers, totals] = await Promise.all([employeeApi.customers(id, paymentStatus), employeeApi.totalCustomers(id)]);
      return { customers: customers.customers, totals };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    resetEmployee: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeeDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEmployeeDashboard.fulfilled, (state, action) => {
        state.profile = action.payload.profile;
        state.totals = action.payload.totals;
        state.customers = action.payload.customers;
        state.status = 'succeeded';
        state.customersStatus = 'succeeded';
      })
      .addCase(fetchEmployeeDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load employee';
      })
      .addCase(fetchEmployeeCustomers.pending, (state) => {
        state.customersStatus = 'loading';
      })
      .addCase(fetchEmployeeCustomers.fulfilled, (state, action) => {
        state.customers = action.payload.customers;
        state.totals = action.payload.totals;
        state.customersStatus = 'succeeded';
      })
      .addCase(fetchEmployeeCustomers.rejected, (state, action) => {
        state.customersStatus = 'failed';
        state.error = action.payload || 'Failed to load customers';
      });
  },
});

export const { resetEmployee } = employeeSlice.actions;
export default employeeSlice.reducer;
