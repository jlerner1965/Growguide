// lib/diagnose.ts
// PURE, rule-based differential diagnostic engine. No I/O, no dates, no
// randomness — a deterministic function of its input, so it is fully
// unit-testable.
//
// The ENTIRE POINT of this module is to resist false certainty. It never
// returns a single confident verdict: it returns a RANKED list of plausible
// explanations, each carrying the evidence FOR it, the conflicting evidence
// AGAINST it, what to inspect next, only LOW-RISK/reversible actions, what
// NOT to do, and when to get help. Symptoms alone never prove a cause, so
// confidence is a coarse 'Low' | 'Moderate' | 'High' — never a fake precise
// percentage — and thin input is capped to low confidence.

export type Confidence = 'Low' | 'Moderate' | 'High';

export interface DiagnoseInput {
  affectedPart?: 'New/upper growth' | 'Old/lower growth' | 'Whole plant' | 'Roots/base';
  growthAge?: 'New growth' | 'Old growth' | 'Both';
  leafColor?: 'Green (normal)' | 'Pale/yellow' | 'Dark green' | 'Purple/red' | 'Bronze/brown' | 'Mottled/speckled';
  interveinalChlorosis?: 'Yes' | 'No';
  marginalTipBurn?: 'Yes' | 'No';
  spotsLesions?: 'None' | 'White powdery' | 'Gray fuzzy' | 'Brown spots' | 'Yellow spots' | 'Black spots';
  wilting?: 'Yes' | 'No';
  leafCurl?: 'None' | 'Curling up' | 'Curling down' | 'Taco/clawing';
  stemSymptoms?: 'None' | 'Weak/leggy' | 'Discolored' | 'Lesions' | 'Soft/mushy base';
  growthRate?: 'Normal' | 'Slow/stalled' | 'Rapid/stretchy';
  pestEvidence?: 'None seen' | 'Tiny moving dots' | 'Webbing' | 'Green/black clusters' | 'Chewed holes' | 'Silvery stippling' | 'Frass/droppings';
  recentWeather?: 'Normal' | 'Hot' | 'Cold/frost' | 'Windy' | 'Heavy rain' | 'Hail';
  recentIrrigation?: 'Normal' | 'More than usual' | 'Less than usual' | 'Erratic';
  recentNutrition?: 'Normal' | 'Fed heavy recently' | 'Not fed in a while' | 'Changed products';
  rootZone?: 'Unknown' | 'Moist/healthy' | 'Waterlogged/soggy' | 'Bone dry' | 'Compacted' | 'Foul smell';
  ph?: 'Unknown' | 'Low (<6)' | 'In range (6-7)' | 'High (>7)';
  ec?: 'Unknown' | 'Low' | 'In range' | 'High';
  progression?: 'Unknown' | 'Sudden (days)' | 'Gradual (weeks)' | 'Not spreading';
  scope?: 'One plant' | 'All/most plants';
}

export interface Explanation {
  label: string;
  /** Coarse, honest certainty. Never a precise percentage. */
  confidence: Confidence;
  /** Opaque ranking score (higher = better supported). Exposed for ordering/tests. */
  score: number;
  evidenceFor: string[];
  /** Conflicting signals — surfaced so the grower sees what argues against this. */
  evidenceAgainst: string[];
  inspectNext: string[];
  /** Low-risk, reversible steps only. Never aggressive treatment of an unconfirmed problem. */
  safeActions: string[];
  doNot: string[];
  whenToGetHelp: string;
}

// A rule contributes evidence for/against one explanation given the input.
interface Rule {
  label: string;
  inspectNext: string[];
  safeActions: string[];
  doNot: string[];
  whenToGetHelp: string;
  evaluate: (i: DiagnoseInput) => { for: string[]; against: string[] };
}

// ---- fields that carry a real signal (used to gauge how much was reported) ----
const NON_SIGNAL = new Set(['', 'Unknown', 'None', 'None seen', 'Green (normal)', 'Normal', 'No']);
export function answeredSignals(i: DiagnoseInput): number {
  return Object.values(i).filter((v) => v != null && !NON_SIGNAL.has(v as string)).length;
}
function providedCount(i: DiagnoseInput): number {
  return Object.values(i).filter((v) => v != null && v !== '' && v !== 'Unknown').length;
}

