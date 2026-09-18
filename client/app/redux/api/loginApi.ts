import { apiRequest } from './client';

export type Role = 'admin' | 'masteradmin' | 'employee';

export interface SessionUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  adminId?: string;
  referralId?: string;
  role?: Role;
  [key: string]: unknown;
}

export interface Session {
  role: Role;
  user: SessionUser;
  token?: string;
}

export type LoginAs = 'admin' | 'employee';

export const loginApi = {
  login: (as: LoginAs, email: string, password: string) =>
    apiRequest<Session>(`/${as === 'admin' ? 'admin' : 'employee'}/login`, 'POST', { email, password }),
  me: () => apiRequest<Session>('/session/me'),
  logout: () => apiRequest('/session/logout', 'POST'),
};

/** Where each role lands after logging in. */
export function dashboardPath(role: Role, id: string): string {
  if (role === 'masteradmin') return `/master/${id}`;
  if (role === 'admin') return `/admin/${id}`;
  return `/emp/${id}`;
}
