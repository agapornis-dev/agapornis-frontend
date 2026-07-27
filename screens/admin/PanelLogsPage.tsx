import { AlertTriangle, CalendarDays, FileWarning, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, Panel, PanelHeader, cn } from '../../components/ui';
import { ApiErrorLogDay, ApiErrorLogEntry } from '../../lib/types';
import { requestJson } from '../../lib/http';

export function PanelLogsScreen({ apiBase, showToast }: { apiBase: string; showToast: (message: string, tone?: any) => void }) {
  const [days, setDays] = useState<ApiErrorLogDay[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [entries, setEntries] = useState<ApiErrorLogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(async (date: string) => {
    if (!date) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const response = await requestJson(apiBase, `/panel-logs/${encodeURIComponent(date)}`, {});
      setEntries(response.entries || []);
      setSelectedDate(date);
    } catch (error: any) {
      showToast(error?.message || 'Failed to load API logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestJson(apiBase, '/panel-logs', {});
      const nextDays = response.days || [];
      setDays(nextDays);
      const nextDate = nextDays.some((day: ApiErrorLogDay) => day.date === selectedDate)
        ? selectedDate
        : nextDays[0]?.date || '';
      if (nextDate) await loadDay(nextDate);
      else {
        setSelectedDate('');
        setEntries([]);
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to load API log days', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, loadDay, selectedDate, showToast]);

  useEffect(() => { void refresh(); }, [apiBase]);

  const visibleEntries = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return entries;
    return entries.filter(entry => [entry.message, entry.context, entry.stack]
      .some(value => String(value || '').toLowerCase().includes(search)));
  }, [entries, query]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <FileWarning size={14} /> Error-only API history
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Panel Logs<span className="text-[var(--primary)]">.</span></h2>
          <p className="mt-2 max-w-3xl text-sm font-medium text-[var(--muted-foreground)]/80">
            API errors are stored as daily UTC log files. Informational, debug, and warning output is not retained here.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-semibold transition-colors hover:bg-[var(--secondary)] disabled:opacity-50">
          <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <div className="grid min-h-[560px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Panel className="h-fit">
          <PanelHeader title={<span className="flex items-center gap-2"><CalendarDays size={16} /> Log days</span>} aside={days.length} />
          {days.length === 0 ? (
            <EmptyState className="p-5 leading-6">No API errors have been recorded yet.</EmptyState>
          ) : (
            <div className="max-h-[620px] divide-y divide-[var(--border)]/60 overflow-y-auto">
              {days.map(day => (
                <button key={day.date} type="button" onClick={() => void loadDay(day.date)} className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--secondary)]/40',
                  selectedDate === day.date && 'bg-[var(--secondary)] text-[var(--foreground)]',
                )}>
                  <span>
                    <span className="block text-sm font-bold">{formatDay(day.date)}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{formatBytes(day.sizeBytes)}</span>
                  </span>
                  <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-xs font-bold text-red-300">{day.entries}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">{selectedDate ? formatDay(selectedDate) : 'No log selected'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{visibleEntries.length} error {visibleEntries.length === 1 ? 'entry' : 'entries'}</p>
            </div>
            <label className="relative w-full sm:max-w-sm">
              <span className="sr-only">Search logs</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search message, context, stack..." className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none focus:border-[var(--foreground)]" />
            </label>
          </div>

          {loading && entries.length === 0 ? (
            <EmptyState className="p-8 text-center">Loading API errors...</EmptyState>
          ) : visibleEntries.length === 0 ? (
            <EmptyState className="p-8 text-center">{entries.length ? 'No errors match this search.' : 'No errors were recorded for this day.'}</EmptyState>
          ) : (
            <div className="max-h-[720px] divide-y divide-[var(--border)]/60 overflow-y-auto">
              {visibleEntries.map((entry, index) => (
                <article key={`${entry.timestamp}:${index}`} className="grid gap-3 p-4 hover:bg-[var(--secondary)]/10 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 font-bold uppercase tracking-wider text-red-300"><AlertTriangle size={12} /> Error</span>
                    {entry.context && <span className="rounded-md bg-[var(--secondary)] px-2 py-1 font-mono font-semibold">{entry.context}</span>}
                    <time className="text-[var(--muted-foreground)]" dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                  </div>
                  <p className="break-words font-mono text-sm leading-6 text-[var(--foreground)]">{entry.message}</p>
                  {entry.stack && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">View stack trace</summary>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-black/20 p-4 font-mono text-xs leading-5 text-[var(--muted-foreground)]">{entry.stack}</pre>
                    </details>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function formatDay(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(value.getTime()) ? value.toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' }) : date;
}

function formatTime(timestamp: string) {
  const value = new Date(timestamp);
  return Number.isFinite(value.getTime()) ? value.toLocaleString() : timestamp;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
