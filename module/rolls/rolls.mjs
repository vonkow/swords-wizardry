import { SwordsWizardryChatMessage } from '../helpers/overrides.mjs';
export class AttackRoll extends Roll {

  constructor(formula, rollData={}, options={}) {
    console.log(rollData);
    super(formula, rollData, options);
    console.log(this);
    this.hitTargets = [];
    this.missedTargets = [];
  }

  async evaluate() {
    const result = await super.evaluate();
    const toHitMatrix = this.data.actor.toHitAC;
    // TODO move game.user.targets to up the chain and pass it in for more generic attacks?
    game.user.targets.forEach((target) => {
      const targetAC = target.actor.system.ac.value;
      const acKey = targetAC < 0
        ? `${targetAC}`
        : `+${targetAC}`; // AC >= 0 is stored as '+#' in system.toHitAC
      if (result.total >= toHitMatrix[acKey]) {
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
      itemId: this._id,
      item: this.data,
      roll: rollHtml,
      total: this.total,
      hitTargets: this.hitTargets,
      missedTargets: this.missedTargets,
      damageFormula: this.data.damageFormula
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [this],
      rollMode: rollMode,
      damageFormula: this.data.damageFormula,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
    console.log(msg);

  }
  
}

export class DamageRoll extends Roll {
  async evaluate() {
    const result = await super.evaluate();
    return result;
  }
}
