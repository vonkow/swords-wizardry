import { AttackRoll, DamageRoll, FeatureRoll } from  '../rolls/rolls.mjs';

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
    rollData.effectType = this.system.effectType;
    rollData.requiresSave = this.system.requiresSave;
    rollData.saveEffect = this.system.saveEffect;
    return rollData;
  }

  async rollSpell() {
    const rollData = this.getRollData();
    const formula = this.system.formula?.trim();

    if (formula) {
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

    const targets = this.system.requiresSave
      ? Array.from(game.user.targets).map(target => ({
          id: target.id,
          name: target.name
        }))
      : [];
    const content = await renderTemplate(SPELL_ROLL_TEMPLATE, {
      item: this,
      actor: this.actor,
      requiresSave: this.system.requiresSave,
      saveEffectHalf: this.system.saveEffect === 'half',
      targets
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rollMode: game.settings.get('core', 'rollMode'),
      content
    });
  }

  async roll() {
    const item = this;
    let rollData, roll;
    switch (this.type) {
      case 'weapon':
        rollData = this.getRollData();
        roll = new AttackRoll(rollData.formula, rollData);
        await roll.render();
        return roll;
      case 'spell':
        return this.rollSpell();
      case 'feature':
        if (this.system.formula) {
          rollData = this.getRollData();
          roll = new FeatureRoll(rollData.formula, rollData);
          await roll.render();
          return roll;
        }
      case 'item':
      case 'armor':
        // TODO update this 
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');
        const label = `[${item.type}] ${item.name}`;
        ChatMessage.create({
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: item.system.description ?? '',
        });
        break;
    }
  }
}
