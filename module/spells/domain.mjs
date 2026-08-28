import {
  SPELL_ACTION_KINDS,
  SPELL_ACTION_LIMITS,
  SPELL_APPLICATION_MULTIPLIERS,
  SPELL_APPLICATION_OPERATION,
  SPELL_APPLICATION_SCHEMA_VERSION,
  SPELL_ATTACK_MODES,
  SPELL_FORMULA_PATHS,
  SPELL_LEVEL_SOURCES,
  SPELL_MESSAGE_SCHEMA_VERSION,
  SPELL_SAVE_OUTCOMES,
  SPELL_TARGET_MODES
} from './constants.mjs';

const ACTION_FIELDS = new Set([
  'id', 'kind', 'label', 'formula', 'target', 'save', 'attack', 'effect', 'notes'
]);
const TARGET_FIELDS = new Set(['mode']);
const SAVE_FIELDS = new Set(['outcome', 'notes']);
const ATTACK_FIELDS = new Set(['mode', 'notes']);
const EFFECT_FIELDS = new Set(['reference']);
const APPLICATION_FIELDS = new Set([
  'schemaVersion',
  'requestId',
  'operation',
  'messageUuid',
  'actionId',
  'actionFingerprint',
  'targetUuid',
  'kind',
  'amount',
  'multiplier'
]);
const FORMULA_ACTION_KINDS = new Set(['damage', 'healing', 'attack', 'roll']);
const UUID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+$/;
const ACTION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const FORMULA_REFERENCE_PATTERN = /@([A-Za-z][A-Za-z0-9_.]*)/g;

export class SpellValidationError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'SpellValidationError';
    this.code = code;
    this.details = details;
  }
}

export function normalizeSpellAction(action = {}, { generateId } = {}) {
  assertPlainObject(action, 'INVALID_ACTION');
  assertKnownFields(action, ACTION_FIELDS);

  const kind = normalizeChoice(
    action.kind ?? 'manual',
    SPELL_ACTION_KINDS,
    'INVALID_ACTION_KIND'
  );
  const id = normalizeActionId(action.id ?? generateId?.());
  const label = normalizeText(action.label, {
    field: 'label',
    max: SPELL_ACTION_LIMITS.label,
    required: true
  });
  const formula = normalizeText(action.formula, {
    field: 'formula',
    max: SPELL_ACTION_LIMITS.formula
  });

  if (FORMULA_ACTION_KINDS.has(kind) && !formula) {
    throw new SpellValidationError('FORMULA_REQUIRED', { kind });
  }
  if (formula) validateFormulaReferences(formula);

  const target = normalizeNested(action.target, TARGET_FIELDS, {
    mode: normalizeChoice(
      action.target?.mode ?? 'none',
      SPELL_TARGET_MODES,
      'INVALID_TARGET_MODE'
    )
  });
  const save = normalizeNested(action.save, SAVE_FIELDS, {
    outcome: normalizeChoice(
      action.save?.outcome ?? 'none',
      SPELL_SAVE_OUTCOMES,
      'INVALID_SAVE_OUTCOME'
    ),
    notes: normalizeText(action.save?.notes, {
      field: 'save.notes',
      max: SPELL_ACTION_LIMITS.notes
    })
  });
  if (save.outcome !== 'none' && !save.notes) {
    throw new SpellValidationError('SAVE_NOTES_REQUIRED', { outcome: save.outcome });
  }

  const attack = normalizeNested(action.attack, ATTACK_FIELDS, {
    mode: normalizeChoice(
      action.attack?.mode ?? 'none',
      SPELL_ATTACK_MODES,
      'INVALID_ATTACK_MODE'
    ),
    notes: normalizeText(action.attack?.notes, {
      field: 'attack.notes',
      max: SPELL_ACTION_LIMITS.notes
    })
  });
  if (kind === 'attack' && attack.mode === 'none') {
    throw new SpellValidationError('ATTACK_MODE_REQUIRED');
  }
  if (attack.mode === 'custom' && !attack.notes) {
    throw new SpellValidationError('ATTACK_NOTES_REQUIRED');
  }

  const effect = normalizeNested(action.effect, EFFECT_FIELDS, {
    reference: normalizeText(action.effect?.reference, {
      field: 'effect.reference',
      max: SPELL_ACTION_LIMITS.effectReference
    })
  });
  if (kind === 'effect' && !effect.reference && !action.notes?.trim()) {
    throw new SpellValidationError('EFFECT_REFERENCE_OR_NOTES_REQUIRED');
  }

  return {
    id,
    kind,
    label,
    formula,
    target,
    save,
    attack,
    effect,
    notes: normalizeText(action.notes, {
      field: 'notes',
      max: SPELL_ACTION_LIMITS.notes
    })
  };
}

