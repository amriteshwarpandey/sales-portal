import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loginApi, LoginAs, Role, Session, SessionUser } from '../api/loginApi';
import { errorMessage } from '../api/client';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface LoginState {
  user: SessionUser | null;
  role: Role | null;
  status: Status;
  error: string | null;
}

const initialState: LoginState = { user: null, role: null, status: 'idle', error: null };

export const login = createAsyncThunk<Session, { as: LoginAs; email: string; password: string }, { rejectValue: string }>(
  'login/login',
  async ({ as, email, password }, { rejectWithValue }) => {
    try {
      return await loginApi.login(as, email, password);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const fetchSession = createAsyncThunk<Session, void, { rejectValue: string }>(
  'login/fetchSession',
  async (_, { rejectWithValue }) => {
    try {
      const session = await loginApi.me();
      if (!session.user) return rejectWithValue('Not logged in');
      return session;
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

export const logout = createAsyncThunk('login/logout', async () => {
  try {
    await loginApi.logout();
  } catch {
    // Already logged out on the server; clear local state regardless.
  }
});

const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    updateUser(state, action: PayloadAction<Partial<SessionUser>>) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const authenticated = (state: LoginState, action: PayloadAction<Session>) => {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.status = 'authenticated';
      state.error = null;
    };

    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, authenticated)
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.payload || 'Login failed';
      })
      .addCase(fetchSession.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(fetchSession.fulfilled, authenticated)
      .addCase(fetchSession.rejected, (state) => {
        state.user = null;
        state.role = null;
        state.status = 'unauthenticated';
      })
      .addCase(logout.fulfilled, () => ({ ...initialState, status: 'unauthenticated' as Status }));
  },
});

export const { updateUser, clearError } = loginSlice.actions;
export default loginSlice.reducer;
