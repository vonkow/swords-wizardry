import {
  SPELL_ACTION_KINDS,
  SPELL_ACTION_LIMITS,
  SPELL_ATTACK_MODES,
  SPELL_LEVEL_SOURCES,
  SPELL_SAVE_OUTCOMES,
  SPELL_TARGET_MODES
} from '../spells/constants.mjs';
import { normalizeCasting, normalizeSpellActions } from '../spells/domain.mjs';

const { TypeDataModel } = foundry.abstract;
const {
  ArrayField, SchemaField, HTMLField, BooleanField, NumberField, StringField
} = foundry.data.fields;

class BaseItemData extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField()
    };
  }
}

class TangibleItemData extends BaseItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      quantity: new NumberField({
        required: true, integer: true, minimum: 0, initial: 1
      }),
      weight: new NumberField({
        required: true, integer: true, minimum: 0, initial: 1
      }),
      pp: new NumberField({ integer: true, min: 0, initial: 0 }),
      gp: new NumberField({ integer: true, min: 0, initial: 0 }),
      sp: new NumberField({ integer: true, min: 0, initial: 0 }),
      cp: new NumberField({ integer: true, min: 0, initial: 0 })
    };
  }
}

export class ArmorData extends TangibleItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      effectOnAC: new NumberField({ integer: true, initial: 0 })
    };
  }
}

export class FeatureData extends BaseItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      formula: new StringField({ initial: "d6" }),
      target: new NumberField({ integer: true, initial: 1 }),
      targetType: new StringField({ initial: "descending" })
    };
  }
}

export class ItemData extends TangibleItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      formula: new StringField({ initial: "d6" })
    };
  }
}

export class SpellData extends BaseItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      spellLevel: new NumberField({
        required: true, integer: true, min: 1, max: 9, initial: 1
      }),
      range: new StringField({ initial: '' }),
      duration: new StringField({ initial: '' }),
      casting: new SchemaField({
        levelSource: new StringField({
          required: true,
          choices: SPELL_LEVEL_SOURCES,
          initial: 'automatic'
        }),
        fixedLevel: new NumberField({
          integer: true,
          min: 1,
          max: 100,
          nullable: true,
          initial: null
        })
      }),
      actions: new ArrayField(new SchemaField({
        id: new StringField({ required: true, maxLength: SPELL_ACTION_LIMITS.id }),
        kind: new StringField({
          required: true,
          choices: SPELL_ACTION_KINDS,
          initial: 'manual'
        }),
        label: new StringField({
          required: true,
          maxLength: SPELL_ACTION_LIMITS.label
        }),
        formula: new StringField({
          initial: '',
          maxLength: SPELL_ACTION_LIMITS.formula
        }),
        target: new SchemaField({
          mode: new StringField({
            required: true,
            choices: SPELL_TARGET_MODES,
            initial: 'none'
          })
        }),
        save: new SchemaField({
          outcome: new StringField({
            required: true,
            choices: SPELL_SAVE_OUTCOMES,
            initial: 'none'
          }),
          notes: new StringField({
            initial: '',
            maxLength: SPELL_ACTION_LIMITS.notes
          })
        }),
        attack: new SchemaField({
          mode: new StringField({
            required: true,
            choices: SPELL_ATTACK_MODES,
            initial: 'none'
          }),
          notes: new StringField({
            initial: '',
            maxLength: SPELL_ACTION_LIMITS.notes
          })
        }),
        effect: new SchemaField({
          reference: new StringField({
            initial: '',
            maxLength: SPELL_ACTION_LIMITS.effectReference
          })
        }),
        notes: new StringField({
          initial: '',
          maxLength: SPELL_ACTION_LIMITS.notes
        })
      }), {
        initial: [],
        max: SPELL_ACTION_LIMITS.count
      })
    };
  }

  static validateJoint(data) {
    super.validateJoint(data);
    normalizeCasting(data.casting ?? {});
    normalizeSpellActions(data.actions ?? []);
  }
}

export class WeaponData extends TangibleItemData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      modifier: new NumberField({ integer: true, initial: 0 }),
      formula: new StringField({ initial: "d20" }),
      damageFormula: new StringField({ initial: "1d6" }),
      specialDamage: new StringField(),
      missile: new BooleanField({ initial: false }),
      range: new NumberField({ integer: true, min: 0, initial: 0 }),
      rateOfFire: new NumberField({ initial: 1 }) /* Also, FUCK */
    }
  }
};