export function normalizeSpellActions(actions = [], { generateId } = {}) {
  if (!Array.isArray(actions)) throw new SpellValidationError('INVALID_ACTIONS');
  if (actions.length > SPELL_ACTION_LIMITS.count) {
    throw new SpellValidationError('TOO_MANY_ACTIONS', {
      count: actions.length,
      maximum: SPELL_ACTION_LIMITS.count
    });
  }

  const normalized = actions.map((action, index) => normalizeSpellAction(action, {
    generateId: () => generateId?.() ?? `action-${index + 1}`
  }));
  const ids = new Set();
  for (const action of normalized) {
    if (ids.has(action.id)) {
      throw new SpellValidationError('DUPLICATE_ACTION_ID', { id: action.id });
    }
    ids.add(action.id);
  }
  return normalized;
}

export function validateFormulaReferences(formula) {
  const normalized = normalizeText(formula, {
    field: 'formula',
    max: SPELL_ACTION_LIMITS.formula,
    required: true
  });
  const references = [];
  for (const match of normalized.matchAll(FORMULA_REFERENCE_PATTERN)) {
    const path = match[1];
    if (!SPELL_FORMULA_PATHS.includes(path)) {
      throw new SpellValidationError('UNSUPPORTED_FORMULA_REFERENCE', { path });
    }
    references.push(path);
  }
  return references;
}

export function normalizeCasting(casting = {}) {
  assertPlainObject(casting, 'INVALID_CASTING');
  assertKnownFields(casting, new Set(['levelSource', 'fixedLevel']));
  const levelSource = normalizeChoice(
    casting.levelSource ?? 'automatic',
    SPELL_LEVEL_SOURCES,
    'INVALID_LEVEL_SOURCE'
  );
  const rawFixedLevel = casting.fixedLevel ?? null;
  const fixedLevel = rawFixedLevel === '' || rawFixedLevel == null
    ? null
    : normalizePositiveInteger(rawFixedLevel, 'INVALID_FIXED_LEVEL');
  if (levelSource === 'fixed' && fixedLevel == null) {
    throw new SpellValidationError('FIXED_LEVEL_REQUIRED');
  }
  return { levelSource, fixedLevel };
}

export function resolveCasterLevel(casting = {}, actor = null) {
  const normalized = normalizeCasting(casting);
  switch (normalized.levelSource) {
    case 'fixed':
      return { status: 'resolved', source: 'fixed', value: normalized.fixedLevel };
    case 'prompt':
      return { status: 'prompt', source: 'prompt', reason: 'PROMPT_REQUIRED' };
    case 'automatic': {
      const value = actor?.type === 'character'
        ? parseSinglePositiveInteger(actor.system?.level?.value)
        : actor?.type === 'npc'
          ? parseNpcHitDice(actor.system?.hd)
          : null;
      return value == null
        ? {
            status: 'prompt',
            source: 'automatic',
            reason: 'AUTOMATIC_REQUIRES_PROMPT'
          }
        : { status: 'resolved', source: 'automatic', value };
    }
    case 'characterLevel': {
      if (actor?.type !== 'character') {
        return {
          status: 'prompt',
          source: 'characterLevel',
          reason: 'CHARACTER_REQUIRED'
        };
      }
      const value = parseSinglePositiveInteger(actor.system?.level?.value);
      return value == null
        ? {
            status: 'prompt',
            source: 'characterLevel',
            reason: 'AMBIGUOUS_CHARACTER_LEVEL'
          }
        : { status: 'resolved', source: 'characterLevel', value };
    }
    case 'npcHitDice': {
      if (actor?.type !== 'npc') {
        return { status: 'prompt', source: 'npcHitDice', reason: 'NPC_REQUIRED' };
      }
      const value = parseNpcHitDice(actor.system?.hd);
      return value == null
        ? { status: 'prompt', source: 'npcHitDice', reason: 'AMBIGUOUS_NPC_HIT_DICE' }
        : { status: 'resolved', source: 'npcHitDice', value };
    }
    default:
      throw new SpellValidationError('INVALID_LEVEL_SOURCE');
  }
}

export function createSpellRollData({ spellLevel, casterLevel, abilityModifier = null }) {
  const level = normalizeNonNegativeInteger(spellLevel, 'INVALID_SPELL_LEVEL');
  const resolvedCasterLevel = normalizePositiveInteger(casterLevel, 'INVALID_CASTER_LEVEL');
  let resolvedAbilityModifier = null;
  if (abilityModifier != null && abilityModifier !== '') {
    resolvedAbilityModifier = Number(abilityModifier);
    if (!Number.isFinite(resolvedAbilityModifier)) {
      throw new SpellValidationError('INVALID_ABILITY_MODIFIER');
    }
  }
  return {
    spell: {
      level,
      casterLevel: resolvedCasterLevel,
      abilityModifier: resolvedAbilityModifier
    }
  };
}

