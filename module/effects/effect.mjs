const { ActiveEffectConfig } = foundry.applications.sheets;

export class SwordsWizardryActiveEffectConfig extends ActiveEffectConfig {
  static PARTS = {
    ...super.PARTS,
    duration: {template: "systems/swords-wizardry/module/effects/effect-duration.hbs"}
  }

  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    if (partId === 'duration') {
      //console.log(this.document);
      //console.log(partContext);
      partContext.fields.system.durationFormula = this.document.system.schema.fields.durationFormula;
    }
    return partContext;
  }
}
