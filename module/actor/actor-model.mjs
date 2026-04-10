const { TypeDataModel } = foundry.abstract;
const {
  SchemaField, ArrayField, HTMLField, BooleanField,
  NumberField, StringField
} = foundry.data.fields;

class BaseCharacterData extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      alignment: new StringField(),
      hp: new SchemaField({
        max: new NumberField({
          required: true, integer: true, min: 0, initial: 4
        }),
        value: new NumberField({
          required: true, integer: true, min: 0, initial: 4
        }),
      }),
      ac: new SchemaField({
        value: new NumberField({
          required: true, integer: true, min: -9, max: 10, initial: 9
        })
      }),
      aac: new SchemaField({
        value: new NumberField({
          required: true, integer: true, min: 0, max: 28, initial: 10
        })
      }),
      tHAACB: new NumberField({
        required: true, integer: true, min: 0, max: 19, initial: 0
      }),
      tHAC0: new NumberField({
        required: true, integer: true, min: 1, max: 20, initial: 19
      }),
      save: new SchemaField({
        value: new NumberField({
          required: true, integer: true, min: 1, max: 20, initial: 15
        })
      }),
      moveRate: new SchemaField({
        value: new StringField({ initial: '12' }),
        special: new StringField()
      }),
      spellSlots: new SchemaField({
        [1]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [2]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [3]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [4]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [5]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [6]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [7]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [8]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        }),
        [9]: new SchemaField({
          max: new NumberField({
            required: true, integer: true, min: 0, initial: 0, max: 20
          }),
          memorized: new ArrayField(new StringField())
        })
      }),
      treasure: new SchemaField({
        pp: new NumberField({ integer: true, min: 0, initial: 0 }),
        gp: new NumberField({ integer: true, min: 0, initial: 0 }),
        sp: new NumberField({ integer: true, min: 0, initial: 0 }),
        cp: new NumberField({ integer: true, min: 0, initial: 0 }),
        gems: new StringField(),
        misc: new StringField
      })
    }
  }
};
      
export class CharacterData extends BaseCharacterData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      class: new StringField(),
      ancestry: new StringField(),
      level: new SchemaField({
        value: new StringField({ intitial: '1' })
      }),
      age: new StringField(),
      deity: new StringField(),
      xp: new SchemaField({
        value: new StringField({ initial: '0' })
      }),
      xpBonus: new SchemaField({
        value: new StringField({ initial: '0' })
      }),
      carryWeight: new SchemaField({
        value: new NumberField({
          required: true, integer: true, min: 0, initial: 0
        })
      }),
      abilities: new SchemaField({
        str: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
        dex: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
        con: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
        ["int"]: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
        wis: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
        cha: new SchemaField({
          value: new NumberField({
            required: true, integer: true, min: 0, max: 25, initial: 10
          }),
          prime: new BooleanField({ initial: false })
        }),
      }),
      modifiers: new SchemaField({
        toHit: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        damage: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        openDoors: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        carry: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        missileToHit: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        ac: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        hp: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        raiseDeadChances: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        additionalLanguages: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        maximumSpellLevel: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        chanceToUnderstandSpell: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        minimumSpellsPerLevel: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        maximumSpellsPerLevel: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        maximumSpecialHirelings: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        }),
        retainerMoraleAdjustment: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 })
        })
      })
    }
  }
};

export class NPCData extends BaseCharacterData {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      cl: new StringField(),
      hd: new StringField({ initial: "1" }),
      morale: new NumberField({ integer: true, min: 0, max: 12 }),
      xp: new SchemaField({
        value: new NumberField({ integer: true })
      }),
      special: new StringField(),
      numberEncountered: new StringField(),
      percentInLair: new StringField()
    }
  }
};

export class ContainerData extends TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      treasure: new SchemaField({
        pp: new NumberField({ integer: true, min: 0, initial: 0 }),
        gp: new NumberField({ integer: true, min: 0, initial: 0 }),
        sp: new NumberField({ integer: true, min: 0, initial: 0 }),
        cp: new NumberField({ integer: true, min: 0, initial: 0 }),
        gems: new StringField(),
        misc: new StringField
      })
    }
  }
};
