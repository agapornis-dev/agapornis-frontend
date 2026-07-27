import { useMemo, useState } from 'react';
import { inp } from '../../../lib/constants';
import { PanelAdminSettings } from '../../../lib/types';
import { Field, Switch, cn, formControlClass } from '../../ui';
import { EmailPreview } from './EmailPreview';

export const mailTemplateOptions = [
  ['login', 'Login'],
  ['registration', 'Registration'],
  ['passwordReset', 'Password reset'],
  ['emailVerification', 'Email verification'],
  ['suspiciousLogin', 'Suspicious login'],
  ['serverCreated', 'Server created'],
  ['serverStarted', 'Server started'],
  ['serverStopped', 'Server stopped'],
  ['serverRestarted', 'Server restarted'],
  ['collaboratorAdded', 'User added'],
  ['ticketCreated', 'Ticket received'],
  ['ticketStaffNotification', 'Ticket staff alert'],
  ['ticketReply', 'Ticket reply'],
  ['ticketStatus', 'Ticket status']
] as const;

type TemplateKey = keyof PanelAdminSettings['smtp']['templates'];

export function EmailTemplateEditor({
  settings,
  disabled,
  onTemplateChange
}: {
  settings: PanelAdminSettings;
  disabled?: boolean;
  onTemplateChange: (key: TemplateKey, template: PanelAdminSettings['smtp']['templates'][TemplateKey]) => void;
}) {
  const [activeKey, setActiveKey] = useState<TemplateKey>('passwordReset');
  const activeTemplate = settings.smtp.templates[activeKey];
  const activeLabel = useMemo(() => mailTemplateOptions.find(([key]) => key === activeKey)?.[1] || activeKey, [activeKey]);

  return (
    <div className="grid gap-5 border-t border-[var(--border)]/50 pt-6">
      <div>
        <h4 className="text-sm font-bold text-[var(--foreground)]">Message Templates</h4>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
          Variables render in the preview using safe sample data, while saved templates keep the variables for real messages.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[14rem_1fr]">
        <div className="grid gap-2 self-start">
          {mailTemplateOptions.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors',
                activeKey === key
                  ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--foreground)]'
                  : 'border-[var(--border)]/60 bg-[var(--secondary)]/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
              onClick={() => setActiveKey(key)}
            >
              <span>{label}</span>
              <span className={cn('h-2 w-2 rounded-full', settings.smtp.templates[key].enabled ? 'bg-[var(--success)]' : 'bg-[var(--border)]')} />
            </button>
          ))}
        </div>

        <div className="grid gap-5">
          <section className="grid gap-4 rounded-xl border border-[var(--border)]/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{activeLabel}</span>
              <Switch
                disabled={disabled}
                checked={activeTemplate.enabled}
                onChange={enabled => onTemplateChange(activeKey, { ...activeTemplate, enabled })}
              />
            </div>
            <Field label="Subject">
              <input
                disabled={disabled}
                className={cn(inp, formControlClass())}
                value={activeTemplate.subject}
                onChange={event => onTemplateChange(activeKey, { ...activeTemplate, subject: event.target.value })}
              />
            </Field>
            <Field label="Message">
              <textarea
                disabled={disabled}
                className={cn(inp, formControlClass('min-h-32 resize-y'))}
                value={activeTemplate.body}
                onChange={event => onTemplateChange(activeKey, { ...activeTemplate, body: event.target.value })}
              />
            </Field>
          </section>

          <EmailPreview
            brand={settings.branding.name}
            fromName={settings.smtp.fromName}
            fromAddress={settings.smtp.fromAddress}
            templateKey={activeKey}
            templateLabel={activeLabel}
            subject={activeTemplate.subject}
            body={activeTemplate.body}
          />
        </div>
      </div>
    </div>
  );
}
