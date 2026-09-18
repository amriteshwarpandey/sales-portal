'use client';

import Header from './Header';
import Footer from './Footer';
import { PageLoader } from './ui';

/** Frame for signed-in pages: header, page title row, content. */
export default function DashboardShell({ ready = true, title, subtitle, actions, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {ready ? (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                {title && <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      ) : (
        <PageLoader />
      )}
      <Footer />
    </div>
  );
}
