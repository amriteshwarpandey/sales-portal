'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname, useRouter } from 'next/navigation';
import { fetchSession } from '@/app/redux/slice/loginSlice';
import { dashboardPath } from '@/app/redux/api/loginApi';

/**
 * Guards a page by role. Restores the session from the cookie if needed and
 * redirects users who shouldn't be here.
 *
 * @param {object} opts
 * @param {string[]} opts.roles    Roles allowed on this page
 * @param {string}  [opts.ownerId] If set, non-master users may only view their own id
 */
export function useAuth({ roles, ownerId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, status } = useSelector((state) => state.login);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSession());
  }, [status, dispatch]);

  const roleAllowed = Boolean(role && roles.includes(role));
  const ownerAllowed = !ownerId || role === 'masteradmin' || user?._id === ownerId;
  const ready = status === 'authenticated' && roleAllowed && ownerAllowed;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === 'authenticated' && (!roleAllowed || !ownerAllowed)) {
      router.replace(dashboardPath(role, user._id));
    }
  }, [status, roleAllowed, ownerAllowed, role, user, router, pathname]);

  return { user, role, ready };
}
