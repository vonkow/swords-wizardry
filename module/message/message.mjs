import { DamageRoll } from '../rolls/rolls.mjs';
import { rpc } from '../helpers/rpc.mjs';

const { deepClone } = foundry.utils;

export class SwordsWizardryChatMessage extends ChatMessage {
  constructor(data){
    super(data);
    if (data.damageFormla) this.damageFormula = data.damageFormula;
    if (data.item) {
      this.system = {};
      this.system.item = data.item;
    }
  }

  async renderHTML() {
    const html = await super.renderHTML();
    this.activateListeners(html);
    return html;
  }

  activateListeners(html) {
    this._activateRollDamageListener(html);
    this._activateApplyDamageListener(html);
  }

  _activateRollDamageListener(html) {
    $(html).on('click', '.damage-roll-button', async (e) => {
      const { actorId, itemId } = e.currentTarget.dataset;
      let actor = game.actors.get(actorId);
      const targetToken = canvas.tokens.get(actorId);
      if (actor.type === 'npc' && !this.actorLink) {
        // TODO if an item gets added to an unlinked token actor this is looking it up on the parent, which is bad and doesn't work
        // Probaby the fix is to pass either actorId or tokenId to this button as part of attack roll and then figure out which it is
        // here (canvas.tokens.get vs game.actors.get) and grab the item from the token or the actor
        // for now, put items on npcs in the sidebar, not on the board.
        console.error('this is maybe broken');
      }
      const item = actor.items.get(itemId);
      item.rollItemDamageAndEffects();
    });
  }

  _activateApplyDamageListener(html) {
    $(html).on('click', '.apply-damage', async (e) => {

      //TODO MOVE TO rolls/roll with a minimal call after fetching event data (and genericize the application bit)?
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize('SWORDS_WIZARDRY.Chat.OnlyGMCanApply'));
        return;
      }

      const button = e.currentTarget;
      const { action, actorId, itemId, targetId, amount: a } = button.dataset;
      const initialAmount = Number(a);
      const actor = Actor.get(actorId);
      const item = actor.items.get(itemId);
      const target = canvas.tokens.get(targetId);
      if (!target) return;

      const data = await item.applyDamageAndEffects(target, initialAmount, action);
      const { amount, oldHP, newHP, effects } = data;

      const messageId = $(button)
        .closest(".message")
        .data("messageId");

      const message = game.messages.get(messageId);

      if (!message) return;

      const applied = deepClone(
        message.getFlag("swords-wizardry", "appliedDamage") || {}
      );

      applied[targetId] = { action, amount, oldHP, newHP };

      await message.setFlag("swords-wizardry", "appliedDamage", applied);

      await message.update({});
    });
  }
}


Hooks.on("renderChatMessageHTML", (message, html, data) => {
  const appliedDamage = message.getFlag("swords-wizardry", "appliedDamage") || {};
  if (Object.keys(appliedDamage).length) {

    const targets = html.querySelectorAll(".damage-target");

    if(!targets.length) return;

    targets.forEach(targetElement => {
      const button = targetElement.querySelector(".apply-damage");
      if (!button) return;

      const { targetId } = button.dataset;
      if (!appliedDamage[targetId]) return;

      const result = appliedDamage[targetId];

      // TODO can we move this / consolidate it?
      const labelKey
        = result.action === "damage" ? "Damage"
        : result.action === "heal" ? "Healing"
        : result.action === "half" ? "HalfDamage"
        : result.action === "half-heal" ? "HalfHealing"
        : result.action === "double" ? "DoubleDamage"
        : result.action === "none" ? "NoEffect"
        : "Damage";
      const label = game.i18n.localize(`SWORDS_WIZARDRY.Chat.${labelKey}`);

      const resultDiv = targetElement.querySelector(".damage-result");
      if (!resultDiv) return;

      /* Don't tell the players how much HP is remaining, they deserve nothing so useful!
      // Consider making this another option in settings
      resultDiv.innerHTML = `
        Applied ${label}: ${result.amount}<br>
        HP: ${result.oldHP} → ${result.newHP}
      `;
      */

      // TODO This style of state update does not survive between game sessions.
      // Investigate how to keep applied results baked into the message (someday, low-pri).
      const applied = game.i18n.localize('SWORDS_WIZARDRY.Chat.Applied');
      resultDiv.textContent = result.action === "none"
        ? `${applied}: ${label}`
        : `${applied} ${label}: ${Math.abs(result.amount)}`;

      const buttons = targetElement.querySelectorAll("button");

      buttons.forEach(b => b.remove());
    });
  }
});
