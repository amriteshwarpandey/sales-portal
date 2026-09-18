import { apiRequest, withQuery } from './client';
import { makeAccountApi } from './accountApi';

export interface EmployeeListQuery {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
}

export const employeeApi = {
  ...makeAccountApi('employee'),
  getEmployee: (id: string) => apiRequest(`/employee/${id}`),
  adminView: (id: string) => apiRequest(`/employee/adminview/${id}`),
  fetchEmployees: (query: EmployeeListQuery) => apiRequest(withQuery('/employee/fetchemployees', { ...query })),
  totalCustomers: (id: string) => apiRequest(`/employee/employee/total-customers/${id}`),
  deleteEmployee: (id: string) => apiRequest(`/employee/${id}`, 'DELETE'),
  customers: (id: string, paymentStatus?: string) => apiRequest(withQuery(`/customer/${id}`, { paymentStatus })),
  updateCustomer: (customerId: string, data: Record<string, unknown>) =>
    apiRequest(`/customer/${customerId}`, 'PUT', data),
};
