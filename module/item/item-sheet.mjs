import { SpellActionEditor } from '../spells/action-editor.mjs';
import { SPELL_LEVEL_SOURCES } from '../spells/constants.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class SwordsWizardryItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    actions: {
      editImage: this.#onEditImage,
      editSpellActions: this.#editSpellActions,
      spellPost: this.#spellPost,
      spellCast: this.#spellCast
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
    context.rootId = this.id;
    context.rollData = this.item.getRollData();
    context.system = this.item.system;
    context.flags = this.item.flags;
    if (this.item.type === 'spell') {
      context.spellActions = Array.from(this.item.system.actions ?? []).map((action) => ({
        ...action,
        kindLabel: game.i18n.localize(`SWORDS_WIZARDRY.Spell.ActionKinds.${action.kind}`)
      }));
      context.casterLevelSources = SPELL_LEVEL_SOURCES.map((value) => ({
        value,
        label: `SWORDS_WIZARDRY.Spell.CasterLevelSources.${value}`
      }));
      const actor = this.item.actor ?? this.item.parent;
      const level = this.item.system.spellLevel;
      context.canCast = actor?.system?.spellSlots?.[level]?.memorized?.includes(this.item.id) === true;
    }
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

  static async #editSpellActions() {
    if (!this.item.isOwner) return;
    await new SpellActionEditor(this.item).render(true);
  }

  static async #spellPost(_event, target) {
    await runSpellAction(target, () => this.item.post());
  }

  static async #spellCast(_event, target) {
    await runSpellAction(target, () => this.item.cast());
  }

}

async function runSpellAction(target, operation) {
  target.disabled = true;
  try {
    const result = await operation();
    if (result?.status === 'failure') {
      const key = `SWORDS_WIZARDRY.Spell.Validation.${result.code}`;
      const localized = game.i18n.localize(key);
      ui.notifications.warn(localized === key
        ? game.i18n.localize('SWORDS_WIZARDRY.Spell.Validation.UNKNOWN')
        : localized);
    }
  } finally {
    target.disabled = false;
  }
}
