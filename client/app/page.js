import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const FEATURES = [
  {
    title: 'Sales reporting & analytics',
    body: 'Revenue by month, top performers and the full recruitment pipeline on one dashboard.',
  },
  {
    title: 'User account management',
    body: 'Role-based access for the master admin, admins and employees, with OTP-verified email changes.',
  },
  {
    title: 'Administration tools',
    body: 'Manage admins, employees and customers, with an audit log of every sensitive action.',
  },
  {
    title: 'Candidate tracking',
    body: 'Shortlist, invite, collect resumes and convert candidates into employees in a few clicks.',
  },
  {
    title: 'Payment processing',
    body: 'Customers pay online through a referral link; admins confirm offline payments and refunds.',
  },
  {
    title: 'Real-time updates',
    body: 'Dashboards refresh live over WebSockets as candidates apply and customers pay.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header publicLinks />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Sales Portal</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              One place for your sales pipeline, customers, and hiring.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              Track sales, manage clients and hiring, and see what&apos;s happening in real time. Built for sales teams and the people who manage them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700">
                Staff login
              </Link>
              <Link href="/apply" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Apply for a job
              </Link>
              <Link href="/register-customer" className="rounded-lg px-5 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                Buy a plan →
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Everything the sales team needs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
