import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../slice/loginSlice';
import adminReducer from '../slice/adminSlice';
import employeeReducer from '../slice/employeeSlice';
import candidateReducer from '../slice/candidateSlice';

export const store = configureStore({
  reducer: {
    login: loginReducer,
    admin: adminReducer,
    employee: employeeReducer,
    candidate: candidateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
