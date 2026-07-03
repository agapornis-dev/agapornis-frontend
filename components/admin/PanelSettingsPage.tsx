import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, CircleUserRound, Cloud, Construction, IdCard, LifeBuoy, LockKeyhole, Mail, Megaphone, MessageCircle, Puzzle, Save, Send, ShieldCheck } from 'lucide-react';
import { btn, inp } from '../../lib/constants';
import { PanelAdminSettings } from '../../lib/types';
import { Field, Panel, cn } from '../ui';
import { requestJson } from '../../lib/http';
import { useLazyData } from '../../hooks/useLazyData';
import { useApiAction } from '../../hooks/useApiAction';

/* ── Self-contained screen (data fetching + UI) ─────────────────────── */

export function SettingsScreen({ apiBase, showToast, updatePublicSettings }: { apiBase: string; showToast: (msg: string, type: 'success' | 'error') => void; updatePublicSettings: (s: any) => void }) {
  const { data: settings, loading, refresh } = useLazyData<any>(apiBase, '/settings', {}, null);
  const { busy, run } = useApiAction(showToast);

  const handleSave = async (formData: any) => {
    const updated = await run(() => requestJson(apiBase, '/settings', {}, { method: 'PATCH', body: JSON.stringify(formData) }), 'Panel settings saved');
    if (updated) { updatePublicSettings(updated); refresh(); }
  };

  const handleTestEmail = async (email: string, smtp: any) => {
    await run(() => requestJson(apiBase, '/settings/smtp/test', {}, { method: 'POST', body: JSON.stringify({ email, smtp }) }), `Test email sent to ${email}`);
  };

  if (loading && !settings) return <div>Loading...</div>;

  return <PanelSettingsPage settings={settings} busy={busy || loading} onSave={handleSave} onTestEmail={handleTestEmail} />;
}