const RULES: Rule[] = [
  {
    label: 'Underwatering (drought stress)',
    inspectNext: ['Probe 5–8 cm into the root zone — is it dry?', 'Water thoroughly and see if wilting recovers within hours'],
    safeActions: ['Water slowly and deeply until you see runoff', 'Add mulch to slow evaporation', 'Give temporary afternoon shade during heat'],
    doNot: ["Don't fertilize a drought-stressed plant until it rehydrates", "Don't assume every wilt means 'needs water' — soggy roots wilt too"],
    whenToGetHelp: "If it doesn't perk up within a day of a deep watering, re-check the root zone before watering again.",
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.rootZone === 'Bone dry') f.push('Root zone reported bone dry');
      if (i.recentIrrigation === 'Less than usual') f.push('Watered less than usual recently');
      if (i.wilting === 'Yes') f.push('Wilting present');
      if (i.recentWeather === 'Hot') f.push('Recent heat raises water demand');
      if (i.rootZone === 'Waterlogged/soggy') a.push('Root zone is waterlogged, not dry');
      if (i.recentIrrigation === 'More than usual') a.push('Watered more than usual — argues against drought');
      return { for: f, against: a };
    },
  },
  {
    label: 'Overwatering',
    inspectNext: ['Feel the root zone — still soggy hours after watering?', 'Smell the base for a sour/anaerobic odor'],
    safeActions: ['Let the medium dry back before the next watering', 'Improve drainage; empty any saucer', 'Gently aerate compacted topsoil'],
    doNot: ["Don't water on a fixed schedule regardless of soil moisture", "Don't feed a soggy, struggling root zone"],
    whenToGetHelp: 'If the stem base is soft/mushy or smells foul, root rot may be advancing — prioritize drainage and consider expert input.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.rootZone === 'Waterlogged/soggy') f.push('Root zone reported waterlogged');
      if (i.recentIrrigation === 'More than usual') f.push('Watered more than usual recently');
      if (i.wilting === 'Yes') f.push('Wilting despite adequate/excess water');
      if (i.stemSymptoms === 'Soft/mushy base') f.push('Soft/mushy stem base');
      if (i.rootZone === 'Bone dry') a.push('Root zone is bone dry — argues against overwatering');
      if (i.recentIrrigation === 'Less than usual') a.push('Watered less than usual');
      return { for: f, against: a };
    },
  },
  {
    label: 'Root-zone oxygen deprivation',
    inspectNext: ['Check whether water pools or drains slowly', 'Look for compaction and check for a foul smell at the roots'],
    safeActions: ['Stop overwatering and let it dry back', 'Improve drainage and aeration', 'Loosen compacted medium gently'],
    doNot: ["Don't keep the medium saturated", "Don't add nutrients into an anaerobic root zone"],
    whenToGetHelp: 'A foul smell with browning roots suggests rot — address drainage promptly and get advice if it worsens.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.rootZone === 'Waterlogged/soggy') f.push('Waterlogged root zone limits oxygen');
      if (i.rootZone === 'Compacted') f.push('Compacted medium limits oxygen');
      if (i.rootZone === 'Foul smell') f.push('Foul smell suggests anaerobic conditions');
      if (i.wilting === 'Yes') f.push('Wilting can accompany failing roots');
      if (i.rootZone === 'Moist/healthy') a.push('Root zone reported moist/healthy');
      if (i.rootZone === 'Bone dry') a.push('Bone-dry root zone argues against waterlogging');
      return { for: f, against: a };
    },
  },
  {
    label: 'Heat stress',
    inspectNext: ['Check leaf temperature and midday sun exposure', 'See whether leaves relax as the day cools'],
    safeActions: ['Provide midday shade cloth during heat waves', 'Water early in the day', 'Improve airflow around the canopy'],
    doNot: ["Don't foliar spray in peak sun (lens/scorch risk)", "Don't heavily defoliate a heat-stressed plant"],
    whenToGetHelp: 'If cupping and scorch keep worsening despite shade and water, reassess siting and exposure.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.recentWeather === 'Hot') f.push('Recent hot weather');
      if (i.leafCurl === 'Curling up' || i.leafCurl === 'Taco/clawing') f.push('Leaves cupping/tacoing upward (classic heat sign)');
      if (i.marginalTipBurn === 'Yes') f.push('Leaf margins/tips scorched');
      if (i.wilting === 'Yes') f.push('Midday wilting');
      if (i.recentWeather === 'Cold/frost') a.push('Recent cold — argues against heat stress');
      return { for: f, against: a };
    },
  },
  {
    label: 'Wind stress / windburn',
    inspectNext: ['Look for torn, tattered, or one-sided leaf damage', 'Check stakes and ties for movement'],
    safeActions: ['Add a windbreak on the prevailing side', 'Stake and tie loosely for support', 'Remove only clearly shredded leaves'],
    doNot: ["Don't tie so tightly you girdle stems", "Don't strip the plant of wind-tattered but functional leaves"],
    whenToGetHelp: 'If stems are cracked or snapping, provide structural support and reassess exposure.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.recentWeather === 'Windy') f.push('Recent windy weather');
      if (i.marginalTipBurn === 'Yes') f.push('Margin browning consistent with windburn');
      if (i.leafColor === 'Bronze/brown') f.push('Bronzed/abraded foliage');
      if (i.stemSymptoms === 'Lesions') f.push('Stem abrasion/lesions from movement');
      if (i.recentWeather === 'Normal') a.push('No unusual wind reported');
      return { for: f, against: a };
    },
  },
  {
    label: 'Cold stress',
    inspectNext: ['Check overnight lows for the site', 'Look for purpling on undersides and stems'],
    safeActions: ['Have frost cloth ready for cold nights', 'Move containers to a sheltered spot if possible', 'Avoid feeding while cold-stalled'],
    doNot: ["Don't push nutrients into a cold-stalled plant", "Don't assume purpling is always a deficiency"],
    whenToGetHelp: 'After a hard frost, wait a few days before pruning damage — some tissue recovers.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.recentWeather === 'Cold/frost') f.push('Recent cold/frost');
      if (i.leafColor === 'Purple/red') f.push('Purpling can follow cold nights');
      if (i.growthRate === 'Slow/stalled') f.push('Growth stalled (cool temps slow uptake)');
      if (i.recentWeather === 'Hot') a.push('Recent heat — argues against cold stress');
      return { for: f, against: a };
    },
  },
  {
    label: 'Nitrogen deficiency',
    inspectNext: ['Confirm the yellowing starts on older/lower leaves', 'Check pH so nitrogen is actually available'],
    safeActions: ['Apply a light, balanced feed if underfed', 'Verify root-zone pH is in range first'],
    doNot: ["Don't dump high-nitrogen fertilizer all at once", "Don't feed heavily if pH is out of range (fix pH first)"],
    whenToGetHelp: 'If a light, correctly-pH’d feed brings no greening in 1–2 weeks, reconsider pH lockout or another cause.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.leafColor === 'Pale/yellow') f.push('Pale/yellow foliage');
      if (i.affectedPart === 'Old/lower growth' || i.growthAge === 'Old growth') f.push('Starts on older/lower leaves (nitrogen is mobile)');
      if (i.recentNutrition === 'Not fed in a while') f.push('Not fed in a while');
      if (i.affectedPart === 'New/upper growth' || i.growthAge === 'New growth') a.push('Yellowing on new growth argues against a mobile-nutrient (N) deficiency');
      if (i.recentNutrition === 'Fed heavy recently') a.push('Recently fed heavy — argues against underfeeding');
      if (i.leafColor === 'Dark green') a.push('Dark green foliage argues against N deficiency');
      return { for: f, against: a };
    },
  },
  {
    label: 'Nitrogen toxicity (overfeeding)',
    inspectNext: ['Look for dark, glossy leaves with clawed tips', 'Check EC/runoff if you can'],
    safeActions: ['Flush with plain, pH-corrected water', 'Reduce feed strength and frequency'],
    doNot: ["Don't add more nutrients", "Don't defoliate heavily to 'fix' the look"],
    whenToGetHelp: 'If clawing spreads after flushing and cutting feed, reassess EC and product mix.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.leafColor === 'Dark green') f.push('Dark, over-green foliage');
      if (i.leafCurl === 'Curling down' || i.leafCurl === 'Taco/clawing') f.push('Clawing/downward-curled tips');
      if (i.recentNutrition === 'Fed heavy recently') f.push('Fed heavy recently');
      if (i.ec === 'High') f.push('High EC reported');
      if (i.leafColor === 'Pale/yellow') a.push('Pale foliage argues against nitrogen excess');
      if (i.recentNutrition === 'Not fed in a while') a.push('Not fed in a while — argues against overfeeding');
      return { for: f, against: a };
    },
  },
  {
    label: 'Magnesium deficiency',
    inspectNext: ['Confirm interveinal yellowing on older leaves with green veins', 'Check pH (Mg locks out below ~6.0)'],
    safeActions: ['Verify pH is ~6.0–6.5', 'Apply a light balanced feed containing magnesium'],
    doNot: ["Don't overdo Epsom/Mg — excess causes its own problems", "Don't ignore pH, which often drives Mg lockout"],
    whenToGetHelp: 'If interveinal chlorosis climbs the plant despite correct pH and light Mg, reassess.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.interveinalChlorosis === 'Yes') f.push('Interveinal chlorosis (green veins, yellow between)');
      if (i.affectedPart === 'Old/lower growth' || i.growthAge === 'Old growth') f.push('On older/lower leaves (Mg is mobile)');
      if (i.affectedPart === 'New/upper growth' || i.growthAge === 'New growth') a.push('New-growth pattern argues against a mobile-nutrient (Mg) deficiency');
      if (i.interveinalChlorosis === 'No') a.push('No interveinal pattern reported');
      return { for: f, against: a };
    },
  },
  {
    label: 'Potassium deficiency',
    inspectNext: ['Look for margin/tip scorch on older leaves', 'Check EC and pH'],
    safeActions: ['Verify pH in range', 'Use a balanced feed with potassium if underfed'],
    doNot: ["Don't confuse salt burn (also tip scorch) with K deficiency without checking EC"],
    whenToGetHelp: 'If margins keep necrosing despite balanced feeding and correct pH, reassess.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.marginalTipBurn === 'Yes') f.push('Margin/tip scorch');
      if (i.affectedPart === 'Old/lower growth' || i.growthAge === 'Old growth') f.push('On older/lower leaves (K is mobile)');
      if (i.leafColor === 'Bronze/brown') f.push('Bronzing at margins');
      if (i.affectedPart === 'New/upper growth' || i.growthAge === 'New growth') a.push('New-growth pattern argues against a mobile-nutrient (K) deficiency');
      if (i.ec === 'High') a.push('High EC points more to salt burn than K shortage');
      return { for: f, against: a };
    },
  },
  {
    label: 'Calcium deficiency',
    inspectNext: ['Check for spotting/distortion on NEW leaves', 'Note if heat/high transpiration is involved'],
    safeActions: ['Verify pH ~6.2–6.5', 'Keep watering steady; avoid extreme swings', 'Use a Cal-Mg-containing balanced feed if needed'],
    doNot: ["Don't assume old-leaf yellowing is calcium (it's immobile — new growth shows first)"],
    whenToGetHelp: 'If new-growth necrosis spreads despite steady watering and correct pH, reassess.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.affectedPart === 'New/upper growth' || i.growthAge === 'New growth') f.push('Affects new/upper growth (calcium is immobile)');
      if (i.spotsLesions === 'Brown spots') f.push('Brown necrotic spots');
      if (i.recentWeather === 'Hot') f.push('Heat/high transpiration can limit calcium delivery');
      if (i.affectedPart === 'Old/lower growth' || i.growthAge === 'Old growth') a.push('Old-growth pattern argues against an immobile-nutrient (Ca) deficiency');
      return { for: f, against: a };
    },
  },
  {
    label: 'pH lockout',
    inspectNext: ['Measure runoff/root-zone pH', 'Note whether several nutrients look deficient at once'],
    safeActions: ['Correct the pH of your input water/feed', 'Flush with pH-corrected water, then feed lightly'],
    doNot: ["Don't keep adding nutrients into a lockout — it worsens salt buildup"],
    whenToGetHelp: 'If deficiencies persist after pH is corrected and held, reassess EC and medium.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.ph === 'Low (<6)') f.push('Root-zone pH low (<6)');
      if (i.ph === 'High (>7)') f.push('Root-zone pH high (>7)');
      if (i.interveinalChlorosis === 'Yes' || i.leafColor === 'Pale/yellow') f.push('Deficiency-like symptoms present');
      if (i.recentNutrition === 'Fed heavy recently') f.push('Feeding heavily yet still symptomatic (points to lockout)');
      if (i.ph === 'In range (6-7)') a.push('pH reported in range — argues against lockout');
      return { for: f, against: a };
    },
  },
  {
    label: 'Salinity / nutrient burn',
    inspectNext: ['Measure runoff EC', 'Confirm tip burn advancing inward from leaf tips'],
    safeActions: ['Flush with plain, pH-corrected water', 'Reduce feed strength going forward'],
    doNot: ["Don't feed more", "Don't let the medium dry to the point salts concentrate"],
    whenToGetHelp: 'If tips keep burning after flushing and lower feed, reassess your feed schedule.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.ec === 'High') f.push('High EC reported');
      if (i.marginalTipBurn === 'Yes') f.push('Tip burn (classic salt/nutrient burn)');
      if (i.recentNutrition === 'Fed heavy recently') f.push('Fed heavy recently');
      if (i.recentNutrition === 'Changed products') f.push('Recently changed products');
      if (i.ec === 'Low') a.push('Low EC argues against salt burn');
      if (i.recentNutrition === 'Not fed in a while') a.push('Not fed in a while — argues against burn');
      return { for: f, against: a };
    },
  },
  {
    label: 'Light stress',
    inspectNext: ['Note whether the worst signs are on the most-exposed top canopy', 'Consider recent changes in exposure'],
    safeActions: ['Adjust exposure gradually, not abruptly', 'Shade the top canopy during peak intensity if bleaching'],
    doNot: ["Don't move a plant from shade to full sun in one step"],
    whenToGetHelp: 'If top-canopy bleaching spreads despite easing exposure, reassess siting.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.affectedPart === 'New/upper growth') f.push('Worst on the most-exposed upper canopy');
      if (i.leafColor === 'Bronze/brown' && i.recentWeather === 'Hot') f.push('Top-canopy bleaching/bronzing in strong sun');
      if (i.growthRate === 'Rapid/stretchy') f.push('Stretchy growth can indicate too little light');
      if (i.affectedPart === 'Old/lower growth') a.push('Lower-leaf pattern argues against top-canopy light stress');
      return { for: f, against: a };
    },
  },
  {
    label: 'Transplant stress',
    inspectNext: ['Confirm a recent transplant or root disturbance', 'Watch whether it settles over several days'],
    safeActions: ['Keep the root zone evenly moist (not soggy)', 'Provide a few days of gentle shade', 'Hold off on heavy feeding'],
    doNot: ["Don't feed heavily while roots re-establish", "Don't repot again immediately"],
    whenToGetHelp: 'If wilting and stall persist beyond a week with good care, look for another cause.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.progression === 'Sudden (days)') f.push('Sudden onset (fits a recent transplant)');
      if (i.wilting === 'Yes') f.push('Wilting');
      if (i.growthRate === 'Slow/stalled') f.push('Growth stalled');
      if (i.progression === 'Gradual (weeks)') a.push('Gradual onset argues against transplant shock');
      return { for: f, against: a };
    },
  },
  {
    label: 'Physical damage',
    inspectNext: ['Look for torn, pitted, or broken tissue', 'Check whether damage is localized rather than systemic'],
    safeActions: ['Support or stake damaged stems', 'Make clean cuts on badly torn tissue', 'Protect from repeat impacts'],
    doNot: ["Don't over-prune — remove only clearly non-viable tissue"],
    whenToGetHelp: 'If a main stem is nearly severed, support it and monitor; severe breakage may not recover.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.recentWeather === 'Hail') f.push('Recent hail can pit/tear tissue');
      if (i.recentWeather === 'Windy') f.push('Wind can tear/break tissue');
      if (i.stemSymptoms === 'Lesions' || i.stemSymptoms === 'Discolored') f.push('Stem lesions/discoloration');
      if (i.scope === 'One plant') f.push('Localized to one plant');
      if (i.scope === 'All/most plants') a.push('Affecting most plants — argues against isolated physical damage');
      return { for: f, against: a };
    },
  },
  {
    label: 'Aphids',
    inspectNext: ['Check undersides and new shoots for clustered soft-bodied insects', 'Look for ants tending them and sticky honeydew'],
    safeActions: ['Knock them off with a firm water spray', 'Remove heavily infested tips by hand', 'Encourage/allow predators (ladybugs, lacewings)'],
    doNot: ["Don't blanket-spray broad insecticide for a few aphids — it kills predators too"],
    whenToGetHelp: 'If colonies rebound fast and distort growth despite manual control, escalate to a targeted, cannabis-safe product.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.pestEvidence === 'Green/black clusters') f.push('Green/black clustered insects reported');
      if (i.leafCurl === 'Curling down' || i.leafCurl === 'Taco/clawing') f.push('New-growth distortion (aphid feeding)');
      if (i.affectedPart === 'New/upper growth') f.push('Concentrated on new growth');
      if (i.pestEvidence === 'None seen') a.push('No pests seen on inspection');
      if (i.pestEvidence === 'Webbing') a.push('Webbing points more to mites than aphids');
      return { for: f, against: a };
    },
  },
  {
    label: 'Spider mites',
    inspectNext: ['Use a loupe on leaf undersides for tiny moving dots', 'Tap a leaf over white paper and watch for specks that move'],
    safeActions: ['Rinse leaf undersides with water', 'Raise humidity around the plant', 'Spot-remove the worst leaves'],
    doNot: ["Don't ignore early stippling — mites multiply fast in heat", "Don't rely on one spray; they resist quickly"],
    whenToGetHelp: 'If webbing spreads across the canopy, escalate promptly with a rotation of cannabis-safe miticides.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.pestEvidence === 'Webbing') f.push('Fine webbing reported');
      if (i.pestEvidence === 'Tiny moving dots') f.push('Tiny moving dots on leaves');
      if (i.leafColor === 'Mottled/speckled') f.push('Fine mottling/stippling (mite feeding)');
      if (i.recentWeather === 'Hot') f.push('Hot, dry conditions favor mites');
      if (i.pestEvidence === 'None seen') a.push('No pests seen on inspection');
      return { for: f, against: a };
    },
  },
  {
    label: 'Thrips',
    inspectNext: ['Look for silvery trails plus tiny black frass specks', 'Watch for slender fast insects when disturbed'],
    safeActions: ['Hang sticky traps to monitor', 'Rinse foliage and remove worst-hit leaves'],
    doNot: ["Don't spray buds harshly to chase thrips"],
    whenToGetHelp: 'If silvering spreads and traps fill quickly, escalate to a targeted, cannabis-safe control.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.pestEvidence === 'Silvery stippling') f.push('Silvery stippling/trails reported');
      if (i.leafColor === 'Mottled/speckled') f.push('Speckled/silvered leaf surface');
      if (i.pestEvidence === 'None seen') a.push('No pests seen on inspection');
      if (i.pestEvidence === 'Webbing') a.push('Webbing points more to mites than thrips');
      return { for: f, against: a };
    },
  },
  {
    label: 'Caterpillars',
    inspectNext: ['Scout for larvae, chewed holes, and frass — especially in/near buds', 'Inspect at dusk when they feed'],
    safeActions: ['Hand-pick larvae', 'Open and check dense buds for hidden frass', 'Remove damaged bud tissue promptly to prevent rot'],
    doNot: ["Don't apply harsh sprays into flowers"],
    whenToGetHelp: 'If bud damage and frass keep appearing, consider a targeted Bt (Bacillus thuringiensis) application per label.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.pestEvidence === 'Chewed holes') f.push('Chewed holes in leaves');
      if (i.pestEvidence === 'Frass/droppings') f.push('Frass/droppings present');
      if (i.pestEvidence === 'None seen') a.push('No pests or chewing seen');
      return { for: f, against: a };
    },
  },
  {
    label: 'Grasshoppers',
    inspectNext: ['Watch for jumping insects and ragged, edge-in leaf damage', 'Check perimeter plants first'],
    safeActions: ['Use floating row cover or physical barriers', 'Hand-catch in the morning when sluggish', 'Encourage birds as predators'],
    doNot: ["Don't broadcast-spray the whole area for a few chewers"],
    whenToGetHelp: 'During an outbreak, physical exclusion is the reliable option — chemical control is rarely worth it for a home grow.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.pestEvidence === 'Chewed holes') f.push('Chewed/ragged leaf damage');
      if (i.recentWeather === 'Hot') f.push('Hot dry spells drive grasshoppers into gardens');
      if (i.pestEvidence === 'Frass/droppings') a.push('Frass points more to caterpillars than grasshoppers');
      if (i.pestEvidence === 'None seen') a.push('No chewing insects seen');
      return { for: f, against: a };
    },
  },
  {
    label: 'Powdery mildew',
    inspectNext: ['Look for white, talc-like patches on upper leaf surfaces', 'Assess airflow and canopy density'],
    safeActions: ['Improve airflow and spacing', 'Remove the worst-affected leaves with a clean tool', 'Keep foliage dry; avoid overhead watering'],
    doNot: ["Don't crowd plants together", "Don't wet the canopy late in the day"],
    whenToGetHelp: 'If it spreads despite airflow and sanitation, consider a labeled, cannabis-safe preventative early — not on mature buds.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.spotsLesions === 'White powdery') f.push('White powdery patches reported');
      if (i.leafColor === 'Mottled/speckled') f.push('Patchy pale surface consistent with early PM');
      if (i.spotsLesions === 'Gray fuzzy') a.push('Gray fuzzy growth points to botrytis, not powdery mildew');
      if (i.spotsLesions === 'None') a.push('No powdery growth reported');
      return { for: f, against: a };
    },
  },
  {
    label: 'Botrytis (gray mold / bud rot)',
    inspectNext: ['Open dense buds and check for gray fuzzy rot or soft brown cores', 'Inspect after wet, humid weather'],
    safeActions: ['Remove affected tissue with a clean tool and bag it away from plants', 'Improve airflow and dry the canopy', 'Thin dense areas to reduce trapped moisture'],
    doNot: ["Don't leave infected material near the plants", "Don't mist a botrytis-prone canopy"],
    whenToGetHelp: 'Botrytis spreads fast in wet weather — remove affected tissue promptly, monitor daily, and get advice if buds keep rotting.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.spotsLesions === 'Gray fuzzy') f.push('Gray fuzzy growth reported');
      if (i.recentWeather === 'Heavy rain') f.push('Recent heavy rain/humidity');
      if (i.stemSymptoms === 'Soft/mushy base') f.push('Soft rot on tissue');
      if (i.spotsLesions === 'White powdery') a.push('White powdery growth points to powdery mildew, not botrytis');
      if (i.spotsLesions === 'None') a.push('No fuzzy rot reported');
      return { for: f, against: a };
    },
  },
  {
    label: 'Septoria-like leaf spot',
    inspectNext: ['Confirm distinct spots starting on lower leaves', 'Note whether wet weather or splashing preceded it'],
    safeActions: ['Remove and bag spotted lower leaves', 'Mulch to reduce soil splash', 'Avoid overhead watering'],
    doNot: ["Don't compost infected leaves near your plants"],
    whenToGetHelp: 'If spotting climbs the plant despite sanitation, consider a labeled, cannabis-safe fungicide early in the season.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if (i.spotsLesions === 'Yellow spots' || i.spotsLesions === 'Brown spots' || i.spotsLesions === 'Black spots') f.push('Distinct leaf spots reported');
      if (i.affectedPart === 'Old/lower growth') f.push('Starts on lower leaves (typical of splash-borne leaf spot)');
      if (i.recentWeather === 'Heavy rain') f.push('Recent wet weather/splashing');
      if (i.spotsLesions === 'None') a.push('No distinct spots reported');
      if (i.spotsLesions === 'White powdery') a.push('Powdery coating points to mildew, not leaf spot');
      return { for: f, against: a };
    },
  },
  {
    label: 'Natural senescence (normal aging)',
    inspectNext: ['Confirm only a few oldest/lowest leaves are involved', 'Check that new growth looks healthy'],
    safeActions: ['Remove spent lower leaves for airflow if you like', 'No treatment needed if the rest of the plant is thriving'],
    doNot: ["Don't treat normal aging as a disease and start unnecessary interventions"],
    whenToGetHelp: 'If yellowing climbs beyond the lowest leaves or new growth suffers, look for an active cause.',
    evaluate: (i) => {
      const f: string[] = [], a: string[] = [];
      if ((i.affectedPart === 'Old/lower growth' || i.growthAge === 'Old growth') && i.leafColor === 'Pale/yellow') f.push('A few oldest/lowest leaves yellowing');
      if (i.progression === 'Gradual (weeks)') f.push('Slow, gradual onset');
      if (i.growthRate === 'Normal') f.push('Rest of the plant growing normally');
      if (i.affectedPart === 'New/upper growth' || i.growthAge === 'New growth') a.push('New-growth involvement argues against normal aging');
      if (i.scope === 'All/most plants') a.push('Widespread across plants — more than simple aging');
      if (i.growthRate === 'Slow/stalled') a.push('Stalled growth argues against healthy aging');
      return { for: f, against: a };
    },
  },
];

