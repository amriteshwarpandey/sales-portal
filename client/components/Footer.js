import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Sales Portal</p>
        <nav className="flex gap-4">
          <Link href="/apply" className="hover:text-slate-900">
            Careers
          </Link>
          <Link href="/register-customer" className="hover:text-slate-900">
            Plans
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Staff login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
