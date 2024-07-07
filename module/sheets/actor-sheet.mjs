import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SwordsWizardryActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swords-wizardry', 'sheet', 'actor'],
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/swords-wizardry/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    context.useAscendingAC = game.settings.get('swords-wizardry', 'useAscendingAC');
    context.includeOptionalSkills = game.settings.get('swords-wizardry', 'includeOptionalSkills');

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.SWORDS_WIZARDRY.abilities[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.modifiers)) {
      v.label = game.i18n.localize(CONFIG.SWORDS_WIZARDRY.modifiers[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.thievingSkills)) {
      v.label = game.i18n.localize(CONFIG.SWORDS_WIZARDRY.thievingSkills[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.optionalSkills)) {
      v.label = game.i18n.localize(CONFIG.SWORDS_WIZARDRY.optionalSkills[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const armor = [];
    const gear = [];
    const features = [];
    const weapons = [];
    const spells = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'armor') {
        armor.push(i);
      }
      if (i.type === 'item') {
        gear.push(i);
      }
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined && i.system.spellLevel > 0) {    // added minimum check to not break old char sheets
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.armor = armor;
    context.gear = gear;
    context.features = features;
    context.weapons = weapons;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    html.on('click', '.item-prepare', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const { spellLevel } = item.system;
      const slots = this.actor.system.spellSlots[spellLevel];
      if (slots.memorized.length < slots.max) {
        slots.memorized.push(item._id);
        slots.memorizedSpells = slots.memorizedSpells || [];
        slots.memorizedSpells.push(item);
      }
      const spellSlots = {};
      //await this.actor.update({ spellLevel: { [spellLevel]: slots } });
      const key = `system.spellSlots.${spellLevel}.memorized`;
      await this.actor.update({
        [key]: slots.memorized
      });
      this.actor.render();
    });

    html.on('click', '.item-cast', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemId = li.data('itemId');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const { spellLevel } = item.system;
      const slots = this.actor.system.spellSlots[spellLevel];
      const mIndex = slots.memorized.indexOf(itemId);
      if (mIndex > -1) slots.memorized.splice(mIndex, 1);
      const sIndex = slots.memorizedSpells.indexOf(item);
      if (sIndex > -1) slots.memorizedSpells.splice(sIndex, 1);
      this.actor.render();
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));


    html.on('click', '.item-inc', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const newq = item.system.quantity + 1;
      item.update({ 'system.quantity': newq });
      this.actor.render();
    });

    html.on('click', '.item-dec', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      const newq = item.system.quantity - 1;
      if (newq > 0)
        item.update({ 'system.quantity': newq });
      this.actor.render();
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = game.i18n.localize(`New.${type}`);
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';

      let roll = new Roll(dataset.roll, this.actor.getRollData());

      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
}