function deriveConfidence(forCount: number, againstCount: number, provided: number): Confidence {
  // Strength from supporting signals, tempered by how much was reported overall.
  let level = forCount >= 3 ? 2 : forCount >= 2 ? 1 : 0; // 0 Low, 1 Moderate, 2 High
  // Conflicting evidence pulls confidence down.
  if (againstCount >= forCount) level -= 1;
  else if (againstCount > 0) level = Math.min(level, 1);
  // Thin input can never read as confident — the whole point of the feature.
  if (provided < 4) level = Math.min(level, 0);
  else if (provided < 7) level = Math.min(level, 1);
  level = Math.max(0, level);
  return level === 2 ? 'High' : level === 1 ? 'Moderate' : 'Low';
}

function fallback(label: string, evidenceFor: string[], score: number): Explanation {
  return {
    label,
    confidence: 'Low',
    score,
    evidenceFor,
    evidenceAgainst: [],
    inspectNext: [
      'Photograph the affected areas and re-check over several days to track progression',
      'Compare an affected leaf with a healthy one on the same plant',
      'Note whether it is spreading and whether one plant or many are affected',
    ],
    safeActions: ['Keep watering and feeding consistent while you observe', 'Make sure airflow and drainage are adequate'],
    doNot: ["Don't apply treatments for a problem you haven't confirmed"],
    whenToGetHelp: 'If symptoms worsen or spread quickly, get a second opinion with clear photos.',
  };
}

