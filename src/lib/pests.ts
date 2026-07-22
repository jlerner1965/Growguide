// lib/pests.ts
// Static, typed library of pest & disease profiles + a severity scale.
// Pure data — no logic, no I/O.
//
// HARD RULES baked into the content:
//  - Never name a specific pesticide product, brand, dose, or rate. Beneficial
//    ORGANISMS (predatory mites, parasitic wasps, Bt, nematodes) are named
//    because they are biological controls, not chemical products.
//  - Never state legal/regulatory requirements — defer to "the label and your
//    local rules" via a standing reminder.
//  - Emphasize identification confidence and least-aggressive-first response.
//  - Look-alikes genuinely disambiguate — that field is the whole point.

import type { Stage } from '../db/types';

export type PestType = 'pest' | 'disease';

export type PlantZone =
  | 'Leaf tops' | 'Leaf undersides' | 'Stems' | 'Soil surface' | 'Interior canopy' | 'Flowers';

export const PLANT_ZONES: PlantZone[] = ['Leaf tops', 'Leaf undersides', 'Stems', 'Soil surface', 'Interior canopy', 'Flowers'];

export type Severity =
  | 'Observation only' | 'Monitor' | 'Intervention may be warranted' | 'Serious risk';

/** Ordered least → most severe, each with plain-English guidance. */
export const SEVERITY_SCALE: { level: Severity; meaning: string }[] = [
  { level: 'Observation only', meaning: 'You noticed something, but there is no clear pest/disease or real damage yet. Note it, keep watching — no action needed.' },
  { level: 'Monitor', meaning: 'Early or low-level signs. Re-inspect on a schedule and tidy up conditions (airflow, watering, dust); hold off on any treatment.' },
  { level: 'Intervention may be warranted', meaning: 'Confirmed and spreading or damaging. Start with the least-aggressive controls — physical and cultural first — and escalate only if those fail.' },
  { level: 'Serious risk', meaning: 'Fast-spreading or crop-threatening (e.g. bud rot in dense flower). Act promptly with the least-aggressive effective option, remove affected tissue, and get a second opinion if unsure.' },
];

/** Convenience: the severity levels in order, least → most severe. */
export const SEVERITY_ORDER: Severity[] = SEVERITY_SCALE.map((s) => s.level);

/**
 * How bad each problem can realistically get if left unmanaged — used only to
 * let the library filter/label by risk. It is NOT a claim about any single
 * plant right now; your own scouting sets the actual severity.
 */
export const PEAK_SEVERITY: Record<string, Severity> = {
  aphids: 'Intervention may be warranted',
  'spider-mites': 'Serious risk',
  thrips: 'Intervention may be warranted',
  caterpillars: 'Serious risk',
  grasshoppers: 'Intervention may be warranted',
  whiteflies: 'Intervention may be warranted',
  'fungus-gnats': 'Monitor',
  'russet-mites': 'Serious risk',
  'powdery-mildew': 'Serious risk',
  botrytis: 'Serious risk',
  septoria: 'Intervention may be warranted',
  'root-rot': 'Serious risk',
};

// Standing reminder attached to every profile — no products, no legal claims.
export const LABEL_REMINDER =
  'If you ever apply any product, slow down first: read and follow its label exactly, confirm it is appropriate for a consumable crop and for the current growth stage, and check what is allowed where you live. This library never recommends specific products, rates, or timings — the label and your local rules govern that.';

export interface PestProfile {
  id: string;
  name: string;
  type: PestType;
  identification: string;
  /** What it's commonly confused with, and how to tell them apart. The most valuable field. */
  lookAlikes: string[];
  typicalLocation: PlantZone[];
  favorableConditions: string;
  scoutingProcedure: string[];
  prevention: string[];
  culturalControls: string[];
  mechanicalControls: string[];
  biologicalOptions: string[];
  productLabelReminder: string;
  followUpInterval: string;
  /** Stages when it's most likely (informational). */
  commonStages: Stage[];
}

