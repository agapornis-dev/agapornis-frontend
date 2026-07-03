import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { cn } from '../ui'; // Assuming you have your standard clsx/tailwind-merge utility here

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
  const initialHistory = useRef(history);

  const latestSendCommand = useRef(onSendCommand);

  // Keep the latest callback in a ref to avoid stale closures inside the xterm effect
  useEffect(() => {
    latestSendCommand.current = onSendCommand;
  }, [onSendCommand]);

  useEffect(() => {
    if (!terminalRef.current || !emitter) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: { 
        background: '#050505', 
        foreground: '#f4f4f5', 
        cursor: '#ffffff', 
        selectionBackground: '#333333' 
      },
      fontFamily: 'IBM Plex Mono, Consolas, Menlo, monospace',
      fontSize: 13,
      scrollback: 2000, // Slightly increased buffer
      disableStdin: readOnly,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    termRef.current = term;

    // Use a short delay before first fit to ensure DOM layout is complete
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    if (initialHistory.current.length) {
      for (const line of initialHistory.current) term.writeln(line);
    } else {
      term.writeln('\x1b[3mConsole connected. Waiting for logs...\x1b[0m');
    }
    
    term.write(readOnly ? '\r\n\x1b[3mRead-only access. Command input is disabled.\x1b[0m' : '\r\n> ');

    const submitCommand = async () => {
      const cmd = commandBuffer.current.trim();
      commandBuffer.current = '';
      
      // 1. Move to the next line and print the prompt IMMEDIATELY.
      // This makes the terminal instantly responsive and prevents race conditions.
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

    const handleLine = (e: Event) => {
      const line = (e as CustomEvent).detail;
      term.write('\x1b[2K\r'); // Clear current prompt
      term.writeln(line);      // Write new incoming log line
      term.write('> ' + commandBuffer.current); // Restore prompt and any typed text
    };

    const handleClear = () => {
      term.reset(); 
      term.writeln('\x1b[3mConsole connected. Waiting for logs...\x1b[0m');
      commandBuffer.current = '';
      term.write('\r\n> ');
    };

    emitter.addEventListener('line', handleLine);
    emitter.addEventListener('clear', handleClear);

    // Use ResizeObserver instead of window resize for more accurate container fitting
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => fitAddon.fit());
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      emitter.removeEventListener('line', handleLine);
      emitter.removeEventListener('clear', handleClear);
      term.dispose();
      dataDisposable.dispose();
    };
  }, [emitter, readOnly]);

  return (
    <div 
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[#050505] shadow-inner",
        className || "h-[500px]"
      )}
    >
      {/* The xterm container needs specific positioning and padding 
        so the canvas correctly calculates bounds during ResizeObserver triggers 
      */}
      <div 
        ref={terminalRef} 
        className="absolute inset-0 p-3 outline-none [&_.xterm]:h-full [&_.xterm]:w-full" 
      />
    </div>
  );
}