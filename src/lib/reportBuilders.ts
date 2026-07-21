// lib/reportBuilders.ts
// Pure functions that build the HTML body for each printable report.
// No React, no side effects — printDoc() opens the window and prints it.
import type { Grow, Plant, JournalEntry, Units } from '../db/types';
import * as d from './derive';
import { escapeHtml, DISCLAIMER_HTML } from './printDoc';

const UNRESOLVED_TAGS = ['Pest found', 'Damage'];

function plantLabel(plants: Plant[], plantId: string | null) {
  if (!plantId) return 'Whole grow';
  return plants.find((p) => p.id === plantId)?.name ?? 'Unknown plant';
}

function unresolvedIssues(entries: JournalEntry[], plants: Plant[]): { scope: string; entry: JournalEntry }[] {
  const scopes = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = e.plant_id ?? '__whole__';
    if (!scopes.has(key)) scopes.set(key, []);
    scopes.get(key)!.push(e);
  }
  const out: { scope: string; entry: JournalEntry }[] = [];
  for (const [key, list] of scopes) {
    const sorted = [...list].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
    const latest = sorted[0];
    if (latest && latest.tags.some((t) => UNRESOLVED_TAGS.includes(t))) {
      out.push({ scope: key === '__whole__' ? 'Whole grow' : plantLabel(plants, key), entry: latest });
    }
  }
  return out;
}

function entryRow(e: JournalEntry, plants: Plant[], units: Units) {
  const stats = [
    e.water_vol_gal != null ? `${e.water_vol_gal} gal` : null,
    e.height_cm != null ? d.fmtHeight(e.height_cm, units) : null,
    e.ph != null ? `pH ${e.ph}` : null,
    e.temp_f != null ? `${e.temp_f}°F` : null,
    e.rh_pct != null ? `${e.rh_pct}% RH` : null,
  ].filter(Boolean).join(' · ');
  return `<div class="entry">
    <strong>${escapeHtml(plantLabel(plants, e.plant_id))}</strong>
    <span class="muted small"> · ${d.fmtDateTime(e.occurred_at)}</span>
    ${e.tags.length ? `<div class="small">${e.tags.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${stats ? `<div class="small muted">${escapeHtml(stats)}</div>` : ''}
    ${e.symptoms ? `<div class="small">Symptoms: ${escapeHtml(e.symptoms)}</div>` : ''}
    ${e.notes ? `<div class="small muted">${escapeHtml(e.notes)}</div>` : ''}
  </div>`;
}

export function buildWeeklySummary(
  grow: Grow, plants: Plant[], entries: JournalEntry[], units: Units,
  from: Date, to: Date, upcoming: d.Task[],
): string {
  const inRange = entries.filter((e) => {
    const t = +new Date(e.occurred_at);
    return t >= +from && t <= +to;
  }).sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));

  const byDay = new Map<string, JournalEntry[]>();
  for (const e of inRange) {
    const key = new Date(e.occurred_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const issues = unresolvedIssues(entries, plants);

  return `
    <h1>Weekly Summary — ${escapeHtml(grow.name)}</h1>
    <div class="sub">${d.fmtShort(from)} – ${d.fmtShort(to)} · generated ${d.fmtDateTime(new Date())}</div>

    <h2>Observations</h2>
    ${byDay.size === 0 ? '<p class="muted small">No journal entries in this range.</p>' :
      Array.from(byDay.entries()).map(([day, es]) => `<h3 style="font-size:13px;margin:12px 0 4px">${escapeHtml(day)}</h3>${es.map((e) => entryRow(e, plants, units)).join('')}`).join('')}

    <h2>Unresolved issues</h2>
    ${issues.length === 0 ? '<p class="muted small">None flagged — no plant\'s most recent entry is a pest/damage note.</p>' :
      issues.map((i) => `<div class="entry"><strong>${escapeHtml(i.scope)}</strong><div class="small">${i.entry.tags.filter((t) => UNRESOLVED_TAGS.includes(t)).join(', ')} — ${d.fmtDateTime(i.entry.occurred_at)}</div>${i.entry.symptoms ? `<div class="small muted">${escapeHtml(i.entry.symptoms)}</div>` : ''}</div>`).join('')}

    <h2>Upcoming actions</h2>
    ${upcoming.length === 0 ? '<p class="muted small">Nothing flagged.</p>' :
      `<table><thead><tr><th>Action</th><th>Why</th><th>When</th></tr></thead><tbody>${upcoming.map((t) => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.sub)}</td><td>${escapeHtml(t.when)}</td></tr>`).join('')}</tbody></table>`}

    ${DISCLAIMER_HTML}
  `;
}

