// =============================================================
// src/modules/scanner/plantKnowledge.js
// Plantea — Local Plant Knowledge Base
// =============================================================
// Responsibility: Enrich scan results with trusted care,
//   toxicity and fun facts for common plants — no external API
//   needed. This keeps the AI scanner useful and 100% free.
// =============================================================

const PLANT_KNOWLEDGE = [
  {
    name: 'Peace Lily',
    scientificName: 'Spathiphyllum wallisii',
    aliases: ['peace lily', 'spathiphyllum'],
    category: 'Indoor',
    watering: 'Water once a week; keep soil lightly moist.',
    sunlight: 'Low to medium indirect light.',
    soil: 'Well-drained, peat-based potting mix.',
    temperature: '18–29°C',
    humidity: 'Likes humidity; mist leaves occasionally.',
    toxic: true,
    toxicityNote: 'Toxic to cats and dogs if ingested.',
    careTips: 'Drooping leaves mean it needs water. Wipe dust off leaves monthly.',
  },
  {
    name: 'Snake Plant',
    scientificName: 'Dracaena trifasciata',
    aliases: ['snake plant', 'mother in law tongue', 'sansevieria'],
    category: 'Indoor',
    watering: 'Water every 2–3 weeks; let soil dry between waterings.',
    sunlight: 'Tolerates low light to bright indirect light.',
    soil: 'Free-draining succulent/cactus mix.',
    temperature: '16–32°C',
    humidity: 'Dry air is fine.',
    toxic: true,
    toxicityNote: 'Mildly toxic to pets if ingested.',
    careTips: 'Very forgiving — avoid overwatering (root rot).',
  },
  {
    name: 'Aloe Vera',
    scientificName: 'Aloe barbadensis miller',
    aliases: ['aloe', 'aloe vera', 'ghrit kumari'],
    category: 'Medicinal',
    watering: 'Water every 2–3 weeks; deep but infrequent.',
    sunlight: 'Bright, direct sunlight (6+ hours).',
    soil: 'Sandy, well-draining succulent mix.',
    temperature: '13–30°C',
    humidity: 'Dry conditions preferred.',
    toxic: false,
    toxicityNote: null,
    careTips: 'The gel inside the leaves soothes burns. Repot when crowded.',
  },
  {
    name: 'Rose Plant',
    scientificName: 'Rosa indica',
    aliases: ['rose', 'gulab'],
    category: 'Flowering',
    watering: 'Water deeply 2–3 times a week in summer.',
    sunlight: 'Full sun (6–8 hours daily).',
    soil: 'Rich, loamy, well-draining soil.',
    temperature: '15–28°C',
    humidity: 'Moderate humidity.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Prune spent blooms to encourage new flowers. Feed with rose fertilizer monthly.',
  },
  {
    name: 'Monstera',
    scientificName: 'Monstera deliciosa',
    aliases: ['monstera', 'swiss cheese plant'],
    category: 'Indoor',
    watering: 'Water when top 2 inches of soil are dry.',
    sunlight: 'Bright, indirect light.',
    soil: 'Chunky, airy aroid mix.',
    temperature: '18–29°C',
    humidity: 'Enjoys higher humidity.',
    toxic: true,
    toxicityNote: 'Toxic to pets if ingested (calcium oxalate).',
    careTips: 'The split leaves only develop with good light. Wipe leaves regularly.',
  },
  {
    name: 'Bamboo Palm',
    scientificName: 'Chamaedorea seifrizii',
    aliases: ['bamboo palm', 'reed palm'],
    category: 'Outdoor',
    watering: 'Keep soil consistently moist but not soggy.',
    sunlight: 'Bright, filtered light.',
    soil: 'Rich, well-draining potting mix.',
    temperature: '16–27°C',
    humidity: 'Likes humidity.',
    toxic: false,
    toxicityNote: null,
    careTips: 'An excellent air purifier. Brown tips mean too-dry air.',
  },
  {
    name: 'Basil (Tulsi)',
    scientificName: 'Ocimum tenuiflorum',
    aliases: ['basil', 'tulsi', 'holy basil', 'niazbo'],
    category: 'Medicinal',
    watering: 'Water regularly; keep soil moist.',
    sunlight: 'Full sun (6+ hours).',
    soil: 'Moist, well-draining soil.',
    temperature: '18–30°C',
    humidity: 'Moderate.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Pinch flower buds to keep leaves tender and bushy.',
  },
  {
    name: 'Jasmine',
    scientificName: 'Jasminum sambac',
    aliases: ['jasmine', 'motia', 'mogri'],
    category: 'Flowering',
    watering: 'Water 2–3 times a week, more in heat.',
    sunlight: 'Full sun to partial shade.',
    soil: 'Well-draining, fertile soil.',
    temperature: '18–30°C',
    humidity: 'Moderate to high.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Fragrant flowers at night. Trim after flowering to shape.',
  },
  {
    name: 'Pothos',
    scientificName: 'Epipremnum aureum',
    aliases: ['pothos', 'money plant', 'devil s ivy'],
    category: 'Indoor',
    watering: 'Water when top inch of soil is dry.',
    sunlight: 'Low to bright indirect light.',
    soil: 'General-purpose potting mix.',
    temperature: '16–29°C',
    humidity: 'Tolerant of most humidity.',
    toxic: true,
    toxicityNote: 'Toxic to pets if ingested.',
    careTips: 'Grows fast in water too. Prune vines to keep bushy.',
  },
  {
    name: 'Mango Tree',
    scientificName: 'Mangifera indica',
    aliases: ['mango', 'aam'],
    category: 'Outdoor',
    watering: 'Deep water weekly; reduce in winter.',
    sunlight: 'Full sun.',
    soil: 'Deep, well-drained soil.',
    temperature: '24–40°C',
    humidity: 'Tropical; likes heat.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Fruits in 3–5 years. Prune to maintain shape after harvest.',
  },
  {
    name: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    aliases: ['fiddle leaf fig', 'fiddle fig'],
    category: 'Indoor',
    watering: 'Water weekly; let soil dry slightly between waterings.',
    sunlight: 'Bright, indirect light.',
    soil: 'Well-draining, rich mix.',
    temperature: '18–27°C',
    humidity: 'Likes humidity.',
    toxic: true,
    toxicityNote: 'Toxic to pets if ingested.',
    careTips: 'Sensitive to relocation — pick a spot and keep it.',
  },
  {
    name: 'Marigold',
    scientificName: 'Tagetes erecta',
    aliases: ['marigold', 'genda'],
    category: 'Flowering',
    watering: 'Water 2–3 times weekly in summer.',
    sunlight: 'Full sun.',
    soil: 'Well-draining, any garden soil.',
    temperature: '18–30°C',
    humidity: 'Moderate.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Deadhead spent flowers for continuous blooms.',
  },
  {
    name: 'Mint',
    scientificName: 'Mentha spicata',
    aliases: ['mint', 'pudina', 'podina'],
    category: 'Medicinal',
    watering: 'Keep soil consistently moist.',
    sunlight: 'Partial shade to full sun.',
    soil: 'Rich, moist soil.',
    temperature: '10–30°C',
    humidity: 'High humidity.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Spreads aggressively — grow in a pot to contain it.',
  },
  {
    name: 'Cactus',
    scientificName: 'Cactaceae',
    aliases: ['cactus', 'cacti'],
    category: 'Outdoor',
    watering: 'Water sparingly every 3–4 weeks.',
    sunlight: 'Bright, direct sunlight.',
    soil: 'Gritty, fast-draining cactus mix.',
    temperature: '10–35°C',
    humidity: 'Dry.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Do not overwater — this is the #1 killer of cacti.',
  },
  {
    name: 'Lemon Tree',
    scientificName: 'Citrus limon',
    aliases: ['lemon', 'nimbu', 'lemon tree'],
    category: 'Outdoor',
    watering: 'Water deeply weekly.',
    sunlight: 'Full sun (8+ hours).',
    soil: 'Well-draining citrus mix.',
    temperature: '20–35°C',
    humidity: 'Moderate.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Feed with citrus fertilizer in spring and summer.',
  },
  {
    name: 'Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    aliases: ['hibiscus', 'gudhal', 'shoe flower'],
    category: 'Flowering',
    watering: 'Water daily in hot weather.',
    sunlight: 'Full sun.',
    soil: 'Rich, well-draining soil.',
    temperature: '18–35°C',
    humidity: 'High.',
    toxic: false,
    toxicityNote: null,
    careTips: 'Big, short-lived flowers — fertilize weekly for bloom.',
  },
  {
    name: 'Dracaena',
    scientificName: 'Dracaena marginata',
    aliases: ['dracaena', 'dragon tree'],
    category: 'Indoor',
    watering: 'Water every 1–2 weeks.',
    sunlight: 'Low to bright indirect light.',
    soil: 'Well-draining mix.',
    temperature: '16–29°C',
    humidity: 'Moderate.',
    toxic: true,
    toxicityNote: 'Toxic to pets if ingested.',
    careTips: 'Brown tips from fluoride in tap water — use filtered water.',
  },
  {
    name: 'Money Plant',
    scientificName: 'Epipremnum aureum',
    aliases: ['money plant', 'crassula', 'jade plant'],
    category: 'Indoor',
    watering: 'Water when soil is dry to the touch.',
    sunlight: 'Bright, indirect light.',
    soil: 'Well-draining mix.',
    temperature: '18–27°C',
    humidity: 'Low to moderate.',
    toxic: false,
    toxicityNote: null,
    careTips: 'A symbol of good fortune. Rotate the pot for even growth.',
  },
];

/**
 * Normalise a name for fuzzy matching.
 */
const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Find enriched care data for an identified plant name.
 * Falls back to the first knowledge-base entry when nothing matches.
 *
 * @param {string} name - Identified common name
 * @returns {object} - Enriched care record (always returns a record)
 */
const findPlantCare = (name) => {
  const target = normalize(name);
  if (!target) return PLANT_KNOWLEDGE[0];

  let best = null;
  let bestScore = 0;

  for (const plant of PLANT_KNOWLEDGE) {
    const candidates = [plant.name, plant.scientificName, ...(plant.aliases || [])];
    for (const candidate of candidates) {
      const c = normalize(candidate);
      if (!c) continue;
      if (c === target) return plant; // exact hit
      if (target.includes(c) || c.includes(target)) {
        // prefer the longest matching name (more specific)
        const score = Math.min(c.length, target.length);
        if (score > bestScore) {
          bestScore = score;
          best = plant;
        }
      }
    }
  }

  return best || PLANT_KNOWLEDGE[0];
};

module.exports = { PLANT_KNOWLEDGE, findPlantCare };
