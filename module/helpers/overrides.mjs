import { DamageRoll } from '../rolls/rolls.mjs';
import { rpc } from './rpc.mjs';

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
	
	$(html).on('click', '.apply-damage', async (e) => {

	  if (!game.user.isGM) {
		ui.notifications.warn("Only GM can apply damage");
		return;
	  }
	  const button = e.currentTarget;
	  const action = e.currentTarget.dataset.action;
	  const targetId = e.currentTarget.dataset.targetId;

	  let amount = Number(e.currentTarget.dataset.amount);

	  if (action === "half") {
		amount = Math.floor(amount / 2);
	  }

	  if (action === "double") {
		amount = amount * 2;
	  }

	  if (action === "heal") {
		amount = amount * -1;
	  }
	  
	  const target = canvas.tokens.get(targetId);

	  if (!target) return;

	  let oldHP = target.actor.system.hp.value;
	  let newHP = target.actor.system.hp.value;
      newHP -= amount;


	  await rpc({
		recipient: 'GM',
		target: target.id,
		operation: 'damage',
		amount: amount,
		data: {
		  system: {
			hp: {
			  value: newHP
			}
		  }
		}
	  });


	const messageId = $(button)
	  .closest(".message")
	  .data("messageId");

	const message = game.messages.get(messageId);

	if (!message) return;

	const applied =
	  foundry.utils.deepClone(
		message.getFlag(
		  "swords-wizardry",
		  "appliedDamage"
		) || {}
	  );

	applied[targetId] = {
	  action: action,
	  amount: amount,
	  oldHP: oldHP,
	  newHP: newHP
	};

	await message.setFlag(
	  "swords-wizardry",
	  "appliedDamage",
	  applied
	);

	await message.update({});
	
	});
  }
}

Hooks.on("renderChatMessageHTML", (message, html, data) => {

  const appliedDamage =
    message.getFlag(
      "swords-wizardry",
      "appliedDamage"
    ) || {};

  const targets =
    html.querySelectorAll(".damage-target");

  if(!targets.length) return;

  targets.forEach(targetElement => {

    const button = targetElement.querySelector(".apply-damage");
    if(!button) return;

    const targetId = button.dataset.targetId;
    if(!appliedDamage[targetId]) return;

    const result = appliedDamage[targetId];

    let label = result.action;

    if(result.action==="damage") label="Damage";
    if(result.action==="heal") label="Healing";
    if(result.action==="half") label="Half Damage";
    if(result.action==="double") label="Double Damage";

    const resultDiv = targetElement.querySelector(".damage-result");
    if(!resultDiv) return;

/* Don't tell the players how much HP is remaining, they deserve nothing so useful!
    resultDiv.innerHTML = `
      Applied ${label}: ${result.amount}<br>
      HP: ${result.oldHP} → ${result.newHP}
    `;
*/
    resultDiv.innerHTML = `
      Applied ${label}: ${result.amount}<br>
    `;

    const buttons =
      targetElement.querySelectorAll("button");

    buttons.forEach(b=>{
      b.disabled = true;
    });

  });

});