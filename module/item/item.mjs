import { AttackRoll, DamageRoll, FeatureRoll } from  '../rolls/rolls.mjs';
import { rpc } from '../helpers/rpc.mjs';

const { renderTemplate } = foundry.applications.handlebars;

export class SwordsWizardryItem extends Item {

  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (!data.img || data.img == "") {
      switch(data.type) {
        case "spell":
          data.img = `systems/swords-wizardry/assets/game-icons-net/spell-book.svg`;
          break;
        case "feature":
          data.img = `systems/swords-wizardry/assets/game-icons-net/skills.svg`;
          break;
        case "armor":
          data.img = `systems/swords-wizardry/assets/game-icons-net/chest-armor.svg`;
          break;
        case "weapon":
          data.img = `systems/swords-wizardry/assets/game-icons-net/plain-dagger.svg`;
          break;
        case "item":
          data.img = `systems/swords-wizardry/assets/game-icons-net/swap-bag.svg`;
          break;
        case "container": // TODO future
          data.img = `systems/swords-wizardry/assets/game-icons-net/swap-bag.svg`;
          break;
        default:
          data.img = `systems/swords-wizardry/assets/game-icons-net/swap-bag.svg`;
      }
    }
    return this.updateSource(data)
  }

  getRollData() {
    const rollData = { ...super.getRollData() };
    rollData.name = this.name;
    rollData.item = this;
    rollData.effects = this.effects;
    switch (this.type) {
      case 'weapon':
        return this.getWeaponRollData(rollData);
      case 'feature':
        return this.getFeatureRollData(rollData);
      case 'spell':
      case 'item':
        return this.getSpellRollData(rollData);
      default:
        return rollData;
    }
  }

  getWeaponRollData(rollData) {
    rollData.formula = 'd20';
    if (this.actor) {
      rollData.actor = this.actor.getRollData();
      rollData.actor._id = this.actor._id;
      if (game.settings.get('swords-wizardry', 'useAscendingAC')) {
        rollData.formula += ` + ${rollData.actor.tHAACB}`;
      }
      if (rollData.actor.toHit && rollData.actor.toHit.v !== 0)
        rollData.formula += ` + ${rollData.actor.toHit.v}`;
      if (rollData.missile && rollData.actor.missileToHit && rollData.actor.missileToHit !== 0)
        rollData.formula += ` + ${rollData.actor.missileToHit.v}`;
      if (rollData.actor.modifiers && rollData.actor.modifiers.damage && rollData.actor.modifiers.damage !== 0)
        rollData.damageFormula += ` + ${rollData.actor.modifiers.damage.value}`;
    }
    if (rollData.modifier && rollData.modifier !== '0') {
      rollData.formula += ` + ${rollData.modifier}`;
    }
    return rollData;
  }

  getFeatureRollData(rollData) {
    if (this.actor) {
      Object.assign(rollData, this.actor.getRollData());
      rollData.actor = this.actor;
    }
    return rollData;
  }

  getSpellRollData(rollData) {
    if (this.actor) {
      Object.assign(rollData, this.actor.getRollData());
      rollData.actor = this.actor;
    }
    rollData.rollType = this.system.rollType;
    rollData.requiresSave = this.system.requiresSave;
    rollData.saveEffect = this.system.saveEffect;
    return rollData;
  }


  async roll() {
    const item = this;
    const rollData = this.getRollData();
    switch (this.type) {
      case 'feature':
        return this.rollFeature(rollData);
      case 'item':
      case 'armor':
        return this.rollItem(rollData);
      case 'spell':
        return this.rollSpell(rollData);
      case 'weapon':
        return this.rollWeapon(rollData);
    }
  }

  async rollWeapon(rollData) {
    const roll = new AttackRoll(rollData.formula, rollData);
    await roll.render();
    return roll;
  }

  async rollFeature(rollData) {
    if (this.system.formula) {
      const roll = new FeatureRoll(rollData.formula, rollData);
      await roll.render();
      return roll;
    }
  }

  async rollItem(rollData) {
    if (this.system.usable) {
      if (this.system.consumable) {
        if (this.system.quantity > 0) {
          this.update({ system: { quantity: this.system.quantity - 1 } });
        } else {
          return null; // TODO update to say nothing to consume
        }
      }
      return this.rollSpell(rollData);
    } else {
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${this.type}] ${this.name}`;
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: this.system.description ?? '',
      });
    }
  }

  async rollSpell(rollData) {
    const formula = this.system.formula?.trim();
    try {
      const roll = new DamageRoll(formula, rollData);
      const result = await roll.render();
      return roll;
    } catch (error) {
      console.error('Swords & Wizardry | Invalid spell roll formula', error);
      ui.notifications.error(game.i18n.format(
        'SWORDS_WIZARDRY.Item.Spell.InvalidFormula',
        { formula }
      ));
      return null;
    }
  }

  async rollItemDamageAndEffects() {
    const { actor } = this;
    const rollData = { actor, item: this, effects: Array.from(this.effects) };
    let { damageFormula } = this.system;
    if (actor.system.modifiers?.damage?.value != 0) damageFormula += `+${actor.system.modifiers.damage.value}`;
    const roll = new DamageRoll(damageFormula, rollData);
    await roll.render();
    return roll;
  }

  async applyDamageAndEffects(target, initialAmount, rollType=this.system.rollType) {
    const sender = this.actor;
    const amount
      = rollType === "none" ? 0
      : rollType === "half" ? Math.floor(initialAmount / 2)
      : rollType === "double" ? initialAmount * 2
      : rollType === "heal" ? initialAmount * -1
      : rollType === "half-heal" ? Math.floor(initialAmount / 2) * -1
      : initialAmount;
    const oldHP = target.actor.system.hp.value;
    const newHP = oldHP - amount;
    
    const effects = this.effects
      .filter((effect) => effect.targeted)
      .map((effect) => effect.name);

    // TODO pass if saved
    await rpc({
        recipient: 'GM',
        operation: 'apply-damage-and-effects',
        sender: this.actor.id,
        target: target.id,
        item: this.id,
        newHP
    });

    return { amount, action: rollType, oldHP, newHP, effects };
  }

  async applyDamageAndEffectsGM(target, data) {
    const { newHP, sender: senderId } = data;
    const sender = game.actors.get(senderId);
    // TODO If amount
    target.update({ system: { hp: { value: newHP } } });

    // TODO this is not blocking, need Promise.all and maybe map instead
    this.effects.forEach(async (effect) => {
      const effectData = effect.toObject();
      if (effectData.system.targeted) {
        effectData.disabled = false;
        effectData.transfer = true;
        effectData.system.targeted = false;
        if (effectData.system.durationFormula) {
          const roll = new Roll(effectData.system.durationFormula, sender.getRollData());
          const result = await roll.evaluate();
          effectData.duration.value = result.total;
          effectData.duration.units = effectData.system.durationFormulaUnits;
        }
        // This wasn't working as a map but nothing beats good old forloop when push comes to shove. (fix is same as above)
        for (let x = 0, change, cRoll; x < effectData.changes.length; x++) {
          change = effectData.changes[x];
          cRoll = new Roll(change.value, sender.getRollData());
          await cRoll.evaluate();
          change.value = cRoll.total;
        }
        target.createEmbeddedDocuments("ActiveEffect", [effectData]);
      }
    });
  }
}
