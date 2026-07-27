export function parseObjectJson(value: string) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function variablesText(value: Record<string, string> = {}) {
  return Object.entries(value).map(([key, val]) => `${key}=${val}`).join('\n');
}

export function parseVariablesText(value: string) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .reduce<Record<string, string>>((acc, line) => {
      const index = line.indexOf('=');
      if (index <= 0) return acc;
      acc[line.slice(0, index).trim().toUpperCase()] = line.slice(index + 1).trim();
      return acc;
    }, {});
}
