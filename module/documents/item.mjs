/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SwordsWizardryItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const rollData = { ...super.getRollData() };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }


  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    // TODO move most of this to a generic roll function so we can reuse outside of items
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      const result = await roll.evaluate();
      const toHitMatrix = this.actor.system.toHitAC;
      const hitTargets = [];
      const missedTargets = [];
      game.user.targets.forEach(target => {
        const targetAC = target.actor.system.ac.value;
        const acKey = targetAC < 0
          ? `${targetAC}`
          : `+${targetAC}`; // AC >= 0 is stored as '+#' in system.toHitAC
        if (result.total >= toHitMatrix[acKey]) {
          hitTargets.push(target);
        } else {
          missedTargets.push(target);
        }
      });

      const diceHtml = await roll.render();

      let resultsHtml;
      if (item.system.damageFormula) {
        // TODO convert to hbs template
        let hitText = hitTargets.map(t => `<span>Hit ${t.actor.name}!</span>`).join('')
        if (hitText.length > 0) hitText = hitText + '<hr>'
        let missedText = missedTargets.map(t => `<span>Missed ${t.actor.name}</span>`).join('')
        if (missedText.length > 0) missedText = missedText + '<hr>'
        resultsHtml = `
          <h3>Rolled: ${item.name}</h3>
          ${hitText}
          ${missedText}
          <hr>
          <a class="inline-result"><span>${diceHtml}</span></a>
          <div></div>
          <hr>
          <span> Damage: [[/r ${item.system.damageFormula}]]</span >
          <hr>
          <div></div>
        `;
      } else {
        resultsHtml = `
          <h3>Rolled: ${item.name}</h3>
          <hr>
          <a class="inline-result"><span>${diceHtml}</span></a>
          <div></div>
        `
      }

      ChatMessage.create({
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: rollMode,
        user: game.user._id,
        speaker: speaker,
        content: resultsHtml
      });

      return roll;
    }
  }
}
