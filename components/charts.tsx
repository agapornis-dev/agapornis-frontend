import { formatBytes } from '../lib/utils';

export function Sparkline({ data, max }: { data: number[]; max?: number }) {
  const width = 240;
  const height = 60;
  const ceiling = Math.max(max || 0, ...data, 1);
  const points = data.length ? data : [0];

  const coords = points.map((value, index) => ({
    x: points.length === 1 ? 0 : (index / (points.length - 1)) * width,
    y: height - (Math.min(value, ceiling) / ceiling) * height,
  }));

  const smoothPath = coords.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

    const prev = coords[i - 1];
    const tension = 0.4;
    const cpx = (point.x - prev.x) * tension;

    const cp1x = (prev.x + cpx).toFixed(1);
    const cp1y = prev.y.toFixed(1);
    const cp2x = (point.x - cpx).toFixed(1);
    const cp2y = point.y.toFixed(1);

    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-16 w-full overflow-visible">
      <path d={`M 0 ${height} L ${width} ${height}`} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
      <path d={smoothPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({ title, value, data, max }: { title: string; value: string; data?: number[]; max?: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      {data && <Sparkline data={data} max={max} />}
    </div>
  );
}
