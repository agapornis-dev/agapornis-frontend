import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, CircleUserRound, Cloud, Construction, IdCard, LifeBuoy, Link2, LockKeyhole, Mail, Megaphone, MessageCircle, Puzzle, Save, Send, ShieldCheck } from 'lucide-react';
import { btn, inp } from '../../lib/constants';
import { PanelAdminSettings } from '../../lib/types';
import { requestJson } from '../../lib/http';
import { useApiAction } from '../../hooks/useApiAction';
import { useLazyData } from '../../hooks/useLazyData';
import { EmailTemplateEditor } from '../../components/admin/settings/EmailTemplateEditor';
import { PasswordPolicyPanel } from '../../components/admin/settings/PasswordPolicyPanel';
import { Field, Panel, PanelTitleBar, Switch, ToggleCard, cn, formControlClass } from '../../components/ui';

export function SettingsScreen({ apiBase, showToast, updatePublicSettings }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; updatePublicSettings: (s: any) => void }) {
  const { data: settings, loading, refresh } = useLazyData<PanelAdminSettings>(apiBase, '/settings', {}, null);
  const { busy, run } = useApiAction(showToast);

  const handleSave = async (formData: any) => {
    const updated = await run(() => requestJson(apiBase, '/settings', {}, { method: 'PATCH', body: JSON.stringify(formData) }), 'Panel settings saved');
    if (updated) { updatePublicSettings(updated); refresh(); }
  };

  const handleTestEmail = async (email: string, smtp: any) => {
    await run(() => requestJson(apiBase, '/settings/smtp/test', {}, { method: 'POST', body: JSON.stringify({ email, smtp }) }), `Test email sent to ${email}`);
  };

  if (loading && !settings) return <div>Loading...</div>;
  if (!settings) return null;

  return <PanelSettingsPage settings={settings} busy={busy || loading} onSave={handleSave} onTestEmail={handleTestEmail} />;
}

