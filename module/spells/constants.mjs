export const SYSTEM_ID = 'swords-wizardry';

export const SPELL_FLAG_KEY = 'spell';
export const SPELL_ITEM_SCHEMA_VERSION = 1;
export const SPELL_MESSAGE_SCHEMA_VERSION = 1;
export const SPELL_APPLICATION_SCHEMA_VERSION = 1;

export const SPELL_ACTION_KINDS = Object.freeze([
  'damage',
  'healing',
  'attack',
  'roll',
  'effect',
  'manual'
]);

export const SPELL_TARGET_MODES = Object.freeze([
  'none',
  'single',
  'selected',
  'manual'
]);

export const SPELL_SAVE_OUTCOMES = Object.freeze([
  'none',
  'negates',
  'half',
  'partial',
  'custom'
]);

export const SPELL_ATTACK_MODES = Object.freeze([
  'none',
  'melee',
  'missile',
  'custom'
]);

export const SPELL_LEVEL_SOURCES = Object.freeze([
  'automatic',
  'fixed',
  'prompt',
  'characterLevel',
  'npcHitDice'
]);

export const SPELL_ACTION_LIMITS = Object.freeze({
  count: 32,
  id: 64,
  label: 100,
  formula: 200,
  notes: 1000,
  effectReference: 500,
  targetCount: 100,
  hitPointAmount: 1_000_000
});

export const SPELL_FORMULA_PATHS = Object.freeze([
  'spell.level',
  'spell.casterLevel',
  'spell.abilityModifier'
]);

export const SPELL_APPLICATION_MULTIPLIERS = Object.freeze([0.5, 1, 2]);

export const SPELL_APPLICATION_OPERATION = 'applyHitPoints';
