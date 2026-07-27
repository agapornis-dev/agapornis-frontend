import assert from 'node:assert/strict';
import {
  consoleLinesToTerminalData,
  consoleReplayDelta,
  consoleTerminalMessage
} from '../lib/console-history.ts';

assert.deepEqual(
  consoleReplayDelta(['line-2', 'line-3'], ['line-1', 'line-2', 'line-3']),
  [],
  'a warm replay duplicated the browser tail'
);

assert.deepEqual(
  consoleReplayDelta(['line-2', 'line-3'], ['line-1', 'line-2', 'line-3', 'line-4']),
  ['line-4'],
  'new output after a warm replay was dropped'
);

assert.deepEqual(
  consoleReplayDelta(
    ['line-2', 'line-3', '[system] reconnecting'],
    ['line-1', 'line-2', 'line-3', 'line-4']
  ),
  ['line-4'],
  'a browser-only status line prevented replay reconciliation'
);

assert.deepEqual(
  consoleReplayDelta(['old-a', 'old-b'], ['new-a', 'new-b']),
  ['new-a', 'new-b'],
  'an unrelated cold replay was discarded'
);

const firstReconnect = consoleReplayDelta(
  ['line-1', 'line-2'],
  ['line-1', 'line-2', 'line-3']
);
const afterFirstReconnect = ['line-1', 'line-2', ...firstReconnect];
assert.deepEqual(
  consoleReplayDelta(afterFirstReconnect, ['line-1', 'line-2', 'line-3', 'line-4']),
  ['line-4'],
  'a second SSE reconnect duplicated its full replay'
);

assert.equal(
  consoleLinesToTerminalData(['first line', '\x1b[31msecond line\x1b[0m']),
  'first line\r\n\x1b[31msecond line\x1b[0m\r\n',
  'terminal replay was not encoded as one xterm-compatible write'
);

assert.equal(
  consoleLinesToTerminalData([]),
  '',
  'an empty terminal batch emitted control characters'
);

assert.equal(
  consoleTerminalMessage({ terminal: true, reason: 'server-removed' }),
  'Server was removed. This console connection has been closed.',
  'server removal did not produce a clear terminal console message'
);

assert.equal(
  consoleTerminalMessage({ terminal: false, reason: 'server-removed' }),
  undefined,
  'a non-terminal event stopped console reconnection'
);

console.log('console history reconciliation tests: PASS');
