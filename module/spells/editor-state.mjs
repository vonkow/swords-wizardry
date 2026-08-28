const EFFECT_TYPES = new Set(['damage', 'healing', 'attack', 'roll', 'effect', 'manual']);
const FORMULA_EFFECT_TYPES = new Set(['damage', 'healing', 'attack', 'roll']);
const SAVE_EFFECT_TYPES = new Set(['damage', 'effect']);
const NOTES_EFFECT_TYPES = new Set(['effect', 'manual']);

export function effectEditorVisibility(kind, { saveOutcome = 'none', attackMode = 'none' } = {}) {
  if (!EFFECT_TYPES.has(kind)) throw new TypeError(`Unknown spell effect type: ${kind}`);
  const save = SAVE_EFFECT_TYPES.has(kind);
  const attack = kind === 'attack';
  return {
    formula: FORMULA_EFFECT_TYPES.has(kind),
    target: true,
    save,
    saveNotes: save && saveOutcome !== 'none',
    attack,
    attackNotes: attack && attackMode === 'custom',
    reference: kind === 'effect',
    notes: NOTES_EFFECT_TYPES.has(kind)
  };
}

export function actionsFromFormData(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(copyAction);
  if (!value || typeof value !== 'object') throw new TypeError('Invalid action form data.');
  return Object.entries(value)
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, action]) => copyAction(action));
}

export function moveAction(actions, index, direction) {
  if (!Array.isArray(actions)) throw new TypeError('Actions must be an array.');
  if (!Number.isInteger(index) || ![-1, 1].includes(direction)) return [...actions];
  const destination = index + direction;
  if (index < 0 || index >= actions.length || destination < 0 || destination >= actions.length) {
    return [...actions];
  }
  const moved = actions.map(copyAction);
  [moved[index], moved[destination]] = [moved[destination], moved[index]];
  return moved;
}

export function actionsFromFormElements(form, count) {
  if (!form?.elements) throw new TypeError('A form with elements is required.');
  return Array.from({ length: count }, (_, index) => ({
    id: read(`actions.${index}.id`),
    kind: read(`actions.${index}.kind`),
    label: read(`actions.${index}.label`),
    formula: read(`actions.${index}.formula`),
    target: { mode: read(`actions.${index}.target.mode`) },
    save: {
      outcome: read(`actions.${index}.save.outcome`),
      notes: read(`actions.${index}.save.notes`)
    },
    attack: {
      mode: read(`actions.${index}.attack.mode`),
      notes: read(`actions.${index}.attack.notes`)
    },
    effect: { reference: read(`actions.${index}.effect.reference`) },
    notes: read(`actions.${index}.notes`)
  }));

  function read(name) {
    return form.elements.namedItem(name)?.value ?? '';
  }
}

function copyAction(action) {
  return JSON.parse(JSON.stringify(action));
}
