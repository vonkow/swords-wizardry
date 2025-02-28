import { DamageRoll } from '../rolls/rolls.mjs';

export class SwordsWizardryChatMessage extends ChatMessage {
  constructor(data){
    super(data);
    if (data.damageFormla) this.damageFormula = data.damageFormula;
    if (data.item) {
      this.system = {};
      this.system.item = data.item;
    }
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
      let { damageFormula } = item.system;
      if (actor.system.modifiers && actor.system.modifiers.damage.value && actor.system.modifiers.damage.value != 0)
        damageFormula += `+${actor.system.modifiers.damage.value}`;
      const roll = new DamageRoll(damageFormula, rollData);
      await roll.render();
    });
  }
}
