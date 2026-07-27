export function consoleReplayDelta(cached: string[], replay: string[]) {
  if (!cached.length || !replay.length) return replay;

  // Find the latest longest block shared by the browser tail and the API or
  // agent replay. Everything after that block has not been rendered locally.
  let previous = new Array<number>(replay.length + 1).fill(0);
  let bestLength = 0;
  let bestReplayEnd = 0;
  for (const cachedLine of cached) {
    const current = new Array<number>(replay.length + 1).fill(0);
    for (let replayIndex = 0; replayIndex < replay.length; replayIndex += 1) {
      if (cachedLine !== replay[replayIndex]) continue;
      const length = previous[replayIndex] + 1;
      current[replayIndex + 1] = length;
      if (length > bestLength || (length === bestLength && replayIndex + 1 > bestReplayEnd)) {
        bestLength = length;
        bestReplayEnd = replayIndex + 1;
      }
    }
    previous = current;
  }

  return bestLength > 0 ? replay.slice(bestReplayEnd) : replay;
}

export function consoleLinesToTerminalData(lines: readonly string[]) {
  return lines.length > 0 ? `${lines.join('\r\n')}\r\n` : '';
}

export function consoleTerminalMessage(payload: Record<string, unknown>) {
  if (payload.terminal !== true) return undefined;
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (message) return message;
  if (payload.reason === 'server-removed') {
    return 'Server was removed. This console connection has been closed.';
  }
  return 'Console connection was closed.';
}
