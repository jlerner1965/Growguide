// lib/encyclopedia.ts
// Static, typed article library. Content lives in a plain exported array with a
// stable shape so it can later be sourced externally — but nothing here fetches.
//
// HARD RULE (the honest voice of this app): claims are tiered — 'established'
// horticultural principle, 'common-practice' (reasonable but not proven), or
// 'uncertain' (contested or cultivar-specific). Breeder timing, yields, and
// potency are never stated as fact. No product brands, no doses, no legal or
// regulatory claims. Where growers genuinely disagree, the text says so.

export type ConfidenceTier = 'established' | 'common-practice' | 'uncertain';

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  established: 'Established principle',
  'common-practice': 'Common practice',
  uncertain: 'Uncertain / contested',
};

export interface BodyBlock {
  kind: 'para' | 'list';
  text?: string;      // para
  items?: string[];   // list
  tier?: ConfidenceTier;
}

export interface Article {
  id: string;
  title: string;
  section: string;
  summary: string;
  body: BodyBlock[];
  relatedIds: string[];
  glossaryTerms: string[];
  /** Route of the tool this maps to, if any. */
  tool?: string;
  /** Whether an "Add to my plan" journal note makes sense. */
  actionable?: boolean;
}

// Canonical section list — every one must have at least one article.
export const SECTIONS: string[] = [
  'Outdoor cultivation fundamentals',
  'Colorado Front Range conditions',
  'Plant physiology basics',
  'Root-zone management',
  'Soil and growing media',
  'Water quality',
  'Irrigation principles',
  'Mineral nutrition',
  'Organic vs synthetic approaches',
  'Training and structural support',
  'Integrated pest management',
  'Diseases',
  'Environmental stress',
  'Flowering',
  'Harvest readiness',
  'Drying',
  'Curing',
  'Storage',
  'Troubleshooting method',
];

