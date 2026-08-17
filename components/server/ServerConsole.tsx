import { FormEvent, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Loader2, Send } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { cn } from '../ui'; // Assuming you have your standard clsx/tailwind-merge utility here
import { consoleLinesToTerminalData } from '../../lib/console-history';

interface ServerConsoleProps {
  emitter: EventTarget;
  history: string[];
  onSendCommand: (cmd: string) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

export function ServerConsole({ 
  emitter, 
  history, 
  onSendCommand, 
  readOnly = false,
  className 
}: ServerConsoleProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const commandBuffer = useRef<string>('');
  const latestHistory = useRef(history);
  latestHistory.current = history;
  const renderedHistory = useRef<string[]>([]);

  const latestSendCommand = useRef(onSendCommand);
  const [mobileCommand, setMobileCommand] = useState('');
  const [mobileSending, setMobileSending] = useState(false);

  // Tracks whether the mobile input is focused or mid-send.
  // A ref (not state) so the value is always current inside the xterm closure
  // without ever needing to re-run the terminal setup effect.
  const mobileActive = useRef(false);

  const submitMobileCommand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = mobileCommand.trim();
    if (!command || mobileSending || readOnly) return;

    setMobileCommand('');
    setMobileSending(true);
    mobileActive.current = true;

    const term = termRef.current;
    // Echo the command into the terminal without a prompt prefix so it doesn't
    // look like an xterm prompt line, then scroll down.
    term?.writeln(`\x1b[2K\r${command}`);
    term?.scrollToBottom();

    try {
      await onSendCommand(command);
    } catch (error: any) {
      term?.writeln(`\x1b[31m[error] ${error?.message || 'command failed'}\x1b[0m`);
    } finally {
      setMobileSending(false);
      // Only clear the flag if the input is no longer focused.
      // onBlur will also clear it, so this covers the programmatic-send path.
      mobileActive.current = document.activeElement?.id === 'mobile-server-command';
    }
  };

  // Keep the latest callback in a ref to avoid stale closures inside the xterm effect
  useEffect(() => {
    latestSendCommand.current = onSendCommand;
  }, [onSendCommand]);

  useEffect(() => {
    if (!terminalRef.current || !emitter) return;

    const term = new Terminal({
      cursorBlink: !readOnly,
      theme: { 
        foreground: '#f4f4f5', 
        cursor: '#ffffff', 
        selectionBackground: '#333333' 
      },
      fontFamily: 'IBM Plex Mono, Consolas, Menlo, monospace',
      fontSize: window.matchMedia('(max-width: 639px)').matches ? 11 : 12,
      lineHeight: 1.25,
      scrollback: 2000,
      scrollOnUserInput: true,
      convertEol: true,
      disableStdin: readOnly,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    termRef.current = term;
    renderedHistory.current = [];

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;

      const key = event.key.toLowerCase();
      const clipboardModifier = event.ctrlKey || event.metaKey;
      const copyShortcut = (clipboardModifier && key === 'c')
        || (event.ctrlKey && event.key === 'Insert');
      const pasteShortcut = (clipboardModifier && key === 'v')
        || (event.shiftKey && event.key === 'Insert');

      // Preserve Ctrl+C as a terminal interrupt unless there is selected text.
      if (copyShortcut && term.hasSelection()) {
        event.preventDefault();
        void navigator.clipboard?.writeText(term.getSelection()).catch(() => undefined);
        return false;
      }

      if (pasteShortcut && !readOnly && navigator.clipboard?.readText) {
        event.preventDefault();
        void navigator.clipboard.readText()
          .then(text => {
            if (text && termRef.current === term) term.paste(text);
          })
          .catch(() => undefined);
        return false;
      }

      return true;
    });

    let fitFrame = 0;
    const fitTerminal = () => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(() => {
        const element = terminalRef.current;
        if (!element || element.clientWidth < 1 || element.clientHeight < 1) return;
        try {
          fitAddon.fit();
          term.scrollToBottom();
        } catch {
          // A later resize frame will retry once the animated tab is measurable.
        }
      });
    };
    fitTerminal();
    void document.fonts?.ready.then(() => {
      if (termRef.current === term) fitTerminal();
    });

    if (latestHistory.current.length) {
      term.write(consoleLinesToTerminalData(latestHistory.current));
      renderedHistory.current = [...latestHistory.current];
    } else {
      term.writeln('\x1b[3mConsole connected. Waiting for logs...\x1b[0m');
    }
    
    term.write(readOnly ? '\r\n\x1b[3mRead-only access. Command input is disabled.\x1b[0m' : '\r\n> ');
    fitTerminal();

    const submitCommand = async () => {
      const cmd = commandBuffer.current.trim();
      commandBuffer.current = '';
      
      term.write('\r\n> ');

      if (cmd) {
        try {
          await latestSendCommand.current(cmd);
        } catch (error: any) {
          term.write('\x1b[2K\r');
          term.writeln(`\x1b[31m[error] ${error?.message || 'command failed'}\x1b[0m`);
          term.write('> ' + commandBuffer.current);
        }
      }
    };

    const dataDisposable = term.onData((data) => {
      if (readOnly) return;
      
      for (let i = 0; i < data.length; i++) {
        const char = data[i];

        // Handle escape sequences
        if (char === '\x1b') {
          while (i + 1 < data.length && /[\[\]0-9;?]/.test(data[i + 1])) i++;
          if (i + 1 < data.length) i++;
          continue;
        }

        if (char === '\n' && data[i - 1] === '\r') continue;

        // Enter key
        if (char === '\r' || char === '\n') {
          void submitCommand();
          continue;
        }

        // Backspace
        if (char === '\x7f' || char === '\b') {
          if (commandBuffer.current.length > 0) {
            commandBuffer.current = commandBuffer.current.slice(0, -1);
            term.write('\b \b');
          }
          continue;
        }

        // Ctrl+C
        if (char === '\x03') {
          commandBuffer.current = '';
          term.write('^C\r\n> ');
          continue;
        }

        if (char < ' ') continue;

        commandBuffer.current += char;
        term.write(char);
      }
    });

    const handleLines = (e: Event) => {
      const detail = (e as CustomEvent<string | string[]>).detail;
      const lines = (Array.isArray(detail) ? detail : [detail])
        .filter((line): line is string => typeof line === 'string');
      if (lines.length === 0) return;

      // Clear and restore the prompt once for the whole replay/live burst.
      term.write(`\x1b[2K\r${consoleLinesToTerminalData(lines)}`);

      // Only restore the xterm prompt when the mobile input isn't active.
      // When the user is typing/sending via the mobile bar, there is no live
      // xterm prompt to restore, and writing "> " would leave a dangling
      // prompt that duplicates once the mobile input is dismissed.
      if (!mobileActive.current) {
        term.write('> ' + commandBuffer.current);
      }

      term.scrollToBottom();
      renderedHistory.current.push(...lines);
      if (renderedHistory.current.length > 200) {
        renderedHistory.current.splice(0, renderedHistory.current.length - 200);
      }
    };

    const handleClear = () => {
      term.reset(); 
      term.writeln('\x1b[3mConsole connected. Waiting for logs...\x1b[0m');
      commandBuffer.current = '';
      renderedHistory.current = [];
      if (!mobileActive.current) {
        term.write('\r\n> ');
      }
      term.scrollToBottom();
    };

    emitter.addEventListener('lines', handleLines);
    // Keep accepting the old single-line contract for callers outside the
    // console hook while the hook itself emits batched `lines` events.
    emitter.addEventListener('line', handleLines);
    emitter.addEventListener('clear', handleClear);

    const resizeObserver = new ResizeObserver(fitTerminal);
    resizeObserver.observe(terminalRef.current);
    window.addEventListener('resize', fitTerminal);
    window.addEventListener('orientationchange', fitTerminal);
    window.visualViewport?.addEventListener('resize', fitTerminal);

    return () => {
      cancelAnimationFrame(fitFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', fitTerminal);
      window.removeEventListener('orientationchange', fitTerminal);
      window.visualViewport?.removeEventListener('resize', fitTerminal);
      emitter.removeEventListener('lines', handleLines);
      emitter.removeEventListener('line', handleLines);
      emitter.removeEventListener('clear', handleClear);
      term.dispose();
      dataDisposable.dispose();
    };
  }, [emitter, readOnly]);

