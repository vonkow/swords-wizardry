const { ActiveEffectTypeDataModel } = foundry.data;
const { BooleanField, StringField } = foundry.data.fields;

export class SwordsWizardryActiveEffectDataModel extends ActiveEffectTypeDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      targeted: new BooleanField({
        label: 'SWORDS_WIZARDRY.Effect.Targeted',
        initial: false
      }),
      durationFormula: new StringField({ 
        label: 'SWORDS_WIZARDRY.Effect.DurationFormula',
        required: true,
        blank: true,
        initial: ""
      }),
      durationFormulaUnits: new StringField({
        label: 'SWORDS_WIZARDRY.Effect.DurationFormulaUnits',
        required: true,
	choices: CONST.ACTIVE_EFFECT_DURATION_UNITS,
	initial: "minutes" // TODO change to rounds once the list view on actors supports it
      })
    }
  }
}
