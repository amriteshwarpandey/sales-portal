import { apiRequest } from './client';

/**
 * Email / password change endpoints. Admins and employees use the same flow,
 * but the spec gives them different paths.
 */
export interface AccountApi {
  sendOtp: (id: string, currentPassword: string) => Promise<any>;
  verifyOtp: (id: string, otp: string) => Promise<any>;
  updateEmail: (id: string, newEmail: string) => Promise<any>;
  checkPassword: (id: string, currentPassword: string) => Promise<any>;
  updatePassword: (id: string, currentPassword: string, newPassword: string) => Promise<any>;
}

export function makeAccountApi(base: 'admin' | 'employee'): AccountApi {
  const paths =
    base === 'admin'
      ? { checkPassword: 'checkpass-pass', updatePassword: 'passupdate' }
      : { checkPassword: 'cpass', updatePassword: 'updateUser' };

  return {
    sendOtp: (id, currentPassword) => apiRequest(`/${base}/checkPass/${id}`, 'POST', { currentPassword }),
    verifyOtp: (id, otp) => apiRequest(`/${base}/otp/${id}`, 'POST', { OTP: otp }),
    updateEmail: (id, newEmail) => apiRequest(`/${base}/updateEmail/${id}`, 'PUT', { newEmail }),
    checkPassword: (id, currentPassword) =>
      apiRequest(`/${base}/${paths.checkPassword}/${id}`, 'POST', { currentPassword }),
    updatePassword: (id, currentPassword, newPassword) =>
      apiRequest(`/${base}/${paths.updatePassword}/${id}`, 'PUT', { currentPassword, newPassword }),
  };
}