  // Console replay can arrive before xterm mounts and subscribes to the live
  // emitter. Reconcile the state-backed history as well so opening the console
  // never waits for a new command/output line before showing its backlog.
  useEffect(() => {
    const term = termRef.current;
    if (!term || history.length === 0) return;

    const rendered = renderedHistory.current;
    let overlap = Math.min(rendered.length, history.length);
    while (overlap > 0) {
      const suffix = rendered.slice(rendered.length - overlap);
      if (suffix.every((line, index) => line === history[index])) break;
      overlap -= 1;
    }

    const missing = history.slice(overlap);
    if (missing.length === 0) return;
    term.write(`\x1b[2K\r${consoleLinesToTerminalData(missing)}`);
    if (!mobileActive.current) {
      term.write('> ' + commandBuffer.current);
    }
    renderedHistory.current = [...history];
    term.scrollToBottom();
  }, [history]);

  return (
    <div 
      className={cn(
        'relative grid min-w-0 w-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden border border-[var(--border)] bg-[#0c0c0d] shadow-inner',
        className || 'h-[min(32rem,62dvh)] min-h-[22rem] sm:h-[500px]'
      )}
      role="region"
      aria-label="Server console"
    >
      <div className="relative min-h-0 min-w-0 overflow-hidden">
        <div
          ref={terminalRef}
          className="absolute inset-2 min-h-0 min-w-0 overflow-hidden outline-none sm:inset-3 [&_.xterm]:h-full [&_.xterm]:max-w-full [&_.xterm]:overflow-hidden [&_.xterm]:w-full [&_.xterm-screen]:max-w-full [&_.xterm-viewport]:!overflow-y-auto [&_.xterm-viewport]:max-w-full"
          onPointerDown={() => termRef.current?.focus()}
        />
      </div>

      {!readOnly && (
        <form
          className="relative z-10 flex min-w-0 items-center gap-2 border-t border-white/10 bg-[#0c0c0d] p-2 md:hidden"
          onSubmit={submitMobileCommand}
        >
          <label className="sr-only" htmlFor="mobile-server-command">Server command</label>
          <input
            id="mobile-server-command"
            value={mobileCommand}
            onChange={event => setMobileCommand(event.target.value)}
            onFocus={() => { mobileActive.current = true; }}
            onBlur={() => {
              // Delay slightly so a submit that fires just before blur can still
              // read mobileActive.current = true during its own async work.
              setTimeout(() => { mobileActive.current = false; }, 100);
            }}
            placeholder="Type a command…"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-base text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:ring-1 focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={mobileSending || !mobileCommand.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send command"
          >
            {mobileSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </form>
      )}
    </div>
  );
}
