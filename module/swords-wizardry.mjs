// Import settings.
import { registerSystemSettings } from './settings.mjs';

import { ImportManager } from './helpers/import-tools.mjs';
import { CharacterCreatorManager } from './apps/character-creator.mjs';
import { SwordsWizardryChatMessage } from './helpers/overrides.mjs';

import { AttackRoll, DamageRoll, FeatureRoll, SaveRoll } from './rolls/rolls.mjs';
// Import document classes.
import { SwordsWizardryActor } from './documents/actor.mjs';
import { SwordsWizardryItem } from './documents/item.mjs';
import { SwordsWizardryCombatTracker, SwordsWizardryCombat } from './documents/combat.mjs';
import { SwordsWizardryTokenDocument } from './tokens/token.mjs';
// Import sheet classes.
import { SwordsWizardryActorSheet } from './sheets/actor-sheet.mjs';
import { SwordsWizardryItemSheet } from './sheets/item-sheet.mjs';
// Import apps
import { CombatHud } from './apps/hud.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { handleRPC } from './helpers/rpc.mjs';
import { SWORDS_WIZARDRY } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function() {

  // Register settings first.
  registerSystemSettings();

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.swordswizardry = {
    SwordsWizardryActor,
    SwordsWizardryItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.SWORDS_WIZARDRY = SWORDS_WIZARDRY;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d6',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SwordsWizardryActor;
  CONFIG.Item.documentClass = SwordsWizardryItem;
  CONFIG.Combat.documentClass = SwordsWizardryCombat;
  CONFIG.ChatMessage.documentClass = SwordsWizardryChatMessage;
  CONFIG.Token.documentClass = SwordsWizardryTokenDocument;

  CONFIG.ui.combat = SwordsWizardryCombatTracker;

  CONFIG.Dice.rolls = [
    Roll,
    AttackRoll,
    DamageRoll,
    FeatureRoll,
    SaveRoll
  ];


  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('swords-wizardry', SwordsWizardryActorSheet, {
    makeDefault: true,
    label: 'SWORDS_WIZARDRY.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('swords-wizardry', SwordsWizardryItemSheet, {
    makeDefault: true,
    label: 'SWORDS_WIZARDRY.SheetLabels.Item',
  });

  Hooks.on('renderSidebarTab', (app, html) => {
    ImportManager.addImportActorButton(app, html);
    CharacterCreatorManager.addCharacterCreationButton(app, html);
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper({
    eq: (v1, v2) => v1 === v2,
    ne: (v1, v2) => v1 !== v2,
    lt: (v1, v2) => v1 < v2,
    gt: (v1, v2) => v1 > v2,
    lte: (v1, v2) => v1 <= v2,
    gte: (v1, v2) => v1 >= v2,
    and() {
        return Array.prototype.every.call(arguments, Boolean);
    },
    or() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    }
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async () => {
  game.socket.on('system.swords-wizardry',(packet) => {
    if (packet.type === 'rpc') handleRPC(packet);
    else console.log('system.swords-wizardry', 'socket event', packet);
  });
  Hooks.on('hotbarDrop', (_bar, data, slot) => createItemMacro(data, slot));
});


/* -------------------------------------------- */
/* HUD Hook                                     */
/* -------------------------------------------- */
Hooks.on('controlToken', async (token, selected) => {
  CombatHud.activateHud(token, selected);
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.swordswizardry.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'swords-wizardry.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
};

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
