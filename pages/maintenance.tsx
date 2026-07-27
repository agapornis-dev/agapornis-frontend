import { Clock, RefreshCw, Mail } from 'lucide-react';
import { Shell } from '../components/ui';
import type { PanelPublicSettings } from '../lib/types';
import Image from 'next/image';
import Head from 'next/head';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface MaintenancePageProps {
  title?: string;
  message?: string;
  /** Human‑readable fallback (e.g. “15 mins”) – shown when no timestamp is provided */
  estimatedCompletion?: string;
  /** ISO 8601 timestamp – if provided, a live countdown replaces the static text */
  estimatedCompletionTimestamp?: string;
  statusPageUrl?: string;
  administratorLoginUrl?: string;
  supportEmail?: string;
  publicSettings?: PanelPublicSettings;
}


function useCountdown(targetISO?: string) {
  const [remaining, setRemaining] = useState<number | null>(null);

  const calculate = useCallback(() => {
    if (!targetISO) return null;
    const diff = new Date(targetISO).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }, [targetISO]);

  useEffect(() => {
    if (!targetISO) {
      setRemaining(null);
      return;
    }
    setRemaining(calculate());

    const id = setInterval(() => {
      const diff = calculate();
      setRemaining(diff);
      if (diff === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetISO, calculate]);

  const formatted = useMemo(() => {
    if (remaining === null) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }, [remaining]);

  return { remaining, formatted };
}

export function MaintenancePage({
  title = 'We’ll be back shortly',
  message = 'We are undergoing scheduled maintenance. We’re making a few improvements and will be online again soon.',
  estimatedCompletion = '15 mins',
  estimatedCompletionTimestamp,
  statusPageUrl = '#',
  administratorLoginUrl,
  supportEmail,
  publicSettings,
}: MaintenancePageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false); // reset fade when image changes
  }, []);

  const { remaining, formatted } = useCountdown(estimatedCompletionTimestamp);
  const isCountdownOver = remaining !== null && remaining <= 0;
  const countdownDisplay = formatted ?? estimatedCompletion;

  return (
    <>
      <Head>
        <title>{`${publicSettings?.branding?.name || 'Agapornis'} – Maintenance`}</title>
      </Head>

      <Shell>
        <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-white antialiased">


          <div className="relative z-10 flex min-h-[100dvh] flex-col">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between px-6 py-6 md:px-12">
              <a
                href="/"
                className="flex items-center gap-3 text-sm font-medium tracking-tight text-white/90 transition-colors hover:text-white"
                aria-label="Home"
              >
                {publicSettings?.branding?.name || 'Agapornis'}
              </a>

              <nav className="flex items-center gap-5 text-sm" aria-label="Utility links">
                {administratorLoginUrl && (
                  <a
                    href={administratorLoginUrl}
                    className="hidden text-white/70 transition hover:text-white sm:block"
                  >
                    Admin
                  </a>
                )}
                {statusPageUrl && (
                  <a
                    href={statusPageUrl}
                    className="text-white/70 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    Status
                  </a>
                )}
              </nav>
            </header>

            {/* Main content */}
            <main className="flex flex-1 items-center justify-center px-6 py-12">
              <section className="mx-auto max-w-3xl text-center animate-fade-in">
                {/* Live indicator */}
                <p className="mb-5 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-white/65">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                  </span>
                  {isCountdownOver ? 'Maintenance Completed' : 'Scheduled Maintenance'}
                </p>

                <h1 className="mx-auto max-w-2xl text-5xl font-light tracking-[-0.04em] text-white sm:text-6xl md:text-7xl">
                  {isCountdownOver ? 'We are back!' : title}
                </h1>

                <p className="mx-auto mt-7 max-w-xl text-base font-light leading-7 text-white/75 sm:text-lg">
                  {isCountdownOver
                    ? 'The maintenance is finished. Everything should be operating normally. You may need to refresh the page.'
                    : message}
                </p>

                {/* Actions row */}
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {!isCountdownOver && countdownDisplay && (
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm text-white/85 backdrop-blur-md">
                      <Clock size={15} className="text-white/65 animate-pulse" />
                      <span>
                        {estimatedCompletionTimestamp
                          ? `Returning in ${countdownDisplay}`
                          : `Estimated return: ${countdownDisplay}`}
                      </span>
                    </div>
                  )}

                  {isCountdownOver && (
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 active:scale-95"
                    >
                      <RefreshCw size={16} />
                      Refresh page
                    </button>
                  )}

                  {!isCountdownOver && statusPageUrl && (
                    <a
                      href={statusPageUrl}
                      className="inline-flex rounded-full border border-white/20 bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 active:scale-95"
                    >
                      View status
                    </a>
                  )}
                </div>

                {supportEmail && (
                  <p className="mt-6 text-sm text-white/60">
                    Need help?{' '}
                    <a
                      href={`mailto:${supportEmail}`}
                      className="inline-flex items-center gap-1 underline-offset-4 transition hover:text-white hover:underline"
                    >
                      <Mail size={14} />
                      {supportEmail}
                    </a>
                  </p>
                )}
              </section>
            </main>

            {/* Footer */}
            <footer className="shrink-0 px-6 py-6 text-center">
              <p className="text-xs font-light tracking-wide text-white/50">
                {publicSettings?.branding?.footerTagline ||
                  'Game server infrastructure, briefly taking a breath.'}
              </p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-white/60">
                {publicSettings?.attribution?.text || 'Powered by Agapornis'}
              </p>
            </footer>
          </div>
        </div>
      </Shell>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out both;
        }
      `}</style>
    </>
  );
}

export default MaintenancePage;