export function buildPlantReport(grow: Grow, plant: Plant, entries: JournalEntry[], units: Units): string {
  const timeline = d.plantEntries(entries, plant.id).slice().reverse();
  const heightPts = d.heightSeries(entries, plant.id);
  const latest = d.latestHeightCm(entries, plant.id);

  return `
    <h1>${escapeHtml(plant.name)}</h1>
    <div class="sub">${escapeHtml(grow.name)} · generated ${d.fmtDateTime(new Date())}</div>

    <h2>Current stats</h2>
    <table><tbody>
      <tr><th>Cultivar</th><td>${escapeHtml(plant.cultivar || '—')}</td></tr>
      <tr><th>Stage</th><td>${escapeHtml(plant.stage || '—')}</td></tr>
      <tr><th>Health</th><td>${plant.health != null ? `${plant.health}/10` : '—'}</td></tr>
      <tr><th>Latest height</th><td>${escapeHtml(d.fmtHeight(latest, units))}</td></tr>
      <tr><th>Start date</th><td>${escapeHtml(plant.start_date || '—')}</td></tr>
      <tr><th>Transplant date</th><td>${escapeHtml(plant.transplant_date || '—')}</td></tr>
      <tr><th>Journal entries</th><td>${timeline.length}</td></tr>
    </tbody></table>

    <h2>Height progression</h2>
    ${heightPts.length < 2 ? '<p class="muted small">Not enough height entries yet to show a trend.</p>' :
      `<table><thead><tr><th>Date</th><th>Height</th></tr></thead><tbody>${heightPts.map((p) => `<tr><td>${d.fmtShort(p.x)}</td><td>${escapeHtml(d.fmtHeight(p.y, units))}</td></tr>`).join('')}</tbody></table>`}

    <h2>Full timeline</h2>
    ${timeline.length === 0 ? '<p class="muted small">No journal entries for this plant yet.</p>' : timeline.map((e) => entryRow(e, [plant], units)).join('')}

    ${DISCLAIMER_HTML}
  `;
}

export function buildSeasonReport(grow: Grow, plants: Plant[], entries: JournalEntry[], units: Units): string {
  const st = d.estimateStage(grow, entries);
  const start = grow.outdoor_transplant ? new Date(grow.outdoor_transplant) : (entries.length ? new Date(entries[entries.length - 1].occurred_at) : null);
  const keyTags = ['Pest found', 'Damage', 'Flowering observed', 'Harvest activity'];
  const keyEvents = entries.filter((e) => e.tags.some((t) => keyTags.includes(t)))
    .slice().sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));

  return `
    <h1>Season Report — ${escapeHtml(grow.name)}</h1>
    <div class="sub">${start ? d.fmtShort(start) : 'start unknown'} – ${d.fmtShort(new Date())} · generated ${d.fmtDateTime(new Date())}</div>

    <h2>Overview</h2>
    <table><tbody>
      <tr><th>Current stage</th><td>${escapeHtml(st.stage)}</td></tr>
      <tr><th>Location</th><td>${escapeHtml(grow.location || '—')}</td></tr>
      <tr><th>Cultivars</th><td>${escapeHtml(grow.cultivars.join(', ') || '—')}</td></tr>
      <tr><th>Total journal entries</th><td>${entries.length}</td></tr>
      <tr><th>Plants tracked</th><td>${plants.length}</td></tr>
    </tbody></table>

    <h2>Plants</h2>
    <table><thead><tr><th>Name</th><th>Cultivar</th><th>Stage</th><th>Latest height</th><th>Entries</th></tr></thead><tbody>
      ${plants.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.cultivar || '—')}</td><td>${escapeHtml(p.stage || '—')}</td><td>${escapeHtml(d.fmtHeight(d.latestHeightCm(entries, p.id), units))}</td><td>${d.plantEntries(entries, p.id).length}</td></tr>`).join('')}
    </tbody></table>

    <h2>Key observations this season</h2>
    ${keyEvents.length === 0 ? '<p class="muted small">No pest, damage, flowering, or harvest events logged yet.</p>' : keyEvents.map((e) => entryRow(e, plants, units)).join('')}

    <h2>Weather</h2>
    <p class="small muted">Weather is never stored in this app — it's fetched live. This report can't show a season-long weather history; check Weather Risks for current conditions.</p>

    ${DISCLAIMER_HTML}
  `;
}
