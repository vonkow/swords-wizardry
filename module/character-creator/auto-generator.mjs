// Utilities to auto-generate a level 1 character (stats, ancestry, class, gear, spells)

const PACK_FALLBACK = 'magia-acero-content.magia-and-acero-elementos';

// Configurable class definitions (canonical keys are English; we localize on display)
// min: minimum ability requirements; primes: prime requisites used for weighting
const CLASSES = [
  // Basic classes: no minimums to guarantee fallback
  { key: 'Fighter', primes: ['str'], min: {} },
  { key: 'Wizard', primes: ['int'], min: {} },
  { key: 'Cleric', primes: ['wis'], min: {} },
  { key: 'Thief', primes: ['dex'], min: {} },
  // Optional extended classes if present in your table; left permissive
  { key: 'Paladin', primes: ['str', 'wis', 'cha'], min: { str: 12, wis: 13, cha: 17 } },
  { key: 'Ranger', primes: ['str', 'dex', 'con'], min: { str: 13, dex: 13, con: 14 } },
  { key: 'Druid', primes: ['wis'], min: { wis: 12 } },
  { key: 'Assassin', primes: ['dex', 'str'], min: { dex: 12, str: 12 } },
  { key: 'Monk', primes: ['wis', 'dex', 'con'], min: { wis: 15, dex: 15, con: 11 } }
];

const BASIC_CLASS_KEYS = new Set(['Fighter', 'Wizard', 'Cleric', 'Thief']);
const BASIC_BY_PRIME = { str: 'Fighter', dex: 'Thief', int: 'Wizard', wis: 'Cleric' };

// Simple ancestry definitions with rough requirements and class hints
const ANCESTRIES = [
  { key: 'Human', min: {}, classPrefs: [] },
  { key: 'Half-Elf', min: {}, classPrefs: ['Wizard', 'Cleric'] },
  { key: 'Dwarf', min: { con: 9 }, classPrefs: ['Fighter', 'Thief', 'Ranger'] },
  { key: 'Elf', min: { int: 13 }, classPrefs: ['Wizard', 'Fighter', 'Ranger'] },
  { key: 'Halfling', min: { dex: 9 }, classPrefs: ['Thief', 'Fighter'] }
];

// Key normalization and localization
// Map Spanish and synonyms to English canonical keys
const CLASS_ALIASES_TO_EN = {
  'Guerrero': 'Fighter',
  'Mago': 'Wizard',
  'Hechicero': 'Wizard',
  'Clérigo': 'Cleric',
  'Clerigo': 'Cleric',
  'Ladrón': 'Thief',
  'Ladron': 'Thief',
  'Paladín': 'Paladin',
  'Paladin': 'Paladin',
  'Explorador': 'Ranger',
  'Druida': 'Druid',
  'Asesino': 'Assassin',
  'Monje': 'Monk',
  // English passthrough + synonym
  'Fighter': 'Fighter',
  'Wizard': 'Wizard',
  'Magic-User': 'Wizard',
  'Cleric': 'Cleric',
  'Thief': 'Thief',
  'Ranger': 'Ranger',
  'Druid': 'Druid',
  'Assassin': 'Assassin',
  'Monk': 'Monk'
};
const ANCESTRY_ALIASES_TO_EN = {
  'Humano': 'Human',
  'Semielfo': 'Half-Elf',
  'Semi-elfo': 'Half-Elf',
  'Semi elfo': 'Half-Elf',
  'Enano': 'Dwarf',
  'Elfo': 'Elf',
  'Mediano': 'Halfling',
  // English passthrough
  'Human': 'Human',
  'Half-Elf': 'Half-Elf',
  'Dwarf': 'Dwarf',
  'Elf': 'Elf',
  'Halfling': 'Halfling'
};

function normalizeClassKey(key) {
  if (!key) return key;
  if (CLASSES.find(c => c.key === key)) return key; // already canonical
  // Try alias map to English
  return CLASS_ALIASES_TO_EN[key] || key;
}

function normalizeAncestryKey(key) {
  if (!key) return key;
  if (ANCESTRIES.find(a => a.key === key)) return key; // already canonical
  return ANCESTRY_ALIASES_TO_EN[key] || key;
}

const CLASS_LABELS = {
  'Fighter': { en: 'Fighter', es: 'Guerrero', de: 'Kämpfer' },
  'Wizard': { en: 'Wizard', es: 'Mago', de: 'Zauberer' },
  'Cleric': { en: 'Cleric', es: 'Clérigo', de: 'Kleriker' },
  'Thief': { en: 'Thief', es: 'Ladrón', de: 'Dieb' },
  'Paladin': { en: 'Paladin', es: 'Paladín', de: 'Paladin' },
  'Ranger': { en: 'Ranger', es: 'Explorador', de: 'Waldläufer' },
  'Druid': { en: 'Druid', es: 'Druida', de: 'Druide' },
  'Assassin': { en: 'Assassin', es: 'Asesino', de: 'Assassine' },
  'Monk': { en: 'Monk', es: 'Monje', de: 'Mönch' }
};

