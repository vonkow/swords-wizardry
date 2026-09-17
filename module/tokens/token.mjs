export class SwordsWizardryTokenDocument extends TokenDocument {
  async _preCreate(data, options, id) {
    await super._preCreate(data, options, id);
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
          this.updateSource({ delta: { system: { hp: { max: roll.total, value: roll.total } } } });
        }
      }
    }
  }
}
