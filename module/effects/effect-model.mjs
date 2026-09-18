const { ActiveEffectTypeDataModel } = foundry.data;
const { StringField } = foundry.data.fields;

export class SwordsWizardryActiveEffectDataModel extends ActiveEffectTypeDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      durationFormula: new StringField({ label: 'duration formula', required: true, blank: true, initial: "" })
    }
  }
}
