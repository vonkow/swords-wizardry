const { ActiveEffectConfig } = foundry.applications.sheets;

export class SwordsWizardryActiveEffectConfig extends ActiveEffectConfig {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    }
  }

  static PARTS = {
    ...super.PARTS,
    details: { template: "systems/swords-wizardry/module/effects/effect-details.hbs" },
    duration: { template: "systems/swords-wizardry/module/effects/effect-duration.hbs" },
    footer: { template: "systems/swords-wizardry/module/effects/empty-footer.hbs" }
  }

  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    if (partId === 'details') {
      partContext.fields.system.targeted = this.document.system.schema.fields.targeted;
    }
    if (partId === 'duration') {
      partContext.fields.system.durationFormula = this.document.system.schema.fields.durationFormula;
      partContext.fields.system.durationFormulaUnits = this.document.system.schema.fields.durationFormulaUnits;
    }
    return partContext;
  }

  _processFormData(event, form, formData) {
    if (formData.system?.targeted) {
      formData.disabled = true;
      formData.transfer = false;
    }
    return super._processFormData(Event, form, formData);
  }
}
