import { AttackRoll, DamageRoll, FeatureRoll } from  '../rolls/rolls.mjs';
import { rpc } from '../helpers/rpc.mjs';

const { renderTemplate } = foundry.applications.handlebars;
const SPELL_ROLL_TEMPLATE = 'systems/swords-wizardry/module/rolls/spell-roll-sheet.hbs';

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
    switch (this.type) {
      case 'weapon':
        return this.getWeaponRollData(rollData);
      case 'feature':
        return this.getFeatureRollData(rollData);
      case 'spell':
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
    rollData.effects = this.effects;
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
    // TODO update this 
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;
    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: this.system.description ?? '',
    });
  }

  async rollSpell(rollData) {
    const formula = this.system.formula?.trim();
    console.log(formula);
    console.log(rollData);
    try {
      const roll = new DamageRoll(formula, rollData)
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
    // TODO rework to only call new DamageRoll();
    /*
    const formula = this.system.formula?.trim();
    const { requiresSave } = this.system;

    // TODO or if requiresSave? and then pass in empty formula and if formula is empty than it's just save?
    if (formula || requiresSave) {
      console.log(`formula: ${formula}, requiresSave: ${requiresSave}`);
      try {
        const roll = new DamageRoll(formula, rollData);
        await roll.render();
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

    const targets = Array.from(game.user.targets).map(target => ({
      id: target.id,
      name: target.name
    }));

    if (!requiresSave) {
      console.log('no save, just get affected');
      console.log(targets);
      targets.forEach(target => {
        const t = canvas.tokens.get(target.id).actor;
        // INFO Here is a call to applyEffect (maybe a bad one)
        // not bad if we then render the card in its completed state
        // ezpz
        this.applyDamageAndEffects(t, '');
      });
    }

    // TODO don't render down here, always call DamageRoll? and have it call applyDamageAndEffect?

    const content = await renderTemplate(SPELL_ROLL_TEMPLATE, {
      item: this,
      actor: this.actor,
      requiresSave,
      saveEffectHalf: this.system.saveEffect === 'half',
      targets
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rollMode: game.settings.get('core', 'rollMode'),
      content
    });
    */
  }

  // TODO maek this rollWeaponDamageAndEffects to not confuse?
  // or genericize and call from rollSpell?
  async rollDamageAndEffects() {
    const { actor } = this;
    const rollData = { actor, item: this };
    let { damageFormula } = this.system;
    if (actor.system.modifiers?.damage?.value != 0) damageFormula += `+${actor.system.modifiers.damage.value}`;
    // TODO change to DamageAndEffectRoll or have a separate one?
    const roll = new DamageRoll(damageFormula, rollData);
    await roll.render();
    return roll;
  }

  async applyDamageAndEffects(target, initialAmount, rollType=this.system.rollType) {
    const sender = this.actor;
    
    console.log(target);
    console.log(initialAmount);
    console.log(rollType);

    const amount
      = rollType === "none" ? 0
      : rollType === "half" ? Math.floor(initialAmount / 2)
      : rollType === "double" ? initialAmount * 2
      : rollType === "heal" ? initialAmount * -1
      : rollType === "half-heal" ? Math.floor(initialAmount / 2) * -1
      : initialAmount;

    const oldHP = target.actor.system.hp.value;
    const newHP = oldHP - amount;
    console.log(newHP);
    
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
    console.log(data);
    const { newHP, sender: senderId } = data;
    const sender = game.actors.get(senderId);
    // TODO If amount
    console.log(target);
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
        // This wasn't working as a map but nothing beats good old forloop when push comes to shove.
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
