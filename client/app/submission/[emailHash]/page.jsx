'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { candidateApi } from '../../redux/api/candidateApi';
import { errorMessage } from '../../redux/api/client';
import PublicShell from '@/components/PublicShell';
import { Button, Card, Input, PageLoader } from '@/components/ui';

export default function ResumeSubmissionPage() {
  const { emailHash } = useParams();
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    candidateApi
      .submissionInfo(emailHash)
      .then(setInfo)
      .catch((err) => setLoadError(errorMessage(err)));
  }, [emailHash]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await candidateApi.submitResume(emailHash, email.trim(), resumeLink.trim());
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <PublicShell>
        <Card className="mx-auto max-w-lg text-center">
          <h1 className="text-xl font-semibold text-slate-900">Link not valid</h1>
          <p className="mt-2 text-slate-600">{loadError}. Please use the link from your most recent email.</p>
        </Card>
      </PublicShell>
    );
  }

  if (!info) {
    return (
      <PublicShell>
        <PageLoader />
      </PublicShell>
    );
  }

  if (done) {
    return (
      <PublicShell>
        <Card className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Resume received</h1>
          <p className="mt-2 text-slate-600">Thanks, {info.firstName}. Our team will review it and get back to you soon.</p>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={`Hi ${info.firstName}, submit your resume`} subtitle="Share a link to your resume (Google Drive, Dropbox, OneDrive, or a personal site).">
      <Card>
        {info.submitted && (
          <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You&apos;ve already submitted a resume. Submitting again will replace it.
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Your email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Use the address this invitation was sent to."
            required
          />
          <Input
            label="Resume link"
            type="url"
            placeholder="https://drive.google.com/…"
            value={resumeLink}
            onChange={(e) => setResumeLink(e.target.value)}
            hint="Make sure the link can be opened by anyone who has it."
            required
          />
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving}>
            Submit resume
          </Button>
        </form>
      </Card>
    </PublicShell>
  );
}
