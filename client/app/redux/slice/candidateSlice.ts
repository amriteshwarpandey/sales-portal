import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { candidateApi } from '../api/candidateApi';
import { errorMessage } from '../api/client';

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface CandidateState {
  items: any[];
  counts: Record<string, number>;
  filter: { status: string; q: string };
  status: LoadStatus;
  error: string | null;
}

const initialState: CandidateState = {
  items: [],
  counts: {},
  filter: { status: '', q: '' },
  status: 'idle',
  error: null,
};

export const fetchCandidates = createAsyncThunk<any, { adminId: string }, { state: { candidate: CandidateState }; rejectValue: string }>(
  'candidate/fetchAll',
  async ({ adminId }, { getState, rejectWithValue }) => {
    try {
      return await candidateApi.list(adminId, getState().candidate.filter);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }
);

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<Partial<CandidateState['filter']>>) {
      state.filter = { ...state.filter, ...action.payload };
    },
    /** Replace one candidate after an action, without refetching the list. */
    upsertCandidate(state, action: PayloadAction<any>) {
      const index = state.items.findIndex((c) => c._id === action.payload._id);
      if (index >= 0) state.items[index] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.items = action.payload.candidates;
        state.counts = action.payload.counts;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load candidates';
      });
  },
});

export const { setFilter, upsertCandidate } = candidateSlice.actions;
export default candidateSlice.reducer;