export function PanelSettingsPage({
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

  useEffect(() => {
    setForm(settings);
    setSecretKey('');
    setSocialSecrets({ google: '', discord: '' });
    setSmtpPassword('');
    setCurseForgeApiKey('');
  }, [settings]);

  const customInputStyle = "bg-[var(--secondary)]/10 border-[var(--border)]/60 transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 font-medium";

  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 pb-12">
      
      {/* Typographical Page Header */}
      <div className="flex flex-col gap-2 border-b border-[var(--border)]/50 pb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
          System Settings<span className="text-[var(--primary)]">.</span>
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--muted-foreground)]/80">
            Configure core panel branding, security policies, and external integrations.
          </p>
          <button
            className={cn(btn, 'group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed')}
            disabled={busy}
            onClick={() => onSave({
              ...form,
              captcha: { ...form.captcha, secretKey: secretKey || undefined },
              socialAuth: {
                google: { ...form.socialAuth.google, clientSecret: socialSecrets.google || undefined },
                discord: { ...form.socialAuth.discord, clientSecret: socialSecrets.discord || undefined }
              },
              smtp: { ...form.smtp, password: smtpPassword || undefined },
              modProviders: { curseForgeApiKey: curseForgeApiKey || undefined }
            })}
          >
            <Save size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:scale-105" /> 
            Save Configuration
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_420px] items-start">
        
        {/* Left Column: Branding & Backups */}
        <div className="flex flex-col gap-8">
          
          {/* Branding Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <IdCard size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Brand Identity</h3>
            </div>
            <div className="grid gap-6 p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Brand Name (Company)">
                  <input className={cn(inp, customInputStyle)} value={form.branding.name} onChange={event => setForm({ ...form, branding: { ...form.branding, name: event.target.value } })} placeholder="e.g. Acme Hosting" />
                </Field>
                <Field label="Panel Name (Application)">
                  <input className={cn(inp, customInputStyle)} value={form.branding.panelName} onChange={event => setForm({ ...form, branding: { ...form.branding, panelName: event.target.value } })} placeholder="e.g. Core_Sys" />
                </Field>
              </div>
              <Field label="Login Screen Tagline">
                <input className={cn(inp, customInputStyle)} value={form.branding.tagline} onChange={event => setForm({ ...form, branding: { ...form.branding, tagline: event.target.value } })} placeholder="Manage your infrastructure..." />
              </Field>
              <Field label="Public Panel URL">
                <input className={cn(inp, customInputStyle, 'font-mono')} type="url" value={form.branding.publicUrl} onChange={event => setForm({ ...form, branding: { ...form.branding, publicUrl: event.target.value } })} placeholder="https://panel.example.com" />
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">Used for secure links in password-reset emails.</p>
              </Field>
              <Field label="Footer Tagline">
                <textarea className={cn(inp, customInputStyle, 'min-h-20 resize-y')} value={form.branding.footerTagline} onChange={event => setForm({ ...form, branding: { ...form.branding, footerTagline: event.target.value } })} placeholder="Describe your service in the footer..." />
              </Field>
            </div>
          </Panel>

          {/* Backup Storage Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <Cloud size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Backup Infrastructure</h3>
            </div>
            <div className="grid gap-6 p-6 sm:p-8">
              
              <ToggleCard 
                title="Allow S3-Compatible Remote Backups" 
                description="Credentials and encryption keys remain isolated on each individual agent."
                checked={form.backupPolicy.s3Enabled}
                onChange={checked => setForm({ ...form, backupPolicy: { ...form.backupPolicy, s3Enabled: checked } })}
              />

              <div className={cn("grid gap-6 sm:grid-cols-2 transition-opacity duration-300", !form.backupPolicy.s3Enabled && "opacity-50 pointer-events-none")}>
                <Field label="Default Storage Target">
                  <select className={cn(inp, customInputStyle)} value={form.backupPolicy.defaultStorage} disabled={!form.backupPolicy.s3Enabled} onChange={event => setForm({ ...form, backupPolicy: { ...form.backupPolicy, defaultStorage: event.target.value as 'local' | 's3' } })}>
                    <option value="local">Agent-Local Storage</option>
                    <option value="s3">S3-Compatible Remote</option>
                  </select>
                </Field>
                <Field label="Remote Retention Limit">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={100} value={form.backupPolicy.retentionCount} onChange={event => setForm({ ...form, backupPolicy: { ...form.backupPolicy, retentionCount: Number(event.target.value) } })} />
                </Field>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 border-t border-[var(--border)]/50 pt-6">
                <Field label="Restore-Test Interval (Hours)">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={720} value={form.backupPolicy.verificationIntervalHours} onChange={event => setForm({ ...form, backupPolicy: { ...form.backupPolicy, verificationIntervalHours: Number(event.target.value) } })} />
                </Field>
                <div className="pt-6">
                  <ToggleCard 
                    title="Enforce Client-Side Encryption" 
                    checked={form.backupPolicy.encryptionRequired}
                    onChange={checked => setForm({ ...form, backupPolicy: { ...form.backupPolicy, encryptionRequired: checked } })}
                    minimal
                  />
                </div>
              </div>

            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <Puzzle size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Minecraft Mod Providers</h3>
            </div>
            <div className="grid gap-4 p-6 sm:p-8">
              <Field label="CurseForge API Key">
                <input
                  className={cn(inp, customInputStyle, 'font-mono text-xs')}
                  type="password"
                  value={curseForgeApiKey}
                  placeholder={form.modProviders.curseForgeApiKeyConfigured ? 'API key configured' : 'Enter CurseForge for Studios API key'}
                  onChange={event => setCurseForgeApiKey(event.target.value)}
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
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <CircleUserRound size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Social Authentication</h3>
            </div>
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
                        onChange={checked => setForm({ ...form, socialAuth: { ...form.socialAuth, [key]: { ...provider, enabled: checked } }})}
                      />
                    </div>
                    
                    <div className={cn("flex flex-col gap-4 transition-opacity duration-300", !provider.enabled && "opacity-40 pointer-events-none")}>
                      <Field label="Client ID">
                        <input className={cn(inp, customInputStyle, "font-mono text-xs")} value={provider.clientId} onChange={event => setForm({ ...form, socialAuth: { ...form.socialAuth, [key]: { ...provider, clientId: event.target.value } }})} />
                      </Field>
                      <Field label="Client Secret">
                        <input className={cn(inp, customInputStyle, "font-mono text-xs")} type="password" value={socialSecrets[key]} placeholder={provider.secretConfigured ? '••••••••••••••••' : 'Enter new secret'} onChange={event => setSocialSecrets({ ...socialSecrets, [key]: event.target.value })} />
                      </Field>
                    </div>
                  </section>
                );
              })}
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Email Notifications</h3>
              </div>
              <Switch checked={form.smtp.enabled} onChange={enabled => setForm({ ...form, smtp: { ...form.smtp, enabled } })} />
            </div>
            <div className={cn('grid gap-7 p-6 sm:p-8 transition-opacity', !form.smtp.enabled && 'opacity-50 pointer-events-none')}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="SMTP Host">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.host} onChange={event => setForm({ ...form, smtp: { ...form.smtp, host: event.target.value } })} placeholder="smtp.example.com" />
                </Field>
                <Field label="Port">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="number" min={1} max={65535} value={form.smtp.port} onChange={event => setForm({ ...form, smtp: { ...form.smtp, port: Number(event.target.value) } })} />
                </Field>
                <Field label="Username">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.username} onChange={event => setForm({ ...form, smtp: { ...form.smtp, username: event.target.value } })} />
                </Field>
                <Field label="Password">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="password" value={smtpPassword} placeholder={form.smtp.passwordConfigured ? 'Password configured' : 'Enter SMTP password'} onChange={event => setSmtpPassword(event.target.value)} />
                </Field>
                <Field label="From Name">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={form.smtp.fromName} onChange={event => setForm({ ...form, smtp: { ...form.smtp, fromName: event.target.value } })} />
                </Field>
                <Field label="From Address">
                  <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} type="email" value={form.smtp.fromAddress} onChange={event => setForm({ ...form, smtp: { ...form.smtp, fromAddress: event.target.value } })} placeholder="panel@example.com" />
                </Field>
              </div>
              <Field label="Connection Security">
                <select
                  disabled={!form.smtp.enabled}
                  className={cn(inp, customInputStyle)}
                  value={form.smtp.security || (form.smtp.port === 465 ? 'tls' : 'starttls')}
                  onChange={event => {
                    const security = event.target.value as 'auto' | 'starttls' | 'tls';
                    setForm({ ...form, smtp: { ...form.smtp, security, secure: security === 'tls' } });
                  }}
                >
                  <option value="auto">Automatic (recommended)</option>
                  <option value="starttls">STARTTLS — usually port 587</option>
                  <option value="tls">TLS from connection — usually port 465</option>
                </select>
              </Field>
              <p className="-mt-5 text-xs text-[var(--muted-foreground)]">
                STARTTLS begins normally and upgrades to encryption. TLS encrypts immediately when connecting.
              </p>

              <div className="grid gap-4 border-t border-[var(--border)]/50 pt-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Message Templates</h4>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Available variables: {'{{user.name}}'}, {'{{user.email}}'}, {'{{reset.url}}'}, {'{{actor.name}}'}, {'{{permission}}'}, {'{{server.name}}'}, {'{{server.id}}'}, {'{{server.status}}'}, {'{{panel.name}}'}, {'{{timestamp}}'}.</p>
                </div>
                {([
                  ['login', 'Login'],
                  ['registration', 'Registration'],
                  ['passwordReset', 'Password reset'],
                  ['serverCreated', 'Server created'],
                  ['serverStarted', 'Server started'],
                  ['serverStopped', 'Server stopped'],
                  ['serverRestarted', 'Server restarted'],
                  ['collaboratorAdded', 'User added to server']
                ] as const).map(([key, label]) => {
                  const template = form.smtp.templates[key];
                  return (
                    <section key={key} className="grid gap-4 rounded-xl border border-[var(--border)]/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{label}</span>
                        <Switch disabled={!form.smtp.enabled} checked={template.enabled} onChange={enabled => setForm({ ...form, smtp: { ...form.smtp, templates: { ...form.smtp.templates, [key]: { ...template, enabled } } } })} />
                      </div>
                      <Field label="Subject">
                        <input disabled={!form.smtp.enabled} className={cn(inp, customInputStyle)} value={template.subject} onChange={event => setForm({ ...form, smtp: { ...form.smtp, templates: { ...form.smtp.templates, [key]: { ...template, subject: event.target.value } } } })} />
                      </Field>
                      <Field label="Message">
                        <textarea disabled={!form.smtp.enabled} className={cn(inp, customInputStyle, 'min-h-28 resize-y')} value={template.body} onChange={event => setForm({ ...form, smtp: { ...form.smtp, templates: { ...form.smtp.templates, [key]: { ...template, body: event.target.value } } } })} />
                      </Field>
                    </section>
                  );
                })}
              </div>

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
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <Construction size={18} className="text-amber-400" />
                <div><h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Maintenance Mode</h3><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Admins and owners keep access.</p></div>
              </div>
              <Switch checked={form.maintenance.enabled} onChange={enabled => setForm({ ...form, maintenance: { ...form.maintenance, enabled } })} />
            </div>
            <div className={cn('grid gap-5 p-6 transition-opacity', !form.maintenance.enabled && 'opacity-60')}>
              {form.maintenance.enabled && <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>Saving will immediately return a maintenance response for every non-admin API session. Authentication remains available through the administrator sign-in link.</span></div>}
              <Field label="Maintenance Title"><input className={cn(inp, customInputStyle)} value={form.maintenance.title} onChange={event => setForm({ ...form, maintenance: { ...form.maintenance, title: event.target.value } })} /></Field>
              <Field label="Message"><textarea className={cn(inp, customInputStyle, 'min-h-28 resize-y')} value={form.maintenance.message} onChange={event => setForm({ ...form, maintenance: { ...form.maintenance, message: event.target.value } })} /></Field>
              <Field label="Estimated Completion (optional)"><input className={cn(inp, customInputStyle)} value={form.maintenance.estimatedCompletion} onChange={event => setForm({ ...form, maintenance: { ...form.maintenance, estimatedCompletion: event.target.value } })} placeholder="e.g. 30 June, 18:00 CET" /></Field>
              <Field label="Public Status URL (optional)"><input className={cn(inp, customInputStyle)} type="url" value={form.maintenance.statusPageUrl} onChange={event => setForm({ ...form, maintenance: { ...form.maintenance, statusPageUrl: event.target.value } })} placeholder="https://status.example.com" /></Field>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3"><Megaphone size={18} className="text-[var(--primary)]" /><div><h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Panel Announcement</h3><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Shown above every signed-in user workspace.</p></div></div>
              <Switch checked={form.announcement.enabled} onChange={enabled => setForm({ ...form, announcement: { ...form.announcement, enabled } })} />
            </div>
            <div className={cn('grid gap-5 p-6 transition-opacity', !form.announcement.enabled && 'opacity-60')}>
              <Field label="Tone"><select className={cn(inp, customInputStyle)} value={form.announcement.tone} onChange={event => setForm({ ...form, announcement: { ...form.announcement, tone: event.target.value as 'info' | 'warning' | 'critical' } })}><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></select></Field>
              <Field label="Title"><input className={cn(inp, customInputStyle)} value={form.announcement.title} onChange={event => setForm({ ...form, announcement: { ...form.announcement, title: event.target.value } })} /></Field>
              <Field label="Message"><textarea className={cn(inp, customInputStyle, 'min-h-24 resize-y')} value={form.announcement.message} onChange={event => setForm({ ...form, announcement: { ...form.announcement, message: event.target.value } })} /></Field>
              <div className="grid gap-5 sm:grid-cols-2"><Field label="Link Label (optional)"><input className={cn(inp, customInputStyle)} value={form.announcement.linkLabel} onChange={event => setForm({ ...form, announcement: { ...form.announcement, linkLabel: event.target.value } })} placeholder="View update" /></Field><Field label="Link URL (optional)"><input className={cn(inp, customInputStyle)} type="url" value={form.announcement.linkUrl} onChange={event => setForm({ ...form, announcement: { ...form.announcement, linkUrl: event.target.value } })} placeholder="https://example.com/update" /></Field></div>
            </div>
          </Panel>

          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3"><LifeBuoy size={18} className="text-[var(--primary)]" /><div><h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Ticket Support</h3><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Optional customer support workspace.</p></div></div>
              <Switch checked={form.support.ticketsEnabled} onChange={ticketsEnabled => setForm({ ...form, support: { ...form.support, ticketsEnabled } })} />
            </div>
            <div className="grid gap-5 p-6">
              <ToggleCard
                title="Ticket Notifications"
                description="Notify customers and staff when tickets receive replies or status changes."
                checked={form.support.notificationsEnabled}
                disabled={!form.support.ticketsEnabled}
                onChange={notificationsEnabled => setForm({ ...form, support: { ...form.support, notificationsEnabled } })}
              />
              <div className="flex gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4 text-xs leading-relaxed text-[var(--muted-foreground)]"><Bell size={16} className="mt-0.5 shrink-0" /><span>Disabling ticket support removes it from navigation and returns a disabled response from the API. Existing tickets and notifications remain stored.</span></div>
            </div>
          </Panel>
          
          {/* Access Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <LockKeyhole size={18} className="text-[var(--primary)]" />
              <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Access Control</h3>
            </div>
            <div className="grid gap-6 p-6">
              
              <ToggleCard 
                title="Allow Account Registration" 
                description="Enable the signup form. You can require a one-time invitation key below."
                checked={form.registration.enabled}
                onChange={checked => setForm({ ...form, registration: { ...form.registration, enabled: checked } })}
              />

              <ToggleCard
                title="Require Invitation Key"
                description="Each new user must enter a single-use key generated by an administrator."
                checked={form.registration.inviteRequired}
                onChange={checked => setForm({ ...form, registration: { ...form.registration, inviteRequired: checked } })}
              />

              <div className="border-t border-[var(--border)]/50 pt-6">
                <ToggleCard 
                  title="Strict Auth Rate Limiting" 
                  checked={form.rateLimit.enabled}
                  onChange={checked => setForm({ ...form, rateLimit: { ...form.rateLimit, enabled: checked } })}
                />
              </div>

              <div className={cn("grid grid-cols-2 gap-4 transition-opacity duration-300", !form.rateLimit.enabled && "opacity-40 pointer-events-none")}>
                <Field label="Window (Seconds)">
                  <input className={cn(inp, customInputStyle)} type="number" min={10} max={3600} value={form.rateLimit.windowSeconds} onChange={event => setForm({ ...form, rateLimit: { ...form.rateLimit, windowSeconds: Number(event.target.value) } })} />
                </Field>
                <Field label="Max Requests">
                  <input className={cn(inp, customInputStyle)} type="number" min={1} max={1000} value={form.rateLimit.maxRequests} onChange={event => setForm({ ...form, rateLimit: { ...form.rateLimit, maxRequests: Number(event.target.value) } })} />
                </Field>
              </div>
            </div>
          </Panel>

          {/* Captcha Panel */}
          <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold tracking-wide text-[var(--foreground)]">Bot Protection</h3>
              </div>
              {form.captcha.secretConfigured && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">
                  <Check size={12} /> Active
                </span>
              )}
            </div>
            
            <div className="grid gap-6 p-6">
              <Field label="Challenge Provider">
                <select className={cn(inp, customInputStyle)} value={form.captcha.provider} onChange={event => setForm({ ...form, captcha: { ...form.captcha, provider: event.target.value as any } })}>
                  <option value="none">Disabled (None)</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                </select>
              </Field>

              <div className={cn("grid gap-6 transition-opacity duration-300", form.captcha.provider === 'none' && "opacity-40 pointer-events-none")}>
                <Field label="Public Site Key">
                  <input className={cn(inp, customInputStyle, "font-mono text-xs")} value={form.captcha.siteKey} onChange={event => setForm({ ...form, captcha: { ...form.captcha, siteKey: event.target.value } })} />
                </Field>
                <Field label="Private Secret Key">
                  <input className={cn(inp, customInputStyle, "font-mono text-xs")} type="password" value={secretKey} placeholder={form.captcha.secretConfigured ? '••••••••••••••••' : 'Enter new secret'} onChange={event => setSecretKey(event.target.value)} />
                </Field>

                <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]/50">
                  <ToggleCard 
                    title="Require on Login" 
                    checked={form.captcha.requireOnLogin}
                    onChange={checked => setForm({ ...form, captcha: { ...form.captcha, requireOnLogin: checked } })}
                    minimal
                  />
                  <ToggleCard 
                    title="Require on Registration" 
                    checked={form.captcha.requireOnRegister}
                    onChange={checked => setForm({ ...form, captcha: { ...form.captcha, requireOnRegister: checked } })}
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


