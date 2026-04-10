import { SaveRoll } from '../rolls/rolls.mjs';
import { MoraleRoll } from '../rolls/rolls.mjs';

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
    } else if (data.type === 'container') {
      foundry.utils.mergeObject(createData, {
        'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        'prototypeToken.actorLink': true
      });
    } else if (data.type === 'npc') {
      foundry.utils.mergeObject(createData, {
        'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
    }
    await this.updateSource(createData);
  }

  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.swordswizardry || {};

    if(game.settings.get('swords-wizardry', 'useAscendingAC') === false) {
      this._prepareToHitMatrix();
    }

    this._prepareCharacterData(actorData);
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

  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;
    for (let [key, modifier] of Object.entries(systemData.modifiers)) {
      modifier.v = Math.floor(modifier.value);
    }
    this._calculateEncumbrance(actorData);
  }

  _calculateEncumbrance(actorData) {
    const systemData = actorData.system;

    let totalWeight = 0;
    let zeroWeightCount = 0;

    for (const item of actorData.items) {
      const itype = item.type;
      if (itype !== 'item' && itype !== 'weapon' && itype !== 'armor') continue;

      const w = Number(item.system.weight) || 0;
      const q = Number(item.system.quantity) || 1;

      if (w === 0) {
        zeroWeightCount += q;
      } else {
        totalWeight += w * q;
      }
    }

    // TODO If misc equipment is checked on character sheet add 10 lbs
    // if (systemData.carryingMiscEquipment) totalWeight += 10;
    const treasure = systemData.treasure || {};
    const totalCoins = (Number(treasure.gp) || 0)
                     + (Number(treasure.pp) || 0)
                     + (Number(treasure.sp) || 0)
                     + (Number(treasure.cp) || 0);
    totalWeight += Math.floor(totalCoins / 10);

    systemData.carryWeight.value = totalWeight;

    // Movement rate based on weight and STR carry modifier
    const carryMod = Number(systemData.modifiers?.carry?.value) || 0;

    const moveRate
      = totalWeight <= 75 + carryMod ? 12
      : totalWeight <= 100 + carryMod ? 9
      : totalWeight <= 150 + carryMod ? 6
      : totalWeight <= 300 + carryMod ? 3
      : 0;

    systemData.moveRate.value = moveRate;
  }

  _prepareMemorizedSpells(actorData) {
    if (actorData.type !== 'character' && actorData.type !== 'npc') return;
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
    this._getCharacterRollData(data);
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
    if (data.level) {
      data.lvl = data.level.value ?? 0;
    }
  }

  async rollSave() {
    const roll = new SaveRoll('d20', this);
    roll.render();
  }
  
 async rollMorale() {
    if (this.type !== 'npc') return;
    const roll = new MoraleRoll('2d6', this);
    roll.render();
  }

  _preUpdate(changed, options, user) {
    // Two-way data binding for AC and AAC
    if (changed.system) {
      if (changed.system.tHAACB && changed.system.tHAACB !== this.system.tHAACB) {
        changed.system.tHAC0 = 19 - changed.system.tHAACB;
      } else if (changed.system.tHAC0 && changed.system.tHAC0 !== this.system.tHAC0) {
        changed.system.tHAACB = 19 - changed.system.tHAC0;
      }

      if (changed.system.ac && changed.system.ac.value !== this.system.ac.value) {
        if (!changed.system.aac) changed.system.aac = {};
        changed.system.aac.value = 19 - changed.system.ac.value;
      } else if (changed.system.aac && changed.system.aac.value !== this.system.aac.value) {
        if (!changed.system.ac) changed.system.ac = {};
        changed.system.ac.value = 19 - changed.system.aac.value;
      }
    }
    return super._preUpdate(changed, options, user);
  }
}
