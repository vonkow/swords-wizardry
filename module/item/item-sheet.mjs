const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { TextEditor } = foundry.applications.ux;

export class SwordsWizardryItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    actions: {
      editImage: this.#onEditImage,
      effectCreate: this.#effectCreate,
      effectDelete: this.#effectDelete,
      effectEdit: this.#effectEdit
    },
    tag: 'form',
    form: {
      handler: SwordsWizardryItemSheet.#onSubmitForm,
      closeOnSubmit: false,
      submitOnChange: true
    },
    classes: ['swords-wizardry', 'sheet', 'item'],
    position: {
      // height removed for dynamic sizing (was 600)
      width: 520
    },
    window: {
      resizable: true,
      title: 'TODO'
    }
  }

  static TABS = { sheet: [] };

  _getTabsConfig(group) {
    const tabs = foundry.utils.deepClone(super._getTabsConfig(group));
    if (group === 'sheet') {
      tabs.initial = 'details';
      tabs.tabs = [
        { id: 'details', label: 'SWORDS_WIZARDRY.ItemSheet.Tabs.Details' },
        { id: 'effects', label: 'SWORDS_WIZARDRY.ItemSheet.Tabs.Effects' }
      ];
      if (game.user.isGM) {
        tabs.tabs.push(
          { id: 'gmDetails', label: 'SWORDS_WIZARDRY.ItemSheet.Tabs.GMDetails' },
        );
      }
    }
    return tabs;
  }

  static PARTS = {
    form: {
      template: 'systems/swords-wizardry/module/item/item-sheet.hbs',
      scrollable: ''
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      scrollable: ''
    },
    details: {
      template: 'systems/swords-wizardry/module/item/item-details.hbs',
      scrollable: ''
    },
    effects: {
      template: 'systems/swords-wizardry/module/item/item-effects.hbs',
      scrollable: ''
    },
    gmDetails: {
      template: 'systems/swords-wizardry/module/item/item-gm-details.hbs',
      scrollable: ''
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isGM = game.user.isGM;
    context.item = this.item;
    context.effects = this.item.effects;
    context.rollData = this.item.getRollData();
    context.system = this.item.system;
    context.flags = this.item.flags;
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.document.system.description,
      { async: true, relativeTo: this.document }
    );
    context.enrichedGmDescription = await TextEditor.enrichHTML(
      this.document.system.gmDescription,
      { async: true, relativeTo: this.document }
    );
    return context;
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();
    await this.document.update(formData.object);
  }

  static async #onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    });

    fp.render(true);
  }

  static async #effectCreate(event, target) {
    const { type } = target.dataset;
    const name = game.i18n.localize('New.effect');
    const data = { name, type, disabled: true, transfer: false };
    const effect = await this.item.createEmbeddedDocuments("ActiveEffect", [data]);
    return effect;
  }

  static async #effectDelete(event, target) {
    const { id } = target.dataset;
    const effect = this.item.effects.get(id);
    effect.delete();
    this.render(false);
  }

  static async #effectEdit(event, target) {
    const { id } =  target.dataset;
    const effect = this.item.effects.get(id);
    effect.sheet.render(true);
  }
}
