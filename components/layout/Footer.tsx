import React from 'react';
import Link from 'next/link';
import { cn } from '../ui';
import { PanelPublicSettings } from '../../lib/types';
import { ArrowUpRight } from 'lucide-react';

interface FooterProps {
  className?: string;
  version?: string;
  publicSettings: PanelPublicSettings;
  supportHref?: string | null;
  docsHref?: string;
  sourceHref?: string;
}

export function Footer({
  className,
  version = 'v1.0.0',
  publicSettings,
  supportHref = '/?screen=tickets',
  docsHref = '/docs',
  sourceHref,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const brandName = publicSettings?.branding?.name || 'Panel';
  const footerTagline = publicSettings?.branding?.footerTagline
    || 'High-performance infrastructure tailored for game server management.';

  return (
    <footer
      className={cn(
        'relative mt-auto w-full overflow-hidden border-t border-[var(--border)] bg-[var(--background)] py-12 sm:py-16',
        className
      )}
    >

      <div className="pointer-events-none absolute -bottom-8 -right-8 select-none font-sans text-[12rem] font-black leading-none tracking-tighter text-[var(--foreground)] opacity-[0.02] sm:text-[16rem] md:text-[20rem]">
        {brandName}
      </div>

      <div className="relative mx-auto flex w-full max-w-screen-2xl flex-col gap-16 px-6 md:flex-row md:justify-between md:px-12">
        
        {/* Left: Brand Identity & Terminal-style Metadata */}
        <div className="flex flex-col gap-6 md:max-w-md">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
              {brandName}
              <span className="text-[var(--primary)]">.</span>
            </h2>
            
          </div>
          
          <p className="text-sm font-medium leading-relaxed text-[var(--muted-foreground)]/80">
            {footerTagline}
          </p>
        </div>

        {/* Right: Typographical Grid Links & Credits */}
        <div className="flex flex-col gap-12 sm:flex-row sm:gap-24">
          
          {/* Resources Column */}
          <div className="flex flex-col gap-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]/50">
              Resources
            </span>
            <nav className="flex flex-col gap-3">
              {supportHref && <FooterLink href={supportHref}>Support</FooterLink>}
              <FooterLink href={docsHref} isExternal>Documentation</FooterLink>
              {sourceHref && <FooterLink href={sourceHref}>Source Code</FooterLink>}
            </nav>
          </div>

          {/* Identity & Credits Column */}
          <div className="flex flex-col gap-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]/50">
              Identity
            </span>
            <div className="flex flex-col gap-3 text-sm font-medium text-[var(--muted-foreground)]">
              <p>&copy; {currentYear} {brandName}</p>
              <p className="flex items-center gap-1.5">
                Crafted by
                <span className="text-[var(--foreground)] transition-colors hover:text-[var(--primary)] cursor-pointer">
                  agapornis
                </span>
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </footer>
  );
}

// Typographical Link with an animated underline and text shift
function FooterLink({
  href,
  children,
  isExternal = false,
}: {
  href: string;
  children: React.ReactNode;
  isExternal?: boolean;
}) {
  const isHttp = href.startsWith('http');
  const external = isExternal || isHttp;

  const content = (
    <span className="group flex w-fit items-center gap-1 text-sm font-medium text-[var(--muted-foreground)] transition-all duration-300 hover:text-[var(--foreground)]">
      <span className="relative">
        {children}
        {/* Animated underline */}
        <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-[var(--primary)] transition-all duration-300 group-hover:w-full" />
      </span>
      {external && (
        <ArrowUpRight 
          size={14} 
          className="translate-y-[1px] opacity-0 transition-all duration-300 group-hover:-translate-y-[1px] group-hover:translate-x-[2px] group-hover:opacity-100 group-hover:text-[var(--primary)]" 
        />
      )}
    </span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
