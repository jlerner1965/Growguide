// screens/Weather.tsx
// hooks -> derive -> render. useWeather powers the 7-day outlook + risk cards
// (same hook the Dashboard uses); useNwsAlerts adds official active alerts,
// best-effort only. If Open-Meteo is unreachable we show a clearly labeled
// simulated example instead of a blank screen — never presented as live data.
import { useGrows } from '../db/hooks';
import { useWeather, type WxDay, type WxRisk } from '../weather/useWeather';
import { useNwsAlerts } from '../weather/useNwsAlerts';

const SEVERITY_RANK: Record<WxRisk['level'], number> = { red: 0, amber: 1, ok: 2 };
const NWS_SEVERITY_PILL: Record<string, string> = {
  Extreme: 'red', Severe: 'red', Moderate: 'amber', Minor: 'blue', Unknown: 'gray',
};

const SIMULATED_DAYS: WxDay[] = [
  { dow: 'Mon', hi: 91, lo: 58, pop: 10, gust: 22, precip: 0, note: 'Clear / dry' },
  { dow: 'Tue', hi: 94, lo: 60, pop: 15, gust: 28, precip: 0, note: 'Breezy' },
  { dow: 'Wed', hi: 89, lo: 57, pop: 35, gust: 20, precip: 0.1, note: 'Chance rain' },
  { dow: 'Thu', hi: 85, lo: 55, pop: 55, gust: 32, precip: 0.4, note: 'Showers likely' },
  { dow: 'Fri', hi: 88, lo: 56, pop: 20, gust: 18, precip: 0, note: 'Clear / dry' },
  { dow: 'Sat', hi: 92, lo: 59, pop: 10, gust: 15, precip: 0, note: 'Clear / dry' },
  { dow: 'Sun', hi: 93, lo: 61, pop: 5, gust: 17, precip: 0, note: 'Clear / dry' },
];
const SIMULATED_RISKS: WxRisk[] = [
  { title: 'Extreme heat', level: 'amber', stat: 'Peak 94°F', advice: 'Water early; watch midday wilt. No foliar spray in peak sun.', icon: 'sun' },
  { title: 'High wind', level: 'amber', stat: 'Gusts to ~32 mph', advice: 'Inspect stakes, ties and trellis before the windiest day.', icon: 'weather' },
  { title: 'Cold / frost', level: 'ok', stat: 'Low ~55°F', advice: 'No cold risk.', icon: 'moon' },
  { title: 'Heavy rain', level: 'ok', stat: 'Wettest ~0.40 in', advice: 'Light or no rain.', icon: 'drop' },
];

function riskCard(r: WxRisk) {
  return (
    <div key={r.title} className="card" style={{ padding: 14, borderLeft: `3px solid var(--${r.level === 'red' ? 'red' : r.level === 'amber' ? 'amber' : 'green'})` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600 }}>{r.title}</div>
        <span className={`pill ${r.level === 'ok' ? 'green' : r.level}`}>{r.level === 'red' ? 'High' : r.level === 'amber' ? 'Elevated' : 'Low'}</span>
      </div>
      <div className="small muted" style={{ margin: '4px 0' }}>{r.stat}</div>
      <div className="small">{r.advice}</div>
    </div>
  );
}

export function Weather() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const wx = useWeather(grow?.lat, grow?.lng);
  const alerts = useNwsAlerts(grow?.lat, grow?.lng);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty"><h4>No grow yet</h4><p>Set up your grow (with a location) to see weather risk.</p></div>
      </div>
    );
  }
  if (grow.lat == null || grow.lng == null) {
    return (
      <div className="content">
        <div className="card empty"><h4>No location set</h4><p>Add coordinates on My Grow → Edit grow to see weather risk for your site.</p></div>
      </div>
    );
  }

  const usingSimulated = !wx.live && !wx.loading;
  const days = wx.live ? wx.days : (usingSimulated ? SIMULATED_DAYS : []);
  const risks = wx.live ? wx.risks : (usingSimulated ? SIMULATED_RISKS : []);
  const sortedRisks = [...risks].sort((a, b) => SEVERITY_RANK[a.level] - SEVERITY_RANK[b.level]);
  const actionItems = sortedRisks.filter((r) => r.level !== 'ok');

  function refresh() { wx.refresh(); alerts.refresh(); }

  return (
    <div className="content">
      <div className="page-head">
        <h2>Weather Risks</h2>
        <span className="spacer" />
        <button className="btn sm" onClick={refresh} disabled={wx.loading}>{wx.loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="page-sub">Estimates for planning, not certainties. CAPE is convective/hail <em>potential</em>; humidity-hours are disease <em>pressure</em> — neither is a forecast of an outcome.</div>

      {usingSimulated && (
        <div className="demo-note" style={{ marginBottom: 16 }}>
          ⚠ Live forecast unavailable — showing a simulated example so the layout still makes sense.
        </div>
      )}

      {alerts.available && alerts.alerts.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Official NWS alerts</div>
          <div className="card" style={{ padding: 0, marginBottom: 20 }}>
            <ul className="list">
              {alerts.alerts.map((a) => (
                <li key={a.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span className={`pill ${NWS_SEVERITY_PILL[a.severity] ?? 'gray'}`}>{a.severity}</span>
                    <span style={{ fontWeight: 600 }}>{a.event}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>{a.headline}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="eyebrow" style={{ marginBottom: 8 }}>Seven-day outlook</div>
      <div className="card" style={{ padding: 16, overflowX: 'auto', marginBottom: 20 }}>
        {wx.loading && days.length === 0 && <div className="muted small">Loading forecast…</div>}
        {days.length === 0 && !wx.loading && <div className="muted small">Forecast unavailable.</div>}
        {days.length > 0 && (
          <div style={{ display: 'flex', gap: 10, minWidth: 560 }}>
            {days.map((day, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{day.dow}</div>
                <div style={{ fontSize: 19, margin: '4px 0' }}>{day.hi}°</div>
                <div className="small muted">{day.lo}° lo</div>
                <div className="small" style={{ marginTop: 6, color: day.gust >= 30 ? 'var(--amber)' : 'var(--muted)' }}>{day.gust} mph</div>
                <div className="small muted">{day.pop}% rain</div>
                <div className="small" style={{ marginTop: 4, fontWeight: 600 }}>{day.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Risk cards</div>
      {sortedRisks.length === 0 && <div className="card empty muted">{wx.loading ? 'Loading…' : 'No risk data available.'}</div>}
      {sortedRisks.length > 0 && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: 20 }}>
          {sortedRisks.map(riskCard)}
        </div>
      )}

      <div className="eyebrow" style={{ marginBottom: 8 }}>Action checklist</div>
      <div className="card" style={{ padding: 16 }}>
        {actionItems.length === 0 ? (
          <div className="muted small">Nothing elevated right now.</div>
        ) : (
          <ul className="list">
            {actionItems.map((r) => (
              <li key={r.title} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <input type="checkbox" style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</div>
                  <div className="small muted">{r.advice}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
