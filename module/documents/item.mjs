import { AttackRoll } from  '../rolls/rolls.mjs';
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
    const rollData = { ...super.getRollData() };
    rollData.name = this.name;

    if (!this.actor) return rollData;
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
    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
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
    } else {
      const rollData = this.getRollData();
      const roll = new AttackRoll(rollData.formula, rollData);
      await roll.render();
      return roll;
    }
  }
}
