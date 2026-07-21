// components/Sparkline.tsx
// Minimal inline SVG trend line, shared by Dashboard and Plants detail.
export function Sparkline({ points }: { points: { x: string; y: number }[] }) {
  if (points.length < 2) return <div className="muted small">Not enough data yet.</div>;
  const W = 480, H = 120, pad = 24;
  const ys = points.map((p) => p.y);
  const y1 = Math.max(...ys) * 1.1 || 1;
  const px = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const py = (v: number) => H - pad - (v / y1) * (H - pad * 2);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="none">
      <path d={`${path} L ${px(points.length - 1)} ${H - pad} L ${px(0)} ${H - pad} Z`} fill="var(--sage-100)" opacity={0.6} />
      <path d={path} fill="none" stroke="var(--forest)" strokeWidth={2} />
    </svg>
  );
}