const ANCESTRY_LABELS = {
  'Human': { en: 'Human', es: 'Humano', de: 'Mensch' },
  'Half-Elf': { en: 'Half-Elf', es: 'Semielfo', de: 'Halbelf' },
  'Dwarf': { en: 'Dwarf', es: 'Enano', de: 'Zwerg' },
  'Elf': { en: 'Elf', es: 'Elfo', de: 'Elf' },
  'Halfling': { en: 'Halfling', es: 'Mediano', de: 'Halbling' }
};

function localizeClassKey(key) {
  const lang = (game.i18n?.lang || 'en').toLowerCase();
  const map = CLASS_LABELS[key];
  if (!map) return key;
  return map[lang] || map.en || key;
}

function localizeAncestryKey(key) {
  const lang = (game.i18n?.lang || 'en').toLowerCase();
  const map = ANCESTRY_LABELS[key];
  if (!map) return key;
  return map[lang] || map.en || key;
}

// Starter kits by class, using Spanish item names with common English fallbacks
const STARTER_KITS = {
  'Fighter': ['Espada larga|Longsword', 'Escudo|Shield', 'Cota de malla|Chain Mail'],
  'Wizard': ['Daga|Dagger', 'Libro de conjuros|Spellbook'],
  'Cleric': ['Maza|Mace', 'Escudo|Shield', 'Cota de malla|Chain Mail'],
  'Thief': ['Daga|Dagger', 'Espada corta|Short Sword', 'Armadura de cuero|Leather Armor'],
  'Paladin': ['Espada larga|Longsword', 'Escudo|Shield', 'Cota de malla|Chain Mail'],
  'Ranger': ['Espada larga|Longsword', 'Arco corto|Shortbow', 'Armadura de cuero tachonado|Studded Leather'],
  'Druid': ['Bastón|Quarterstaff', 'Armadura de cuero|Leather Armor'],
  'Assassin': ['Daga|Dagger', 'Espada corta|Short Sword', 'Armadura de cuero|Leather Armor'],
  'Monk': ['Bastón|Quarterstaff']
};

// Basic weapon allowance by class to weed out bad picks (heuristic)
const DISALLOWED = {
  'Cleric': [/espada|sword/i, /arco|bow/i],
  'Druid': [/metal|mail|plate|chain|cota|placas/i],
  'Wizard': [/armadura|armor|mail|plate|shield|escudo|cota|placas/i]
};

// --- Ability -> Modifiers tables rewritten (range-based, different naming) ---
const STR_BRACKETS = [
  { min: 18, hit: 2, dmg: 3, doors: [1, 5], carry: 50 },
  { min: 17, hit: 2, dmg: 2, doors: [1, 4], carry: 30 },
  { min: 16, hit: 1, dmg: 1, doors: [1, 3], carry: 15 },
  { min: 15, hit: 1, dmg: 0, doors: [1, 2], carry: 10 },
  { min: 12, hit: 0, dmg: 0, doors: [1, 2], carry: 5 },
  { min: 8, hit: 0, dmg: 0, doors: [1, 2], carry: 0 },
  { min: 6, hit: -1, dmg: 0, doors: [1, 1], carry: -5 },
  { min: -Infinity, hit: -2, dmg: -1, doors: [1, 1], carry: -10 },
];

const DEX_BRACKETS = [
  { min: 13, missile: 1, ac: 1 },
  { min: 9, missile: 0, ac: 0 },
  { min: -Infinity, missile: -1, ac: -1 },
];

const CON_BRACKETS = [
  { min: 13, hp: 1, raise: 100 },
  { min: 9, hp: 0, raise: 75 },
  { min: -Infinity, hp: -1, raise: 50 },
];

