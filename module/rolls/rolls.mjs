export class AttackRoll extends Roll {

  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.hitTargets = [];
    this.missedTargets = [];
  }

  async evaluate() {
    const result = await super.evaluate();
    const toHitMatrix = this.data.actor.toHitAC;
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
      item: this.data,
      roll: rollHtml,
      total: this.total,
      hitTargets: this.hitTargets,
      missedTargets: this.missedTargets
    }
    const resultsHtml = await renderTemplate(template, chatData);
    ChatMessage.create({
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [this],
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });

  }
  
}
