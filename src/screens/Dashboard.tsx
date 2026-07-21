// screens/Dashboard.tsx
// Reference wiring: hooks -> derive -> render, with real loading / empty /
// error states. Every other screen follows this shape (swap State.x for useX()).
import { useGrows, usePlants, useJournal, useProfile } from '../db/hooks';
import { useWeather } from '../weather/useWeather';
import * as d from '../lib/derive';
import type { JournalEntry } from '../db/types';
import type { ReactNode } from 'react';

function Sparkline({ points }: { points: { x: string; y: number }[] }) {
  if (points.length < 2) return <div className="muted small">Not enough data yet.</div>;
  const W = 480, H = 120, pad = 24;
  const ys = points.map((p) => p.y);
  const y1 = Math.max(...ys) * 1.1 || 1;
  const px = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const py = (v: number) => H - pad - (v / y1) * (H - pad * 2);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="none">
      <path d={`${path} L ${px(points.length - 1)} ${H - pad} L ${px(0)} ${H - pad} Z`} fill="var(--sage-100,#e7ede0)" opacity={0.5} />
      <path d={path} fill="none" stroke="var(--forest,#1f3d2b)" strokeWidth={2} />
    </svg>
  );
}

export function Dashboard() {
  const profile = useProfile();
  const grows = useGrows();
  const grow = grows.data?.[0]; // v1: single active grow = the first one
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const wx = useWeather(grow?.lat, grow?.lng);

  if (grows.isLoading) return <div className="content muted" style={{ padding: 24 }}>Loading…</div>;
  if (grows.error) return <div className="content" style={{ padding: 24 }}>Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <h2>No grow yet</h2>
          <p className="muted">Set up your first grow to start tracking.</p>
        </div>
      </div>
    );
  }

  const units = profile.data?.units ?? 'imperial';
  const entries: JournalEntry[] = journal.data ?? [];
  const active = (plants.data ?? []).filter((p) => !p.archived);
  const st = d.estimateStage(grow, entries);
  const dsp = d.daysSinceTransplant(grow);
  const duf = d.daysUntilFlowering(grow, entries);
  const hw = d.harvestWindow(grow);
  const alerts = d.computeAlerts(grow, entries, wx.risks);
  const tasks = d.upcomingTasks(grow, entries, wx.risks);
  const risk = d.riskLevel(wx.risks);
  const first = active[0];
  const heightPts = first ? d.heightSeries(entries, first.id) : [];
  const recent = [...entries].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)).slice(0, 4);
  const loadingGrow = plants.isLoading || journal.isLoading;

  return (
    <div className="content" style={{ padding: 24 }}>
      <div className="grid" style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <Stat k="Active plants" v={String(active.length)} />
        <Stat k="Growth stage" v={st.stage} foot={`day ${dsp} since transplant`} />
        <Stat k="Flowering in" v={`~${duf} days`} foot={`est. ~${d.fmtShort(d.estimatedFloweringDate(grow))}`} />
        <Stat k="Harvest window" v={`${d.fmtShort(hw.from)}–${d.fmtShort(hw.to)}`} foot="range, not a date" />
      </div>

      <SectionLabel title="What needs attention today" right={<span className={`pill ${risk.cls}`}>{risk.label} risk</span>} />
      {loadingGrow ? <div className="card muted" style={{ padding: 16 }}>Loading grow…</div> : (
        <div className="grid" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1.4fr 1fr' }}>
          <div className="card" style={{ padding: 16 }}>
            {alerts.length === 0 && <div className="muted small">Nothing urgent right now.</div>}
            {alerts.map((a, i) => (
              <div key={i} style={{ borderLeft: `3px solid var(--${a.level === 'red' ? 'red' : a.level === 'ok' ? 'forest-300' : 'amber'},#b07615)`, padding: '6px 0 6px 12px', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div className="small muted">{a.body}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow">Upcoming tasks</div>
            <ul className="list" style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
              {tasks.map((t, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line,#e0e3d7)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</div>
                  <div className="small muted">{t.sub} · {t.when}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <SectionLabel
        title="Seven-day outlook"
        right={<span className={`pill ${wx.live ? 'green' : 'amber'}`}>{wx.live ? 'Live · Open-Meteo' : wx.loading ? 'Loading…' : 'Offline'}</span>}
      />
      <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 560 }}>
          {(wx.days.length ? wx.days : []).map((day, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', border: '1px solid var(--line,#e0e3d7)', borderRadius: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{day.dow}</div>
              <div style={{ fontSize: 19, margin: '4px 0' }}>{day.hi}°</div>
              <div className="small muted">{day.lo}° lo</div>
              <div className="small" style={{ marginTop: 6, color: day.gust >= 30 ? 'var(--amber,#b07615)' : 'var(--muted,#5d6455)' }}>{day.gust} mph</div>
              <div className="small muted">{day.pop}% rain</div>
              <div className="small" style={{ marginTop: 4, fontWeight: 600 }}>{day.note}</div>
            </div>
          ))}
          {!wx.days.length && <div className="muted small">{wx.loading ? 'Loading forecast…' : 'Forecast unavailable.'}</div>}
        </div>
      </div>

      <SectionLabel title={`Height trend — ${first?.name ?? '—'}`} />
      <div className="card" style={{ padding: 16 }}>
        <Sparkline points={heightPts.map((p) => ({ x: p.x, y: units === 'imperial' ? d.cmToIn(p.y) : p.y }))} />
        <div className="legend small muted" style={{ marginTop: 6 }}>Height ({units === 'imperial' ? 'in' : 'cm'})</div>
      </div>

      <SectionLabel title="Recent observations" />
      <div className="card" style={{ padding: 16 }}>
        {recent.length === 0 && <div className="muted small">No entries yet.</div>}
        <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {recent.map((e) => {
            const p = active.find((x) => x.id === e.plant_id);
            return (
              <li key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line,#e0e3d7)' }}>
                <div style={{ fontWeight: 600 }}>
                  {p ? p.name : 'Whole grow'} <span className="muted small" style={{ fontWeight: 400 }}>· {d.fmtDateTime(e.occurred_at)}</span>
                </div>
                <div className="small muted">{e.notes ?? ((e.tags ?? []).join(', ') || '—')}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ k, v, foot }: { k: string; v: string; foot?: string }) {
  return (
    <div className="card stat" style={{ padding: 14 }}>
      <div className="eyebrow">{k}</div>
      <div style={{ fontSize: 27, fontWeight: 600, marginTop: 3 }}>{v}</div>
      {foot && <div className="small muted" style={{ marginTop: 5 }}>{foot}</div>}
    </div>
  );
}

function SectionLabel({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '26px 0 12px' }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--line,#e0e3d7)' }} />
      {right}
    </div>
  );
}
