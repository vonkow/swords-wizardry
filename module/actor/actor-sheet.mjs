const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class SwordsWizardryActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    actions: {
      editImage: this.#onEditImage,
      itemCreate: this.#itemCreate,
      itemDecrement: this.#itemDecrement,
      itemDelete: this.#itemDelete,
      itemEdit: this.#itemEdit,
      itemIncrement: this.#itemIncrement,
      moraleRoll: this.#moraleRoll,
      roll: this.#roll,
      saveRoll: this.#saveRoll,
      spellCast: this.#spellCast,
      spellPost: this.#spellPost,
      spellPrepare: this.#spellPrepare
    },
    tag: 'form',
    form: {
      handler: SwordsWizardryActorSheet.#onSubmitForm,
      closeOnSubmit: false,
      submitOnChange: true
    },
    classes: ['swords-wizardry', 'sheet', 'actor'],
    position: {
      width: 640,
      height: 640
    },
    window: {
      resizable: true,
      title: 'TODO'
    }
  }

  static TABS = { sheet: {} }

  _getTabsConfig(group) {
    const tabs = foundry.utils.deepClone(super._getTabsConfig(group));
    if (group === 'sheet') {
      if (this.actor.type === 'character') {
        tabs.initial = 'features';
        tabs.tabs = [
          // id, icon?, label?, tooltip?, cssClass?
          { id: 'features', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Main' },
          { id: 'weapons', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Combat' },
          { id: 'items', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Equipment' },
          { id: 'spells', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Spells' },
          { id: 'description', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Description' }
        ];
      }
      else if (this.actor.type === 'npc') {
        tabs.initial = 'weapons';
        tabs.tabs = [
          { id: 'weapons', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Combat' },
          { id: 'description', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Description' },
          { id: 'items', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Equipment' },
          { id: 'spells', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Spells' }
        ];
      }
      else if (this.actor.type === 'container') {
        tabs.initial = 'items';
        tabs.tabs = [
          { id: 'items', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Equipment' },
          { id: 'description', label: 'SWORDS_WIZARDRY.CharacterSheet.Tabs.Description' }
        ];
      }
    }
    return tabs;
  }

  static PARTS = {
    character: {
      template: 'systems/swords-wizardry/module/actor/character-sheet.hbs',
      scrollable: ''
    },
    container: {
      template: 'systems/swords-wizardry/module/actor/container-sheet.hbs',
      scrollable: ''
    },
    npc: {
      template: 'systems/swords-wizardry/module/actor/npc-sheet.hbs',
      scrollable: ''
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
      scrollable: ''
    },
    features: {
      template: 'systems/swords-wizardry/module/actor/features.hbs',
      scrollable: ''
    },
    weapons: {
      template: 'systems/swords-wizardry/module/actor/weapons.hbs',
      scrollable: ''
    },
    items: {
      template: 'systems/swords-wizardry/module/actor/items.hbs',
      scrollable: ''
    },
    spells: {
      template: 'systems/swords-wizardry/module/actor/spells.hbs',
      scrollable: ''
    },
    description: {
      template: 'systems/swords-wizardry/module/actor/description.hbs',
      scrollable: ''
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.useAscendingAC = game.settings.get(
      'swords-wizardry',
      'useAscendingAC'
    );
    // TODO do we want to set context.actor or just this.actor it? figure out why
    context.actor = this.actor;
    context.system = this.actor.system;
    context.flags = this.actor.flags;

    // todo will container type get mad at this?
    this._prepareItems(context);
    if (this.actor.type == 'character') {
      this._prepareCharacterData(context);
    }

    // TODO is this needed?
    // Add roll data for TinyMCE editors.
    context.rollData = this.actor.getRollData();
    return context;
  }

  _prepareItems(context) {
    if (this.actor.type === 'container') {
      context.gear = this.actor.items;
    }
    else {
      context.armor = [];
      context.gear = [];
      context.features = [];
      context.weapons = [];
      context.spells = {
        1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: []
      };

      for (let i of this.actor.items) {
        i.img = i.img || Item.DEFAULT_ICON;
        switch (i.type) {
          case 'armor': context.armor.push(i); break;
          case 'feature': context.features.push(i); break;
          case 'item': context.gear.push(i); break;
          case 'spell': context.spells[i.system.spellLevel].push(i); break;
          case 'weapon': context.weapons.push(i); break;
        }
      }
    }
  }

  _prepareCharacterData(context) {
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(
        CONFIG.SWORDS_WIZARDRY.abilities[k]
      ) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.modifiers)) {
      v.label = game.i18n.localize(
        CONFIG.SWORDS_WIZARDRY.modifiers[k]
      ) ?? k;
    }
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

  static async #itemCreate(event, target) {
    const { type, spellLevel } = target.dataset;
    const name = game.i18n.localize(`New.${type}`);
    const data = { name, type };
    if (spellLevel) data.system = { spellLevel };
    // Grab any data associated with this control.
    //const system = duplicate(target.dataset);
    return await Item.create(data, { parent: this.actor });
  }

  static async #itemDelete(event, target) {
    const { id } = target.dataset;
    const item = this.actor.items.get(id);
    item.delete();
    this.render(false);
  }

  static async #itemEdit(event, target) {
    const { id } =  target.dataset;
    const item = this.actor.items.get(id);
    item.sheet.render(true);
  }

  static async #itemIncrement(event, target) {
    const { id } =  target.dataset;
    const item = this.actor.items.get(id);
    const newQuantity = item.system.quantity + 1;
    item.update({ 'system.quantity': newQuantity });
  }

  static async #itemDecrement(event, target) {
    const { id } =  target.dataset;
    const item = this.actor.items.get(id);
    const newQuantity = item.system.quantity - 1;
    if (newQuantity > 0) await item.update({ 'system.quantity': newQuantity });
  }

  static async #moraleRoll(_event, _target) {
    this.actor.rollMorale();
  }

  static async #roll(event, target) {
    const { id, rollType, roll, label } = target.dataset;
    if (rollType === 'item') {
      const item = this.actor.items.get(id);
      if (item) return item.roll();
    }
    if (roll) {
      const flavor = label ? `[ability] ${label}` : '';
      const rollObj = new Roll(roll, this.actor.getRollData());
      rollObj.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  static async #saveRoll(_event, _target) {
    this.actor.rollSave();
  }

  static async #spellPrepare(event, target) {
    const { id } = target.dataset;
    const item = this.actor.items.get(id);
    if (!item || !this.actor.isOwner) return;
    const { spellLevel } = item.system;
    const slots = this.actor.system.spellSlots[spellLevel];
    if (!slots || slots.memorized.length >= slots.max) return;
    const memorized = [...slots.memorized, item.id];
    const key = `system.spellSlots.${spellLevel}.memorized`;
    await this.actor.update({ [key]: memorized });
    this.actor.render();
  }

  static async #spellCast(event, target) {
    const { id } = target.dataset;
    const item = this.actor.items.get(id);
    if (!item) return;
    await runSpellAction(target, () => item.cast());
  }

  static async #spellPost(event, target) {
    const { id } = target.dataset;
    const item = this.actor.items.get(id);
    if (!item) return;
    await runSpellAction(target, () => item.post());
  }
}

async function runSpellAction(target, operation) {
  target.disabled = true;
  try {
    const result = await operation();
    if (result?.status !== 'failure') return;
    const key = `SWORDS_WIZARDRY.Spell.Validation.${result.code}`;
    const localized = game.i18n.localize(key);
    ui.notifications.warn(localized === key
      ? game.i18n.localize('SWORDS_WIZARDRY.Spell.Validation.UNKNOWN')
      : localized);
  } finally {
    target.disabled = false;
  }
}
