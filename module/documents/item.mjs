import { AttackRoll, FeatureRoll } from  '../rolls/rolls.mjs';

export class SwordsWizardryItem extends Item {

  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  getRollData() {
    const rollData = { ...super.getRollData() };
    rollData.name = this.name;
    rollData.item = this;
    switch (this.type) {
      case 'weapon':
        return this.getWeaponRollData(rollData);
      case 'feature':
        return this.getFeatureRollData(rollData);
      default:
        return rollData;
    }
  }

  getWeaponRollData(rollData) {
    rollData.formula = 'd20';
    if (rollData.modifier)
      rollData.formula += ` + ${rollData.modifier}`;
    if (!this.actor) return rollData;
    rollData.actor = this.actor.getRollData();
    rollData.actor._id = this.actor._id;
    if (rollData.actor.toHit)
      rollData.formula += ` + ${rollData.actor.toHit.v}`;
    if (rollData.missile)
      rollData.formula += ` + ${rollData.actor.missileToHit.v}`;
    if (rollData.actor.modifiers && rollData.actor.modifiers.damage && rollData.actor.modifiers.damage !== '0')
      rollData.damageFormula += ` + ${rollData.actor.modifiers.damage.value}`;
    return rollData;
  }

  getFeatureRollData(rollData) {
    return rollData;
  }

  async roll() {
    const item = this;
    let rollData, roll;
    switch (this.type) {
      case 'weapon':
        rollData = this.getRollData();
        roll = new AttackRoll(rollData.formula, rollData);
        await roll.render();
        return roll;
      case 'feature':
        if (this.system.formula) {
          rollData = this.getRollData();
          roll = new FeatureRoll(rollData.formula, rollData);
          await roll.render();
          return roll;
        }
      case 'spell':
      case 'item':
      case 'armor':
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
        break;
    }
  }
}