const INT_BRACKETS = [
  { min: 18, addLang: 6, maxSpell: 9, learn: 95, perLevel: [8, 'ALL'] },
  { min: 17, addLang: 5, maxSpell: 9, learn: 85, perLevel: [7, 'ALL'] },
  { min: 16, addLang: 5, maxSpell: 8, learn: 75, perLevel: [6, 10] },
  { min: 15, addLang: 4, maxSpell: 8, learn: 75, perLevel: [6, 10] },
  { min: 14, addLang: 4, maxSpell: 7, learn: 65, perLevel: [5, 8] },
  { min: 13, addLang: 3, maxSpell: 7, learn: 65, perLevel: [5, 8] },
  { min: 12, addLang: 3, maxSpell: 6, learn: 55, perLevel: [4, 6] },
  { min: 11, addLang: 2, maxSpell: 6, learn: 50, perLevel: [4, 6] },
  { min: 10, addLang: 2, maxSpell: 5, learn: 50, perLevel: [4, 6] },
  { min: 9, addLang: 1, maxSpell: 5, learn: 45, perLevel: [3, 5] },
  { min: 8, addLang: 1, maxSpell: 5, learn: 40, perLevel: [3, 5] },
  { min: -Infinity, addLang: 0, maxSpell: 4, learn: 30, perLevel: [2, 4] },
];

const CHA_BRACKETS = [
  { min: 18, specHirelings: 7, retainerMoraleAdjustment: 4 },
  { min: 17, specHirelings: 6, retainerMoraleAdjustment: 2 },
  { min: 15, specHirelings: 5, retainerMoraleAdjustment: 1 },
  { min: 12, specHirelings: 4, retainerMoraleAdjustment: 0 },
  { min: 8, specHirelings: 3,	 retainerMoraleAdjustment: -1 },
  { min: 6, specHirelings: 2, retainerMoraleAdjustment: -2 },
  { min: -Infinity, specHirelings: 1, retainerMoraleAdjustment: -4 },
];

function pickRange(table, score) {
  const s = Number(score) || 0;
  for (const row of table) {
    if (s >= row.min) return row;
  }
  return table[table.length - 1];
}

export function computeModifiersFromScores(abilities, clsKey) {
  const normClass = normalizeClassKey(clsKey);
  const s = pickRange(STR_BRACKETS, abilities.str ?? 10);
  const d = pickRange(DEX_BRACKETS, abilities.dex ?? 10);
  const c = pickRange(CON_BRACKETS, abilities.con ?? 10);
  const i = pickRange(INT_BRACKETS, abilities.int ?? 10);
  const ch = pickRange(CHA_BRACKETS, abilities.cha ?? 10);

  const minPer = i.perLevel?.[0] ?? 0;
  const maxPer = i.perLevel?.[1] ?? 0;
  const maxPerNum = typeof maxPer === 'string' ? 99 : Number(maxPer || 0);

  return {
    // Only Fighters receive positive Strength melee to-hit; others only apply penalties
    toHit: { value: normClass === 'Fighter' ? Number(s.hit || 0) : Math.min(Number(s.hit || 0), 0) },
    // Fighters get full Str damage bonus; others only apply penalties (no positive bonus)
    damage: { value: normClass === 'Fighter' ? Number(s.dmg || 0) : Math.min(Number(s.dmg || 0), 0) },
    openDoors: { value: Number(Array.isArray(s.doors) ? s.doors[1] : 0) },
    carry: { value: Number(s.carry || 0) },
    missileToHit: { value: Number(d.missile || 0) },
    ac: { value: Number(d.ac || 0) },
    hp: { value: Number(c.hp || 0) },
    raiseDeadChance: { value: Number(c.raise || 0) },
    additionalLanguages: { value: Number(i.addLang || 0) },
    maximumSpellLevel: { value: Number(i.maxSpell || 0) },
    chanceToUnderstandSpell: { value: Number(i.learn || 0) },
    minimumSpellsPerLevel: { value: Number(minPer || 0) },
    maximumSpellsPerLevel: { value: Number(maxPerNum) },
    maximumSpecialHirelings: { value: Number(ch.specHirelings || 0) },
  retainerMoraleAdjustment: { value: Number(ch.retainerMoraleAdjustment || 0) }
  };
}

async function roll3d6() { return (await new Roll('3d6').evaluate({ async: true })).total; }

function meetsMinimums(abilities, mins) {
  return Object.entries(mins).every(([k, v]) => (abilities[k] ?? 0) >= v);
}

function scoreClass(abilities, cls) {
  // Sum of prime requisites plus small contribution of second-highest stat
  const primeSum = cls.primes.reduce((s, k) => s + (abilities[k] ?? 0), 0);
  const sorted = Object.values(abilities).sort((a, b) => b - a);
  const top2 = (sorted[1] ?? 0) * 0.25;
  return primeSum + top2;
}

function weightedRandom(candidates) {
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c.value;
  }
  return candidates[0]?.value;
}

