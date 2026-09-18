'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/app/redux/slice/loginSlice';
import { dashboardPath } from '@/app/redux/api/loginApi';
import { disconnectSocket } from './useSocket';
import { fullName, initials } from './format';
import { StatusBadge, cx } from './ui';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">SP</span>
      <span>Sales Portal</span>
    </Link>
  );
}

function navFor(role, id) {
  if (role === 'masteradmin') {
    return [
      { href: `/master/${id}`, label: 'Master console' },
      { href: `/admin/${id}`, label: 'Sales dashboard' },
      { href: `/candidate/admin/${id}`, label: 'Candidates' },
    ];
  }
  if (role === 'admin') {
    return [
      { href: `/admin/${id}`, label: 'Dashboard' },
      { href: `/candidate/admin/${id}`, label: 'Candidates' },
    ];
  }
  if (role === 'employee') return [{ href: `/emp/${id}`, label: 'Dashboard' }];
  return [];
}

/** Header for signed-in pages. Public pages pass `publicLinks` instead. */
export default function Header({ publicLinks = false }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useSelector((state) => state.login);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await dispatch(logout());
    disconnectSocket();
    router.replace('/login');
  };

  const links = user ? navFor(role, user._id) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Logo />
          <nav className="hidden gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-medium',
                  pathname === link.href ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {initials(user)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-900">{fullName(user)}</span>
                <span className="block text-xs leading-tight text-slate-500">{user.adminId || user.referralId}</span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="animate-fade-in absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-slate-100 px-3 pb-3 pt-1">
                    <p className="truncate text-sm font-medium text-slate-900">{fullName(user)}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <StatusBadge status={role} className="mt-2" />
                  </div>
                  <div className="md:hidden">
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={dashboardPath(role, user._id)}
                    onClick={() => setMenuOpen(false)}
                    className="hidden rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 md:block"
                  >
                    My dashboard
                  </Link>
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : publicLinks ? (
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/apply" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:block">
              Careers
            </Link>
            <Link href="/register-customer" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:block">
              Buy a plan
            </Link>
            <Link href="/login" className="rounded-lg bg-indigo-600 px-3.5 py-2 font-medium text-white hover:bg-indigo-700">
              Staff login
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
