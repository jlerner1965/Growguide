// screens/Encyclopedia.tsx
// hooks -> static data (lib/encyclopedia, lib/glossary) -> render. A searchable
// reference with a reader, glossary tooltips, related links, tool cross-links,
// and device-local bookmarks / read progress. "Add to my plan" drops guidance
// into the user's real journal via createEntry.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrows, useCreateEntry } from '../db/hooks';
import {
  ARTICLES, SECTIONS, searchArticles, TIER_LABEL,
  type Article, type BodyBlock, type ConfidenceTier,
} from '../lib/encyclopedia';
import { GLOSSARY } from '../lib/glossary';

const TIER_PILL: Record<ConfidenceTier, string> = { established: 'green', 'common-practice': 'gray', uncertain: 'amber' };
const ROUTE_LABEL: Record<string, string> = {
  '/diagnose': 'Diagnostics', '/pests': 'Pest & Disease', '/irrigation': 'Irrigation',
  '/nutrition': 'Nutrition', '/training': 'Training', '/harvest': 'Harvest Planner', '/weather': 'Weather Risks',
};

function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { const raw = localStorage.getItem(key); setSet(new Set(raw ? JSON.parse(raw) : [])); } catch { setSet(new Set()); }
  }, [key]);
  const persist = (next: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ } };
  const toggle = (id: string) => setSet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); persist(n); return n; });
  const ensure = (id: string) => setSet((prev) => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); persist(n); return n; });
  return { set, toggle, ensure };
}

function Body({ blocks }: { blocks: BodyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {b.tier && <span className={`pill ${TIER_PILL[b.tier]}`} style={{ marginBottom: 6, display: 'inline-block' }}>{TIER_LABEL[b.tier]}</span>}
          {b.kind === 'para' && <p style={{ margin: 0 }}>{b.text}</p>}
          {b.kind === 'list' && (
            <ul className="list">{(b.items ?? []).map((it, j) => <li key={j} style={{ padding: '2px 0' }}>• {it}</li>)}</ul>
          )}
        </div>
      ))}
    </>
  );
}

export function Encyclopedia() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const createEntry = useCreateEntry();

  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const bookmarks = useLocalSet('encyclopedia-bookmarks');
  const read = useLocalSet('encyclopedia-read');

  const results = useMemo(() => {
    let list = searchArticles(query, section || undefined);
    if (onlyBookmarked) list = list.filter((a) => bookmarks.set.has(a.id));
    return list;
  }, [query, section, onlyBookmarked, bookmarks.set]);

  const open = openId ? ARTICLES.find((a) => a.id === openId) ?? null : null;

  useEffect(() => { if (openId) read.ensure(openId); /* mark read on open */ }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addToPlan(article: Article) {
    if (!grow) { alert('Set up a grow first — notes attach to your grow.'); return; }
    try {
      await createEntry.mutateAsync({ grow_id: grow.id, plant_id: null, tags: ['Note'], notes: `From the encyclopedia — ${article.title}: ${article.summary}` });
      alert('Added to your journal as a note.');
    } catch {
      alert('Could not add this to your plan. Try again.');
    }
  }

  // ---- reader ----
  if (open) {
    const related = open.relatedIds.map((id) => ARTICLES.find((a) => a.id === id)).filter(Boolean) as Article[];
    return (
      <div className="content" style={{ maxWidth: 760 }}>
        <button className="btn ghost sm" onClick={() => setOpenId(null)}>← Back to library</button>
        <div className="page-head" style={{ marginTop: 10 }}>
          <h2>{open.title}</h2>
          <span className="pill blue">{open.section}</span>
        </div>
        <div className="page-sub">{open.summary}</div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="btn sm" onClick={() => bookmarks.toggle(open.id)}>{bookmarks.set.has(open.id) ? '★ Bookmarked' : '☆ Bookmark'}</button>
          <button className="btn sm" onClick={() => read.toggle(open.id)}>{read.set.has(open.id) ? '✓ Read' : 'Mark read'}</button>
          {open.tool && <Link className="btn sm primary" to={open.tool}>Open {ROUTE_LABEL[open.tool] ?? 'tool'} →</Link>}
          {open.actionable && <button className="btn sm" onClick={() => addToPlan(open)} disabled={createEntry.isPending || !grow}>{createEntry.isPending ? 'Adding…' : '+ Add to my plan'}</button>}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <Body blocks={open.body} />
        </div>

        {open.glossaryTerms.length > 0 && (
          <>
            <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Terms in this article (hover for a definition)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {open.glossaryTerms.map((t) => (
                <span key={t} className="pill gray" title={GLOSSARY[t] ?? t} style={{ cursor: 'help' }}>{t}</span>
              ))}
            </div>
          </>
        )}

        {related.length > 0 && (
          <>
            <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Related</div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
              {related.map((r) => (
                <button key={r.id} className="card" style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setOpenId(r.id)}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</div>
                  <div className="small muted">{r.section}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="small muted" style={{ marginTop: 18 }}>Bookmarks and read progress are saved on this device only.</div>
      </div>
    );
  }

  // ---- library ----
  return (
    <div className="content" style={{ maxWidth: 980 }}>
      <div className="page-head"><h2>Cultivation Encyclopedia</h2><span className="count num">{ARTICLES.length}</span></div>
      <div className="page-sub">General horticultural reference in the honest voice of this app: claims are tagged as established, common practice, or uncertain — and cultivar-specific timing, yield, and potency are never stated as fact.</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the encyclopedia…" style={{ flex: 1, minWidth: 160, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)' }} />
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All sections</option>
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} /> Bookmarked only
          </label>
        </div>

        {results.length === 0 ? (
          <div className="empty"><h4>Nothing matches</h4><p>{onlyBookmarked ? 'No bookmarks match — try clearing a filter.' : 'Try a different search or section.'}</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', padding: 16 }}>
            {results.map((a) => (
              <div key={a.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => setOpenId(a.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {bookmarks.set.has(a.id) && <span title="Bookmarked">★</span>}
                    {read.set.has(a.id) && <span className="pill green" style={{ fontSize: 10 }}>read</span>}
                  </span>
                </div>
                <div className="small muted" style={{ margin: '3px 0 6px' }}>{a.section}</div>
                <div className="small">{a.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="small muted">Bookmarks and read progress are saved on this device only. “Add to my plan” (on actionable articles) drops a note into your grow’s journal.</div>
    </div>
  );
}
