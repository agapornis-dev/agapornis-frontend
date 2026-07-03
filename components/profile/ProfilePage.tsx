import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, KeyRound, RefreshCw, Save, ShieldCheck, ShieldOff, UserRound, AlertTriangle, Fingerprint } from 'lucide-react';
import { Session, User } from '../../lib/types';
import { btn, inp } from '../../lib/constants';
import { Field, Panel, cn } from '../ui';
import { HeadersMap, requestJson } from '../../lib/http';
import { AccountActivity } from '../server/ServerActivity';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function ProfileScreen({ apiBase, showToast, session, setSession }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; session: Session; setSession: (s: any) => void }) {
  const { busy, run } = useApiAction(showToast);

  return (
    <ProfilePage
      user={session.user}
      busy={busy}
      apiBase={apiBase}
      authHeaders={{}}
      onSaveProfile={async (data) => {
        const user = await run(() => requestJson(apiBase, '/auth/me', {}, { method: 'PATCH', body: JSON.stringify(data) }), 'Profile updated');
        if (user) setSession({ user });
      }}
      onChangePassword={async (data) => {
        await run(() => requestJson(apiBase, '/auth/password', {}, { method: 'PATCH', body: JSON.stringify(data) }), 'Password changed');
      }}
      onTwoFactorChanged={user => setSession({ user })}
      showToast={showToast}
    />
  );
}

export function ProfilePage({
  user,
  busy,
  apiBase,
  authHeaders,
  onSaveProfile,
  onChangePassword,
  onTwoFactorChanged,
  showToast
}: {
  user: User;
  busy: boolean;
  apiBase: string;
  authHeaders: HeadersMap;
  onSaveProfile: (data: { name: string; email: string }) => Promise<void>;
  onChangePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  onTwoFactorChanged: (user: User) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  return (
    <div className="mx-auto grid max-w-[1200px] gap-10">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Account Settings<span className="text-[var(--primary)]">.</span>
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Personal Information */}
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
            <UserRound size={16} className="text-[var(--primary)]" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Identity Profile
            </span>
          </div>
          
          <form
            className="grid gap-6 p-6"
            onSubmit={event => {
              event.preventDefault();
              void onSaveProfile(profile);
            }}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Display name">
                <input 
                  className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium")} 
                  value={profile.name} 
                  onChange={event => setProfile({ ...profile, name: event.target.value })} 
                />
              </Field>
              <Field label="Email address">
                <input 
                  className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium")} 
                  type="email" 
                  value={profile.email} 
                  onChange={event => setProfile({ ...profile, email: event.target.value })} 
                />
              </Field>
            </div>
            
            <div className="flex justify-end pt-2">
              <button 
                className={cn('group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50')} 
                disabled={busy}
              >
                <Save size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:scale-105" /> 
                Commit Changes
              </button>
            </div>
          </form>
        </Panel>

        {/* Password Management */}
        <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
            <KeyRound size={16} className="text-[var(--primary)]" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Password
            </span>
          </div>
          
          <form
            className="grid gap-5 p-6"
            onSubmit={event => {
              event.preventDefault();
              if (passwords.newPassword !== passwords.confirmPassword) return;
              void onChangePassword({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
              }).then(() => setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }));
            }}
          >
            <Field label="Current password">
              <input className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)]")} type="password" value={passwords.currentPassword} onChange={event => setPasswords({ ...passwords, currentPassword: event.target.value })} />
            </Field>
            <Field label="New password">
              <input className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)]")} type="password" minLength={8} value={passwords.newPassword} onChange={event => setPasswords({ ...passwords, newPassword: event.target.value })} />
            </Field>
            <Field label="Confirm new password">
              <input className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)]")} type="password" minLength={8} value={passwords.confirmPassword} onChange={event => setPasswords({ ...passwords, confirmPassword: event.target.value })} />
            </Field>
            
            <div className="pt-3">
              <button 
                className={cn('group flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-4 py-2.5 text-sm font-medium transition-all hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed')} 
                disabled={busy || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}
              >
                <KeyRound size={16} className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]" /> 
                Update Password
              </button>
            </div>
          </form>
        </Panel>
      </div>

      <TwoFactorPanel
        user={user}
        apiBase={apiBase}
        authHeaders={authHeaders}
        onChanged={onTwoFactorChanged}
        showToast={showToast}
      />

      {/* Adding a subtle wrapper to Account Activity to match the layout width/spacing */}
      <div className="mt-4 border-t border-[var(--border)]/50 pt-8">
        <AccountActivity apiBase={apiBase} authHeaders={authHeaders} />
      </div>
    </div>
  );
}

