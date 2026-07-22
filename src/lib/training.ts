// lib/training.ts
// A static, typed library of training / structural-support technique cards.
// Pure data — no logic, no I/O. The voice is deliberately honest: each card
// says plainly when NOT to do the technique. Nothing here is a guarantee.

import type { Stage } from '../db/types';

export interface TechniqueCard {
  id: string;
  name: string;
  purpose: string;
  /** Growth stages where the technique is appropriate. */
  stages: Stage[];
  /** High-stress techniques get a stronger caution near/at flower. */
  highStress: boolean;
  benefits: string[];
  risks: string[];
  recoveryTime: string;
  weather: string;
  /** WHEN TO AVOID IT — the honest part. */
  avoidWhen: string[];
  /** Tags applied when the technique is logged: the technique name + fitting existing tags. */
  journalTags: string[];
}

export const TECHNIQUES: TechniqueCard[] = [
  {
    id: 'topping',
    name: 'Topping',
    purpose: 'Cut the growing tip above a node to split one main stem into two, encouraging a bushier, more even canopy.',
    stages: ['Vegetative'],
    highStress: true,
    benefits: ['Creates multiple main colas', 'Lowers and evens the canopy', 'Better light to more bud sites'],
    risks: ['Temporary growth pause', 'Wound can admit infection if tools are dirty', 'Over-topping compounds stress'],
    recoveryTime: 'About 3–7 days to resume vigorous growth',
    weather: 'Top on a mild, dry day so the cut heals cleanly. Avoid right before a heat wave or storm.',
    avoidWhen: ['The plant is stressed, pest-ridden, or recently transplanted', 'Within ~2 weeks of expected flowering, or during flower', 'Seedlings without several healthy nodes'],
    journalTags: ['Topping', 'Topped'],
  },
  {
    id: 'lst',
    name: 'Low-stress training (LST)',
    purpose: 'Gently bend and tie branches outward to open the canopy and even the colas — no cutting.',
    stages: ['Vegetative', 'Pre-flower'],
    highStress: false,
    benefits: ['Even canopy without a growth pause', 'More light reaches lower sites', 'Reversible and forgiving'],
    risks: ['Branches can snap if bent too fast', 'Ties can bite into stems if left too tight'],
    recoveryTime: 'Immediate — no wound; branches reorient over hours',
    weather: 'Branches bend best when warm and turgid; they are brittle on cold mornings.',
    avoidWhen: ['Branches are brittle, cold, or wilted', 'Late flower, when stems are woody and buds heavy — use support instead'],
    journalTags: ['LST', 'Trained'],
  },
  {
    id: 'supercropping',
    name: 'Supercropping',
    purpose: 'Pinch and gently crush the inner stem so a branch can be bent over, strengthening it and lowering the canopy.',
    stages: ['Vegetative', 'Pre-flower'],
    highStress: true,
    benefits: ['Stronger stems where they heal', 'Lowers tall branches into the canopy', 'Redirects growth without cutting'],
    risks: ['A branch can break if crushed too hard', 'Adds stress if overdone'],
    recoveryTime: 'About 2–5 days; a supportive knuckle forms at the bend',
    weather: 'Do it on a mild, dry day; avoid before heat or storm stress.',
    avoidWhen: ['The plant is already stressed', 'Flowering, when a break costs a finished cola', 'Woody, inflexible stems'],
    journalTags: ['Supercropping', 'Trained'],
  },
  {
    id: 'selective-pruning',
    name: 'Selective pruning',
    purpose: 'Remove specific low or inner growth so the plant spends energy on productive tops.',
    stages: ['Vegetative', 'Pre-flower'],
    highStress: true,
    benefits: ['Improved airflow', 'More light and energy to keeper branches', 'Fewer wispy lower buds'],
    risks: ['Over-pruning removes photosynthetic leaves', 'Each cut is a wound and a stressor'],
    recoveryTime: 'About 2–4 days for light pruning',
    weather: 'Prune on a dry day so wounds heal; avoid right before wet, humid weather that invites pathogens.',
    avoidWhen: ['Heavy pruning during flower', 'Stressed or recovering plants', 'Just before a wet stretch'],
    journalTags: ['Selective pruning', 'Pruned'],
  },
  {
    id: 'canopy-thinning',
    name: 'Canopy thinning (defoliation)',
    purpose: 'Remove select fan leaves to get light and airflow into the canopy.',
    stages: ['Vegetative', 'Pre-flower', 'Flowering'],
    highStress: true,
    benefits: ['Better airflow reduces mold pressure', 'Light reaches interior bud sites'],
    risks: ['Over-defoliation starves and stresses the plant', 'Removing too much at once stalls growth'],
    recoveryTime: 'About 3–7 days after a modest thin',
    weather: 'A modest thin before a humid or wet stretch cuts mold pressure. Do not strip leaves before a heat wave.',
    avoidWhen: ['Removing more than a modest share of leaves at once', 'Stressed plants', 'Aggressive defoliation in late flower'],
    journalTags: ['Canopy thinning', 'Pruned'],
  },
  {
    id: 'scrog',
    name: 'Horizontal SCROG (screen of green)',
    purpose: 'Weave growth through a horizontal net to hold an even, flat canopy.',
    stages: ['Vegetative', 'Pre-flower'],
    highStress: false,
    benefits: ['A very even canopy', 'Maximum light capture', 'Buds are supported by the net later'],
    risks: ['Tucking can bruise growth', 'Plants become hard to move', 'Needs setup before the canopy woodens'],
    recoveryTime: 'Ongoing training rather than a single wound',
    weather: 'Install and train before stems stiffen; the net also steadies the canopy in wind.',
    avoidWhen: ['Starting mid/late flower when stems no longer bend', 'Cramped spacing that traps humidity'],
    journalTags: ['SCROG', 'Trained'],
  },
  {
    id: 'trellis-install',
    name: 'Trellis installation',
    purpose: 'Set posts and netting to carry the future canopy and heavy flowers.',
    stages: ['Vegetative', 'Pre-flower'],
    highStress: false,
    benefits: ['Supports heavy colas', 'Helps the plant resist wind', 'Organizes the canopy'],
    risks: ['Driving posts late can damage roots', 'An under-built structure can fail in wind'],
    recoveryTime: 'Not applicable — structural work',
    weather: 'Build ahead of storm season and anchor for your local wind exposure.',
    avoidWhen: ['Driving posts through an established root ball late in the season', 'Relying on an under-anchored structure on an exposed, windy site'],
    journalTags: ['Trellis installation', 'Trained'],
  },
  {
    id: 'branch-support',
    name: 'Branch support (tying / propping)',
    purpose: 'Tie or prop heavy branches so colas stay upright as they fill in.',
    stages: ['Flowering', 'Late flower'],
    highStress: false,
    benefits: ['Prevents snapped colas', 'Keeps buds off the ground and out of the mud'],
    risks: ['Ties can girdle swelling stems', 'Props can slip under load'],
    recoveryTime: 'Immediate',
    weather: 'Get ahead of wind and rain that weigh down wet buds.',
    avoidWhen: ['Tight ties that bite into swelling stems', 'Waiting until after a branch has already bent or broken'],
    journalTags: ['Branch support', 'Trained'],
  },
  {
    id: 't-post-support',
    name: 'T-post support',
    purpose: 'Use driven T-posts as anchor points for tie-lines around large outdoor plants.',
    stages: ['Vegetative', 'Pre-flower', 'Flowering'],
    highStress: false,
    benefits: ['Strong anchoring for big plants', 'Reusable season to season'],
    risks: ['Driving posts late can damage roots', 'Sharp tops are a hazard', 'Still only as good as its anchoring'],
    recoveryTime: 'Not applicable — structural work',
    weather: 'Install before the plant is huge and before storm season arrives.',
    avoidWhen: ['Driving posts into the root zone of an established plant', 'Treating posts as a certified windproof structure'],
    journalTags: ['T-post support', 'Trained'],
  },
  {
    id: 'wind-protection',
    name: 'Wind protection',
    purpose: 'Add windbreaks and staking to cut wind stress and breakage on exposed sites.',
    stages: ['Seedling', 'Vegetative', 'Pre-flower', 'Flowering', 'Late flower'],
    highStress: false,
    benefits: ['Less windburn and breakage', 'Steadier, less rocked growth'],
    risks: ['Solid windbreaks can trap humidity', 'Overdoing it shades the plant'],
    recoveryTime: 'Not applicable',
    weather: 'The whole point — set up ahead of forecast wind and re-check ties after storms.',
    avoidWhen: ['Solid barriers that trap moisture around dense flower', 'Over-shading the plant just to block wind'],
    journalTags: ['Wind protection', 'Trained'],
  },
  {
    id: 'late-flower-support',
    name: 'Late-season flower support',
    purpose: 'Reinforce heavy, rain-laden colas late in flower to prevent collapse and rot.',
    stages: ['Late flower', 'Harvest'],
    highStress: false,
    benefits: ['Keeps colas upright and off wet ground', 'Reduces bud rot from ground contact'],
    risks: ['Handling ripe buds bruises them and knocks trichomes', 'Ties in a dense canopy trap moisture'],
    recoveryTime: 'Immediate',
    weather: 'Essential before late-season rain or wet snow; keep the canopy able to dry out.',
    avoidWhen: ['Heavy handling of ripe, brittle buds', 'Adding ties that trap moisture in an already damp canopy'],
    journalTags: ['Late-season flower support', 'Trained'],
  },
];

/** All tags that mark a journal entry as a training/support activity. */
export const TRAINING_TAGS: string[] = Array.from(
  new Set(TECHNIQUES.flatMap((t) => t.journalTags)),
);
