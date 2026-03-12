// TODO 
// move app submit buttons to default footer template and _prepareContext
// make apps resizable?
// make the roll a character button fill the whole width for players (not GM)
// ? Update actor and item sheets to v2?

// Import settings.
import { registerSystemSettings } from './settings.mjs';

import { ImportManager } from './importer/importer.mjs';
import { CharacterCreatorManager } from './character-creator/character-creator.mjs';
import { fetchClassFeatures, fetchAncestryFeatures } from './character-creator/auto-generator.mjs';
import { localizeClassKey, normalizeClassKey } from './character-creator/auto-generator.mjs';
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

// Internal helper functions to keep the init block readable (kept inside this file)
function registerDocumentsAndConfig() {
  CONFIG.SWORDS_WIZARDRY = SWORDS_WIZARDRY;
  CONFIG.Combat.initiative = { formula: '1d6', decimals: 2 };
  CONFIG.Actor.documentClass = SwordsWizardryActor;
  CONFIG.Item.documentClass = SwordsWizardryItem;
  CONFIG.Combat.documentClass = SwordsWizardryCombat;
  CONFIG.ChatMessage.documentClass = SwordsWizardryChatMessage;
  CONFIG.Token.documentClass = SwordsWizardryTokenDocument;
  CONFIG.ui.combat = SwordsWizardryCombatTracker;
  CONFIG.Dice.rolls = [ Roll, AttackRoll, DamageRoll, FeatureRoll, SaveRoll ];
  if (CONFIG?.ActiveEffect) CONFIG.ActiveEffect.legacyTransferral = false;
}

function registerSheets() {
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('swords-wizardry', SwordsWizardryActorSheet, { makeDefault: true, label: 'SWORDS_WIZARDRY.SheetLabels.Actor' });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('swords-wizardry', SwordsWizardryItemSheet, { makeDefault: true, label: 'SWORDS_WIZARDRY.SheetLabels.Item' });
}

Hooks.once('init', function() {
  registerSystemSettings();

  game.swordswizardry = {
    // Public API (kept for compatibility)
    SwordsWizardryActor,
    SwordsWizardryItem,
    rollItemMacro,
    // Debug utilities
    debugListMagiaAceroFeatures: async () => {
      try {
        const pack = Array.from(game.packs).find(p => p.documentName === 'Item' && (/magia.*acero|swords.*wizardry.*content/i.test(`${p.package?.id ?? ''}`) || /elementos|elements|items/i.test(`${p.title}`)));
        if (!pack) return console.warn('Could not find the Magia & Acero (S&W content) item pack');
        if (!pack.index.size) await pack.getIndex({ fields: ['name', 'type'] });
        console.debug('[S&W] Pack:', pack.collection, pack.title, 'module:', pack.package?.id);
        console.debug('[S&W] Features:', pack.index.filter(e => e.type === 'feature').map(e => e.name));
        const classes = ['Fighter','Wizard','Cleric','Thief','Paladin','Ranger','Druid','Assassin','Monk'];
        for (const c of classes) {
          const feats = await fetchClassFeatures(pack, c);
          if (feats.length) console.debug(`[S&W] Class ${c}:`, feats.map(f => f.name));
        }
        const ancs = ['Human','Half-Elf','Dwarf','Elf','Halfling'];
        for (const a of ancs) {
          const feats = await fetchAncestryFeatures(pack, a);
          if (feats.length) console.debug(`[S&W] Ancestry ${a}:`, feats.map(f => f.name));
        }
      } catch (err) { console.error('debugListMagiaAceroFeatures error', err); }
    },
    debugListSpellsByClass: async (cls = 'Druid') => {
      try {
        const pack = Array.from(game.packs).find(p => p.documentName === 'Item' && (/magia.*acero|swords.*wizardry.*content/i.test(`${p.package?.id ?? ''}`) || /elementos|elements|items/i.test(`${p.title}`)));
        if (!pack) return console.warn('No item pack found');
        if (!pack.index.size) await pack.getIndex({ fields: ['name', 'type', 'folder'] });
        const foldersById = new Map((pack.folders ?? []).map(fd => [fd.id, fd]));
        const folderPath = (id) => {
          const names = []; let node = foldersById.get(id); let guard = 0;
          while (node && guard++ < 20) { names.unshift((node.name || '').toLowerCase()); node = node.folder ? foldersById.get(node.folder) : null; }
          return names.join('/');
        };
        const entries = [...pack.index];
        // Fast filter by type to avoid loading everything if not needed (assuming type === 'spell')
        const spellEntries = entries.filter(e => e.type === 'spell' || /spell|conjuro/i.test(e.type ?? ''));
        const docs = await Promise.all(spellEntries.map(e => pack.getDocument(e._id)));
        const getLvl = (d) => Number(d.system?.spellLevel ?? d.system?.level ?? d.system?.data?.spellLevel ?? d.system?.data?.level ?? NaN);
        const norm = normalizeClassKey(cls);
        const list = docs.map(d => ({ name: d.name, lvl: getLvl(d), path: folderPath(d.folder?.id ?? d.folder), flags: d.flags }));
        console.debug('[S&W] Spells (filtered):');
        console.table(list.filter(x => /conjuros|spells/.test(x.path)));
        console.debug('[S&W] Class requested:', norm);
      } catch (err) { console.error('debugListSpellsByClass error', err); }
    }
  };

  registerDocumentsAndConfig();
  registerSheets();

  Hooks.on('renderActorDirectory', (app, html, _data, _options) => {
    console.debug('[S&W] renderActorDirectory hook');
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
    const args = Array.prototype.slice.call(arguments, 0, -1); // remove hash/options
    return args.every(Boolean);
  },
  or() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.some(Boolean);
  }
});