function pickClass(abilities, preferredAncestryKey) {
  // 1) Clases avanzadas que cumplen requisitos mínimos
  let advanced = CLASSES.filter(c => !BASIC_CLASS_KEYS.has(c.key) && meetsMinimums(abilities, c.min));

  // 2) Entre las básicas, identifica la(s) asociada(s) al atributo más alto entre STR/DEX/INT/WIS
  const core = { str: abilities.str ?? 0, dex: abilities.dex ?? 0, int: abilities.int ?? 0, wis: abilities.wis ?? 0 };
  const max = Math.max(core.str, core.dex, core.int, core.wis);
  const topKeys = Object.entries(core).filter(([k, v]) => v === max).map(([k]) => k);
  const basicCandidates = topKeys
    .map(primeKey => BASIC_BY_PRIME[primeKey])
    .filter(Boolean)
    .map(name => CLASSES.find(c => c.key === name))
    .filter(Boolean);

  // 3) Combina opciones y elige uniformemente al azar
  let options = [...advanced, ...basicCandidates];
  // If an ancestry is preferred/fixed, filter classes allowed for it
  const prefAn = preferredAncestryKey ? normalizeAncestryKey(preferredAncestryKey) : null;
  if (prefAn) options = options.filter(c => isClassAllowedForAncestry(c.key, prefAn));
  if (!options.length) {
    // Fallback improbable: if something fails, return Fighter
    return CLASSES.find(c => c.key === 'Fighter');
  }
  const idx = Math.floor(Math.random() * options.length);
  return options[idx];
}

function pickAncestry(abilities, chosenClass) {
  const allowed = allowedAncestriesForClass(chosenClass.key);
  const viable = ANCESTRIES.filter(a => allowed.includes(a.key) && meetsMinimums(abilities, a.min));
  if (!viable.length) return 'Human';
  // Mild preference for ancestries that like the chosen class
  const cands = viable.map(a => ({
    value: a.key,
    weight: 1 + (a.classPrefs.includes(chosenClass.key) ? 2 : 0)
  }));
  return weightedRandom(cands);
}

export async function ensurePack(collectionName) {
  if (collectionName) return game.packs.get(collectionName) ?? null;
  const candidates = Array.from(game.packs).filter(p => p.documentName === 'Item');
  const findBy = (re) => candidates.find(p => re.test(`${p.collection} ${p.title}`));
  const lang = (game.i18n?.lang || 'en').toLowerCase();
  if (lang === 'es') {
    return game.packs.get('magia-acero-content.magia-and-acero-elementos')
      || findBy(/magia[- ]?acero|magia.*acero/i)
      || findBy(/elementos/i)
      || candidates[0]
      || null;
  } else {
    return game.packs.get('swords-wizardry-content.items')
      || findBy(/swords[- ]?wizardry[- ]?content|swords.*wizardry.*items/i)
      || findBy(/elements|items/i)
      || candidates[0]
      || null;
  }
}

function nameMatcher(candidate) {
  // Allow "Nombre ES|Name EN" patterns
  const parts = candidate.split('|').map(s => s.trim());
  return (name) => parts.some(p => new RegExp(`^${p}$`, 'i').test(name));
}

async function fetchByNames(pack, names) {
  if (!pack) return [];
  if (!pack.index.size) await pack.getIndex({ fields: ['type', 'name', 'system.spellLevel'] });
  const out = [];
  for (const n of names) {
    const matchFn = nameMatcher(n);
    const entry = pack.index.find(e => matchFn(e.name));
    if (!entry) continue;
    const doc = await pack.getDocument(entry._id);
    out.push(doc.toObject());
  }
  return out;
}

function regexAnyMatch(text, regexList) {
  const lower = (text || '').toLowerCase();
  return regexList.some(rx => rx.test(lower));
}

function folderPath(folder) {
  if (!folder) return '';
  // Build path like "Padre/Hijo/Nombre" from a Folder-like object
  try {
    // If it's an ID string, bail (caller should map via pack)
    if (typeof folder === 'string') return '';
    const names = [];
    let f = folder;
    let guard = 0;
    while (f && guard++ < 20) {
      names.unshift(f.name?.toLowerCase?.() || '');
      f = f.parent ?? null;
    }
    return names.filter(Boolean).join('/');
  } catch (_) {
    return '';
  }
}

// Build a folderPath using compendium folder IDs (more reliable than doc.folder)
function folderPathFromPack(pack, folderId) {
  try {
    if (!folderId) return '';
    const byId = new Map((pack.folders ?? []).map(fd => [fd.id, fd]));
    const names = [];
    let node = byId.get(folderId);
    let guard = 0;
    while (node && guard++ < 20) {
      names.unshift((node.name || '').toLowerCase());
      node = node.folder ? byId.get(node.folder) : null;
    }
    return names.filter(Boolean).join('/');
  } catch (_) {
    return '';
  }
}

