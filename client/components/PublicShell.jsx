import Header from './Header';
import Footer from './Footer';

/** Layout for public pages (no login needed). */
export default function PublicShell({ title, subtitle, children, width = 'max-w-3xl' }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header publicLinks />
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${width}`}>
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
