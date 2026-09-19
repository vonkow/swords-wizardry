const { ActiveEffectTypeDataModel } = foundry.data;
const { BooleanField, StringField } = foundry.data.fields;

export class SwordsWizardryActiveEffectDataModel extends ActiveEffectTypeDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      targeted: new BooleanField({
        label: 'Targeted TODO',
        initial: false
      }),
      durationFormula: new StringField({ 
        label: 'duration formula TODO',
        required: true,
        blank: true,
        initial: ""
      }),
      durationFormulaUnits: new StringField({
        label: 'duration formula units TODO',
        required: true,
	choices: CONST.ACTIVE_EFFECT_DURATION_UNITS,
	initial: "minutes" // TODO change to rounds once the list view on actors supports it
      })
    }
  }
}