// Resolve a document's folder path robustly: prefer pack folder tree by ID, else traverse Folder object
function resolveFolderPath(pack, doc) {
  // Try by ID through the pack folder tree
  const id = doc?.folder?.id ?? doc?.folder;
  const viaPack = folderPathFromPack(pack, id);
  if (viaPack) return viaPack;
  // Fallback: traverse Folder object chain if present
  return folderPath(doc.folder);
}

// Heurísticas de rasgos de clase / raza (ajustables según tu compendio)
const CLASS_FEATURE_KEYWORDS = {
  'Fighter': [/\bguerrero\b|\bfighter\b|\bfighting[- ]man\b/i],
  'Wizard': [/\bmago\b|hechicer|\bmagician\b|magic[- ]user|\bwizard\b/i],
  'Cleric': [/cl[eé]rigo|\bcleric\b/i],
  'Thief': [/ladr[oó]n|\bthief\b|thieving/i],
  'Paladin': [/palad[ií]n|\bpaladin\b/i],
  'Ranger': [/explorador|\branger\b|rastreador|tracking/i],
  'Druid': [/druida|\bdruid\b/i],
  'Assassin': [/asesino|\bassassin\b/i],
  'Monk': [/monje|\bmonk\b/i]
};

const ANCESTRY_FEATURE_KEYWORDS = {
  'Human': [/\bhumano\b|\bhuman\b/i],
  'Half-Elf': [/\bsemi[- ]?elfo\b|\bhalf[- ]?elf\b/i],
  'Dwarf': [/\benano\b|\bdwarf\b/i],
  'Elf': [/\belfo\b|\belf\b/i],
  'Halfling': [/\bmediano\b|\bhalfling\b|\bhobbit\b/i]
};

// Class ↔ Ancestry restrictions (canonical English)
const CLASS_ALLOWED_ANCESTRIES = {
  'Assassin': ['Human'],
  'Cleric': ['Human', 'Half-Elf'],
  'Druid': ['Human'],
  'Fighter': 'ANY',
  'Wizard': ['Human', 'Elf', 'Half-Elf'],
  'Monk': ['Human'],
  'Paladin': ['Human'],
  'Ranger': ['Human'],
  'Thief': 'ANY'
};

function allowedAncestriesForClass(clsKey) {
  const norm = normalizeClassKey(clsKey);
  const rule = CLASS_ALLOWED_ANCESTRIES[norm];
  if (!rule || rule === 'ANY') return ANCESTRIES.map(a => a.key);
  return rule;
}

function isClassAllowedForAncestry(clsKey, ancestryKey) {
  const list = allowedAncestriesForClass(clsKey);
  const anc = normalizeAncestryKey(ancestryKey);
  return list.includes(anc);
}

async function fetchFeaturesByKeywords(pack, regexList) {
  if (!pack) return [];
  if (!pack.index.size) await pack.getIndex({ fields: ['type', 'name', 'folder'] });
  // Load all feature docs and filter ONLY by folder path match
  const allFeatEntries = pack.index.filter(e => e.type === 'feature');
  const docs = await Promise.all(allFeatEntries.map(e => pack.getDocument(e._id)));
  const matched = docs.filter(doc => regexAnyMatch(folderPath(doc.folder), regexList));
  return matched.map(d => d.toObject());
}

// Spell folder matching hints (bilingual: ES/EN)
const SPELL_FOLDER_KEYWORDS = {
  'Wizard': [/\bconjuros\b.*\bmago\b/i, /\bmago\b.*\bconjuros\b/i, /\bspells?\b.*\bwizard\b/i, /\bwizard\b.*\bspells?\b/i, /magic[- ]?user/i],
  'Cleric': [/\bconjuros\b.*cl[eé]rigo\b/i, /cl[eé]rigo\b.*\bconjuros\b/i, /\bspells?\b.*\bcleric\b/i, /\bcleric\b.*\bspells?\b/i],
  'Druid': [/\bconjuros\b.*\bdruida\b/i, /\bdruida\b.*\bconjuros\b/i, /\bspells?\b.*\bdruid\b/i, /\bdruid\b.*\bspells?\b/i]
};

const CLASS_POSITIVE_HINTS = {
  'Wizard': [/\bwizard\b/i, /\bmago\b/i, /magic[- ]?user/i],
  'Cleric': [/\bcleric\b/i, /cl[eé]rigo/i],
  'Druid': [/\bdruid\b/i, /druida/i]
};

