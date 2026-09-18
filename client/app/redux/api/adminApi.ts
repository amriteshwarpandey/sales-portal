import { apiRequest, withQuery } from './client';
import { makeAccountApi } from './accountApi';

export interface AdminStats {
  totals: {
    employees: number;
    admins: number;
    customers: number;
    candidates: number;
    revenue: number;
    paidSales: number;
    pendingPayments: number;
  };
  candidates: Record<string, number>;
  monthly: { month: string; revenue: number; sales: number }[];
  topEmployees: { referralId: string; name: string; customers: number; revenue: number; employeeId?: string }[];
  recentCustomers: any[];
}

export const adminApi = {
  ...makeAccountApi('admin'),
  getAdmin: (id: string) => apiRequest(`/admin/${id}`),
  fetchAdmins: () => apiRequest('/admin/fetchadmin'),
  getStats: () => apiRequest<AdminStats>('/admin/stats/summary'),
  fetchCustomers: (query: { page?: number; limit?: number; q?: string; paymentStatus?: string }) =>
    apiRequest(withQuery('/customer/all', query)),
  setPaymentStatus: (customerId: string, paymentStatus: string, transactionId?: string) =>
    apiRequest(`/customer/payment/status/${customerId}`, 'PUT', { paymentStatus, transactionId }),
  deleteCustomer: (customerId: string) => apiRequest(`/customer/${customerId}`, 'DELETE'),
};

export const masterApi = {
  admins: () => apiRequest('/master/admins'),
  createAdmin: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    apiRequest('/master/admins', 'POST', data),
  deleteAdmin: (id: string) => apiRequest(`/master/admins/${id}`, 'DELETE'),
  overview: () => apiRequest<AdminStats>('/master/overview'),
  auditLogs: (query: { page?: number; action?: string }) => apiRequest(withQuery('/master/audit-logs', query)),
};
