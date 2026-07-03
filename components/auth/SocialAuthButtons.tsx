import Image from 'next/image';
import { PanelPublicSettings } from '../../lib/types';

export function SocialAuthButtons({ settings }: { settings: PanelPublicSettings }) {
  const providers = [
    { key: 'google', label: 'Google', enabled: settings.socialAuth?.google?.enabled === true, iconUrl: 'https://thesvg.org/icons/google/default.svg' },
    { key: 'discord', label: 'Discord', enabled: settings.socialAuth?.discord?.enabled === true, iconUrl: 'https://thesvg.org/icons/discord/default.svg' }
  ].filter(p => p.enabled);

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs font-medium text-[var(--muted-foreground)]">
        <span className="h-px flex-1 bg-[var(--border)]/60" />
        <span>OR</span>
        <span className="h-px flex-1 bg-[var(--border)]/60" />
      </div>
      <div className="flex flex-col gap-2">
        {providers.map(provider => (
          <button
            key={provider.key}
            type="button"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--secondary)]/30 hover:border-[var(--border)]"
            onClick={() => window.location.assign(`/api/auth/oauth/start?provider=${provider.key}`)}
          >
            <Image src={provider.iconUrl} alt="" width={18} height={18} />
            Continue with {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