// Hardcoded Level-1 spell name lists (bilingual: "ES|EN")
const LVL1_SPELL_NAMES = {
  Wizard: [
    'Detectar magia|Detect Magic',
    'Dormir|Sleep',
    'Escudo|Shield',
    'Hechizar persona|Charm Person',
    'Leer idiomas|Read Languages',
    'Leer magia|Read Magic',
    'Luz|Light',
    'Protección contra el mal|Protection from Evil',
    'Proyectil mágico|Magic Missile',
    'Retener portal|Hold Portal'
  ],
  Druid: [
    'Detectar magia|Detect Magic',
    'Detectar trampas y pozos|Detect Snares & Pits',
    'Fuego imaginario|Faerie Fire',
    'Localizar animal|Locate Animal',
    'Predecir el tiempo|Predict Weather',
    'Purificar el agua|Purify Water'
  ]
};

export async function fetchClassFeatures(pack, clsKey) {
  const rx = CLASS_FEATURE_KEYWORDS[normalizeClassKey(clsKey)];
  if (!rx) return [];
  return fetchFeaturesByKeywords(pack, rx);
}

export async function fetchAncestryFeatures(pack, ancestryKey) {
  const rx = ANCESTRY_FEATURE_KEYWORDS[normalizeAncestryKey(ancestryKey)];
  if (!rx) return [];
  return fetchFeaturesByKeywords(pack, rx);
}

function filterAllowedByClass(clsKey, items) {
  const rules = DISALLOWED[normalizeClassKey(clsKey)];
  if (!rules) return items;
  return items.filter(it => !rules.some(rx => rx.test(it.name)));
}

async function pickStarterKit(clsKey, pack) {
  const names = STARTER_KITS[normalizeClassKey(clsKey)] ?? ['Daga|Dagger'];
  const items = await fetchByNames(pack, names);
  // Remove any spell-type items accidentally matched by name (e.g., Escudo vs Shield spell)
  const filtered = items.filter(i => (i.type || '').toLowerCase() !== 'spell');
  return filterAllowedByClass(clsKey, filtered);
}

function classHasLevel1Spells(clsKey) {
  // At level 1, only Wizards and Druids get spells
  return ['Wizard', 'Druid'].includes(normalizeClassKey(clsKey));
}

function normalizeSpellClass(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  if (/wizard|mage|mago|magic[- ]?user/.test(s)) return 'Wizard';
  if (/cleric|cl[eé]rigo/.test(s)) return 'Cleric';
  if (/druid|druida/.test(s)) return 'Druid';
  return null;
}

function detectSpellClass(doc, pathHint) {
  // 1) Flags/system explicit
  const flagClass = normalizeSpellClass(doc?.flags?.['swords-wizardry']?.spellClass || doc?.system?.spellClass);
  if (flagClass) return flagClass;
  // 2) Folder path
  const path = pathHint || folderPath(doc.folder);
  const fromFolder = normalizeSpellClass(path);
  if (fromFolder) return fromFolder;
  // 3) Name hints
  const name = doc?.name ?? '';
  const allHints = ['Wizard','Cleric','Druid'];
  for (const k of allHints) {
    const hints = CLASS_POSITIVE_HINTS[k] || [];
    if (hints.some(rx => rx.test(name))) return k;
  }
  return null;
}