export function fingerprintAction(action) {
  const canonical = canonicalStringify(action);
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildSpellMessageSnapshot({
  item,
  caster = null,
  casting,
  targetUuids = []
}) {
  assertPlainObject(item, 'INVALID_ITEM_SNAPSHOT');
  assertUuid(item.uuid, 'INVALID_ITEM_UUID');
  const actions = normalizeSpellActions(item.system?.actions ?? []);
  const casterLevel = normalizePositiveInteger(casting?.casterLevel, 'INVALID_CASTER_LEVEL');
  const castingSource = normalizeChoice(
    casting?.source,
    SPELL_LEVEL_SOURCES,
    'INVALID_LEVEL_SOURCE'
  );
  if (targetUuids.length > SPELL_ACTION_LIMITS.targetCount) {
    throw new SpellValidationError('TOO_MANY_TARGETS');
  }
  const stableTargetUuids = targetUuids.map((uuid) => {
    assertUuid(uuid, 'INVALID_TARGET_UUID');
    return uuid;
  });
  if (caster?.uuid) assertUuid(caster.uuid, 'INVALID_CASTER_UUID');

  return deepFreeze({
    schemaVersion: SPELL_MESSAGE_SCHEMA_VERSION,
    messageKind: 'spell-card',
    sourceItemUuid: item.uuid,
    sourceActorUuid: caster?.uuid ?? null,
    casterUuid: caster?.uuid ?? null,
    casterName: normalizeText(caster?.name, {
      field: 'caster.name',
      max: SPELL_ACTION_LIMITS.label
    }),
    casting: { casterLevel, source: castingSource },
    item: {
      name: normalizeText(item.name, {
        field: 'item.name',
        max: SPELL_ACTION_LIMITS.label,
        required: true
      }),
      img: normalizeText(item.img, { field: 'item.img', max: 500 }),
      description: String(item.system?.description ?? ''),
      spellLevel: normalizeNonNegativeInteger(
        item.system?.spellLevel ?? 0,
        'INVALID_SPELL_LEVEL'
      ),
      range: normalizeText(item.system?.range, { field: 'item.range', max: 500 }),
      duration: normalizeText(item.system?.duration, {
        field: 'item.duration',
        max: 500
      })
    },
    actions: actions.map((action) => ({
      ...action,
      fingerprint: fingerprintAction(action)
    })),
    targetUuids: stableTargetUuids
  });
}

export function planSpellAction({
  action,
  spellLevel,
  casterLevel,
  abilityModifier = null,
  targetUuids = []
}) {
  const normalizedAction = normalizeSpellAction(action);
  const references = normalizedAction.formula
    ? validateFormulaReferences(normalizedAction.formula)
    : [];
  if (references.includes('spell.abilityModifier') && abilityModifier == null) {
    throw new SpellValidationError('ABILITY_MODIFIER_REQUIRED');
  }
  if (targetUuids.length > SPELL_ACTION_LIMITS.targetCount) {
    throw new SpellValidationError('TOO_MANY_TARGETS');
  }
  const stableTargetUuids = targetUuids.map((uuid) => {
    assertUuid(uuid, 'INVALID_TARGET_UUID');
    return uuid;
  });
  return {
    actionId: normalizedAction.id,
    actionFingerprint: fingerprintAction(normalizedAction),
    kind: normalizedAction.kind,
    label: normalizedAction.label,
    formula: normalizedAction.formula,
    target: structuredCopy(normalizedAction.target),
    save: structuredCopy(normalizedAction.save),
    attack: structuredCopy(normalizedAction.attack),
    effect: structuredCopy(normalizedAction.effect),
    notes: normalizedAction.notes,
    rollData: createSpellRollData({ spellLevel, casterLevel, abilityModifier }),
    targetUuids: stableTargetUuids
  };
}

export function consumePreparedSpell(prepared, spellId) {
  if (!Array.isArray(prepared)) throw new SpellValidationError('INVALID_PREPARED_LIST');
  const next = [...prepared];
  const index = next.indexOf(spellId);
  if (index === -1) return { status: 'missing', index, prepared: next };
  next.splice(index, 1);
  return { status: 'consumed', index, prepared: next };
}

export function applyHitPointChange({
  kind,
  current,
  maximum,
  amount,
  multiplier = 1
}) {
  if (!['damage', 'healing'].includes(kind)) {
    throw new SpellValidationError('INVALID_HP_KIND', { kind });
  }
  const oldHP = normalizeNonNegativeInteger(current, 'INVALID_CURRENT_HP');
  const maximumHP = normalizeNonNegativeInteger(maximum, 'INVALID_MAXIMUM_HP');
  const numericAmount = Number(amount);
  if (
    !Number.isFinite(numericAmount)
    || numericAmount < 0
    || numericAmount > SPELL_ACTION_LIMITS.hitPointAmount
  ) {
    throw new SpellValidationError('INVALID_HP_AMOUNT');
  }
  if (!SPELL_APPLICATION_MULTIPLIERS.includes(multiplier)) {
    throw new SpellValidationError('INVALID_HP_MULTIPLIER');
  }
  const requestedAmount = Math.floor(numericAmount * multiplier);
  const newHP = kind === 'damage'
    ? Math.max(0, oldHP - requestedAmount)
    : Math.max(oldHP, Math.min(maximumHP, oldHP + requestedAmount));
  return {
    oldHP,
    newHP,
    requestedAmount,
    appliedAmount: Math.abs(newHP - oldHP)
  };
}

export function validateApplicationRequest(request = {}) {
  assertPlainObject(request, 'INVALID_APPLICATION_REQUEST');
  assertKnownFields(request, APPLICATION_FIELDS);
  if (request.schemaVersion !== SPELL_APPLICATION_SCHEMA_VERSION) {
    throw new SpellValidationError('INVALID_APPLICATION_SCHEMA');
  }
  if (!REQUEST_ID_PATTERN.test(String(request.requestId ?? ''))) {
    throw new SpellValidationError('INVALID_REQUEST_ID');
  }
  if (request.operation !== SPELL_APPLICATION_OPERATION) {
    throw new SpellValidationError('INVALID_APPLICATION_OPERATION');
  }
  assertUuid(request.messageUuid, 'INVALID_MESSAGE_UUID');
  assertUuid(request.targetUuid, 'INVALID_TARGET_UUID');
  const actionId = normalizeActionId(request.actionId);
  const actionFingerprint = normalizeText(request.actionFingerprint, {
    field: 'actionFingerprint',
    max: 64,
    required: true
  });
  if (!['damage', 'healing'].includes(request.kind)) {
    throw new SpellValidationError('INVALID_HP_KIND');
  }
  const amount = Number(request.amount);
  if (
    !Number.isFinite(amount)
    || amount < 0
    || amount > SPELL_ACTION_LIMITS.hitPointAmount
  ) {
    throw new SpellValidationError('INVALID_HP_AMOUNT');
  }
  const multiplier = Number(request.multiplier);
  if (!SPELL_APPLICATION_MULTIPLIERS.includes(multiplier)) {
    throw new SpellValidationError('INVALID_HP_MULTIPLIER');
  }
  return {
    schemaVersion: request.schemaVersion,
    requestId: request.requestId,
    operation: request.operation,
    messageUuid: request.messageUuid,
    actionId,
    actionFingerprint,
    targetUuid: request.targetUuid,
    kind: request.kind,
    amount,
    multiplier
  };
}

function normalizeNested(source, allowedFields, normalized) {
  if (source != null) {
    assertPlainObject(source, 'INVALID_NESTED_FIELD');
    assertKnownFields(source, allowedFields);
  }
  return normalized;
}

function normalizeChoice(value, choices, code) {
  if (!choices.includes(value)) throw new SpellValidationError(code, { value });
  return value;
}

function normalizeActionId(value) {
  const id = normalizeText(value, {
    field: 'id',
    max: SPELL_ACTION_LIMITS.id,
    required: true
  });
  if (!ACTION_ID_PATTERN.test(id)) throw new SpellValidationError('INVALID_ACTION_ID');
  return id;
}

function normalizeText(value, { field, max, required = false }) {
  const normalized = String(value ?? '').trim();
  if (required && !normalized) {
    throw new SpellValidationError('TEXT_REQUIRED', { field });
  }
  if (normalized.length > max) {
    throw new SpellValidationError('TEXT_TOO_LONG', { field, maximum: max });
  }
  return normalized;
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new SpellValidationError(code, { value });
  }
  return number;
}

function normalizeNonNegativeInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new SpellValidationError(code, { value });
  }
  return number;
}

function parseSinglePositiveInteger(value) {
  const text = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseNpcHitDice(value) {
  const text = String(value ?? '').trim();
  const match = /^([1-9]\d*)(?:\s*[+-]\s*\d+)?$/.exec(text);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function assertUuid(value, code) {
  if (!UUID_PATTERN.test(String(value ?? ''))) {
    throw new SpellValidationError(code, { value });
  }
}

function assertPlainObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SpellValidationError(code);
  }
}

function assertKnownFields(value, allowed) {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new SpellValidationError('UNKNOWN_FIELD', { field: unknown });
}

function canonicalStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalStringify(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalStringify(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function structuredCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