Hooks.once('ready', async () => {
  if (game.socket) {
    game.socket.on('system.swords-wizardry', (packet) => {
      if (packet?.type === 'rpc') handleRPC(packet);
      else console.debug('[S&W] socket event', packet);
    });
  } else console.warn('Socket not yet available during ready hook');
  Hooks.on('hotbarDrop', (_bar, data, slot) => createItemMacro(data, slot));
});


Hooks.on('controlToken', async (token, selected) => {
  if (!token) return;
  CombatHud.activateHud(token, selected);
});

// TODO Move to helpers (if needed at all)
async function createItemMacro(data, slot) {
  if (data.type !== 'Item') return;
  if (!data.uuid?.includes('Actor.') && !data.uuid?.includes('Token.')) {
    return ui.notifications.warn(game.i18n?.localize?.('SWORDS_WIZARDRY.Warn.ItemMacroOwnedOnly') ?? 'You can only create macro buttons for owned Items');
  }
  let item;
  try { item = await Item.fromDropData(data); } catch (err) { console.error('Item.fromDropData failed', err); }
  if (!item) return ui.notifications.warn('Item data not resolved');
  const command = `game.swordswizardry.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  if (!macro) {
    try {
      macro = await Macro.create({
        name: item.name,
        type: 'script',
        img: item.img,
        command,
        flags: { 'swords-wizardry.itemMacro': true }
      });
    } catch (err) { console.error('Macro.create failed', err); return; }
  }
  game.user?.assignHotbarMacro(macro, slot);
  return false;
}

async function rollItemMacro(itemUuid) {
  const dropData = { type: 'Item', uuid: itemUuid };
  try {
    const item = await Item.fromDropData(dropData);
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(game.i18n?.format?.('SWORDS_WIZARDRY.Warn.MacroItemMissing', { item: itemName }) ?? `Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }
    // Si el item no tiene método roll, avisar.
    if (typeof item.roll !== 'function') {
      return ui.notifications.warn(`Item ${item.name} cannot be rolled.`);
    }
    await item.roll();
  } catch (err) {
    console.error('rollItemMacro error', err);
    ui.notifications.error('Error rolling item macro');
  }
}
