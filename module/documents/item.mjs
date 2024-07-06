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
    const item = this;
    console.log(item);
    console.log(game);
    console.log(game.combat.turns.find(c => c.actorId === item.parent._id));
    // Do things with the below. One roll and foreach effect or foreach roll?
    console.log(game.user.targets);

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
      //const result = await roll.evaluate();
      const diceHtml = await roll.render();

      let results_html;
      if (item.system.damageFormula) {
        results_html = `<h3>Rolled: ${item.name}</h3>
        <hr>
        <a class="inline-result">
        <span>${diceHtml}</span>
        <div></div>
        <hr>
        <span>Damage: [[/r ${item.system.damageFormula} ]] </span>
        <hr>
        <div></div>`

      }
      else {
        results_html = `<h3>Rolled: ${item.name}</h3>
        <hr>
        <a class="inline-result">
        <span>${diceHtml}</span>
        <div></div>`
      }

      ChatMessage.create({
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
        rollMode: rollMode,
        user: game.user._id,
        speaker: speaker,
        content: results_html
      });

      return roll;
    }
  }
}
