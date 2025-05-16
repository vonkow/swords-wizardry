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
      let actor = game.actors.get(actorId);
      const targetToken = canvas.tokens.get(actorId);
      if (actor.type === 'npc' && !this.actorLink) {
        // TODO if an item gets added to an unlinked token actor this is looking it up on the parent, which is bad and doesn't work
        // Probaby the fix is to pass either actorId or tokenId to this button as part of attack roll and then figure out which it is
        // here (canvas.tokens.get vs game.actors.get) and grab the item from the token or the actor
        // for now, put items on npcs in the sidebar, not on the board.
        console.log('this is maybe broken');
      }
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
