const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class SwordsWizardryItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    actions: {
    },
    tag: 'form',
    form: {
      handler: SwordsWizardryItemSheet.#onSubmitForm,
      closeOnSubmit: false,
      submitOnChange: true
    },
    classes: ['swords-wizardry', 'sheet', 'item'],
    position: {
      height: 480,
      width: 520
    },
    window: {
      resizable: true,
      title: 'TODO'
    }
  }

  static PARTS = {
    form: {
      template: 'systems/swords-wizardry/module/item/item-sheet.hbs',
      scrollable: ''
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.rollData = this.item.getRollData();
    context.system = this.item.system;
    context.flags = this.item.flags;
    return context;
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();
    await this.document.update(formData.object);
  }

}
