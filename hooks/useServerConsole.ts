import { useCallback, useEffect, useRef, useState } from 'react';
import { HeadersMap, agentServerPath } from '../lib/http';
import { ServerRecord } from '../lib/types';
import { useFeedback } from '../components/feedback/FeedbackProvider'; // Adjust path if necessary

const CONSOLE_HISTORY_LIMIT = 200;
const STREAM_ACTIVATION_DELAY_MS = 150;

function waitForStableSelection(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let timer: number | undefined;
    const aborted = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      const error = new Error('Console connection cancelled');
      error.name = 'AbortError';
      reject(error);
    };
    if (signal.aborted) return aborted();
    timer = window.setTimeout(() => {
      signal.removeEventListener('abort', aborted);
      resolve();
    }, STREAM_ACTIVATION_DELAY_MS);
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
  const { showToast } = useFeedback(); // Initialize feedback
  
  const abortRef = useRef<AbortController | null>(null);
  const emitterRef = useRef<EventTarget>(new EventTarget());
  const historyRef = useRef<Record<string, string[]>>({});
  const selectedRef = useRef<ServerRecord | null>(null);
  
  // Track if we've already alerted about the EULA for this session to prevent spam
  const eulaAlertedRef = useRef(false);
  
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);

  // Performance: Batch frequent updates
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

    lines.forEach(line => {
      emitterRef.current.dispatchEvent(new CustomEvent('line', { detail: line }));
    });

    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(() => {
        const currentHistory = historyRef.current[key] || [];
        const updatedHistory = [...currentHistory, ...batchBufferRef.current].slice(-CONSOLE_HISTORY_LIMIT);
        
        historyRef.current[key] = updatedHistory;

        if (selectedRef.current?.id === server.id) {
          setSelectedHistory(updatedHistory);
        }

        batchBufferRef.current = [];
        batchTimeoutRef.current = null;
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

  const connectConsole = useCallback(async (server: ServerRecord) => {
    stopConsole();
    selectedRef.current = server;
    historyRef.current[consoleKey(server)] = [];
    setSelectedHistory([]);
    eulaAlertedRef.current = false; // Reset the EULA alert flag on fresh connect

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await waitForStableSelection(controller.signal);
      const res = await fetch(`${apiBase || '/api'}${agentServerPath(server, '/console')}`, {
        headers: authHeaders,
        signal: controller.signal
      });
      
      if (!res.ok || !res.body) throw new Error('Console unavailable');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const agentMessages: Record<string, { text: string, color: string }> = {
        'console-attached': { text: 'Connected to live server console.', color: '\x1b[32m' }, // Green
        'console-detached': { text: 'Console stream disconnected.', color: '\x1b[90m' },      // Gray
        'console-reconnecting': { text: 'Console stream interrupted; reconnecting…', color: '\x1b[33m' }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || ''; 

        const extractedLines: string[] = [];

        for (const chunk of chunks) {
          const dataPayload = chunk.split('\n')
            .filter(l => l.startsWith('data: '))
            .map(l => l.slice(6))
            .join('\n');

          if (!dataPayload) continue;

          try {
            const event = JSON.parse(dataPayload);
            if (event.action) {
              const mapped = agentMessages[event.action];
              if (mapped) {
                if (event.action === 'console-detached' || event.action === 'console-reconnecting') {
                  extractedLines.push(`${mapped.color}[system] \x1b[3m${mapped.text}\x1b[0m`);
                }
              } else {
                extractedLines.push(`\x1b[33m[system] \x1b[3m${event.action}\x1b[0m`);
              }
            }
            if (event.line) {
              const parsedLines = parseConsolePayload(event.line);
              extractedLines.push(...parsedLines);

              // --- EULA Detection Logic ---
              if (!eulaAlertedRef.current) {
                for (const line of parsedLines) {
                  if (line.toLowerCase().includes('agree to the eula') || line.toLowerCase().includes('failed to load eula.txt')) {
                    eulaAlertedRef.current = true;
                    showToast('Server stopped because the EULA is not accepted. Please update your eula.txt file to start the server.', 'error');
                    break;
                  }
                }
              }

            }
            if (event.errorMessage) extractedLines.push(`\x1b[31m[error] ${event.errorMessage}\x1b[0m`);
          } catch (e) {
            // Ignore malformed JSON chunks
          }
        }

        if (extractedLines.length > 0) {
          appendLinesBatched(server, extractedLines);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        appendLinesBatched(server, [`\x1b[31m[System] ${error.message}\x1b[0m`]);
      }
    }
  }, [apiBase, appendLinesBatched, authHeaders, stopConsole, showToast]);

  useEffect(() => {
    return () => stopConsole();
  }, [stopConsole]);

  return { consoleEmitter: emitterRef.current, consoleHistory: selectedHistory, connectConsole, stopConsole };
}