function getSpellLevel(doc, pathHint) {
  // Try multiple common locations for spell level
  const sys = doc?.system ?? {};
  const candidates = [
    sys.spellLevel,
    sys.level,
    sys?.data?.spellLevel,
    sys?.data?.level,
    sys?.spell?.level
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  // Fallback: parse from folder path like "Conjuros/Mago/Nivel 1"
  const s = String(pathHint || '').toLowerCase();
  const m = s.match(/(?:nivel|level)\s*(\d+)/i);
  if (m) return Number(m[1]);
  return NaN;
}

async function pickRandomSpells(pack, clsKey, count = 1) {
  // Safety: only Wizard and Druid get level-1 spells
  if (!classHasLevel1Spells(clsKey)) return [];
  if (!pack) return [];
  if (!pack.index.size) await pack.getIndex({ fields: ['type', 'name', 'folder', 'system.spellLevel'] });
  const allEntries = [...pack.index];
  if (!allEntries.length) return [];

  const norm = normalizeClassKey(clsKey);
  // -1) Prefer hardcoded spell name lists for deterministic class-correct picks
  const byNames = LVL1_SPELL_NAMES[norm];
  if (Array.isArray(byNames) && byNames.length) {
    const docs = await fetchByNames(pack, byNames);
    if (docs.length) {
      const pool = [...docs];
      const picked = [];
      for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }
      if (picked.length) return picked;
    }
  }
  const docsLoaded = await Promise.all(allEntries.map(e => pack.getDocument(e._id)));
  const pathFor = (d) => resolveFolderPath(pack, d);

  // 0) Deterministic: look for folder chain "Conjuros|Spells / <Class> / Nivel|Level 1"
  const allFolders = (pack.folders ?? []).map(fd => ({ id: fd.id, path: folderPathFromPack(pack, fd.id) }));
  const fold = (s) => (s || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
  const clsTag = norm === 'Wizard' ? /(mago|wizard|magic[- ]?user)/ : /(druida|druid)/;
  const level1 = /(nivel\s*1|level\s*1)/;
  const spellsRoot = /(conjuros|spells)/;
  const matchFolder = (p) => spellsRoot.test(p) && clsTag.test(p) && level1.test(p);
  const levelFolder = allFolders
    .map(f => ({ id: f.id, path: fold(f.path) }))
    .filter(f => matchFolder(f.path))
    // prefer deepest path (longest), in case of multiple matches
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (levelFolder) {
    const inFolderIdx = allEntries.filter(e => e.folder === levelFolder.id);
    if (inFolderIdx.length) {
      const inFolderDocs = await Promise.all(inFolderIdx.map(e => pack.getDocument(e._id)));
      const spellsFirst = inFolderDocs.filter(d => (d.type || '').toLowerCase() === 'spell');
      const pool0 = (spellsFirst.length ? spellsFirst : inFolderDocs);
  const pool = pool0.filter(d => Number(getSpellLevel(d, pathFor(d)) || 1) === 1);
      const picks = [];
      const bag = [...pool];
      for (let i = 0; i < Math.min(count, bag.length); i++) {
        const idx = Math.floor(Math.random() * bag.length);
        picks.push(bag.splice(idx, 1)[0]);
      }
      if (picks.length) return picks.map(d => d.toObject());
    }
  }
  // Primary: exact class match via detection + level 1
  let eligible = docsLoaded.filter(d => detectSpellClass(d, pathFor(d)) === norm && getSpellLevel(d, pathFor(d)) === 1);
  if (!eligible.length) {
    // Secondary: folder hints, then level 1 or lowest level if none marked
    const folderHints = SPELL_FOLDER_KEYWORDS[norm] || [];
    const inFolderAll = docsLoaded.filter(d => folderHints.length ? regexAnyMatch(pathFor(d) || '', folderHints) : false);
    const inFolder = inFolderAll.filter(d => (d.type || '').toLowerCase() === 'spell')
      .concat(inFolderAll.filter(d => (d.type || '').toLowerCase() !== 'spell'));
    const lvl1 = inFolder.filter(d => getSpellLevel(d, pathFor(d)) === 1);
    if (lvl1.length) eligible = lvl1; else if (inFolder.length) {
      const withLevels = inFolder.map(d => ({ d, lvl: getSpellLevel(d, pathFor(d)) })).filter(x => Number.isFinite(x.lvl));
      if (withLevels.length) {
        const minLvl = Math.min(...withLevels.map(x => x.lvl));
        eligible = withLevels.filter(x => x.lvl === minLvl).map(x => x.d);
      } else {
        eligible = inFolder;
      }
    }
  }
  if (!eligible.length) return [];

  const pool = [...eligible];
  const pickedDocs = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    pickedDocs.push(pool.splice(idx, 1)[0]);
  }
  return pickedDocs.map(d => d.toObject());
}

