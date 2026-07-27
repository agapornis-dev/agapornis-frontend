import { useCallback, useEffect, useRef, useState } from 'react';
import { HeadersMap, agentServerPath } from '../lib/http';
import { ServerRecord } from '../lib/types';
import { useFeedback } from '../components/feedback/FeedbackProvider';
import { consoleReplayDelta, consoleTerminalMessage } from '../lib/console-history';

const CONSOLE_HISTORY_LIMIT = 200;
const STREAM_RECONNECT_DELAY_MS = 1_000;
const HISTORY_BOUNDARY_TIMEOUT_MS = 250;
const HISTORY_BURST_MAX_MS = 1_000;
const COLD_HISTORY_START_TIMEOUT_MS = 5_000;

function waitForReconnect(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', aborted);
      resolve();
    }, STREAM_RECONNECT_DELAY_MS);
    const aborted = () => {
      window.clearTimeout(timer);
      const error = new Error('Console reconnection cancelled');
      error.name = 'AbortError';
      reject(error);
    };
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
  });
}

function consoleKey(server: ServerRecord) {
  return `${server.nodeId}:${server.id}`;
}

function parseConsolePayload(payload: string): string[] {
  const normalized = payload.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const decoded = normalized.includes('\\n') && !normalized.includes('\n')
    ? normalized.replace(/\\r\\n|\\n|\\r/g, '\n')
    : normalized;

  return decoded.split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.length > 0);
}

