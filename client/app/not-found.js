import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="text-slate-600">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        Go home
      </Link>
    </div>
  );
}
