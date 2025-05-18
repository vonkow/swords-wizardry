// TODO for v13
// move app submit buttons to default footer template and _prepareContext
// make apps resizable?
// make the roll a character button fill the whole width for players (not GM)
// ? Update actor and item sheets to v2?

// Import settings.
import { registerSystemSettings } from './settings.mjs';

import { ImportManager } from './importer/importer.mjs';
import { CharacterCreatorManager } from './character-creator/character-creator.mjs';
import { SwordsWizardryChatMessage } from './helpers/overrides.mjs';

import { AttackRoll, DamageRoll, FeatureRoll, SaveRoll } from './rolls/rolls.mjs';
// Import document classes.
import { SwordsWizardryActor } from './actor/actor.mjs';
import { SwordsWizardryItem } from './item/item.mjs';
import { SwordsWizardryCombatTracker, SwordsWizardryCombat } from './combat/combat.mjs';
import { SwordsWizardryTokenDocument } from './tokens/token.mjs';
// Import sheet classes.
import { SwordsWizardryActorSheet } from './actor/actor-sheet.mjs';
import { SwordsWizardryItemSheet } from './item/item-sheet.mjs';
// Import apps
import { CombatHud } from './hud/hud.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { handleRPC } from './helpers/rpc.mjs';
import { SWORDS_WIZARDRY } from './helpers/config.mjs';

Hooks.once('init', function() {
  registerSystemSettings();

  game.swordswizardry = {
    SwordsWizardryActor,
    SwordsWizardryItem,
    rollItemMacro,
  };

  CONFIG.SWORDS_WIZARDRY = SWORDS_WIZARDRY;

  CONFIG.Combat.initiative = {
    formula: '1d6',
    decimals: 2,
  };

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

  Hooks.on('renderActorDirectory', (app, html, _data, _options) => {
    console.log('renderActorDirectory', app, html);
    ImportManager.addImportActorButton(app, html);
    CharacterCreatorManager.addCharacterCreationButton(app, html);
  });

  return preloadHandlebarsTemplates();
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

Hooks.once('ready', async () => {
  game.socket.on('system.swords-wizardry',(packet) => {
    if (packet.type === 'rpc') handleRPC(packet);
    else console.log('system.swords-wizardry', 'socket event', packet);
  });
  Hooks.on('hotbarDrop', (_bar, data, slot) => createItemMacro(data, slot));
});


Hooks.on('controlToken', async (token, selected) => {
  CombatHud.activateHud(token, selected);
});

// TODO Move to helpers (if needed at all)
async function createItemMacro(data, slot) {
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn('You can only create macro buttons for owned Items');
  }
  const item = await Item.fromDropData(data);
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

function rollItemMacro(itemUuid) {
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  Item.fromDropData(dropData).then((item) => {
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }
    item.roll();
  });
}
