import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  siGithub,
  siX,
  siInstagram,
  siYoutube,
  siDiscord,
  type SimpleIcon,
} from 'simple-icons';
import { ArrowUpRight, BriefcaseBusiness, Globe2 } from 'lucide-react';
import { cn } from '../ui';
import { PanelPublicSettings } from '../../lib/types';
import packageJson from '../../package.json';

// The attribution rendered by this component is subject to the AGPLv3
// section 7(b) term in ATTRIBUTION.md.

interface FooterProps {
  className?: string;
  version?: string;
  compact?: boolean;
  publicSettings: PanelPublicSettings;
  supportHref?: string | null;
  docsHref?: string;
  sourceHref?: string;
}

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

type SocialLinkKey = keyof PanelPublicSettings['socialLinks'];

interface SocialLinkDefinition {
  key: SocialLinkKey;
  label: string;
  icon?: SimpleIcon;
}

const SOURCE_REPOSITORY = 'https://github.com/agapornis-dev/agapornis-frontend';

const SOCIAL_LINKS: readonly SocialLinkDefinition[] = [
  { key: 'website', label: 'Website' },
  { key: 'discord', label: 'Discord', icon: siDiscord },
  { key: 'instagram', label: 'Instagram', icon: siInstagram },
  { key: 'twitter', label: 'X / Twitter', icon: siX },
  { key: 'youtube', label: 'YouTube', icon: siYoutube },
  { key: 'github', label: 'GitHub', icon: siGithub },
  { key: 'linkedin', label: 'LinkedIn' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Footer({
  className,
  version,
  compact = false,
  publicSettings,
  supportHref = '/?screen=tickets',
  docsHref,
  sourceHref,
}: FooterProps) {
  const brandName = publicSettings.branding.name ?? 'Agapornis';
  const brandDescription =
    publicSettings.branding.footerTagline ??
    publicSettings.branding.tagline ??
    '';
  const socialEntries = SOCIAL_LINKS.flatMap(definition => {
    const href = publicSettings.socialLinks?.[definition.key]?.trim();
    return href ? [{ ...definition, href }] : [];
  });
  const configuredSource = sourceHref?.trim() || SOURCE_REPOSITORY;
  const configuredDocs = docsHref?.trim() || `${configuredSource}#readme`;
  const configuredVersion = version
    || process.env.NEXT_PUBLIC_AGAPORNIS_FRONTEND_VERSION
    || `v${packageJson.version}`;

  if (compact) {
    const compactLinks = [
      ...(supportHref ? [{ label: 'Support', href: supportHref, external: false }] : []),
      { label: 'Docs', href: configuredDocs, external: true },
      { label: 'Source', href: configuredSource, external: true },
    ];

    return (
      <footer
        className={cn(
          'mobile-safe-bottom w-full shrink-0 border-t border-[var(--border)] bg-[var(--background)] px-3 py-3 sm:px-5 xl:px-6 2xl:px-8',
          className
        )}
      >
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 leading-5">
            <span>© {new Date().getFullYear()} {brandName}. </span>
            <span className="font-semibold text-[var(--foreground)]">
              {publicSettings.attribution?.text || 'Powered by Agapornis'}
            </span>
            <span> · GNU AGPLv3.</span>
          </p>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
            {compactLinks.map(({ label, href, external }) => (
              <Link
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="font-medium transition-colors hover:text-[var(--foreground)]"
              >
                {label}
              </Link>
            ))}
            <span className="font-mono opacity-60">{configuredVersion}</span>
          </div>
        </div>
      </footer>
    );
  }

  const platformLinks: FooterLink[] = [
    ...(supportHref ? [{ label: 'Support tickets', href: supportHref }] : []),
    { label: 'Documentation', href: configuredDocs, external: true },
    { label: 'Source', href: configuredSource, external: true },
    { label: 'Releases', href: `${configuredSource.replace(/\/$/, '')}/releases`, external: true },
    ...(publicSettings.maintenance?.statusPageUrl?.trim()
      ? [{ label: 'Status', href: publicSettings.maintenance.statusPageUrl.trim(), external: true }]
      : []),
  ];

  return (
    <footer
      className={cn(
        'mobile-safe-bottom w-full border-t border-[var(--border)] bg-[var(--background)] px-4 pb-8 pt-10 sm:px-8 sm:pt-12 lg:px-16 xl:px-24',
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(260px,1fr)_minmax(480px,680px)] lg:items-start lg:gap-16 xl:gap-24">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0}
            className="flex flex-col gap-6 lg:max-w-[420px]"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">
                {brandName}
              </h2>
              <p className="max-w-[380px] text-sm leading-relaxed text-[var(--muted-foreground)]">
                {brandDescription}
              </p>
            </div>
          </motion.div>

          <div className={cn(
            'grid gap-10 sm:gap-12',
            socialEntries.length > 0 && 'sm:grid-cols-[minmax(150px,0.7fr)_minmax(280px,1.3fr)]'
          )}>
            <motion.nav
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={1}
              aria-label="Platform links"
            >
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--foreground)]">
                Platform
              </h3>
              <ul className="space-y-3.5">
                {platformLinks.map(({ label, href, external }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="rounded-sm text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                    >
                      {label}
                      {external && <span className="sr-only"> (opens in a new tab)</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>

            {socialEntries.length > 0 && (
              <motion.nav
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={2}
                aria-label="Social and community links"
              >
                <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--foreground)]">
                  Social &amp; community
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {socialEntries.map(({ key, label, href, icon }) => (
                    <li key={key} className="min-w-0">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg border border-[var(--border)]/70 bg-[var(--card)]/35 px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)]/20 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                      >
                        {icon ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width={16}
                            height={16}
                            fill="currentColor"
                            className="shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d={icon.path} />
                          </svg>
                        ) : key === 'linkedin' ? (
                          <BriefcaseBusiness aria-hidden="true" size={17} className="shrink-0" />
                        ) : (
                          <Globe2 aria-hidden="true" size={17} className="shrink-0" />
                        )}
                        <span className="min-w-0 truncate">{label}</span>
                        <ArrowUpRight
                          aria-hidden="true"
                          size={14}
                          className="ml-auto shrink-0 opacity-45 transition-opacity group-hover:opacity-80"
                        />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[var(--border)] pt-6 sm:mt-16 sm:flex-row sm:items-center sm:pt-8">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            <span>© {new Date().getFullYear()} {brandName}.</span>{' '}
            <span className="font-semibold text-[var(--foreground)]">{publicSettings.attribution?.text || 'Powered by Agapornis'}</span>
            <span> · GNU AGPLv3.</span>
          </p>
          <span className="font-mono text-xs font-medium text-[var(--muted-foreground)]/60">
            {configuredVersion}
          </span>
        </div>
      </div>
    </footer>
  );
}