// 1. Added `disabled?: boolean` to the props
function Switch({ checked, onChange, disabled }: { checked: boolean, onChange: (c: boolean) => void, disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled} // 2. Pass disabled to the HTML button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
        // 3. Swap cursor styles and lower opacity when disabled
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "bg-[var(--success)]" : "bg-[var(--border)]"
      )}
    >
      <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

// Interactive Interactive Card for Booleans
// 4. Added `disabled?: boolean` to the ToggleCard props
function ToggleCard({ title, description, checked, onChange, minimal = false, disabled }: { title: string, description?: string, checked: boolean, onChange: (c: boolean) => void, minimal?: boolean, disabled?: boolean }) {
  return (
    <label className={cn(
      "group flex items-center justify-between gap-4 rounded-xl border transition-all",
      // 5. Swap cursor styles and lower opacity when disabled
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      minimal ? "border-transparent py-1" : "border-[var(--border)]/60 bg-[var(--secondary)]/5 px-4 py-3 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5",
      checked && !minimal && "border-[var(--success)]/40 bg-[var(--primary)]/5" // Note: Fixed 'var(--gree)' typo here
    )}>
      <div className="flex flex-col gap-0.5">
        <span className={cn("font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]", minimal && "text-sm")}>{title}</span>
        {description && <span className="text-xs font-medium text-[var(--muted-foreground)]/80 leading-relaxed pr-4">{description}</span>}
      </div>
      {/* 6. Pass the disabled prop down to the Switch component */}
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}
