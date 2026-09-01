// TODO: Rename this file to be ChatMessage or something, it's not really generic overrides
import { DamageRoll } from '../rolls/rolls.mjs';
import { rpc } from './rpc.mjs';

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
        console.log('this is maybe broken');
      }
      const item = actor.items.get(itemId);
      const rollData = { actor, item };
      let { damageFormula } = item.system;
      if (actor.system.modifiers && actor.system.modifiers.damage.value && actor.system.modifiers.damage.value != 0)
        damageFormula += `+${actor.system.modifiers.damage.value}`;
      const roll = new DamageRoll(damageFormula, rollData);
      await roll.render();
    });
  }

  _activateApplyDamageListener(html) {
    $(html).on('click', '.apply-damage', async (e) => {

      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize(
          'SWORDS_WIZARDRY.Chat.OnlyGMCanApply'
        ));
        return;
      }

      const button = e.currentTarget;
      const { action, targetId, amount: a } = button.dataset;
      const initialAmount = Number(a);
      const target = canvas.tokens.get(targetId);
      if (!target) return;

      const amount
        = action === "none" ? 0
        : action === "half" ? Math.floor(initialAmount / 2)
        : action === "double" ? initialAmount * 2
        : action === "heal" ? initialAmount * -1
        : action === "half-heal" ? Math.floor(initialAmount / 2) * -1
        : initialAmount;

      const oldHP = target.actor.system.hp.value;
      const newHP = oldHP - amount;

      if (action !== "none") {
        await rpc({
          recipient: 'GM',
          target: target.id,
          operation: 'damage',
          amount: amount,
          data: { system: { hp: { value: newHP } } }
        });
      }


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
