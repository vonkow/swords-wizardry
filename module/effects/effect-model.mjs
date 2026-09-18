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
      })
    }
  }
}