/**
 * Run the differential. Always returns a RANKED array of at least two
 * possibilities — never a single confident verdict. Every emitted explanation
 * carries at least one item of supporting evidence; conflicting evidence is
 * surfaced wherever the input contradicts the explanation.
 */
export function diagnose(input: DiagnoseInput): Explanation[] {
  const provided = providedCount(input);

  const results: Explanation[] = RULES
    .map((r) => ({ r, ev: r.evaluate(input) }))
    .filter((x) => x.ev.for.length > 0) // never emit an explanation with no supporting evidence
    .map(({ r, ev }) => ({
      label: r.label,
      confidence: deriveConfidence(ev.for.length, ev.against.length, provided),
      score: ev.for.length * 2 - ev.against.length,
      evidenceFor: ev.for,
      evidenceAgainst: ev.against,
      inspectNext: r.inspectNext,
      safeActions: r.safeActions,
      doNot: r.doNot,
      whenToGetHelp: r.whenToGetHelp,
    }));

  results.sort((a, b) => b.score - a.score);

  // Guarantee a differential (never a lone verdict): pad with honest low-
  // confidence "keep observing" entries if too few conditions matched.
  if (results.length < 2) {
    results.push(fallback(
      'Not enough distinctive signs yet',
      [provided < 4 ? 'Only a few observations provided so far' : 'Reported signs are non-specific and overlap several causes'],
      -1,
    ));
  }
  if (results.length < 2) {
    results.push(fallback(
      'General or environmental stress',
      ['Symptoms so far do not point strongly to one specific cause'],
      -2,
    ));
  }

  return results;
}