export function useServerConsole(apiBase: string, authHeaders: HeadersMap) {
  const { showToast } = useFeedback();

  const abortRef = useRef<AbortController | null>(null);
  const emitterRef = useRef<EventTarget>(new EventTarget());
  const historyRef = useRef<Record<string, string[]>>({});
  const selectedRef = useRef<ServerRecord | null>(null);

  const eulaAlertedRef = useRef<Set<string>>(new Set());

  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);

  const batchBufferRef = useRef<string[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('agapornis.console.')) localStorage.removeItem(key);
    }
  }, []);



  const appendLinesBatched = useCallback((server: ServerRecord, lines: string[]) => {
    if (!lines.length) return;

    const key = consoleKey(server);
    batchBufferRef.current.push(...lines);
    emitterRef.current.dispatchEvent(new CustomEvent('lines', { detail: lines }));

    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(() => {
        const batch = batchBufferRef.current;
        batchBufferRef.current = [];
        batchTimeoutRef.current = null;
        if (!batch.length) return;

        const currentHistory = historyRef.current[key] || [];
        const updatedHistory = [...currentHistory, ...batch].slice(-CONSOLE_HISTORY_LIMIT);
        historyRef.current[key] = updatedHistory;

        if (selectedRef.current?.id === server.id) {
          setSelectedHistory(updatedHistory);
        }

      }, 50);
    }
  }, []);

  const stopConsole = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    batchBufferRef.current = [];
  }, []);

  const clearConsole = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    setSelectedHistory([]);
    batchBufferRef.current = [];

    if (selectedRef.current) {
      const key = consoleKey(selectedRef.current);
      historyRef.current[key] = [];
    }


    emitterRef.current.dispatchEvent(new CustomEvent('clear'));
  }, []);

  const connectConsole = useCallback(async (server: ServerRecord) => {
    stopConsole();
    selectedRef.current = server;
    const key = consoleKey(server);
    const cachedHistory = historyRef.current[key] || [];
    setSelectedHistory(cachedHistory);

    const controller = new AbortController();
    abortRef.current = controller;

    const isCurrentConnection = () =>
      !controller.signal.aborted &&
      abortRef.current === controller &&
      selectedRef.current != null &&
      consoleKey(selectedRef.current) === key;

    let terminal = false;
    try {
      while (!controller.signal.aborted &&
             !terminal &&
             abortRef.current === controller &&
             selectedRef.current &&
             consoleKey(selectedRef.current) === key) {
        let finishPendingReplay: (() => void) | undefined;
        try {
          const res = await fetch(`${apiBase || '/api'}${agentServerPath(server, '/console')}`, {
            headers: {
              ...authHeaders,
              Accept: 'text/event-stream',
              'Cache-Control': 'no-cache'
            },
            cache: 'no-store',
            signal: controller.signal
          });

          if (!res.ok || !res.body) throw new Error('Console unavailable');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const replayBaseline = historyRef.current[key] || [];
          let awaitingHistoryBoundary = replayBaseline.length > 0;
          let coldAgentReplay = false;
          let bufferedHistory: string[] = [];
          let historyBoundaryTimer: ReturnType<typeof setTimeout> | undefined;
          let historyBurstDeadline: ReturnType<typeof setTimeout> | undefined;
          let coldHistoryStartTimer: ReturnType<typeof setTimeout> | undefined;
          let deduplicatePendingReplay = false;

          const finishInitialHistory = (deduplicate: boolean) => {
            if (!awaitingHistoryBoundary) return;
            awaitingHistoryBoundary = false;
            if (historyBoundaryTimer) clearTimeout(historyBoundaryTimer);
            if (historyBurstDeadline) clearTimeout(historyBurstDeadline);
            if (coldHistoryStartTimer) clearTimeout(coldHistoryStartTimer);
            historyBoundaryTimer = undefined;
            historyBurstDeadline = undefined;
            coldHistoryStartTimer = undefined;
            if (isCurrentConnection()) {
              appendLinesBatched(
                server,
                deduplicate
                  ? consoleReplayDelta(replayBaseline, bufferedHistory)
                  : bufferedHistory
              );
            }
            bufferedHistory = [];
          };

          const scheduleHistoryBoundary = (deduplicate: boolean) => {
            if (historyBoundaryTimer) clearTimeout(historyBoundaryTimer);
            if (coldHistoryStartTimer) clearTimeout(coldHistoryStartTimer);
            coldHistoryStartTimer = undefined;
            deduplicatePendingReplay ||= deduplicate;
            historyBoundaryTimer = setTimeout(
              () => finishInitialHistory(deduplicatePendingReplay),
              HISTORY_BOUNDARY_TIMEOUT_MS
            );
            if (!historyBurstDeadline) {
              historyBurstDeadline = setTimeout(
                () => finishInitialHistory(deduplicatePendingReplay),
                HISTORY_BURST_MAX_MS
              );
            }
          };

          const acceptConsoleLines = (lines: string[], replayed: boolean) => {
            if (!lines.length || !isCurrentConnection()) return;
            if (awaitingHistoryBoundary && (coldAgentReplay || replayed)) {
              bufferedHistory.push(...lines);
              // Debounce the initial tail so slower agents still reconcile as
              // one burst. A separate deadline prevents a noisy server from
              // withholding output forever.
              scheduleHistoryBoundary(true);
              return;
            }
            if (awaitingHistoryBoundary) finishInitialHistory(false);
            appendLinesBatched(server, lines);
          };

          finishPendingReplay = () => finishInitialHistory(deduplicatePendingReplay);

      const agentMessages: Record<string, { text: string, color: string }> = {
        'console-attached': { text: 'Connected to live server console.', color: '\x1b[32m' },
        'console-detached': { text: 'Console stream disconnected.', color: '\x1b[90m' },
        'console-reconnecting': { text: 'Console stream interrupted; reconnecting…', color: '\x1b[33m' }
      };

          while (!controller.signal.aborted) {
            const { value, done } = await reader.read();
            if (done) throw new Error('Console stream ended');

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
              const dataPayload = chunk.split('\n')
                .filter(l => l.startsWith('data: '))
                .map(l => l.slice(6))
                .join('\n');

              if (!dataPayload) continue;

              try {
                const event = JSON.parse(dataPayload);

                if (event.line) {
                  const parsedLines = parseConsolePayload(event.line);
                  const consoleLines: string[] = [];
                  for (const line of parsedLines) {
                    const isEulaMessage = line.toLowerCase().includes('agree to the eula')
                      || line.toLowerCase().includes('failed to load eula.txt');
                    if (isEulaMessage && event.replayed !== true && !eulaAlertedRef.current.has(key)) {
                      eulaAlertedRef.current.add(key);
                      consoleLines.push('\x1b[1;41;97m EULA REQUIRED \x1b[0m \x1b[1;31mAccept the Minecraft EULA in eula.txt before restarting the server.\x1b[0m');
                      showToast(
                        'Minecraft EULA approval is required. Set eula=true in eula.txt, then restart the server.',
                        'error'
                      );
                    }
                    consoleLines.push(line);
                  }
                  acceptConsoleLines(consoleLines, event.replayed === true);
                }

                if (event.historyReady === true) {
                  if (event.agentHistoryComplete === true) {
                    // The upgraded agent provides an exact replay boundary, so
                    // reconcile immediately even when its history was empty.
                    finishInitialHistory(true);
                  } else if (Number(event.historyEntries || 0) > 0) {
                    finishInitialHistory(true);
                  } else if (awaitingHistoryBoundary) {
                    // A cold API feed has no in-memory replay yet. Keep the
                    // browser cache visible and reconcile the agent's initial
                    // Docker tail as one short, bounded burst.
                    coldAgentReplay = true;
                    if (coldHistoryStartTimer) clearTimeout(coldHistoryStartTimer);
                    coldHistoryStartTimer = setTimeout(
                      () => finishInitialHistory(false),
                      COLD_HISTORY_START_TIMEOUT_MS
                    );
                  }
                }

                if (event.action) {
                  const mapped = agentMessages[event.action];
                  if (mapped) {
                    if (event.action === 'console-detached' || event.action === 'console-reconnecting') {
                      appendLinesBatched(server, [`${mapped.color}[system] \x1b[3m${mapped.text}\x1b[0m`]);
                    }
                  } else {
                    appendLinesBatched(server, [`\x1b[33m[system] \x1b[3m${event.action}\x1b[0m`]);
                  }

                }

                if (event.errorMessage) {
                  appendLinesBatched(server, [`\x1b[31m[error] ${event.errorMessage}\x1b[0m`]);
                }

                const terminalMessage = consoleTerminalMessage(event);
                if (terminalMessage) {
                  finishInitialHistory(deduplicatePendingReplay || coldAgentReplay);
                  appendLinesBatched(server, [
                    `\x1b[31m[system] \x1b[3m${terminalMessage}\x1b[0m`
                  ]);
                  terminal = true;
                }
              } catch (e) {
                // Ignore malformed JSON chunks
              }
            }

            if (terminal) {
              await reader.cancel().catch(() => undefined);
              break;
            }
          }
        } catch (error: any) {
          finishPendingReplay?.();
          if (error.name === 'AbortError' || controller.signal.aborted) throw error;
          if (terminal) break;
          appendLinesBatched(server, [
            `\x1b[33m[system] \x1b[3mConsole connection lost; reconnecting…\x1b[0m`
          ]);
        }

        if (terminal) break;
        await waitForReconnect(controller.signal);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        appendLinesBatched(server, [`\x1b[31m[System] ${error.message}\x1b[0m`]);
      }
    }
    if (abortRef.current === controller) abortRef.current = null;
  }, [apiBase, appendLinesBatched, authHeaders, stopConsole, showToast]);

  useEffect(() => {
    return () => stopConsole();
  }, [stopConsole]);

  return {
    consoleEmitter: emitterRef.current,
    consoleHistory: selectedHistory,
    connectConsole,
    stopConsole,
    clearConsole
  };
}