type TwoFactorSetup = {
  secret: string;
  formattedSecret: string;
  otpauthUri: string;
  setupToken: string;
};

function TwoFactorPanel({
  user,
  apiBase,
  authHeaders,
  onChanged,
  showToast
}: {
  user: User;
  apiBase: string;
  authHeaders: HeadersMap;
  onChanged: (user: User) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [recoveryVerification, setRecoveryVerification] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!setup?.otpauthUri) return setQrCode('');
    void QRCode.toDataURL(setup.otpauthUri, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrCode)
      .catch(() => setQrCode(''));
  }, [setup?.otpauthUri]);

  async function beginSetup() {
    setBusy(true);
    try {
      setSetup(await requestJson(apiBase, '/auth/2fa/setup', authHeaders, { method: 'POST' }));
      setRecoveryCodes([]);
      setCode('');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (!setup) return;
    setBusy(true);
    try {
      const result = await requestJson(apiBase, '/auth/2fa/enable', authHeaders, {
        method: 'POST',
        body: JSON.stringify({ setupToken: setup.setupToken, code })
      });
      setRecoveryCodes(result.recoveryCodes || []);
      setSetup(null);
      setCode('');
      onChanged(result.user);
      showToast('Two-factor authentication enabled', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const nextUser = await requestJson(apiBase, '/auth/2fa/disable', authHeaders, {
        method: 'POST',
        body: JSON.stringify({ password, code: disableCode })
      });
      onChanged(nextUser);
      setPassword('');
      setCode('');
      setDisableCode('');
      setRecoveryCodes([]);
      showToast('Two-factor authentication disabled', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    try {
      const result = await requestJson(apiBase, '/auth/2fa/recovery-codes', authHeaders, {
        method: 'POST',
        body: JSON.stringify({ code: recoveryVerification })
      });
      setRecoveryCodes(result.recoveryCodes || []);
      setRecoveryVerification('');
      showToast('Recovery codes replaced', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
      
      {/* 2FA Header with Technical Status Badge */}
      <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Fingerprint size={16} className="text-[var(--primary)]" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Multi Factor Auth
          </span>
        </div>
        
        {/* Glowing Terminal Status Indicator */}
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest",
          user.twoFactorEnabled 
            ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]" 
            : "border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)]"
        )}>
          <span className="relative flex h-1.5 w-1.5">
            {user.twoFactorEnabled && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", user.twoFactorEnabled ? "bg-[var(--success)]" : "bg-[var(--muted-foreground)]")} />
          </span>
          {user.twoFactorEnabled ? 'Active' : 'Disabled'}
        </div>
      </div>

      <div className="grid gap-8 p-6 lg:p-8">
        
        {/* State 1: Disabled & Not Setting Up */}
        {!user.twoFactorEnabled && !setup && (
          <div className="flex flex-col items-start gap-6 rounded-xl border border-[var(--border)]/50 bg-[var(--secondary)]/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">Enhance your account security</h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                Protect your account against unauthorized access by requiring a TOTP authenticator app and one-time recovery codes during sign-in.
              </p>
            </div>
            <button 
              className="group relative flex shrink-0 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-all hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 disabled:opacity-50" 
              disabled={busy} 
              onClick={() => void beginSetup()}
            >
              <ShieldCheck size={16} className="transition-transform group-hover:scale-110" /> 
              Initialize Setup
            </button>
          </div>
        )}

        {/* State 2: Actively Setting Up */}
        {setup && (
          <div className="grid gap-10 md:grid-cols-[220px_1fr]">
            
            {/* QR Code Block */}
            <div className="flex flex-col gap-3">
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-white p-2 shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)] ring-1 ring-[var(--border)]">
                {qrCode ? (
                  <img src={qrCode} alt="Authenticator setup QR code" width={204} height={204} className="rounded-md" />
                ) : (
                  <span className="font-mono text-xs text-black/50">Generating_QR...</span>
                )}
              </div>
            </div>
            
            {/* Form Block */}
            <div className="flex flex-col justify-center gap-6">
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">1. Scan the QR code, or enter this secret manually:</p>
                <code className="flex w-fit items-center rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/30 px-4 py-2.5 font-mono text-sm font-semibold tracking-widest text-[var(--primary)]">
                  {setup.formattedSecret}
                </code>
              </div>
              
              <div className="max-w-xs">
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">2. Verify authenticator code:</p>
                <Field label>
                  <input 
                    className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 text-lg tracking-widest text-center transition-all focus:border-[var(--primary)] h-12")} 
                    placeholder="000000"
                    inputMode="numeric" 
                    autoComplete="one-time-code" 
                    value={code} 
                    onChange={event => setCode(event.target.value)} 
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  className="group flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-all hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-50" 
                  disabled={busy || !code.trim()} 
                  onClick={() => void enable()}
                >
                  <ShieldCheck size={16} className="transition-transform group-hover:scale-110" /> 
                  Verify & Enable
                </button>
                <button 
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/50 hover:text-[var(--foreground)]" 
                  onClick={() => setSetup(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Enabled (Manage / Disable) */}
        {user.twoFactorEnabled && recoveryCodes.length === 0 && (
          <div className="grid gap-8 lg:grid-cols-2">
            
            {/* Left Col: Recovery Codes */}
            <div className="flex flex-col gap-5 rounded-xl border border-[var(--border)]/40 bg-[var(--secondary)]/5 p-6">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Recovery Codes</h4>
                <p className="text-xs text-[var(--muted-foreground)]">
                  You have <span className="font-mono text-[var(--foreground)]">{user.recoveryCodesRemaining || 0}</span> recovery codes remaining.
                </p>
              </div>
              
              <Field label="Current Authenticator Code">
                <input 
                  className={cn(inp, "bg-[var(--secondary)]/10 border-[var(--border)]/60 font-mono tracking-widest")} 
                  placeholder="000000"
                  value={recoveryVerification} 
                  onChange={event => setRecoveryVerification(event.target.value)} 
                  autoComplete="one-time-code" 
                />
              </Field>
              
              <button 
                className="group inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)]/50 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50" 
                disabled={busy || !recoveryVerification.trim()} 
                onClick={() => void regenerate()}
              >
                <RefreshCw size={14} className="transition-transform group-hover:rotate-180" /> 
                Regenerate Codes
              </button>
            </div>

            {/* Right Col: Disable 2FA */}
            <div className="flex flex-col gap-5 rounded-xl border border-red-500/10 bg-red-500/5 p-6">
              <div className="flex flex-col gap-1">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-500">
                  <AlertTriangle size={14} /> Disable Authentication
                </h4>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Disabling 2FA reduces your account security significantly.
                </p>
              </div>

              <div className="grid gap-4">
                {user.passwordEnabled !== false && (
                  <Field label="Current password">
                    <input className={cn(inp, "border-red-500/20 bg-red-500/5 focus:border-red-500/50 focus:ring-red-500/20")} type="password" value={password} onChange={event => setPassword(event.target.value)} />
                  </Field>
                )}
                <Field label="Authenticator or recovery code">
                  <input className={cn(inp, "font-mono tracking-widest border-red-500/20 bg-red-500/5 focus:border-red-500/50 focus:ring-red-500/20")} placeholder="000000" value={disableCode} onChange={event => setDisableCode(event.target.value)} />
                </Field>
              </div>
              
              <button 
                className="group mt-1 inline-flex w-fit items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50" 
                disabled={busy || !disableCode.trim() || (user.passwordEnabled !== false && !password)} 
                onClick={() => void disable()}
              >
                <ShieldOff size={16} className="transition-transform group-hover:scale-110" /> 
                Disable 2FA
              </button>
            </div>
          </div>
        )}

        {/* State 4: Just generated Recovery Codes */}
        {recoveryCodes.length > 0 && (
          <div className="flex flex-col gap-6 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Save these recovery codes</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Each code works once. Store them in a secure password manager.</p>
              </div>
              <button 
                className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium transition-all hover:border-[var(--primary)]/50 hover:text-[var(--primary)]" 
                onClick={() => void navigator.clipboard.writeText(recoveryCodes.join('\n'))}
              >
                <Copy size={14} className="transition-transform group-hover:scale-110" /> 
                Copy to clipboard
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--background)] p-5 sm:grid-cols-5">
              {recoveryCodes.map(codeValue => (
                <code key={codeValue} className="select-all rounded-md bg-[var(--secondary)]/30 py-1.5 text-center font-mono text-sm tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]/50">
                  {codeValue}
                </code>
              ))}
            </div>
            
            <button 
              className="group flex w-fit items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90" 
              onClick={() => setRecoveryCodes([])}
            >
              I have securely saved these codes
            </button>
          </div>
        )}

      </div>
    </Panel>
  );
}