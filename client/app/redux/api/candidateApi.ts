import { apiRequest, withQuery } from './client';

export type CandidateStatus = 'pending' | 'shortlisted' | 'discarded' | 'invited' | 'employee';

export interface CandidateApplication {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  college: string;
  state: string;
  branch: string;
  degree: string;
  passingYear: number | string;
  message?: string;
}

/** Status action -> endpoint segment, as defined by the API. */
const STATUS_ENDPOINT: Record<Exclude<CandidateStatus, 'employee'>, string> = {
  shortlisted: 'shortlist',
  discarded: 'discard',
  pending: 'pending',
  invited: 'invited',
};

export const candidateApi = {
  apply: (data: CandidateApplication) => apiRequest('/candidate', 'POST', data),
  list: (adminId: string, query: { status?: string; q?: string } = {}) =>
    apiRequest(withQuery(`/candidate/admin-candidate/${adminId}`, query)),
  get: (id: string) => apiRequest(`/candidate/${id}`),
  setStatus: (adminId: string, candidateId: string, status: Exclude<CandidateStatus, 'employee'>) =>
    apiRequest(`/candidate/${STATUS_ENDPOINT[status]}/${adminId}`, 'POST', { candidateId }),
  convertToEmployee: (adminId: string, candidateId: string) =>
    apiRequest(`/candidate/employee/${adminId}`, 'POST', { candidateId }),
  inviteOne: (candidateId: string) => apiRequest(`/candidate/sendemail/${candidateId}`, 'POST'),
  inviteAllShortlisted: () => apiRequest('/candidate/sendemail', 'POST'),
  submissionInfo: (emailHash: string) => apiRequest(`/candidate/submission/${emailHash}`),
  submitResume: (emailHash: string, email: string, resumeLink: string) =>
    apiRequest(`/candidate/submission/${emailHash}`, 'POST', { email, resumeLink }),
};