export class AutoGenerator {
  static async generateLevel1({ name, folder, packCollection, autoEquip = true, autoSpells = true, spellCount = 1, fixedClass, fixedAncestry } = {}) {
    const abilities = {
      str: await roll3d6(), dex: await roll3d6(), con: await roll3d6(),
      int: await roll3d6(), wis: await roll3d6(), cha: await roll3d6()
    };
    // Normalize fixed inputs
    const chosenClassName = (fixedClass ?? '').toString().trim();
    const chosenAncestryName = (fixedAncestry ?? '').toString().trim();
    const normFixedClass = chosenClassName ? normalizeClassKey(chosenClassName) : '';
    const normFixedAncestry = chosenAncestryName ? normalizeAncestryKey(chosenAncestryName) : '';

    // Determine class (fixed or random), respecting ancestry restrictions when ancestry is fixed
    let cls;
    if (normFixedClass) {
      cls = CLASSES.find(c => c.key === normFixedClass) ?? pickClass(abilities, normFixedAncestry || undefined);
    } else {
      cls = pickClass(abilities, normFixedAncestry || undefined);
    }
    // Enforce chosen class minimums by raising ability scores to the minimums
    if (cls?.min) {
      for (const [k, v] of Object.entries(cls.min)) {
        if (typeof abilities[k] === 'number' && abilities[k] < v) abilities[k] = v;
      }
    }

    // Determine ancestry (fixed or random) and enforce compatibility
    let ancestry;
    if (normFixedAncestry) {
      if (!isClassAllowedForAncestry(cls.key, normFixedAncestry)) {
        const allowed = allowedAncestriesForClass(cls.key);
        const viable = ANCESTRIES.filter(a => allowed.includes(a.key) && meetsMinimums(abilities, a.min));
        ancestry = (viable[0]?.key) || (allowed[0]) || 'Human';
        ui?.notifications?.warn?.(game.i18n?.localize('SWORDS_WIZARDRY.CharacterCreator.InvalidClassAncestry') || 'Class and Ancestry were incompatible; adjusted ancestry.');
      } else {
        ancestry = normFixedAncestry;
      }
    } else {
      ancestry = pickAncestry(abilities, cls);
    }
    const gp = (await new Roll('3d6').evaluate({ async: true })).total * 10;

  const actor = await Actor.create({
      name: name || (game.i18n?.localize('SWORDS_WIZARDRY.CharacterCreator.DefaultName') ?? 'New Adventurer'),
      type: 'character',
      img: '/systems/swords-wizardry/assets/game-icons-net/cowled.svg',
      system: {
        abilities: {
          str: { value: abilities.str }, dex: { value: abilities.dex }, con: { value: abilities.con },
          int: { value: abilities.int }, wis: { value: abilities.wis }, cha: { value: abilities.cha }
        },
    class: localizeClassKey(cls.key),
    ancestry: localizeAncestryKey(ancestry),
    treasure: { gp },
    modifiers: computeModifiersFromScores(abilities, cls.key)
      },
      permission: { default: 3 },
      folder
    });

    const pack = await ensurePack(packCollection);
  const items = [];

  if (autoEquip) {
      const kit = await pickStarterKit(cls.key, pack);
      items.push(...kit);
    }

  if (autoSpells && classHasLevel1Spells(cls.key)) {
      const spells = await pickRandomSpells(pack, cls.key, Math.max(1, Number(spellCount) || 1));
      items.push(...spells);
    }

    // Safety: ensure only Wizard/Druid end with spell items; strip any stray spells for other classes
    if (!classHasLevel1Spells(cls.key)) {
      for (let i = items.length - 1; i >= 0; i--) {
        if ((items[i].type || '').toLowerCase() === 'spell') items.splice(i, 1);
      }
    }

    // Rasgos de clase y raza
    try {
  const classFeats = await fetchClassFeatures(pack, cls.key);
  const ancestryFeats = await fetchAncestryFeatures(pack, ancestry);
      items.push(...classFeats, ...ancestryFeats);
    } catch (e) {
      console.warn('S&W AutoGen: no se pudieron obtener rasgos de clase/raza', e);
    }

    if (items.length) await actor.createEmbeddedDocuments('Item', items);

    // Return summary for logging/UI if needed
    return {
      actor,
      abilities,
      cls: localizeClassKey(cls.key),
      ancestry: localizeAncestryKey(ancestry),
      itemsAdded: items.map(i => i.name)
    };
  }
}

export { CLASSES, ANCESTRIES };
export { localizeClassKey, localizeAncestryKey, normalizeClassKey, normalizeAncestryKey };

// Derivar nombres de clases disponibles según rasgos presentes en el pack
export async function getAvailableClassesFromPack(pack) {
  const keys = CLASSES.map(c => c.key);
  if (!pack) return keys.map(k => ({ key: k, label: localizeClassKey(k) }));
  const out = [];
  for (const key of keys) {
    const feats = await fetchClassFeatures(pack, key);
    if (feats.length) out.push({ key, label: localizeClassKey(key) });
  }
  const list = out.length ? out : keys.map(k => ({ key: k, label: localizeClassKey(k) }));
  return list;
}

// Derivar nombres de razas disponibles según rasgos presentes en el pack
export async function getAvailableAncestriesFromPack(pack) {
  const names = ANCESTRIES.map(a => a.key);
  if (!pack) return names.map(k => ({ key: k, label: localizeAncestryKey(k) }));
  const out = [];
  for (const key of names) {
    const feats = await fetchAncestryFeatures(pack, key);
    if (feats.length) out.push({ key, label: localizeAncestryKey(key) });
  }
  const list = out.length ? out : names.map(k => ({ key: k, label: localizeAncestryKey(k) }));
  // Always ensure Human appears in the dropdown even if it has no specific feature entries
  if (!list.some(e => e.key === 'Human')) {
    list.unshift({ key: 'Human', label: localizeAncestryKey('Human') });
  }
  return list;
}
