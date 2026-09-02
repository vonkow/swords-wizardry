import { SwordsWizardryChatMessage } from '../helpers/overrides.mjs';
import { rpc } from '../helpers/rpc.mjs';

const { renderTemplate } = foundry.applications.handlebars;

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
    const rollHtml = await super.render();
    const template = 'systems/swords-wizardry/module/rolls/attack-roll-sheet.hbs';
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

    const isSpell = this.data.item?.type === 'spell';
    const effectType = isSpell ? this.data.effectType ?? 'none' : 'damage';
    const requiresSave = isSpell && Boolean(this.data.requiresSave);
    if (
      !game.settings.get('swords-wizardry', 'dmAppliesDamage')
      && !requiresSave
      && effectType !== 'none'
    ) {
      const amount = effectType === 'healing' ? result.total * -1 : result.total;
      await Promise.all(Array.from(game.user.targets).map(target =>
        rpc({
          recipient: 'GM',
          target: target.id,
          operation: 'damage',
          amount,
          data: { system: { hp: { value: target.actor.system.hp.value - amount } } }
        })
      ));
    }

    return result;
  }

  async render(options) {
    const dmAppliesDamage = game.settings.get('swords-wizardry', 'dmAppliesDamage');
    const isSpell = this.data.item?.type === 'spell';
    const effectType = isSpell ? this.data.effectType ?? 'none' : 'damage';
    const requiresSave = isSpell && Boolean(this.data.requiresSave);
    const saveEffect = this.data.saveEffect === 'half' ? 'half' : 'negate';
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render();
    const template = isSpell
      ? 'systems/swords-wizardry/module/rolls/spell-roll-sheet.hbs'
      : 'systems/swords-wizardry/module/rolls/damage-roll-sheet.hbs';

    const chatData = {
      item: this.data.item,
      actor: this.data.actor,
      roll: rollHtml,
      total: this.total,
      dmAppliesDamage,
      requiresSave,
      saveEffectHalf: saveEffect === 'half',
      fullAction: effectType === 'healing'
        ? 'heal'
        : effectType === 'damage' ? 'damage' : null,
      saveAction: saveEffect === 'half'
        ? effectType === 'healing' ? 'half-heal' : 'half'
        : 'none'
    };

    const needsManualApplication = effectType !== 'none'
      && (dmAppliesDamage || requiresSave);
    if (needsManualApplication || requiresSave) {
      const targets = Array.from(game.user.targets).map(t => ({
        id: t.id,
        name: t.name,
        hp: t.actor.system.hp.value
      }));

      const message = this.message;

      const appliedDamage = message
        ? message.getFlag('swords-wizardry', 'appliedDamage') || {}
	: {}

      chatData.targets = targets;
      chatData.appliedDamage = appliedDamage;
    }

    const resultsHtml = await renderTemplate(template, chatData);
    return SwordsWizardryChatMessage.create({
      rolls: [this],
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
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
    const rollHtml = await super.render();
    const template = 'systems/swords-wizardry/module/rolls/feature-roll-sheet.hbs';
    const chatData = {
      total: this.total,
      success: this.success,
      roll: rollHtml,
      ...this.data
    };
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

export class SaveRoll extends Roll {
  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.save = rollData?.system?.save ?? { value: 15 };
    if (!this.save.value) this.save.value = 15;
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
    const rollHtml = await super.render();
    const template = 'systems/swords-wizardry/module/rolls/save-roll-sheet.hbs';
    const chatData = {
      total: this.total,
      target: this.save.value,
      success: this.success,
      roll: rollHtml,
      ...this.data
    };
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

export class MoraleRoll extends Roll {
  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.morale = rollData?.system?.morale ?? 7;
  }

  async evaluate() {
    const result = await super.evaluate();
    result.success = result.total <= this.morale;
    return result;
  }

  async render(options) {
    if (!game.user.isGM) {
      return rpc({
        recipient: "GM",
        operation: "moraleRoll",
        actorId: this.data.actor.id
      });
    }

    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    if (!this._evaluated) await this.evaluate();

    const rollHtml = await super.render();
    const template = 'systems/swords-wizardry/module/rolls/morale-roll-sheet.hbs';
    const chatData = {
      total: this.total,
      target: this.morale,
      success: this.success,
      roll: rollHtml,
      ...this.data
    };
    const resultsHtml = await renderTemplate(template, chatData);

    const msg = await SwordsWizardryChatMessage.create({
      rolls: [this],
	  rollMode: CONST.DICE_ROLL_MODES.GMROLL,
	  whisper: ChatMessage.getWhisperRecipients("GM"),
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
  }
}