function PanelSettingsPage({
  settings,
  busy,
  onSave,
  onTestEmail
}: {
  settings: PanelAdminSettings;
  busy: boolean;
  onSave: (settings: any) => Promise<void>;
  onTestEmail: (email: string, smtp: any) => Promise<void>;
}) {
  const [form, setForm] = useState(settings);
  const [secretKey, setSecretKey] = useState('');
  const [socialSecrets, setSocialSecrets] = useState({ google: '', discord: '' });
  const [smtpPassword, setSmtpPassword] = useState('');
  const [curseForgeApiKey, setCurseForgeApiKey] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(settings);
    setSecretKey('');
    setSocialSecrets({ google: '', discord: '' });
    setSmtpPassword('');
    setCurseForgeApiKey('');
    setDirty(false);
  }, [settings]);

  const customInputStyle = formControlClass();

  const updateForm = (next: PanelAdminSettings) => {
    setForm(next);
    setDirty(true);
  };

  const save = () => onSave({
    ...form,
    captcha: { ...form.captcha, secretKey: secretKey || undefined },
    socialAuth: {
      google: { ...form.socialAuth.google, clientSecret: socialSecrets.google || undefined },
      discord: { ...form.socialAuth.discord, clientSecret: socialSecrets.discord || undefined }
    },
    smtp: { ...form.smtp, password: smtpPassword || undefined },
    modProviders: { curseForgeApiKey: curseForgeApiKey || undefined }
  });

  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* Contextual bar: the page title itself already lives in AdminShell's header,
          so this only carries the description + save action, sticking to the top of
          the scroll area the same way the shell's own header sits above content. */}
      <div className="sticky -top-1 sm:-top-1 md:-top-1 z-10 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--background)]/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 md:-mx-8 md:-mt-8 md:px-8">
        <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
          Configure core panel branding, security policies, and external integrations.
        </p>
        <button
          className={cn(btn, 'group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed')}
          disabled={busy}
          onClick={save}
        >
          <Save size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:scale-105" />
          {dirty ? 'Save Configuration' : 'Saved'}
        </button>
      </div>

      <div className="grid gap-8 2xl:grid-cols-[1fr_460px] xl:grid-cols-[1fr_420px] items-start">

        {/* Left Column: Branding & Backups */}
        <div className="flex flex-col gap-8">

          {/* Branding Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<IdCard size={18} className="text-[var(--primary)]" />} title="Brand Identity" />
            <div className="grid gap-6 p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Brand Name (Company)">
                  <input className={cn(inp, customInputStyle)} value={form.branding.name} onChange={event => updateForm({ ...form, branding: { ...form.branding, name: event.target.value } })} placeholder="e.g. Acme Hosting" />
                </Field>
                <Field label="Panel Name (Application)">
                  <input className={cn(inp, customInputStyle)} value={form.branding.panelName} onChange={event => updateForm({ ...form, branding: { ...form.branding, panelName: event.target.value } })} placeholder="e.g. Core_Sys" />
                </Field>
              </div>
              <Field label="Login Screen Tagline">
                <input className={cn(inp, customInputStyle)} value={form.branding.tagline} onChange={event => updateForm({ ...form, branding: { ...form.branding, tagline: event.target.value } })} placeholder="Manage your infrastructure..." />
              </Field>
              <Field label="Public Panel URL">
                <input className={cn(inp, customInputStyle, 'font-mono')} type="url" value={form.branding.publicUrl} onChange={event => updateForm({ ...form, branding: { ...form.branding, publicUrl: event.target.value } })} placeholder="https://panel.example.com" />
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Used for secure links in password-reset emails.</p>
              </Field>
              <Field label="Footer Tagline">
                <textarea className={cn(inp, customInputStyle, 'min-h-20 resize-y')} value={form.branding.footerTagline} onChange={event => updateForm({ ...form, branding: { ...form.branding, footerTagline: event.target.value } })} placeholder="Describe your service in the footer..." />
              </Field>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<Link2 size={18} className="text-[var(--primary)]" />} title="Social & Community Links" />
            <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              {([
                ['website', 'Website', 'https://example.com'],
                ['discord', 'Discord', 'https://discord.gg/example'],
                ['instagram', 'Instagram', 'https://instagram.com/example'],
                ['twitter', 'Twitter / X', 'https://x.com/example'],
                ['youtube', 'YouTube', 'https://youtube.com/@example'],
                ['github', 'GitHub', 'https://github.com/example'],
                ['linkedin', 'LinkedIn', 'https://linkedin.com/company/example'],
              ] as const).map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <input
                    className={cn(inp, customInputStyle, 'font-mono text-xs')}
                    type="url"
                    value={form.socialLinks[key]}
                    placeholder={placeholder}
                    onChange={event => updateForm({ ...form, socialLinks: { ...form.socialLinks, [key]: event.target.value } })}
                  />
                </Field>
              ))}
            </div>
          </Panel>

          {/* Backup Storage Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<Cloud size={18} className="text-[var(--primary)]" />} title="Backup Infrastructure" />
            <div className="grid gap-6 p-6 sm:p-8">

              <ToggleCard
                title="Allow S3-Compatible Remote Backups"
                description="Credentials and encryption keys remain isolated on each individual agent."
                checked={form.backupPolicy.s3Enabled}
                onChange={checked => updateForm({ ...form, backupPolicy: { ...form.backupPolicy, s3Enabled: checked } })}
              />

              <div className={cn("grid gap-6 sm:grid-cols-2 transition-opacity duration-300", !form.backupPolicy.s3Enabled && "opacity-50 pointer-events-none")}>
                <Field label="Default Storage Target">
                  <select className={cn(inp, customInputStyle)} value={form.backupPolicy.defaultStorage} disabled={!form.backupPolicy.s3Enabled} onChange={event => updateForm({ ...form, backupPolicy: { ...form.backupPolicy, defaultStorage: event.target.value as 'local' | 's3' } })}>
                    <option value="local">Agent-Local Storage</option>
                    <option value="s3">S3-Compatible Remote</option>
                  </select>
                </Field>
                <Field label="Remote Retention Limit">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={100} value={form.backupPolicy.retentionCount} onChange={event => updateForm({ ...form, backupPolicy: { ...form.backupPolicy, retentionCount: Number(event.target.value) } })} />
                </Field>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 border-t border-[var(--border)]/50 pt-6">
                <Field label="Restore-Test Interval (Hours)">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={720} value={form.backupPolicy.verificationIntervalHours} onChange={event => updateForm({ ...form, backupPolicy: { ...form.backupPolicy, verificationIntervalHours: Number(event.target.value) } })} />
                </Field>
                <div className="pt-6">
                  <ToggleCard
                    title="Enforce Client-Side Encryption"
                    checked={form.backupPolicy.encryptionRequired}
                    onChange={checked => updateForm({ ...form, backupPolicy: { ...form.backupPolicy, encryptionRequired: checked } })}
                    minimal
                  />
                </div>
              </div>

            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<Puzzle size={18} className="text-[var(--primary)]" />} title="Minecraft Mod Providers" />
            <div className="grid gap-4 p-6 sm:p-8">
              <Field label="CurseForge API Key">
                <input
                  className={cn(inp, customInputStyle, 'font-mono text-xs')}
                  type="password"
                  value={curseForgeApiKey}
                  placeholder={form.modProviders.curseForgeApiKeyConfigured ? 'API key configured' : 'Enter CurseForge for Studios API key'}
                  onChange={event => { setCurseForgeApiKey(event.target.value); setDirty(true); }}
                  autoComplete="off"
                />
              </Field>
              <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                Modrinth works automatically. Add a CurseForge for Studios key to include CurseForge mods and server packs in the Minecraft browser.
              </p>
            </div>
          </Panel>

          {/* Social Auth Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<CircleUserRound size={18} className="text-[var(--primary)]" />} title="Social Authentication" />
            <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)]/50">
              {([
                { key: 'google' as const, label: 'Google OAuth', icon: CircleUserRound, color: 'text-blue-500' },
                { key: 'discord' as const, label: 'Discord OAuth', icon: MessageCircle, color: 'text-indigo-400' }
              ]).map(({ key, label, icon: Icon, color }) => {
                const provider = form.socialAuth[key];
                return (
                  <section key={key} className="flex flex-col gap-5 p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 text-base font-bold text-[var(--foreground)]">
                        <Icon size={18} className={color} /> {label}
                      </div>
                      <Switch
                        checked={provider.enabled}
                        onChange={checked => updateForm({ ...form, socialAuth: { ...form.socialAuth, [key]: { ...provider, enabled: checked } }})}
                      />
                    </div>

                    <div className={cn("flex flex-col gap-4 transition-opacity duration-300", !provider.enabled && "opacity-40 pointer-events-none")}>
                      <Field label="Client ID">
                        <input className={cn(inp, customInputStyle, "font-mono text-xs")} value={provider.clientId} onChange={event => updateForm({ ...form, socialAuth: { ...form.socialAuth, [key]: { ...provider, clientId: event.target.value } }})} />
                      </Field>
                      <Field label="Client Secret">
                        <input className={cn(inp, customInputStyle, "font-mono text-xs")} type="password" value={socialSecrets[key]} placeholder={provider.secretConfigured ? 'Secret configured' : 'Enter new secret'} onChange={event => { setSocialSecrets({ ...socialSecrets, [key]: event.target.value }); setDirty(true); }} />
                      </Field>
                    </div>
                  </section>
                );
              })}
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar
              icon={<Mail size={18} className="text-[var(--primary)]" />}
              title="Email Notifications"
              aside={<Switch checked={form.smtp.enabled} onChange={enabled => updateForm({ ...form, smtp: { ...form.smtp, enabled } })} />}
            />
            <div className={cn('grid gap-7 p-6 sm:p-8 transition-opacity', !form.smtp.enabled && 'opacity-50 pointer-events-none')}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="SMTP Host">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.host} onChange={event => updateForm({ ...form, smtp: { ...form.smtp, host: event.target.value } })} placeholder="smtp.example.com" />
                </Field>
                <Field label="Port">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="number" min={1} max={65535} value={form.smtp.port} onChange={event => updateForm({ ...form, smtp: { ...form.smtp, port: Number(event.target.value) } })} />
                </Field>
                <Field label="Username">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.username} onChange={event => updateForm({ ...form, smtp: { ...form.smtp, username: event.target.value } })} />
                </Field>
                <Field label="Password">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="password" value={smtpPassword} placeholder={form.smtp.passwordConfigured ? 'Password configured' : 'Enter SMTP password'} onChange={event => { setSmtpPassword(event.target.value); setDirty(true); }} />
                </Field>
                <Field label="From Name">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.fromName} onChange={event => updateForm({ ...form, smtp: { ...form.smtp, fromName: event.target.value } })} />
                </Field>
                <Field label="From Address">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="email" value={form.smtp.fromAddress} onChange={event => updateForm({ ...form, smtp: { ...form.smtp, fromAddress: event.target.value } })} placeholder="panel@example.com" />
                </Field>
              </div>
              <Field label="Connection Security">
                <select
                  disabled={!form.smtp.enabled}
                  className={cn(inp, customInputStyle)}
                  value={form.smtp.security || (form.smtp.port === 465 ? 'tls' : 'starttls')}
                  onChange={event => {
                    const security = event.target.value as 'auto' | 'starttls' | 'tls';
                    updateForm({ ...form, smtp: { ...form.smtp, security, secure: security === 'tls' } });
                  }}
                >
                  <option value="auto">Automatic (recommended)</option>
                  <option value="starttls">STARTTLS - usually port 587</option>
                  <option value="tls">TLS from connection - usually port 465</option>
                </select>
              </Field>
              <p className="-mt-5 text-xs text-[var(--muted-foreground)]">
                STARTTLS begins normally and upgrades to encryption. TLS encrypts immediately when connecting.
              </p>

              <EmailTemplateEditor
                settings={form}
                disabled={!form.smtp.enabled}
                onTemplateChange={(key, template) => updateForm({
                  ...form,
                  smtp: { ...form.smtp, templates: { ...form.smtp.templates, [key]: template } }
                })}
              />

              <div className="flex flex-col gap-3 border-t border-[var(--border)]/50 pt-6 sm:flex-row">
                <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle, 'flex-1')} type="email" value={testEmail} onChange={event => setTestEmail(event.target.value)} placeholder="Send test to email address" />
                <button
                  className={cn(btn, 'flex items-center justify-center gap-2')}
                  disabled={busy || !testEmail || !form.smtp.enabled}
                  onClick={() => onTestEmail(testEmail, { ...form.smtp, password: smtpPassword || undefined })}
                >
                  <Send size={15} /> Send Test
                </button>
              </div>
            </div>
          </Panel>

        </div>

        {/* Right Column: Security & Access */}
        <div className="flex flex-col gap-8">

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar
              icon={<Construction size={18} className="text-amber-400" />}
              title="Maintenance Mode"
              subtitle="Admins and owners keep access."
              aside={<Switch checked={form.maintenance.enabled} onChange={enabled => updateForm({ ...form, maintenance: { ...form.maintenance, enabled } })} />}
            />
            <div className={cn('grid gap-5 p-6 transition-opacity', !form.maintenance.enabled && 'opacity-60')}>
              {form.maintenance.enabled && <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>Saving will immediately return a maintenance response for every non-admin API session. Authentication remains available through the administrator sign-in link.</span></div>}
              <Field label="Maintenance Title"><input className={cn(inp, customInputStyle)} value={form.maintenance.title} onChange={event => updateForm({ ...form, maintenance: { ...form.maintenance, title: event.target.value } })} /></Field>
              <Field label="Message"><textarea className={cn(inp, customInputStyle, 'min-h-28 resize-y')} value={form.maintenance.message} onChange={event => updateForm({ ...form, maintenance: { ...form.maintenance, message: event.target.value } })} /></Field>
              <Field label="Estimated Completion (optional)"><input className={cn(inp, customInputStyle)} value={form.maintenance.estimatedCompletion} onChange={event => updateForm({ ...form, maintenance: { ...form.maintenance, estimatedCompletion: event.target.value } })} placeholder="e.g. 30 June, 18:00 CET" /></Field>
              <Field label="Public Status URL (optional)"><input className={cn(inp, customInputStyle)} type="url" value={form.maintenance.statusPageUrl} onChange={event => updateForm({ ...form, maintenance: { ...form.maintenance, statusPageUrl: event.target.value } })} placeholder="https://status.example.com" /></Field>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar
              icon={<Megaphone size={18} className="text-[var(--primary)]" />}
              title="Panel Announcement"
              subtitle="Shown above every signed-in user workspace."
              aside={<Switch checked={form.announcement.enabled} onChange={enabled => updateForm({ ...form, announcement: { ...form.announcement, enabled } })} />}
            />
            <div className={cn('grid gap-5 p-6 transition-opacity', !form.announcement.enabled && 'opacity-60')}>
              <Field label="Tone"><select className={cn(inp, customInputStyle)} value={form.announcement.tone} onChange={event => updateForm({ ...form, announcement: { ...form.announcement, tone: event.target.value as 'info' | 'warning' | 'critical' } })}><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></select></Field>
              <Field label="Title"><input className={cn(inp, customInputStyle)} value={form.announcement.title} onChange={event => updateForm({ ...form, announcement: { ...form.announcement, title: event.target.value } })} /></Field>
              <Field label="Message"><textarea className={cn(inp, customInputStyle, 'min-h-24 resize-y')} value={form.announcement.message} onChange={event => updateForm({ ...form, announcement: { ...form.announcement, message: event.target.value } })} /></Field>
              <div className="grid gap-5 sm:grid-cols-2"><Field label="Link Label (optional)"><input className={cn(inp, customInputStyle)} value={form.announcement.linkLabel} onChange={event => updateForm({ ...form, announcement: { ...form.announcement, linkLabel: event.target.value } })} placeholder="View update" /></Field><Field label="Link URL (optional)"><input className={cn(inp, customInputStyle)} type="url" value={form.announcement.linkUrl} onChange={event => updateForm({ ...form, announcement: { ...form.announcement, linkUrl: event.target.value } })} placeholder="https://example.com/update" /></Field></div>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar
              icon={<LifeBuoy size={18} className="text-[var(--primary)]" />}
              title="Ticket Support"
              subtitle="Optional customer support workspace."
              aside={<Switch checked={form.support.ticketsEnabled} onChange={ticketsEnabled => updateForm({ ...form, support: { ...form.support, ticketsEnabled } })} />}
            />
            <div className="grid gap-5 p-6">
              <ToggleCard
                title="Ticket Notifications"
                description="Send in-app and configured email notifications for new tickets, replies, assignments, and status changes."
                checked={form.support.notificationsEnabled}
                disabled={!form.support.ticketsEnabled}
                onChange={notificationsEnabled => updateForm({ ...form, support: { ...form.support, notificationsEnabled } })}
              />
              <div className="flex gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4 text-xs leading-relaxed text-[var(--muted-foreground)]"><Bell size={16} className="mt-0.5 shrink-0" /><span>Disabling ticket support removes it from navigation and returns a disabled response from the API. Existing tickets and notifications remain stored.</span></div>
            </div>
          </Panel>

          {/* Access Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar icon={<LockKeyhole size={18} className="text-[var(--primary)]" />} title="Access Control" />
            <div className="grid gap-6 p-6">

              <ToggleCard
                title="Allow Account Registration"
                description="Enable the signup form. You can require a one-time invitation key below."
                checked={form.registration.enabled}
                onChange={checked => updateForm({ ...form, registration: { ...form.registration, enabled: checked } })}
              />

              <ToggleCard
                title="Require Invitation Key"
                description="Each new user must enter a single-use key generated by an administrator."
                checked={form.registration.inviteRequired}
                onChange={checked => updateForm({ ...form, registration: { ...form.registration, inviteRequired: checked } })}
              />

              <ToggleCard
                title="Require Email Verification"
                description="When SMTP and the public panel URL are configured, new accounts must verify their address before signing in."
                checked={form.accountSecurity.emailVerificationRequired}
                onChange={emailVerificationRequired => updateForm({ ...form, accountSecurity: { ...form.accountSecurity, emailVerificationRequired } })}
              />

              <ToggleCard
                title="Suspicious Login Detection"
                description="Email users when a login arrives from both a new network and a new browser signature."
                checked={form.accountSecurity.suspiciousLoginDetection}
                onChange={suspiciousLoginDetection => updateForm({ ...form, accountSecurity: { ...form.accountSecurity, suspiciousLoginDetection } })}
              />

              <div className="border-t border-[var(--border)]/50 pt-6">
                <ToggleCard
                  title="Strict Auth Rate Limiting"
                  checked={form.rateLimit.enabled}
                  onChange={checked => updateForm({ ...form, rateLimit: { ...form.rateLimit, enabled: checked } })}
                />
              </div>

              <div className={cn("grid grid-cols-2 gap-4 transition-opacity duration-300", !form.rateLimit.enabled && "opacity-40 pointer-events-none")}>
                <Field label="Window (Seconds)">
                  <input className={cn(inp, customInputStyle)} type="number" min={10} max={3600} value={form.rateLimit.windowSeconds} onChange={event => updateForm({ ...form, rateLimit: { ...form.rateLimit, windowSeconds: Number(event.target.value) } })} />
                </Field>
                <Field label="Max Requests">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={1000} value={form.rateLimit.maxRequests} onChange={event => updateForm({ ...form, rateLimit: { ...form.rateLimit, maxRequests: Number(event.target.value) } })} />
                </Field>
              </div>
            </div>
          </Panel>

          <PasswordPolicyPanel
            policy={form.passwordPolicy}
            onChange={passwordPolicy => updateForm({ ...form, passwordPolicy })}
          />

          {/* Captcha Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <PanelTitleBar
              icon={<ShieldCheck size={18} className="text-[var(--primary)]" />}
              title="Bot Protection"
              aside={form.captcha.secretConfigured && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">
                  <Check size={12} /> Active
                </span>
              )}
            />

            <div className="grid gap-6 p-6">
              <Field label="Challenge Provider">
                <select className={cn(inp, customInputStyle)} value={form.captcha.provider} onChange={event => updateForm({ ...form, captcha: { ...form.captcha, provider: event.target.value as any } })}>
                  <option value="none">Disabled (None)</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                </select>
              </Field>

              <div className={cn("grid gap-6 transition-opacity duration-300", form.captcha.provider === 'none' && "opacity-40 pointer-events-none")}>
                <Field label="Public Site Key">
                  <input className={cn(inp, customInputStyle, "font-mono text-xs")} value={form.captcha.siteKey} onChange={event => updateForm({ ...form, captcha: { ...form.captcha, siteKey: event.target.value } })} />
                </Field>
                <Field label="Private Secret Key">
                  <input className={cn(inp, customInputStyle, "font-mono text-xs")} type="password" value={secretKey} placeholder={form.captcha.secretConfigured ? 'Secret configured' : 'Enter new secret'} onChange={event => { setSecretKey(event.target.value); setDirty(true); }} />
                </Field>

                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]/50">
                  <ToggleCard
                    title="Require on Login"
                    checked={form.captcha.requireOnLogin}
                    onChange={checked => updateForm({ ...form, captcha: { ...form.captcha, requireOnLogin: checked } })}
                    minimal
                  />
                  <ToggleCard
                    title="Require on Registration"
                    checked={form.captcha.requireOnRegister}
                    onChange={checked => updateForm({ ...form, captcha: { ...form.captcha, requireOnRegister: checked } })}
                    minimal
                  />
                </div>
              </div>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
