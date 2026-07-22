// lib/trellis.ts
// PURE trellis/structural planner. No I/O, no randomness — a deterministic
// function of its numeric inputs, so it is fully unit-testable.
//
// HARD RULE: this is PLANNING GUIDANCE, not an engineering certification. It
// never states load ratings, wind-load capacity, or safety guarantees. Every
// result lists the assumptions it made and tells the user to verify against
// their own site and local conditions. Canopy expansion is always accounted
// for — a plant grows INTO the trellis, so we size for the future canopy.

export interface TrellisInput {
  plantCount: number;
  plantHeightCm: number;
  plantWidthCm: number;
  expectedExpansionPct: number;   // how much bigger the canopy will get, %
  postSpacingCm: number;          // target horizontal spacing between posts
  availablePostHeightCm: number;  // usable post height above ground
  netWidthCm: number;             // one net panel's width
  netHeightCm: number;            // one net panel's height
  rowLengthCm: number;            // available/planned row length
}

export interface MaterialItem {
  item: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface TrellisLayout {
  postCount: number;
  postPositionsCm: number[];
  postSpacingCm: number;                 // actual (evened) spacing used
  netPanelCount: number;
  recommendedNetHeightOffGroundCm: number;
  totalRowLengthCm: number;              // length the structure must span
  futureCanopyWidthCm: number;
  futureCanopyHeightCm: number;
}

export interface TrellisPlan {
  layout: TrellisLayout;
  materials: MaterialItem[];
  assumptions: string[];
  caveats: string[];
}

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const pos = (n: number, fallback: number) => (Number.isFinite(n) && n > 0 ? n : fallback);

export function planTrellis(raw: TrellisInput): TrellisPlan {
  const assumptions: string[] = [];
  const caveats: string[] = [];

  // Defensive input handling — invalid values fall back and are called out.
  const plantCount = Math.max(1, Math.floor(pos(raw.plantCount, 1)));
  const plantWidthCm = pos(raw.plantWidthCm, 60);
  const plantHeightCm = pos(raw.plantHeightCm, 120);
  const expansionPct = Number.isFinite(raw.expectedExpansionPct) && raw.expectedExpansionPct >= 0 ? raw.expectedExpansionPct : 0;
  const postSpacingCm = pos(raw.postSpacingCm, 120);
  const availablePostHeightCm = pos(raw.availablePostHeightCm, 180);
  const netWidthCm = pos(raw.netWidthCm, 120);
  const netHeightCm = pos(raw.netHeightCm, 150);
  const rowLengthCm = pos(raw.rowLengthCm, plantCount * plantWidthCm);

  if (raw.plantCount <= 0 || raw.plantWidthCm <= 0 || raw.plantHeightCm <= 0) {
    caveats.push('Some inputs were missing or non-positive; sensible defaults were substituted — re-enter real measurements for a usable plan.');
  }

  // Size for the FUTURE canopy, not today's.
  const futureCanopyWidthCm = round(plantWidthCm * (1 + expansionPct / 100));
  const futureCanopyHeightCm = round(plantHeightCm * (1 + expansionPct / 100));
  assumptions.push(`Sized for the future canopy: width ${plantWidthCm}→${futureCanopyWidthCm} cm and height ${plantHeightCm}→${futureCanopyHeightCm} cm at +${expansionPct}% expansion.`);

  // Structure must span the longer of "plants at future width" and the row you have.
  const canopyRunCm = plantCount * futureCanopyWidthCm;
  const totalRowLengthCm = Math.max(canopyRunCm, rowLengthCm);
  assumptions.push('Plants are spaced along the row at their future width; the structure spans the longer of that run and your row length.');

  // Posts, evenly spread across the run.
  const gaps = Math.max(1, Math.ceil(totalRowLengthCm / postSpacingCm));
  const postCount = gaps + 1;
  const actualSpacing = round(totalRowLengthCm / gaps);
  const postPositionsCm = Array.from({ length: postCount }, (_, i) => round(i * actualSpacing));
  assumptions.push(`Target post spacing ${postSpacingCm} cm, evened to ${actualSpacing} cm across the ${totalRowLengthCm} cm run.`);

  // One horizontal support layer (SCROG-style) assumed.
  const netPanelCount = Math.max(1, Math.ceil(totalRowLengthCm / netWidthCm));
  assumptions.push('One horizontal support layer assumed (SCROG-style). Add layers/panels for a vertical netting wall.');

  const maxOffGround = Math.max(20, availablePostHeightCm - netHeightCm);
  const recommendedNetHeightOffGroundCm = clamp(round(futureCanopyHeightCm * 0.4), 20, maxOffGround);

  // Caveats specific to the numbers.
  caveats.push('Planning guidance only — not an engineering sign-off. It does not certify structural strength, wind resistance, or safety. Verify every post, anchor, depth, and spacing against your own site, soil, and local weather before relying on it.');
  if (availablePostHeightCm < futureCanopyHeightCm) {
    caveats.push(`Posts (${availablePostHeightCm} cm above ground) are shorter than the expected canopy (${futureCanopyHeightCm} cm) — the plant may outgrow the top support. Consider taller posts.`);
  }
  if (rowLengthCm < canopyRunCm) {
    caveats.push(`Your row length (${rowLengthCm} cm) is shorter than ${plantCount} plants need at future width (${canopyRunCm} cm) — expect crowding. Lengthen the row or reduce plant count.`);
  }

  const nettingMeters = Math.round((totalRowLengthCm / 100) * 10) / 10;
  const materials: MaterialItem[] = [
    { item: 'Line posts (T-posts or 2×2 stakes)', quantity: postCount, unit: 'posts', note: `At least ${availablePostHeightCm} cm above ground; set the ends most securely.` },
    { item: 'Trellis net panels', quantity: netPanelCount, unit: 'panels', note: `${netWidthCm}×${netHeightCm} cm each, one horizontal layer` },
    { item: 'Trellis netting (total run)', quantity: nettingMeters, unit: 'm' },
    { item: 'Plant ties / soft clips', quantity: plantCount * 8, unit: 'ties' },
    { item: 'Branch-support stakes', quantity: plantCount * 2, unit: 'stakes' },
    { item: 'End anchors / guy-line kits', quantity: 2, unit: 'kits', note: 'One per row end; add more on long or exposed runs.' },
  ];

  return {
    layout: {
      postCount,
      postPositionsCm,
      postSpacingCm: actualSpacing,
      netPanelCount,
      recommendedNetHeightOffGroundCm,
      totalRowLengthCm,
      futureCanopyWidthCm,
      futureCanopyHeightCm,
    },
    materials,
    assumptions,
    caveats,
  };
}
