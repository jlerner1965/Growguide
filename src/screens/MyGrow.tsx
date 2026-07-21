// screens/MyGrow.tsx
// hooks -> derive -> render. Active grow overview + the heuristic starting
// cultivation plan; "Edit" routes into the GrowSetup wizard.
import { useNavigate } from 'react-router-dom';
import { useGrows, usePlants, useJournal } from '../db/hooks';
import * as d from '../lib/derive';

export function MyGrow() {
  const navigate = useNavigate();
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty">
          <h4>No grow yet</h4>
          <p>Set up your grow to start tracking plants, journal entries, and weather risk.</p>
          <button className="btn primary" onClick={() => navigate('/grow-setup')}>Set up your grow</button>
        </div>
      </div>
    );
  }

  const entries = journal.data ?? [];
  const st = d.estimateStage(grow, entries);
  const plan = d.growPlan(grow);
  const activePlants = (plants.data ?? []).filter((p) => !p.archived);

  return (
    <div className="content">
      <div className="page-head">
        <h2>{grow.name}</h2>
        <span className="pill blue">{st.stage}</span>
        {grow.is_sample && <span className="pill gray">Sample data</span>}
        <span className="spacer" />
        <button className="btn sm" onClick={() => navigate('/grow-setup')}>Edit grow</button>
      </div>
      <div className="page-sub">{grow.location || 'No location set'}{grow.lat != null && grow.lng != null ? ` · ${grow.lat.toFixed(4)}, ${grow.lng.toFixed(4)}` : ''}</div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 24 }}>
        <div className="card stat">
          <div className="eyebrow">Plants</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{activePlants.length}</div>
        </div>
        <div className="card stat">
          <div className="eyebrow">Type</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{grow.photo_type ?? '—'}</div>
        </div>
        <div className="card stat">
          <div className="eyebrow">Container</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{grow.container ?? '—'}</div>
        </div>
        <div className="card stat">
          <div className="eyebrow">Medium</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{grow.medium ?? '—'}</div>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Starting cultivation plan</div>
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <ul className="list">
          {plan.map((m) => (
            <li key={m.label} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{m.label}</span>
                <span className="small muted">{m.date ? d.fmtShort(m.date) : '—'}</span>
              </div>
              <div className="small muted">{m.note}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Details</div>
      <div className="card" style={{ padding: 16 }}>
        <DetailRow label="Indoor start" value={grow.indoor_start} />
        <DetailRow label="Outdoor transplant" value={grow.outdoor_transplant} />
        <DetailRow label="Experience" value={grow.experience} />
        <DetailRow label="Elevation" value={grow.elevation_ft != null ? `${grow.elevation_ft} ft` : null} />
        <DetailRow label="Sun exposure" value={grow.sun_exposure} />
        <DetailRow label="Protection" value={grow.protection} />
        <DetailRow label="Irrigation" value={grow.irrigation} />
        <DetailRow label="Nutrition approach" value={grow.nutrition_approach} />
        <DetailRow label="Cultivars" value={grow.cultivars.length ? grow.cultivars.join(', ') : null} />
        <DetailRow label="Concerns" value={grow.concerns} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="muted small">{label}</span>
      <span className="small" style={{ textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
