import { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../ui';

export function groupEggsByNest(eggs: any[]) {
  const groups = new Map<string, { id: string; name: string; eggs: any[] }>();
  for (const egg of eggs) {
    const id = String(egg.nestId || 'uncategorized');
    const group = groups.get(id) || { id, name: String(egg.nestName || 'Uncategorized'), eggs: [] };
    group.eggs.push(egg);
    groups.set(id, group);
  }
  return Array.from(groups.values())
    .map(group => ({ ...group, eggs: group.eggs.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id))) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function EggSelectOptions({ eggs }: { eggs: any[] }) {
  return <>{groupEggsByNest(eggs).map(group => (
    <optgroup key={group.id} label={group.name}>
      {group.eggs.map(egg => <option key={egg.id} value={egg.id}>{egg.name || egg.id}</option>)}
    </optgroup>
  ))}</>;
}

export function AllowedEggNestPicker({ eggs, primaryEggId, allowedEggIds, onChange }: {
  eggs: any[];
  primaryEggId?: string;
  allowedEggIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set([primaryEggId, ...allowedEggIds].filter(Boolean));
  const [collapsedNests, setCollapsedNests] = useState<Set<string>>(new Set());

  return (
    <div className="grid gap-4">
      {groupEggsByNest(eggs).map(group => {
        const selectable = group.eggs.filter(egg => egg.id !== primaryEggId);
        const wholeNest = selectable.length > 0 && selectable.every(egg => selected.has(egg.id));
        const collapsed = collapsedNests.has(group.id);
        return (
          <section key={group.id} className="overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--background)]">
            <div className={cn('flex items-center justify-between bg-[var(--secondary)]/15 px-4 py-3', !collapsed && 'border-b border-[var(--border)]/50')}>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setCollapsedNests(current => {
                  const next = new Set(current);
                  next.has(group.id) ? next.delete(group.id) : next.add(group.id);
                  return next;
                })}
                aria-expanded={!collapsed}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                <span>
                  <span className="block text-sm font-bold">{group.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{group.eggs.length} egg{group.eggs.length === 1 ? '' : 's'}</span>
                </span>
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
                Allow nest
                <input
                  type="checkbox"
                  checked={wholeNest}
                  disabled={selectable.length === 0}
                  onChange={event => {
                    const ids = new Set(allowedEggIds);
                    for (const egg of selectable) event.target.checked ? ids.add(egg.id) : ids.delete(egg.id);
                    onChange(Array.from(ids));
                  }}
                />
              </label>
            </div>
            {!collapsed && <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.eggs.map(egg => {
                const primary = egg.id === primaryEggId;
                const checked = primary || selected.has(egg.id);
                return (
                  <label key={egg.id} className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                    checked ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10' : 'border-[var(--border)]/60 hover:bg-[var(--secondary)]/20',
                    primary && 'cursor-not-allowed opacity-70'
                  )}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={primary}
                      onChange={event => {
                        const ids = new Set(allowedEggIds);
                        event.target.checked ? ids.add(egg.id) : ids.delete(egg.id);
                        onChange(Array.from(ids));
                      }}
                    />
                    <span className="truncate text-sm font-semibold">{egg.name || egg.id}</span>
                    <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', checked ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]')}>
                      {checked && <Check size={10} className="text-[var(--primary-foreground)]" />}
                    </span>
                  </label>
                );
              })}
            </div>}
          </section>
        );
      })}
    </div>
  );
}
