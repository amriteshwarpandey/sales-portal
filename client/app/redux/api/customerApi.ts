import { apiRequest } from './client';

export interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
}

export interface CustomerSignup {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  referralId: string;
  plan: string;
}

export const customerApi = {
  plans: () => apiRequest<{ plans: Plan[] }>('/customer/plans'),
  register: (data: CustomerSignup) => apiRequest('/customer/register', 'POST', data),
  initiatePayment: (customerId: string) => apiRequest(`/customer/payment/initiate/${customerId}`, 'POST'),
  confirmPayment: (customerId: string, orderId: string, method: string) =>
    apiRequest(`/customer/payment/confirm/${customerId}`, 'POST', { orderId, method }),
};
