import { SaveRoll } from '../rolls/rolls.mjs';

export class SwordsWizardryActor extends Actor {

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (!data.hasOwnProperty('prototypeToken')) await this._createTokenPrototype(data);
  }

  async _createTokenPrototype(data) {
    const createData = {};
    if (data.type === 'character') {
      foundry.utils.mergeObject(createData, {
        'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        'prototypeToken.actorLink': true
      });
    } else if (data.type === 'npc') {
      foundry.utils.mergeObject(createData, {
        'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
    }
    await this.updateSource(createData);
  }

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.swordswizardry || {};

    if(game.settings.get('swords-wizardry', 'useAscendingAC') === false) {
      this._prepareToHitMatrix();
    }

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
    this._prepareMemorizedSpells(actorData);
  }

  _prepareToHitMatrix() {
    const tHAC0 = this.system.tHAC0;
    this.system.toHitACMatrix = {
      "-9": tHAC0 + 9,
      "-8": tHAC0 + 8,
      "-7": tHAC0 + 7,
      "-6": tHAC0 + 6,
      "-5": tHAC0 + 5,
      "-4": tHAC0 + 4,
      "-3": tHAC0 + 3,
      "-2": tHAC0 + 2,
      "-1": tHAC0 + 1,
      "+0": tHAC0,
      "+1": tHAC0 - 1,
      "+2": tHAC0 - 2,
      "+3": tHAC0 - 3,
      "+4": tHAC0 - 4,
      "+5": tHAC0 - 5,
      "+6": tHAC0 - 6,
      "+7": tHAC0 - 7,
      "+8": tHAC0 - 8,
      "+9": tHAC0 - 9
    };
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // TODO delete this?
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using S&W
      ability.mod = Math.floor((ability.value - 10) / 2);
    }

    for (let [key, modifier] of Object.entries(systemData.modifiers)) {
      // Calculate the modifier using S&W
      modifier.v = Math.floor(modifier.value);
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    //systemData.xp = systemData.cr * systemData.cr * 100;
  }

  _prepareMemorizedSpells(actorData) {
    const { system } = actorData;
    Object.entries(system.spellSlots).forEach(([key, value]) => {
      if (value.memorized.length > 0) {
        value.memorizedSpells = [];
        value.memorized.forEach(spellId => {
          const item = actorData.items.get(spellId);
          if (item) {
            value.memorizedSpells.push(item);
          }
        })
      }
    });
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const data = { ...super.getRollData() };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.modifiers) {
      for (let [k, v] of Object.entries(data.modifiers)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    if (data.thievingSkills) {
      for (let [k, v] of Object.entries(data.thievingSkills)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.level) {
      data.lvl = data.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  async rollSave() {
    const roll = new SaveRoll('d20', this); 
    roll.render();
  }

  _preUpdate(changed, options, user) {
    // Two-way data binding for AC and AAC
    if (changed.system.tHAACB && changed.system.tHAACB !== this.system.tHAACB) {
      changed.system.tHAC0 = 19 - changed.system.tHAACB;
    } else if (changed.system.tHAC0 && changed.system.tHAC0 !== this.system.tHAC0) {
      changed.system.tHAACB = 19 - changed.system.tHAC0;
    }
    return super._preUpdate(changed, options, user);
  }
}
