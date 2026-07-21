// lib/printDoc.ts
// Opens a new window with clean, print-friendly HTML and triggers the
// browser's native print/save-as-PDF. No file is generated — the browser
// dialog is the export mechanism.
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export const DISCLAIMER_HTML = `
  <p class="disclaimer">Cultivation estimates and derived guidance in this report are heuristics for a
  home-growing hobbyist, not professional agronomic, legal, or safety advice. Colorado law on possession
  and cultivation limits is your own responsibility to know and follow.</p>
`;

export function printDoc(title: string, bodyHtml: string) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Your browser blocked the print window. Allow pop-ups for this site and try again.');
    return;
  }
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #182016; margin: 32px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #dfe3d8; padding-bottom: 4px; }
  .sub { color: #5d6455; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e3d7; font-size: 12.5px; vertical-align: top; }
  th { color: #5d6455; text-transform: uppercase; font-size: 10.5px; letter-spacing: .04em; }
  .muted { color: #5d6455; }
  .small { font-size: 12px; }
  .pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: #eef0ea; color: #5d6455; margin-right: 4px; }
  .entry { padding: 8px 0; border-bottom: 1px solid #eee; }
  .disclaimer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #dfe3d8; font-size: 11px; color: #5d6455; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
${bodyHtml}
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body>
</html>`);
  win.document.close();
  win.focus();
}
