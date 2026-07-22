// lib/glossary.ts
// Term -> plain-English definition, used for tooltips in the encyclopedia
// reader. Definitions are general horticultural explanations — no products,
// no doses, no guarantees.

export const GLOSSARY: Record<string, string> = {
  'photoperiod': 'A plant whose flowering is triggered by lengthening nights (day length), as opposed to an autoflower that flowers on its own internal clock.',
  'autoflower': 'A plant that begins flowering after a set age regardless of day length.',
  'root zone': 'The volume of medium the roots occupy — where water, air, and nutrients are actually taken up.',
  'vegetative': 'The leafy growth stage before flowering, when the plant builds structure.',
  'transpiration': 'The plant moving water up from the roots and evaporating it from the leaves, which also pulls nutrients along.',
  'chlorosis': 'Yellowing of leaf tissue from loss of chlorophyll — a symptom with many possible causes.',
  'necrosis': 'Dead, brown, crispy tissue.',
  'senescence': 'Natural aging — for example lower leaves yellowing and dropping late in the season.',
  'macronutrient': 'A nutrient needed in larger amounts (nitrogen, phosphorus, potassium, and also calcium, magnesium, sulfur).',
  'micronutrient': 'A nutrient needed in small amounts (such as iron, manganese, zinc).',
  'lockout': 'When nutrients are present but the plant cannot take them up — often because root-zone pH is out of range.',
  'pH': 'A measure of how acidic or alkaline the root zone or solution is; it strongly affects which nutrients are available.',
  'EC': 'Electrical conductivity — a proxy for how much dissolved mineral/salt content is in water or the root zone.',
  'runoff': 'The water that drains out the bottom after watering; testing its pH and EC reveals root-zone conditions.',
  'field capacity': 'The amount of water a medium holds after excess has drained — roughly "full but not waterlogged".',
  'cation exchange capacity': 'A soil\'s ability to hold onto and exchange nutrient ions — higher means more buffering.',
  'amendment': 'Material mixed into soil to improve it — for structure, water-holding, or slow nutrient release.',
  'trichome': 'The tiny resin glands on flowers and leaves; their appearance under magnification is used to judge ripeness.',
  'pistil': 'The hair-like structures on flowers (often white, then darkening) — an early, rough ripeness cue.',
  'calyx': 'The small pod-like structures that make up the bulk of a bud.',
  'node': 'The point on a stem where leaves and branches emerge.',
  'topping': 'Cutting the growing tip above a node to split one main stem into two.',
  'supercropping': 'Gently crushing and bending an inner stem to strengthen and lower a branch.',
  'LST': 'Low-stress training — bending and tying branches to shape the canopy without cutting.',
  'SCROG': 'Screen of green — weaving growth through a horizontal net for an even, flat canopy.',
  'IPM': 'Integrated pest management — a prevent-monitor-identify-escalate approach that starts with the least-aggressive controls.',
  'foliar': 'Relating to the leaves — for example, anything applied to or affecting the foliage.',
  'powdery mildew': 'A fungal disease showing as white, powdery patches on leaf surfaces.',
  'botrytis': 'Gray mold / bud rot — a fungal disease that rots dense, damp buds from the inside.',
  'damping off': 'A disease that collapses seedlings at the soil line, driven by overly wet conditions.',
  'cure': 'A slow, controlled rest after drying that smooths harshness and stabilizes moisture.',
  'RH': 'Relative humidity — how much moisture the air holds relative to its maximum at that temperature.',
  'UV': 'Ultraviolet radiation from the sun; stronger at Front Range elevations.',
  'monsoon': 'The summer pattern of afternoon storms that can bring sudden rain, wind, and hail to the region.',
  'hardening off': 'Gradually acclimating indoor-started plants to outdoor sun, wind, and temperature swings.',
};

export const GLOSSARY_TERMS = Object.keys(GLOSSARY);
