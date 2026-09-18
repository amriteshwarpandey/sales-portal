'use client';

import { Provider } from 'react-redux';
import { store } from './redux/store/store';
import { ToastProvider } from '@/components/Toast';

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <ToastProvider>{children}</ToastProvider>
    </Provider>
  );
}
