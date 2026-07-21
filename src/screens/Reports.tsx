// screens/Reports.tsx
// hooks -> derive -> render for the picker UI; report content itself is built
// by pure functions in lib/reportBuilders and printed via lib/printDoc.
import { useState } from 'react';
import { useGrows, usePlants, useJournal, useProfile } from '../db/hooks';
import * as d from '../lib/derive';
import { printDoc } from '../lib/printDoc';
import { buildWeeklySummary, buildPlantReport, buildSeasonReport } from '../lib/reportBuilders';

type ReportKind = 'weekly' | 'plant' | 'season';

function defaultFrom() {
  const dt = new Date();
  dt.setDate(dt.getDate() - 7);
  return dt.toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function Reports() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const profile = useProfile();
  const plants = usePlants(grow?.id, { includeArchived: true });
  const journal = useJournal(grow?.id);

  const [kind, setKind] = useState<ReportKind>('weekly');
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayStr());
  const [plantId, setPlantId] = useState('');

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty"><h4>No grow yet</h4><p>Set up your grow before generating reports.</p></div>
      </div>
    );
  }

  const units = profile.data?.units ?? 'imperial';
  const allPlants = plants.data ?? [];
  const entries = journal.data ?? [];
  const loading = plants.isLoading || journal.isLoading || profile.isLoading;

  function generate() {
    if (kind === 'weekly') {
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59`);
      const upcoming = d.upcomingTasks(grow!, entries, []);
      printDoc(`Weekly Summary — ${grow!.name}`, buildWeeklySummary(grow!, allPlants, entries, units, fromDate, toDate, upcoming));
    } else if (kind === 'plant') {
      const plant = allPlants.find((p) => p.id === plantId);
      if (!plant) return;
      printDoc(`${plant.name} — Plant Report`, buildPlantReport(grow!, plant, entries, units));
    } else {
      printDoc(`Season Report — ${grow!.name}`, buildSeasonReport(grow!, allPlants, entries, units));
    }
  }

  const canGenerate = !loading && (kind !== 'plant' || !!plantId);

  return (
    <div className="content" style={{ maxWidth: 560 }}>
      <div className="page-head"><h2>Reports</h2></div>
      <div className="page-sub">Printable reports built from your journal and plant data. Opens your browser's print dialog — save as PDF from there.</div>

      <div className="card" style={{ padding: 16 }}>
        <div className="field">
          <span className="lab">Report</span>
          <div className="seg">
            <button type="button" className={kind === 'weekly' ? 'on' : ''} onClick={() => setKind('weekly')}>Weekly summary</button>
            <button type="button" className={kind === 'plant' ? 'on' : ''} onClick={() => setKind('plant')}>Individual plant</button>
            <button type="button" className={kind === 'season' ? 'on' : ''} onClick={() => setKind('season')}>Full season</button>
          </div>
        </div>

        {kind === 'weekly' && (
          <div className="grid2">
            <label className="field"><span className="lab">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field"><span className="lab">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}

        {kind === 'plant' && (
          <label className="field"><span className="lab">Plant</span>
            <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
              <option value="">Select a plant…</option>
              {allPlants.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archived)' : ''}</option>)}
            </select>
          </label>
        )}

        {kind === 'season' && (
          <p className="small muted">Covers your whole grow from transplant (or first entry) through today.</p>
        )}

        {loading && <p className="small muted">Loading grow data…</p>}
        <button className="btn primary" onClick={generate} disabled={!canGenerate}>Generate & print</button>
      </div>
    </div>
  );
}
