import { KeyRound } from 'lucide-react';
import { inp } from '../../../lib/constants';
import { PanelAdminSettings } from '../../../lib/types';
import { Field, Panel, PanelTitleBar, cn, formControlClass } from '../../ui';

type PasswordPolicy = PanelAdminSettings['passwordPolicy'];

export function PasswordPolicyPanel({
  policy,
  onChange
}: {
  policy: PasswordPolicy;
  onChange: (policy: PasswordPolicy) => void;
}) {
  const update = (patch: Partial<PasswordPolicy>) => onChange({ ...policy, ...patch });
  const classes = ['lowercase', 'uppercase', 'number', 'symbol'];

  return (
    <Panel className="overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
      <PanelTitleBar
        icon={<KeyRound size={18} className="text-[var(--primary)]" />}
        title="Password Policy"
        subtitle="Applied to registration, reset, and account password changes."
      />
      <div className="grid gap-5 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum length">
            <input
              className={cn(inp, formControlClass())}
              type="number"
              min={8}
              max={128}
              value={policy.minLength}
              onChange={event => {
                const minLength = Number(event.target.value);
                update({ minLength, maxLength: Math.max(policy.maxLength, minLength) });
              }}
            />
          </Field>
          <Field label="Maximum length">
            <input
              className={cn(inp, formControlClass())}
              type="number"
              min={policy.minLength}
              max={256}
              value={policy.maxLength}
              onChange={event => update({ maxLength: Number(event.target.value) })}
            />
          </Field>
          <Field label="Required types">
            <select
              className={cn(inp, formControlClass())}
              value={policy.requiredCharacterClasses}
              onChange={event => update({ requiredCharacterClasses: Number(event.target.value) })}
            >
              {[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} of 4</option>)}
            </select>
          </Field>
        </div>

        <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Current rule</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--foreground)]">
            New passwords must be {policy.minLength}-{policy.maxLength} characters and include at least {policy.requiredCharacterClasses} of {classes.join(', ')}.
          </p>
        </div>
      </div>
    </Panel>
  );
}
