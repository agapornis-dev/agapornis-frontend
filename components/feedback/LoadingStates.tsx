import { Activity, Check, LoaderCircle, RotateCcw, ServerCog, TriangleAlert, Zap } from 'lucide-react';
import { Panel, cn } from '../ui';
import { LiveConnectionState } from '../../hooks/useAgentHealth';


export function LiveStatus({ state, label = 'Agent telemetry' }: { state: LiveConnectionState; label?: string }) {
  const live = state === 'live';
  const connecting = state === 'connecting';
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
      <span className="relative flex h-2 w-2">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            live ? 'bg-[var(--success)]' : connecting ? 'bg-amber-400' : 'bg-amber-400/70'
          )}
        />
      </span>
      {label}{' '}
      <span className={cn(live ? 'text-[var(--success)]' : 'text-amber-400')}>
        {live ? 'live' : connecting ? 'connecting' : 'reconnecting'}
      </span>
    </span>
  );
}


export function ScreenLoading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5" role="status" aria-live="polite">
      <Panel className="relative overflow-hidden min-h-52 justify-center p-8 border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">
        {/* Animated top rail */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--secondary)]/30">
          <span className="block h-full w-1/3 animate-[loading-slide_1.5s_ease-in-out_infinite] bg-[var(--foreground)]" />
        </div>

        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-full border border-[var(--border)]/60 bg-[var(--secondary)]/10 backdrop-blur-sm">
            <LoaderCircle className="animate-spin text-[var(--primary)]" size={22} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
            {title}<span className="text-[var(--primary)]">.</span>
          </h2>
          <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">{detail}</p>
        </div>
      </Panel>

      {/* Skeleton cards */}
      <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map(item => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10"
          />
        ))}
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
};

const steps = [
  { phase: 'validating', label: 'Validate configuration', threshold: 15 },
  { phase: 'placement', label: 'Choose an agent', threshold: 30 },
  { phase: 'creating', label: 'Pull image and create container', threshold: 50 },
  { phase: 'registering', label: 'Finalize access', threshold: 90 }
];

export function ProvisioningLoading({ job, connection, onDismiss }: {
  job: ProvisioningView;
  connection: LiveConnectionState;
  onDismiss: () => void;
}) {
  const failed = job.status === 'failed';
  const complete = job.status === 'complete';

  return (
    <div className="mx-auto grid max-w-3xl gap-5" role="status" aria-live="polite">
      <Panel className="relative overflow-hidden border-[var(--border)]/60 bg-[var(--background)]/50 backdrop-blur-sm">

        {/* Progress bar — top edge, thicker and more deliberate */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--secondary)]/30">
          <div
            className={cn(
              'h-full transition-[width] duration-700 ease-out',
              failed ? 'bg-[var(--destructive)]' : complete ? 'bg-[var(--success)]' : 'bg-[var(--foreground)]'
            )}
            style={{ width: `${job.progress}%` }}
          />
        </div>

        <div className="p-7 sm:p-10">
          {/* Header row */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Status icon */}
            <div
              className={cn(
                'grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition-colors',
                failed
                  ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]'
                  : complete
                    ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                    : 'border-[var(--border)]/60 bg-[var(--secondary)]/10 text-[var(--foreground)]'
              )}
            >
              {failed
                ? <TriangleAlert size={26} />
                : complete
                  ? <Check size={26} />
                  : <ServerCog size={26} className="animate-pulse" />
              }
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                Provisioning {job.serverId}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                {failed
                  ? <>Stopped<span className="text-[var(--destructive)]">.</span></>
                  : complete
                    ? <>Ready<span className="text-[var(--success)]">.</span></>
                    : <>{job.message}<span className="text-[var(--primary)]">.</span></>
                }
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">
                {failed
                  ? job.errorMessage
                  : complete
                    ? 'Your server is live and ready to use.'
                    : 'Each stage is tracked below while the agent prepares the container.'
                }
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <LiveStatus state={connection} label="Progress stream" />
                {job.nodeId && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                    <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
                    {job.nodeId}
                  </span>
                )}
                <span className="ml-auto font-mono text-sm font-semibold text-[var(--muted-foreground)]">
                  {job.progress}%
                </span>
              </div>
            </div>
          </div>

          {/* Step timeline */}
          <div className="mt-8 flex flex-col gap-0">
            {steps.map((step, index) => {
              const done = complete || job.progress > step.threshold;
              const active = !failed && !done && job.progress >= step.threshold - 15;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.phase} className="flex gap-4">
                  {/* Track column */}
                  <div className="flex flex-col items-center">
                    {/* Node */}
                    <div
                      className={cn(
                        'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300',
                        done
                          ? 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]'
                          : active
                            ? 'border-[var(--foreground)]/30 bg-[var(--secondary)]/10 text-[var(--foreground)]'
                            : 'border-[var(--border)]/60 bg-[var(--background)] text-[var(--muted-foreground)]'
                      )}
                    >
                      {done
                        ? <Check size={13} />
                        : active
                          ? <LoaderCircle size={13} className="animate-spin" />
                          : <span className="text-[10px]">{index + 1}</span>
                      }
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'w-px flex-1 my-1 transition-colors duration-500',
                          done ? 'bg-[var(--success)]/30' : 'bg-[var(--border)]/40'
                        )}
                      />
                    )}
                  </div>

                  {/* Step label */}
                  <div className={cn('pb-4 pt-1 min-w-0', isLast && 'pb-0')}>
                    <p
                      className={cn(
                        'text-sm font-semibold leading-tight transition-colors',
                        done
                          ? 'text-[var(--success)]'
                          : active
                            ? 'text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)]'
                      )}
                    >
                      {step.label}
                    </p>
                    {active && (
                      <p className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)]/70 animate-pulse">
                        In progress…
                      </p>
                    )}
                    {done && (
                      <p className="mt-0.5 text-xs font-medium text-[var(--success)]/60">
                        Done
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Failed CTA */}
          {failed && (
            <div className="mt-8 border-t border-[var(--border)]/50 pt-6">
              <button
                type="button"
                onClick={onDismiss}
                className="group relative flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-2.5 text-sm font-bold text-[var(--background)] transition-all hover:bg-[var(--foreground)]/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              >
                <RotateCcw size={15} className="transition-transform group-hover:-rotate-45" />
                Back to configuration
              </button>
            </div>
          )}
        </div>
      </Panel>

      {/* Footer hint */}
      {!failed && (
        <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-[var(--muted-foreground)]">
          <Zap size={13} className="text-[var(--primary)]" />
          Large images and install scripts can take a few minutes.
        </p>
      )}
    </div>
  );
}