export const ARTICLES: Article[] = [
  {
    id: 'outdoor-fundamentals',
    title: 'Outdoor cultivation fundamentals',
    section: 'Outdoor cultivation fundamentals',
    summary: 'What an outdoor photoperiod grow actually depends on — sun, season length, and a healthy root zone — and why the calendar is a guide, not a rule.',
    body: [
      { kind: 'para', tier: 'established', text: 'Outdoor photoperiod plants flower in response to lengthening nights as the season turns, not on a fixed date. Your job is to keep the plant healthy through a long vegetative summer and then support it through flower.' },
      { kind: 'para', tier: 'established', text: 'Light, water, air, and a living root zone are the non-negotiables. Most problems trace back to one of them — usually water and the root zone — long before they are a nutrient or pest issue.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Pick the sunniest spot you have; more direct sun generally means a bigger, denser plant.',
        'Give roots room and drainage; a cramped or waterlogged root zone caps everything above it.',
        'Observe more than you intervene — a daily look beats a weekly overhaul.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Exactly how big a plant gets, and how fast, is highly cultivar- and site-specific. Treat any size or timing figure you read elsewhere as a rough expectation, not a promise.' },
    ],
    relatedIds: ['front-range-conditions', 'plant-physiology', 'troubleshooting-method'],
    glossaryTerms: ['photoperiod', 'root zone', 'vegetative'],
  },
  {
    id: 'front-range-conditions',
    title: 'Colorado Front Range conditions',
    section: 'Colorado Front Range conditions',
    summary: 'Elevation, intense UV, wind, hail, the summer monsoon, low humidity, and short shoulder seasons all shape a Front Range grow in specific ways.',
    body: [
      { kind: 'para', tier: 'established', text: 'At Front Range elevations the air is thinner and UV is stronger than at sea level. Days can be hot while nights drop sharply, and the growing window between hard frosts is shorter than in milder climates.' },
      { kind: 'list', tier: 'established', items: [
        'Low humidity and dry heat push water demand up and favor spider mites.',
        'Afternoon convective storms bring wind and hail risk, especially mid-to-late summer.',
        'The summer monsoon can deliver sudden downpours; dense buds that stay wet raise bud-rot pressure later.',
        'Short shoulder seasons mean an early fall frost can end a late-finishing plant abruptly.',
      ] },
      { kind: 'para', tier: 'common-practice', text: 'Many local growers plan for wind and hail protection early, and watch the fall forecast closely so they can harvest ahead of a hard frost or a long wet spell rather than chasing peak ripeness at any cost.' },
      { kind: 'para', tier: 'uncertain', text: 'Microclimates vary enormously across the Front Range — elevation, canyon wind, and urban heat all shift the picture. Your own site observations beat any regional generalization.' },
    ],
    relatedIds: ['environmental-stress', 'harvest-readiness', 'diseases'],
    glossaryTerms: ['UV', 'monsoon', 'hardening off', 'RH'],
    tool: '/weather',
  },
  {
    id: 'plant-physiology',
    title: 'Plant physiology basics',
    section: 'Plant physiology basics',
    summary: 'How the plant moves water and builds tissue — transpiration, photosynthesis, and mobile vs immobile nutrients — so symptoms make sense.',
    body: [
      { kind: 'para', tier: 'established', text: 'Water moves up from the roots and evaporates from the leaves (transpiration), pulling nutrients along with it. Photosynthesis in the leaves builds the sugars that drive growth. Anything that limits roots, light, or airflow limits the whole plant.' },
      { kind: 'para', tier: 'established', text: 'Some nutrients are mobile: the plant can move them from old leaves to new growth, so a shortage shows on lower/older leaves first (for example nitrogen and magnesium). Immobile nutrients cannot be relocated, so a shortage shows on new growth first (for example calcium).' },
      { kind: 'list', tier: 'common-practice', items: [
        'Where a symptom appears — new vs old growth — is often the biggest clue to its cause.',
        'A symptom is the end of a chain: light, water, root health, and pH usually come before "deficiency".',
      ] },
    ],
    relatedIds: ['mineral-nutrition', 'troubleshooting-method', 'root-zone'],
    glossaryTerms: ['transpiration', 'chlorosis', 'macronutrient', 'micronutrient'],
  },
  {
    id: 'root-zone',
    title: 'Root-zone management',
    section: 'Root-zone management',
    summary: 'Roots need both water and air. Managing the wet/dry cycle and drainage is the highest-leverage thing most growers can do.',
    body: [
      { kind: 'para', tier: 'established', text: 'Roots respire — they need oxygen as well as water. A root zone that stays saturated starves roots of air and invites rot; one that never dries can be just as harmful as one that dries too hard.' },
      { kind: 'para', tier: 'common-practice', text: 'A wet-then-partly-dry cycle, rather than constant moisture, is a widely used target: water thoroughly, then let the medium dry back somewhat before the next watering. How far to let it dry depends on the medium, container, and weather.' },
      { kind: 'list', tier: 'established', items: [
        'Drainage matters as much as watering volume.',
        'Wilting in wet soil points to a root/oxygen problem, not thirst.',
        'A hand check of the root zone beats any schedule.',
      ] },
    ],
    relatedIds: ['irrigation-principles', 'soil-media', 'diseases'],
    glossaryTerms: ['root zone', 'field capacity', 'damping off'],
    tool: '/irrigation',
    actionable: true,
  },
  {
    id: 'soil-media',
    title: 'Soil and growing media',
    section: 'Soil and growing media',
    summary: 'Native soil, amended soil, soilless mixes, and coco each behave differently in how they hold water and nutrients.',
    body: [
      { kind: 'para', tier: 'established', text: 'A medium does two jobs: hold water and air in a workable balance, and hold nutrients where roots can reach them. Heavier soils hold more water and buffer nutrients; lighter soilless mixes and coco drain fast and hold less, so they dry and swing quicker.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Amended native soil and quality potting mixes are forgiving and buffer pH swings.',
        'Coco and soilless mixes give control but demand more attention to watering and feeding rhythm.',
        'Compaction and poor structure quietly limit roots — texture matters.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Which medium is "best" is genuinely contested and depends on your climate, watering habits, and how hands-on you want to be. There is no single right answer.' },
    ],
    relatedIds: ['root-zone', 'water-quality', 'mineral-nutrition'],
    glossaryTerms: ['amendment', 'field capacity', 'cation exchange capacity'],
  },
  {
    id: 'water-quality',
    title: 'Water quality',
    section: 'Water quality',
    summary: 'Source water carries its own pH, mineral load, and sometimes chlorine — all of which interact with feeding.',
    body: [
      { kind: 'para', tier: 'established', text: 'Water is never truly neutral: it has a pH and a background mineral content (measured as EC). Both interact with whatever you add, so knowing your starting water helps you interpret pH and EC readings downstream.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Hard tap water already carries calcium and magnesium; very pure water carries almost none.',
        'Letting chlorinated water stand, or otherwise managing chlorine, is common when soil life matters to you.',
        'Testing runoff pH and EC tells you more than testing input water alone.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'How much water chemistry matters varies a lot with your medium and program. In buffered soil it is often minor; in coco or soilless systems it can be central.' },
    ],
    relatedIds: ['mineral-nutrition', 'irrigation-principles', 'soil-media'],
    glossaryTerms: ['EC', 'pH', 'runoff'],
  },
  {
    id: 'irrigation-principles',
    title: 'Irrigation principles',
    section: 'Irrigation principles',
    summary: 'Water to the plant\'s need and the medium\'s behavior — not to a fixed calendar — and confirm with a physical check.',
    body: [
      { kind: 'para', tier: 'established', text: 'The right amount of water depends on plant size, medium, container, and weather — all of which change through the season. No fixed schedule can track that; only the root zone can tell you where things actually stand.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Water thoroughly, then let the medium dry back appropriately before the next watering.',
        'Heat, wind, and low humidity raise demand; cool, wet spells lower it.',
        'Check the root zone by hand and by container weight before adding time or volume.',
      ] },
      { kind: 'para', tier: 'established', text: 'Rain reduces watering need but does not replace inspection — a downpour can wet the surface while leaving the root zone patchy, or oversaturate a container that then cannot dry.' },
    ],
    relatedIds: ['root-zone', 'water-quality', 'environmental-stress'],
    glossaryTerms: ['field capacity', 'transpiration', 'runoff'],
    tool: '/irrigation',
    actionable: true,
  },
  {
    id: 'mineral-nutrition',
    title: 'Mineral nutrition',
    section: 'Mineral nutrition',
    summary: 'The roles of the major and minor nutrients, and why availability (pH, root health) matters as much as quantity.',
    body: [
      { kind: 'para', tier: 'established', text: 'Plants need nitrogen, phosphorus, and potassium in larger amounts, plus calcium, magnesium, sulfur, and a set of micronutrients in smaller amounts. Having a nutrient present is not the same as the plant being able to take it up.' },
      { kind: 'para', tier: 'established', text: 'Uptake depends on root-zone pH: outside a workable range, nutrients that are present get "locked out" and the plant shows deficiency symptoms even when fed. This is why chasing symptoms with more fertilizer often backfires.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Verify pH and root health before concluding "deficiency".',
        'Mobile-nutrient shortages show on old growth first; immobile ones on new growth.',
        'Less is often safer than more — excess causes its own burn and lockout.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Precise "ideal" feeding levels are cultivar- and system-specific and widely debated. This app never tells you an amount to feed — only how to reason about it.' },
    ],
    relatedIds: ['organic-vs-synthetic', 'plant-physiology', 'troubleshooting-method'],
    glossaryTerms: ['macronutrient', 'micronutrient', 'lockout', 'EC', 'pH'],
    tool: '/nutrition',
    actionable: true,
  },
  {
    id: 'organic-vs-synthetic',
    title: 'Organic vs synthetic approaches',
    section: 'Organic vs synthetic approaches',
    summary: 'Two broad philosophies — feed the soil life, or feed the plant directly — each with real trade-offs and passionate advocates.',
    body: [
      { kind: 'para', tier: 'established', text: 'Broadly, organic approaches build a living soil and let microbes convert amendments into plant-available nutrients over time; mineral/synthetic approaches supply already-available nutrients directly, giving faster control and faster mistakes.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Organic/living-soil tends to be forgiving and buffered, but slower to correct.',
        'Bottled/mineral programs are precise and responsive, but less forgiving of overfeeding.',
        'Hybrid approaches borrow from both.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Which is "better" is one of the most genuinely contested topics among growers, often as much about values and workflow as results. Both can grow excellent plants; neither is a shortcut.' },
    ],
    relatedIds: ['mineral-nutrition', 'soil-media', 'water-quality'],
    glossaryTerms: ['amendment', 'macronutrient'],
    tool: '/nutrition',
  },
  {
    id: 'training-support',
    title: 'Training and structural support',
    section: 'Training and structural support',
    summary: 'Shaping the canopy for light and airflow, and physically supporting heavy branches — and when NOT to.',
    body: [
      { kind: 'para', tier: 'established', text: 'Training redistributes growth so more bud sites get good light and airflow; structural support keeps heavy branches from snapping as they fill. Low-stress bending is reversible; cutting and high-stress methods are not.' },
      { kind: 'list', tier: 'common-practice', items: [
        'High-stress techniques (topping, supercropping) suit healthy plants in veg, not stressed plants or plants near/in flower.',
        'Support (ties, stakes, trellis) becomes the priority as buds gain weight.',
        'A more open canopy dries faster after rain, which lowers disease pressure.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'How much training helps, and which method is best, is cultivar- and grower-dependent — plenty of excellent plants get very little training at all.' },
    ],
    relatedIds: ['flowering', 'diseases', 'front-range-conditions'],
    glossaryTerms: ['topping', 'supercropping', 'LST', 'SCROG', 'node'],
    tool: '/training',
    actionable: true,
  },
  {
    id: 'ipm',
    title: 'Integrated pest management',
    section: 'Integrated pest management',
    summary: 'A least-aggressive-first, identify-before-you-act framework: prevent, monitor, then escalate only as needed.',
    body: [
      { kind: 'para', tier: 'established', text: 'Integrated pest management (IPM) is a sequence, not a spray: prevent problems, scout regularly to catch them early, identify what you actually have, and escalate from cultural and physical controls to stronger measures only when justified.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Prevention (sanitation, airflow, healthy plants) is cheaper than any cure.',
        'Scout on a schedule and confirm identification — ideally with magnification — before acting.',
        'Start with the least-aggressive effective control; preserve beneficial insects.',
      ] },
      { kind: 'para', tier: 'established', text: 'Acting on a wrong identification wastes effort and can make things worse. Confidence in what you are looking at comes first.' },
    ],
    relatedIds: ['diseases', 'troubleshooting-method', 'front-range-conditions'],
    glossaryTerms: ['IPM', 'foliar'],
    tool: '/pests',
    actionable: true,
  },
  {
    id: 'diseases',
    title: 'Diseases',
    section: 'Diseases',
    summary: 'Most outdoor disease pressure is fungal and moisture-driven — powdery mildew, botrytis, leaf spot, and root rot — and airflow is the throughline.',
    body: [
      { kind: 'para', tier: 'established', text: 'The common outdoor diseases are largely about moisture and airflow: powdery mildew in humid, still, low-light canopies; botrytis (bud rot) in dense buds that stay wet; leaf spot with rain splash; and root rot in waterlogged media.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Airflow, spacing, and canopy management reduce pressure across all of them.',
        'Remove affected tissue with a clean tool and keep it away from healthy plants.',
        'Dry canopies after rain matter most during flower, when a wet Front Range fall can drive bud rot.',
      ] },
      { kind: 'para', tier: 'established', text: 'Cultural control (dryness, airflow, sanitation) is the most reliable lever. Confirm what you are seeing before treating — several diseases and disorders look alike.' },
    ],
    relatedIds: ['ipm', 'environmental-stress', 'harvest-readiness'],
    glossaryTerms: ['powdery mildew', 'botrytis', 'necrosis', 'foliar'],
    tool: '/pests',
  },
  {
    id: 'environmental-stress',
    title: 'Environmental stress',
    section: 'Environmental stress',
    summary: 'Heat, cold, wind, hail, and intense sun each leave characteristic marks — often mistaken for pests or deficiencies.',
    body: [
      { kind: 'para', tier: 'established', text: 'Abiotic stress — from weather rather than a pest or pathogen — is common on the Front Range and frequently misread. Heat cupping, wind tatter, cold purpling, and sun bleaching all mimic other problems.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Heat: leaves cup/taco upward, midday wilt; shade and water timing help.',
        'Wind: torn or one-sided damage; windbreaks and support help.',
        'Cold: purpling and stalled growth after cold nights.',
        'Intense sun: bleaching on the most-exposed top canopy.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Because stress signs overlap with deficiencies and pests, a single symptom rarely proves a cause. Look at the pattern, the weather, and what changed.' },
    ],
    relatedIds: ['front-range-conditions', 'troubleshooting-method', 'diseases'],
    glossaryTerms: ['necrosis', 'chlorosis', 'transpiration'],
    tool: '/weather',
  },
  {
    id: 'flowering',
    title: 'Flowering',
    section: 'Flowering',
    summary: 'What the transition to flower looks like, and how support, airflow, and disease-watching become the priorities.',
    body: [
      { kind: 'para', tier: 'established', text: 'Photoperiod plants begin flowering as nights lengthen. Stretch slows, pistils appear, and buds form and gain weight over the following weeks. Priorities shift from shaping the plant to supporting and protecting it.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Support heavy colas before they bend or break.',
        'Keep airflow up and the canopy able to dry — bud rot risk climbs as buds densify.',
        'Avoid high-stress training now; the plant is committing to flower.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'How long flowering takes and how big buds get are strongly cultivar-specific. Any week-count you see is a rough expectation, not a schedule — the plant, not the calendar, tells you where it is.' },
    ],
    relatedIds: ['harvest-readiness', 'training-support', 'diseases'],
    glossaryTerms: ['photoperiod', 'pistil', 'calyx', 'trichome'],
  },
  {
    id: 'harvest-readiness',
    title: 'Harvest readiness',
    section: 'Harvest readiness',
    summary: 'Readiness is a window you read from the plant — pistils and trichomes — not a date, and weather can force the call.',
    body: [
      { kind: 'para', tier: 'established', text: 'Ripeness is judged from the plant itself: darkening, curling pistils and — more reliably — the color of the trichome heads under magnification. It is a window, not a single day, and it is never a breeder countdown.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Clear trichomes read as immature; cloudy as near-peak; amber as later and more sedative.',
        'Check several colas, top and bottom — they ripen unevenly.',
        'Frost or a long wet stretch can make harvesting earlier the wiser call than waiting for "peak".',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'The "right" trichome mix is a matter of preference and is debated among growers; there is no single correct point, and potency/effect claims tied to it are not something this app asserts as fact.' },
    ],
    relatedIds: ['flowering', 'drying', 'front-range-conditions'],
    glossaryTerms: ['trichome', 'pistil'],
    tool: '/harvest',
    actionable: true,
  },
  {
    id: 'drying',
    title: 'Drying',
    section: 'Drying',
    summary: 'A slow, controlled dry in a dark, moderate space protects quality; too fast or too wet both cause problems.',
    body: [
      { kind: 'para', tier: 'established', text: 'Drying removes most of the water from harvested flower over a period of days. A dark space with moderate temperature, moderate humidity, and gentle airflow supports an even, unhurried dry.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Many growers target a moderate, stable environment — often described around the low 60s°F and roughly 60% relative humidity — with light air movement, not a fan blasting the flower.',
        'Too fast a dry traps a harsh, "green" quality; too slow or too humid invites mold.',
        'Gentle handling preserves the delicate surface resin.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'Exact targets and dry times are debated and depend on your climate and setup. Read the flower (stem snap, feel) rather than trusting a fixed number of days.' },
    ],
    relatedIds: ['curing', 'storage', 'harvest-readiness'],
    glossaryTerms: ['RH', 'cure'],
    tool: '/harvest',
  },
  {
    id: 'curing',
    title: 'Curing',
    section: 'Curing',
    summary: 'A controlled rest in containers after drying that smooths harshness — patience is the main ingredient.',
    body: [
      { kind: 'para', tier: 'established', text: 'Curing is a slower, controlled equilibration after the initial dry, usually in closed containers, during which remaining moisture redistributes and harshness mellows. It rewards patience.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Flower is placed in containers and "burped" (briefly opened) to exchange air and release moisture, more often at first and less over time.',
        'Watching container humidity and smell guides the process better than a fixed schedule.',
        'Rushing the cure is the most common way to undo a good dry.',
      ] },
      { kind: 'para', tier: 'uncertain', text: 'How long to cure, and how much it matters, is debated and preference-driven. There is no single correct duration.' },
    ],
    relatedIds: ['drying', 'storage'],
    glossaryTerms: ['cure', 'RH'],
  },
  {
    id: 'storage',
    title: 'Storage',
    section: 'Storage',
    summary: 'Cool, dark, stable, and not too dry preserves cured flower; light, heat, and air are the enemies.',
    body: [
      { kind: 'para', tier: 'established', text: 'Once cured, flower keeps best cool, dark, and in stable humidity. Light and heat degrade it over time, and both too-dry and too-humid storage cause problems — brittleness at one end, mold risk at the other.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Airtight containers in a cool, dark place are the common approach.',
        'Stable conditions matter more than any single "perfect" number.',
        'Check periodically, especially early, for any sign of excess moisture.',
      ] },
    ],
    relatedIds: ['curing', 'drying'],
    glossaryTerms: ['RH', 'cure'],
  },
  {
    id: 'troubleshooting-method',
    title: 'Troubleshooting method',
    section: 'Troubleshooting method',
    summary: 'How to reason about a problem: observe carefully, form a differential, rule things out, and change one variable at a time.',
    body: [
      { kind: 'para', tier: 'established', text: 'Good troubleshooting is a method, not a lookup. A single symptom rarely has a single certain cause, so the goal is a ranked differential — several possibilities with the evidence for and against each — rather than a confident guess.' },
      { kind: 'list', tier: 'common-practice', items: [
        'Describe precisely what you see, where (new vs old growth), and what changed.',
        'Rule out the basics first: light, water, root zone, and pH before "deficiency" or "pest".',
        'Change one variable at a time so you can tell what actually helped.',
        'Confirm visually — ideally with magnification — before treating.',
      ] },
      { kind: 'para', tier: 'established', text: 'Certainty from symptoms alone is usually false certainty. Holding two or three possibilities in mind, and watching how they resolve, is the honest approach.' },
    ],
    relatedIds: ['ipm', 'plant-physiology', 'mineral-nutrition'],
    glossaryTerms: ['chlorosis', 'necrosis', 'lockout'],
    tool: '/diagnose',
    actionable: true,
  },
];

/** All article ids, for quick existence checks. */
export const ARTICLE_IDS = new Set(ARTICLES.map((a) => a.id));

/** Plain-text search over title, summary, and body. */
export function searchArticles(query: string, section?: string): Article[] {
  const q = query.trim().toLowerCase();
  return ARTICLES.filter((a) => {
    if (section && a.section !== section) return false;
    if (!q) return true;
    const hay = [a.title, a.summary, ...a.body.map((b) => b.text ?? (b.items ?? []).join(' '))].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
