const { ActiveEffectConfig } = foundry.applications.sheets;

export class SwordsWizardryActiveEffectConfig extends ActiveEffectConfig {
  static PARTS = {
    ...super.PARTS,
    details: { template: "systems/swords-wizardry/module/effects/effect-details.hbs" },
    duration: { template: "systems/swords-wizardry/module/effects/effect-duration.hbs" }
  }

  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    if (partId === 'details') {
      partContext.fields.system.targeted = this.document.system.schema.fields.targeted;
    }
    if (partId === 'duration') {
      partContext.fields.system.durationFormula = this.document.system.schema.fields.durationFormula;
    }
    return partContext;
  }
}
