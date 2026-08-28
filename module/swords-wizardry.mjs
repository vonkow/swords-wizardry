import { registerSystemSettings } from './settings.mjs';
import { ImportManager } from './importer/importer.mjs';
import {
  CharacterCreatorManager
} from './character-creator/character-creator.mjs';
import { SwordsWizardryChatMessage } from './helpers/overrides.mjs';
import {
  AttackRoll, DamageRoll, FeatureRoll, SaveRoll, MoraleRoll
} from './rolls/rolls.mjs';
import {
  CharacterData, ContainerData, NPCData
} from './actor/actor-model.mjs';
import { SwordsWizardryActor } from './actor/actor.mjs';
import { SwordsWizardryActorSheet } from './actor/actor-sheet.mjs';
import {
  ArmorData, FeatureData, ItemData, SpellData, WeaponData
} from './item/item-model.mjs';
import { SwordsWizardryItem } from './item/item.mjs';
import { SwordsWizardryItemSheet } from './item/item-sheet.mjs';
import { SwordsWizardryTokenDocument } from './tokens/token.mjs';
import {
  SwordsWizardryCombatTracker, SwordsWizardryCombat
} from './combat/combat.mjs';
import { CombatHud } from './hud/hud.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { handleRPC } from './helpers/rpc.mjs';
import { SWORDS_WIZARDRY } from './helpers/config.mjs';
import { createFoundrySpellService } from './spells/service.mjs';
import { createFoundrySpellApplicationService } from './spells/application.mjs';
import { createFoundrySpellChatController } from './spells/chat-controller.mjs';

const { Actors, Items } = foundry.documents.collections;
const { ActorSheet, ItemSheet } = foundry.appv1.sheets;
let spellChatController;

Hooks.once('init', function() {
  registerSystemSettings();

  const spellService = createFoundrySpellService();
  const spellApplicationService = createFoundrySpellApplicationService();
  spellChatController = createFoundrySpellChatController(
    spellService,
    spellApplicationService
  );

  game.swordswizardry = {
    SwordsWizardryActor,
    SwordsWizardryItem,
    rollItemMacro,
    spells: Object.freeze({
      post: spellService.post.bind(spellService),
      cast: spellService.cast.bind(spellService),
      invoke: spellService.invoke.bind(spellService),
      requestApplication: spellApplicationService.apply.bind(spellApplicationService)
    })
  };

  CONFIG.SWORDS_WIZARDRY = SWORDS_WIZARDRY;

  CONFIG.Combat.initiative = {
    formula: '1d6',
    decimals: 2,
  };

  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.container = ContainerData;
  CONFIG.Actor.dataModels.npc = NPCData;
  CONFIG.Actor.documentClass = SwordsWizardryActor;
  CONFIG.Item.dataModels.armor = ArmorData;
  CONFIG.Item.dataModels.feature = FeatureData;
  CONFIG.Item.dataModels.item = ItemData;
  CONFIG.Item.dataModels.spell = SpellData;
  CONFIG.Item.dataModels.weapon = WeaponData;
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
    SaveRoll,
    MoraleRoll
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

// TODO Move this to a template, lazy
function showWelcome() {
  SwordsWizardryChatMessage.create({
    content: `<h3><strong>Welcome to Swords & Wizardry!</strong></h3>
<p><em>Swords & Wizardry, S&W, and Mythmere Games are trademarks of <a href="mythmeregames.com">Mythmere Games LLC</a>. The author is not affiliated in any way with Mythmere Games LLC.</em></p>
<p>This system can be used to play Swords & Wizardry and pretty much any variant of Swords & Wizardry or the original edition of the first published RPG. To support this flexibility, it is relatively light on automations. Feedback and Pull Requests are always welcome; see our <a href="https://github.com/vonkow/swords-wizardry">project page</a> to submit either.</p>
<p>Check out the following modules to improve your gaming experience with official game content and additional automations:</p>
<ul>
  <li><a href="https://foundryvtt.com/packages/swords-wizardry-content">Swords & Wizardry Complete Revised Content</a> (Ancestries, classes, items, spells, and monsters)</li>
  <li><a href="https://foundryvtt.com/packages/swords-wizardry-optional-content">Swords & Wizardry Book of Options</a> (Additional ancestries and classes)</li>
  <li><a href="">Swords & Wizardry Fiends and Foes</a> (Coming soon, additional monsters)</li>
</ul>`
  });
}

Hooks.once('ready', async () => {
  spellChatController.start();
  if (game.user.isGM) {
    if (game.settings.get('swords-wizardry', 'systemVersion') !== game.system.version) {
      game.settings.set('swords-wizardry', 'systemVersion', game.system.version);
      showWelcome();
      game.settings.set('swords-wizardry', 'showWelcome', false);
    }
    else if (game.settings.get('swords-wizardry', 'showWelcome')) {
      showWelcome();
      game.settings.set('swords-wizardry', 'showWelcome', false);
    }
  }
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
