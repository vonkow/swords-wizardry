export class SwordsWizardryTokenDocument extends TokenDocument {
  async _onCreate(data, options, id) {
    await super._onCreate(data, options, id);
    const { actor } = this;
    if (game.user.isGM) {
      if (actor.type === 'npc' && !this.actorLink) {
        if (!actor.system.hp.max) {
          const { hd } = actor.system;
          let dice, modifier;
          if (hd.indexOf('+') > -1) {
            [dice, modifier] = hd.split('+');
            modifier = `+${modifier}`;
          } else if (hd.indexOf('-') > -1) {
            [dice, modifier] = hd.split('-');
            modifier = `-${modifier}`;
          } else {
            dice = hd;
            modifier = '';
          }
          dice = dice.indexOf('d') > -1 ? dice : `${dice}d8`;
          const rollFormula = dice + modifier;
          const roll = await new Roll(rollFormula).evaluate();
          actor.system.hp.max = roll.total;
          actor.system.hp.value = roll.total;
        }
      }
    }
  }
}
