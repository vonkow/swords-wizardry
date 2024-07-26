import { DamageRoll } from '../rolls/rolls.mjs';

export class SwordsWizardryChatMessage extends ChatMessage {
  constructor(data){
    super(data);
    this.damageFormula = data.damageFormula;
    this.system.item = data.item;
  }

  async getHTML() {
    const html = await super.getHTML();
    this.activateListeners(html);
    return html;
  }

  activateListeners(html) {
    $(html).on('click', '.damage-roll-button', async (e) => {
      const { actorId, itemId } = e.currentTarget.dataset;
      const actor = game.actors.get(actorId);
      const item = actor.items.get(itemId);
      const rollData = { actor, item };
      const roll = new DamageRoll(item.system.damageFormula, rollData);
      await roll.render();
    });
  }
}
