import { Check, Loader2, RotateCcw, Server, AlertTriangle, ArrowRight, Terminal } from 'lucide-react';
import { cn } from '../ui';
import { LiveConnectionState } from '../../hooks/useAgentHealth';

// 1. LiveStatus: Compact connection-state pill with a static status indicator
export function LiveStatus({ state }: { state: LiveConnectionState }) {
  const live = state === 'live';
  const connecting = state === 'connecting';
  
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] shadow-sm"
    >
      <div className="relative flex h-2 w-2 items-center justify-center">
        <span 
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors duration-500',
            live
              ? 'bg-[var(--success)]'
              : connecting
                ? 'bg-amber-500'
                : 'bg-[var(--muted-foreground)]'
          )} 
        />
      </div>
      <span>{live ? 'Running' : connecting ? 'Connecting' : 'Offline'}</span>
    </div>
  );
}

// 2. ScreenLoading: Clean, centered, relying on sharp typography and subtle animation
export function ScreenLoading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="relative flex min-h-[40vh] flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm">
        {/* Subtle background glow characteristic of modern docs */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)]/5 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <Loader2 className="mb-6 h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}


export type ProvisioningView = {
  id: string;
  serverId: string;
  nodeId?: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  phase: string;
  progress: number;
  message: string;
  errorMessage?: string;
  history?: Array<{ phase: string; progress: number; message: string; at: string }>;
};

export function ProvisioningLoading({ job, connection, onDismiss, onComplete }: {
  job: ProvisioningView;
  connection: LiveConnectionState;
  onDismiss: () => void;
  onComplete?: () => void;
}) {
  const failed = job.status === 'failed';
  const complete = job.status === 'complete';
  const events = job.history?.length
    ? job.history
    : [{ phase: job.phase, progress: job.progress, message: job.message, at: '' }];

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm">
        
        {/* Top Progress Line - Very thin and sharp */}
        <div 
          className="absolute inset-x-0 top-0 h-[2px] w-full bg-[var(--muted)]"
          role="progressbar" 
          aria-valuenow={job.progress} 
        >
          <div
            className={cn(
              'h-full transition-all duration-700 ease-in-out',
              failed ? 'bg-red-500' : complete ? 'bg-emerald-500' : 'bg-[var(--foreground)]'
            )}
            style={{ width: `${job.progress}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {/* Header Area */}
          <div className="flex flex-col gap-4 pb-8 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <LiveStatus state={connection} />
                {job.nodeId && (
                  <div className="flex items-center gap-1.5 rounded-md bg-[var(--muted)]/50 px-2 py-1 text-xs font-mono text-[var(--muted-foreground)]">
                    <Server size={12} />
                    {job.nodeId}
                  </div>
                )}
              </div>
              
              {!failed && !complete && (
                <div className="font-mono text-sm font-medium text-[var(--muted-foreground)]">
                  {Math.round(job.progress)}%
                </div>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {failed ? "Provisioning Failed" : complete ? "Server Online" : `Configuring ${job.serverId}`}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {failed ? 'The deployment pipeline halted due to an exception.' 
                 : complete ? 'Your environment is fully initialized and ready to accept traffic.' 
                 : 'Streaming logs and build progress directly from the agent.'}
              </p>
            </div>
          </div>

          {/* Fumadocs-style Steps Timeline */}
          <div className="relative mt-8 ml-2">
            {events.map((step, index) => {
              const isLast = index === events.length - 1;
              const active = isLast && !failed && !complete;
              const done = !active && step.phase !== 'failed';

              return (
                <div key={`${step.phase}-${index}`} className="group relative flex pb-8 last:pb-2">
                  {/* Vertical Line Connector */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-6 h-full w-[1px] bg-[var(--border)] group-last:hidden" />
                  )}

                  {/* Step Indicator (Circle) */}
                  <div className="relative z-10 flex items-start justify-center">
                    <div
                      className={cn(
                        "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-[var(--background)] transition-colors duration-300",
                        done ? "border-[var(--foreground)] text-[var(--foreground)]" 
                             : active ? "border-[var(--primary)] text-[var(--primary)] shadow-[0_0_12px_var(--primary)]/10"
                             : "border-[var(--border)] text-[var(--muted-foreground)]"
                      )}
                    >
                      {done ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : active ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <span className="text-[10px] font-medium">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="ml-4 flex min-w-0 flex-col pt-1.5">
                    <p className={cn(
                      "text-sm font-medium tracking-tight",
                      done ? "text-[var(--foreground)]" : active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                    )}>
                      {step.message}
                    </p>
                    {active && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]/80 flex items-center gap-1.5">
                        <Terminal size={10} /> Executing...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message Block */}
          {failed && job.errorMessage && (
            <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex gap-3 text-red-500">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Deployment Error</p>
                  <p className="text-red-500/90 leading-relaxed font-mono text-xs">{job.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Clean Action Footer */}
          {(failed || complete) && (
            <div className="mt-8 flex justify-end border-t border-[var(--border)] pt-6">
              {failed ? (
                <button
                  onClick={onDismiss}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
                >
                  <RotateCcw size={14} />
                  Review Setup
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] shadow transition-colors hover:bg-[var(--foreground)]/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
                >
                  View Dashboard
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
