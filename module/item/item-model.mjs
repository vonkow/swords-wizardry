const { TypeDataModel } = foundry.abstract;
const {
  SchemaField, HTMLField, BooleanField, NumberField, StringField
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
        required: true, integer: true, initial: 1
      }),
      range: new StringField(),
      duration: new StringField()
    };
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