export const PROFILES: PestProfile[] = [
  {
    id: 'aphids', name: 'Aphids', type: 'pest',
    identification: 'Soft, pear-shaped insects about 1–3 mm, often green but sometimes black, yellow, or pink, clustered on new shoots and leaf undersides. Look for sticky honeydew, sooty mold, cast white skins, and ants tending them.',
    lookAlikes: [
      'Whiteflies: also cluster on undersides and make honeydew, but whiteflies are winged and flutter up in a cloud when disturbed; aphids stay put and are rounded/pear-shaped.',
      'Thrips: cause silvery stippling rather than clusters of visible bodies; thrips are slender and dart, aphids are plump and slow.',
      'Parasitized aphid "mummies": tan, swollen, papery aphids are a good sign — leave them; they release beneficial wasps.',
    ],
    typicalLocation: ['Leaf undersides', 'Interior canopy', 'Stems'],
    favorableConditions: 'Mild temperatures and lush, nitrogen-rich new growth. Populations build fast in spring/early summer; Front Range plants often get winged migrants arriving from nearby vegetation.',
    scoutingProcedure: [
      'Turn over the newest leaves and inspect shoot tips.',
      'Look for clustered bodies, sticky honeydew, and cast white skins.',
      'Follow any ant trails up the stem — ants farm aphids and flag an infestation.',
      'Tap a shoot over white paper and watch what falls and crawls.',
    ],
    prevention: ['Avoid over-applying nitrogen — soft, lush growth attracts them.', 'Preserve natural predators; avoid broad sprays that wipe them out.', 'Inspect incoming plants and weedy hosts nearby.'],
    culturalControls: ['Remove weedy aphid hosts around the grow.', 'Prune out heavily infested tips.', 'Reduce dust so predators stay active.'],
    mechanicalControls: ['Knock them off with a firm water spray, repeated every few days.', 'Wipe or hand-remove small colonies.', 'Barrier ants off stems so predators can work.'],
    biologicalOptions: ['Ladybugs (adults and larvae), lacewing larvae, hoverfly larvae, and parasitic wasps are effective aphid predators.', 'Leave any tan "mummies" in place — those aphids are already parasitized.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect every 2–3 days; aphids reproduce quickly.',
    commonStages: ['Seedling', 'Vegetative', 'Pre-flower'],
  },
  {
    id: 'spider-mites', name: 'Spider mites', type: 'pest',
    identification: 'Very small eight-legged mites (about 0.3–0.5 mm), pale or reddish, on leaf undersides. First sign is fine pale stippling/speckling seen from the leaf top; heavy infestations show fine webbing over leaves and buds.',
    lookAlikes: [
      'Thrips: also stipple, but leave elongated silvery scars with tiny black frass specks and no webbing; mites make round pinprick speckles and eventually webbing.',
      'Nutrient/pH speckling: abiotic speckling is more uniform, with no moving dots or webbing underneath — confirm with a loupe.',
      'Russet mites: cause bronzing/curling of new growth with no visible dots or webbing to the naked eye — a different pattern (see the russet mite profile).',
    ],
    typicalLocation: ['Leaf undersides', 'Interior canopy', 'Flowers'],
    favorableConditions: 'Hot, dry, dusty conditions — classic Front Range summer. Numbers surge in heat and on water-stressed plants.',
    scoutingProcedure: [
      'Inspect leaf undersides with a 10–60x loupe for moving dots and eggs.',
      'Tap a leaf over white paper and watch for specks that crawl.',
      'Hold leaves to the light to see stippling from above.',
      'Check the hottest, driest parts of the canopy first.',
    ],
    prevention: ['Keep plants well-watered; avoid heat/drought stress.', 'Reduce dust (wet down nearby paths).', 'Quarantine and inspect incoming plants.'],
    culturalControls: ['Raise humidity around plants — mites dislike it.', 'Remove the most heavily infested leaves.', 'Correct the water stress that favors them.'],
    mechanicalControls: ['Spray leaf undersides forcefully with water, repeated every few days.', 'Remove and bag heavily webbed leaves.'],
    biologicalOptions: ['Predatory mites (for example Phytoseiulus persimilis and Neoseiulus/Amblyseius species) and predatory beetles are the standard biological control.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect every 2–3 days in hot weather — they multiply explosively.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'thrips', name: 'Thrips', type: 'pest',
    identification: 'Slender insects about 1–2 mm, pale to dark, that dart when disturbed; larvae are tiny and pale. Feeding leaves silvery/bronze stippled patches speckled with tiny black frass dots.',
    lookAlikes: [
      'Spider mites: also stipple, but make round pinprick speckles and webbing; thrips leave elongated silvery scars plus black frass and no webbing.',
      'Wind/mechanical abrasion: can silver a leaf surface but lacks frass specks and live insects.',
      'Leaf-miner trails: winding tunnels inside the leaf, not surface silvering.',
    ],
    typicalLocation: ['Leaf tops', 'Leaf undersides', 'Flowers'],
    favorableConditions: 'Warm, dry weather; often blow in from surrounding grasses and weeds common across the Front Range.',
    scoutingProcedure: [
      'Hang blue or yellow sticky cards near the canopy to detect adults.',
      'Shake a flower or shoot over white paper and watch for slivers that move.',
      'Inspect silvered areas with a loupe for frass specks and larvae.',
      'Check flowers and tender new growth closely.',
    ],
    prevention: ['Manage weeds and grass around the grow.', 'Use sticky cards early for detection.', 'Inspect incoming plants and clones.'],
    culturalControls: ['Remove weedy hosts nearby.', 'Remove the most damaged leaves.'],
    mechanicalControls: ['Sticky traps to reduce adults and monitor trends.', 'Rinse foliage and hand-remove badly damaged tissue.'],
    biologicalOptions: ['Predatory mites (for example Amblyseius/Neoseiulus species), minute pirate bugs, and lacewings help suppress thrips.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect and read sticky cards every 3–4 days.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'caterpillars', name: 'Caterpillars / budworm', type: 'pest',
    identification: 'Chewed leaves with ragged holes and — the real threat — larvae boring into buds, leaving dark frass (droppings) and rotting bud cores. Larvae range from tiny to several centimeters.',
    lookAlikes: [
      'Grasshopper damage: also chews leaves, but works from the leaf margins inward and leaves no bud-boring frass; caterpillars leave frass and hollowed buds.',
      'Hail/physical damage: torn tissue with no frass or larvae present.',
      'Botrytis: bud rot often follows caterpillar tunneling — check whether it is simple frass or gray fuzzy rot.',
    ],
    typicalLocation: ['Flowers', 'Interior canopy', 'Leaf tops'],
    favorableConditions: 'Late summer into flower, when moths lay eggs on buds — coinciding with prime bud-rot season as Front Range nights cool.',
    scoutingProcedure: [
      'Inspect buds for dark frass specks and entry holes.',
      'Gently open suspect buds to look for larvae and rot.',
      'Scout at dusk, when many larvae feed.',
      'Check leaves for ragged chewing and droppings below.',
    ],
    prevention: ['Scout buds daily as flowers form.', 'Remove damaged bud tissue promptly so rot does not follow.', 'Encourage birds and predatory insects.'],
    culturalControls: ['Remove and destroy infested bud material.', 'Keep the canopy open so rot is less likely to set in.'],
    mechanicalControls: ['Hand-pick larvae, especially at dusk.', 'Crush visible eggs on bud sites.'],
    biologicalOptions: ['Bacillus thuringiensis (Bt) is a caterpillar-specific biological control; parasitic wasps and predatory bugs also help.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Inspect buds daily once flowering — damage turns to rot fast.',
    commonStages: ['Flowering', 'Late flower'],
  },
  {
    id: 'grasshoppers', name: 'Grasshoppers', type: 'pest',
    identification: 'Large chewing insects that remove leaf tissue from the margins inward, leaving ragged edges; you often see them jump. Damage can be rapid during outbreaks.',
    lookAlikes: [
      'Caterpillars: also chew, but leave frass and bore into buds; grasshoppers rarely bore buds and leave little frass on the plant.',
      'Hail/wind: tears tissue but produces no clean chewed margins and no insects present.',
    ],
    typicalLocation: ['Leaf tops', 'Leaf undersides', 'Stems'],
    favorableConditions: 'Hot, dry summers with nearby grassland — a recurring Front Range issue in drought years, when hoppers move in from drying fields.',
    scoutingProcedure: [
      'Walk the perimeter first — hoppers invade from field edges.',
      'Look for ragged, edge-in leaf damage and jumping insects.',
      'Scout in warm midday when they are most active.',
    ],
    prevention: ['Keep surrounding grass and weeds managed.', 'Use floating row cover or netting on young plants during outbreaks.', 'Encourage birds.'],
    culturalControls: ['Physical barriers/row cover on vulnerable plants.', 'Reduce tall dry grass next to the grow.'],
    mechanicalControls: ['Hand-catch in the cool morning when they are sluggish.', 'Exclusion netting around plants.'],
    biologicalOptions: ['Birds, praying mantids, and predatory insects help; during heavy outbreaks, exclusion is more reliable than predators.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-check every 2–3 days during an outbreak — damage can be fast.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'whiteflies', name: 'Whiteflies', type: 'pest',
    identification: 'Tiny white, moth-like insects (about 1–2 mm) on leaf undersides that flutter up in a cloud when the plant is shaken; they leave honeydew and sooty mold.',
    lookAlikes: [
      'Aphids: also cluster on undersides and make honeydew, but do not fly up in a cloud and are wingless and pear-shaped.',
      'Fungus gnats: dark, not white, and hover around the soil surface rather than resting under leaves.',
      'Mealybugs: cottony white masses that do not fly, versus fluttering adult whiteflies.',
    ],
    typicalLocation: ['Leaf undersides', 'Interior canopy'],
    favorableConditions: 'Warm weather and sheltered, still air; common where plants are crowded or near greenhouses.',
    scoutingProcedure: [
      'Shake the plant and watch for a cloud of tiny white flies.',
      'Inspect undersides for scale-like nymphs and eggs.',
      'Use yellow sticky cards to detect and track adults.',
    ],
    prevention: ['Yellow sticky cards for early detection.', 'Avoid crowding; keep airflow up.', 'Inspect incoming plants.'],
    culturalControls: ['Remove heavily infested lower leaves.', 'Improve spacing and airflow.'],
    mechanicalControls: ['Yellow sticky traps to knock down adults.', 'Rinse undersides with water.'],
    biologicalOptions: ['Parasitic wasps (Encarsia and Eretmocerus species) and predatory beetles and lacewings are standard biological controls.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect and read cards every 3–4 days.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'fungus-gnats', name: 'Fungus gnats', type: 'pest',
    identification: 'Small dark flies (about 2–4 mm) that hover over and run across the soil surface; larvae are clear with black heads in the top layer of wet medium and feed on roots and organic matter.',
    lookAlikes: [
      'Whiteflies: white and leaf-dwelling, not dark soil-surface flies.',
      'Shore flies: also soil-surface flies but stouter with mottled wings, and cause less root damage.',
      'Root rot: overlaps because both thrive in overwatered soil — check the roots and how wet the medium stays.',
    ],
    typicalLocation: ['Soil surface', 'Stems'],
    favorableConditions: 'Constantly wet, organic-rich medium and overwatering — the true root cause. Common with peat/compost-heavy mixes kept too moist.',
    scoutingProcedure: [
      'Watch the soil surface for running and hovering dark flies.',
      'Lay yellow sticky cards flat near the soil.',
      'Rest a slice of potato on the medium and check its underside for larvae after a day.',
      'Check whether the top of the medium stays wet too long.',
    ],
    prevention: ['Let the top of the medium dry between waterings — the single biggest control.', 'Avoid overwatering; improve drainage.', 'Top the soil with a dry mulch or sand layer to deter egg-laying.'],
    culturalControls: ['Reduce watering frequency; improve drainage.', 'Remove excess organic debris from the surface.'],
    mechanicalControls: ['Yellow sticky cards laid flat to catch adults.', 'Let the medium dry to break the larval cycle.'],
    biologicalOptions: ['Beneficial nematodes (Steinernema feltiae), predatory soil mites (Stratiolaelaps), and Bti-based biological soil treatments target the larvae.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-check cards and the surface every 3–5 days, tied to your watering cycle.',
    commonStages: ['Seedling', 'Vegetative'],
  },
  {
    id: 'russet-mites', name: 'Russet mites (hemp russet mite)', type: 'pest',
    identification: 'Microscopic mites you cannot see with the naked eye (need 60x or more). Damage shows first: new growth looks dull, curled, or "greasy," leaf edges curl up, and tips turn brassy/bronzed, progressing upward. Often noticed only once the top growth looks off.',
    lookAlikes: [
      'Nutrient burn (the key look-alike): nutrient burn shows crispy brown TIPS and margins, usually starting on the older/larger leaves and with an otherwise normal leaf surface. Russet damage starts on NEW growth with dull, greasy curling and, under 60x+, actual moving mites. Distinguish by magnification and by which growth is affected — new vs. old.',
      'Spider mites: leave visible dots and webbing at the same magnification; russet mites make no webbing and are far smaller.',
      'Broad mites: nearly identical microscopic damage with distorted, shiny new growth — hard to separate without high magnification; scout them the same way.',
      'Wind/heat stress: can bronze leaves but is more uniform and lacks the greasy, curled new growth.',
    ],
    typicalLocation: ['Interior canopy', 'Stems', 'Leaf undersides', 'Flowers'],
    favorableConditions: 'Warm weather; spread readily on hands, tools, and clothing, so sanitation matters as much as any treatment.',
    scoutingProcedure: [
      'Use 60x or higher magnification on stems and new growth — lower power will miss them.',
      'Focus on the boundary between healthy and dull/curled tissue.',
      'Work top-down: damage climbs from where it started.',
      'Sanitize hands and tools between plants so scouting does not spread them.',
    ],
    prevention: ['Sanitize hands and tools; they hitchhike easily.', 'Quarantine and inspect incoming clones (a common entry point).', 'Isolate suspect plants early.'],
    culturalControls: ['Isolate affected plants to slow spread.', 'Remove the worst-affected tissue.', 'Do not move between plants without sanitizing.'],
    mechanicalControls: ['Remove and bag heavily damaged growth.', 'Rinsing has limited effect at their size — focus on isolation and sanitation.'],
    biologicalOptions: ['Some predatory mites (for example Amblyseius/Neoseiulus species) are used against russet and broad mites; results vary, so confirm the identification first.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect every 2–3 days under high magnification; damage spreads upward quickly.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'powdery-mildew', name: 'Powdery mildew', type: 'disease',
    identification: 'White to grayish, powdery, talc-like patches on upper leaf surfaces (and later stems and buds) that can be wiped off. Starts as small round spots that merge.',
    lookAlikes: [
      'Botrytis: gray FUZZY mold inside dense buds and rotting tissue — not a dry powdery film on leaf tops.',
      'Trichomes or leaf dust: sparkly resin or dust does not spread as expanding circular colonies and cannot be smeared like powdery mildew.',
      'Downy mildew: grows on leaf UNDERsides with yellowing on top; powdery mildew is mainly on the upper surface.',
    ],
    typicalLocation: ['Leaf tops', 'Interior canopy', 'Flowers'],
    favorableConditions: 'High humidity with poor airflow and moderate temperatures; big day–night swings and dewy Front Range nights raise pressure even when days are dry.',
    scoutingProcedure: [
      'Inspect upper leaf surfaces in the shaded interior canopy first.',
      'Look for small round white colonies that enlarge and merge.',
      'Gently wipe a spot — powdery mildew smears; resin does not.',
      'Check crowded, low-airflow zones.',
    ],
    prevention: ['Maximize spacing and airflow; thin dense interior growth.', 'Avoid wetting foliage late in the day.', 'Arrange plants so canopies dry quickly.'],
    culturalControls: ['Improve airflow and light penetration.', 'Remove the most affected leaves with a clean tool.', 'Thin the canopy to lower humidity.'],
    mechanicalControls: ['Remove and bag affected leaves away from plants.', 'Wipe isolated early spots and sanitize tools.'],
    biologicalOptions: ['Some biological/microbial preventatives are used early in the season; confirm suitability for edible flower and follow the label.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect every 2–3 days in humid spells; it spreads fast.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'botrytis', name: 'Botrytis (bud rot)', type: 'disease',
    identification: 'Gray-brown fuzzy mold inside dense buds; affected tissue turns soft, brown, and crumbly, often with a dead leaf poking out of the rot. It spreads outward from the bud core.',
    lookAlikes: [
      'Powdery mildew: a dry white film on surfaces, not internal fuzzy rot.',
      'Caterpillar damage: frass and hollowed buds can precede or mimic rot — open the bud to check for larvae versus gray fuzz.',
      'Normal maturation: darkening pistils are normal; a mushy brown core is not.',
    ],
    typicalLocation: ['Flowers', 'Interior canopy'],
    favorableConditions: 'Prolonged wet/humid weather and dense buds that stay damp — the top risk during a wet Front Range fall and after rain on swelling colas.',
    scoutingProcedure: [
      'Check the densest, biggest colas first, especially after rain.',
      'Gently squeeze-test for soft spots and look for a single dead leaf marking a rot pocket.',
      'Open suspect areas to see gray fuzz and brown, crumbly tissue.',
      'Inspect daily during wet weather.',
    ],
    prevention: ['Maximize airflow and dry the canopy quickly after rain.', 'Thin dense leaves and buds around colas.', 'Consider harvesting at-risk colas earlier if a long wet stretch is coming.'],
    culturalControls: ['Remove affected tissue immediately with a clean tool and bag it away from plants.', 'Open the canopy to speed drying.'],
    mechanicalControls: ['Cut out and remove rot pockets promptly, cleaning tools between cuts.', 'Shake water off heavy colas after rain.'],
    biologicalOptions: ['Some preventative biological treatments are used before onset; the most reliable control is cultural — airflow, dryness, and prompt removal.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Inspect daily in wet weather; botrytis can ruin a cola in a day or two.',
    commonStages: ['Flowering', 'Late flower', 'Harvest'],
  },
  {
    id: 'septoria', name: 'Septoria-like leaf spot', type: 'disease',
    identification: 'Distinct round spots (yellow, then tan/brown, sometimes with darker margins) starting on LOWER leaves and climbing upward; heavily spotted leaves yellow and drop.',
    lookAlikes: [
      'Nutrient issues: tend to be uniform mottling or interveinal patterns, not discrete round spots with margins.',
      'Powdery mildew: a raised white film, not sunken necrotic spots.',
      'Insect stippling: fine speckles rather than defined round lesions.',
    ],
    typicalLocation: ['Leaf tops', 'Leaf undersides', 'Interior canopy'],
    favorableConditions: 'Wet foliage and soil-splash after rain, plus warm, humid spells. Worse where lower leaves stay wet and airflow is poor.',
    scoutingProcedure: [
      'Inspect the lowest leaves first — it starts low and climbs.',
      'Look for round spots with defined margins versus diffuse discoloration.',
      'Note whether rain or overhead watering preceded it.',
      'Check both surfaces of spotted leaves.',
    ],
    prevention: ['Avoid overhead watering; keep foliage dry.', 'Mulch to reduce soil splash onto lower leaves.', 'Space and prune for airflow.'],
    culturalControls: ['Remove and bag spotted lower leaves.', 'Improve airflow; avoid handling plants while wet.'],
    mechanicalControls: ['Prune affected lower foliage with a clean tool.', 'Do not compost infected leaves near plants.'],
    biologicalOptions: ['Preventative cultural and biological measures dominate; confirm any product is suitable for edible crops and follow the label.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-inspect every 4–5 days, sooner in wet weather.',
    commonStages: ['Vegetative', 'Pre-flower', 'Flowering'],
  },
  {
    id: 'root-rot', name: 'Root rot / pythium', type: 'disease',
    identification: 'Below ground, roots turn brown and mushy and may smell sour instead of being white and firm. Above ground, wilting despite wet soil, stunting, yellowing, and slow decline — usually tied to overwatering and warm, low-oxygen root zones.',
    lookAlikes: [
      'Underwatering: also wilts, but the root zone is dry and the roots are intact — root rot wilts in WET, soggy medium.',
      'Nutrient deficiency: yellowing without mushy, foul-smelling roots or waterlogging.',
      'Fungus gnats: thrive in the same overwatered conditions and can accompany root rot — check for both.',
    ],
    typicalLocation: ['Soil surface', 'Stems'],
    favorableConditions: 'Overwatering, poor drainage, compacted medium, and warm, stagnant root zones with low oxygen.',
    scoutingProcedure: [
      'Check whether wilting is happening in WET soil — a key rot clue.',
      'Smell the base/root zone for a sour, anaerobic odor.',
      'If possible, examine roots: white and firm is healthy; brown and mushy is not.',
      'Assess drainage and how long the medium stays saturated.',
    ],
    prevention: ['Let the medium dry appropriately between waterings.', 'Ensure real drainage and aeration; avoid compacted, waterlogged mixes.', 'Avoid warm standing water at the roots.'],
    culturalControls: ['Stop overwatering; improve drainage and aeration right away.', 'Remove standing water; loosen a compacted surface.'],
    mechanicalControls: ['Improve drainage (repot or amend if feasible) and cut back watering.', 'Remove clearly dead, mushy roots if repotting.'],
    biologicalOptions: ['Beneficial root inoculants (for example Trichoderma and beneficial Bacillus species) are used preventatively to support root health; they are not a rescue for a waterlogged root zone.'],
    productLabelReminder: LABEL_REMINDER,
    followUpInterval: 'Re-assess every 2–3 days as you correct watering; recovery is gradual.',
    commonStages: ['Seedling', 'Vegetative', 'Pre-flower'],
  },
];
