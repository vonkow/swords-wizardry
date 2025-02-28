import { SwordsWizardryChatMessage } from '../helpers/overrides.mjs';

export class AttackRoll extends Roll {

  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.hitTargets = [];
    this.missedTargets = [];
  }

  async evaluate() {
    const result = await super.evaluate();
    // TODO move game.user.targets to up the chain and pass it in for more generic attacks?
    game.user.targets.forEach((target) => {
      let hit = false;
      if (game.settings.get('swords-wizardry', 'useAscendingAC')) {
        // Attack bonus is added to the roll formula by the item.
        const targetAAC = target.actor.system.aac.value;
        if (result.total >= targetAAC) hit = true;
      } else {
        const targetAC = target.actor.system.ac.value;
        const targetNumber = this.data.actor.tHAC0 - targetAC;
        if (result.total >= targetNumber) hit = true;
      }
      if (hit) {
        this.hitTargets.push(target);
      } else {
        this.missedTargets.push(target);
      }
    });
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/attack-roll-sheet.hbs';
    const chatData = {
      item: this.data.item,
      actor: this.data.actor,
      roll: rollHtml,
      total: this.total,
      hitTargets: this.hitTargets,
      missedTargets: this.missedTargets,
      damageFormula: this.data.damageFormula
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rolls: [this],
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
  }
}

export class DamageRoll extends Roll {
  async evaluate() {
    const result = await super.evaluate();
    game.user.targets.forEach((target) => {
        target.actor.system.hp.value -= result.total;
    });
    this.data.targetedActors = game.user.targets.map((target) => target.actor);
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/damage-roll-sheet.hbs';
    const chatData = {
      item: this.data.item,
      actor: this.data.actor,
      roll: rollHtml,
      total: this.total,
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
    Hooks.callAll("swords-wizardry.damageRoll", this.data.actor, this.data.targetedActors, this.data.item, this.total);
  }
}

export class FeatureRoll extends Roll {
  async evaluate() {
    const result = await super.evaluate();
    // do something with result.total and this.data.target based on this.data.targetType
    result.success = (
        result.data.targetType == 'ascending'
        && result.total >= parseInt(result.data.target)
      ) || (
        result.data.targetType == 'descending'
        && result.total <= parseInt(result.data.target)
      );
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/feature-roll-sheet.hbs';
    const chatData = {
      total: this.total,
      success: this.success,
      roll: rollHtml,
      ...this.data
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });

  }
}

export class SaveRoll extends Roll {
  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.save = rollData.system.save || { value: 15 };
  }

  async evaluate() {
    const result = await super.evaluate();
    result.success = result.total >= this.save.value;
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/save-roll-sheet.hbs';
    const chatData = {
      total: this.total,
      target: this.save.value,
      success: this.success,
      roll: rollHtml,
      ...this.data
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
  }
}
