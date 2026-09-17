export async function rpc(data = {}) {
  if (!data.recipient) data.recipient = 'GM';
  if (data.recipient === 'GM' && game.user.isGM) {
    await run(data);
  } else {
    const packet = {
      requestId: foundry.utils.randomID(16),
      type: 'rpc',
      ...data
    };
    console.log('send rpc', data);
    await game.socket.emit('system.swords-wizardry', packet);
  }
}

export async function handleRPC(data = {}) {
  console.log('handleRPC', data);
  if (data.recipient === 'GM' && game.user.isGM) {
    // TODO consider adding an event list to prevent duplicate execution.
    await run(data);
  } else {
    // TODO future stub for gm -> player and player -> player rpc
    console.log('got an RPC', data);
  }
}

async function run(data = {}) {
  const { operation, target, sender, item } = data;
  const targetActor = game.actors.get(target);
  const targetToken = canvas.tokens.get(target);
  if (operation === 'damage') {
    if (targetActor) targetActor.update({
      system: { hp: { value: targetActor.system.hp.value - data.amount } }
    });
    else if (targetToken) targetToken.actor.update({
      system: { hp: { value: targetToken.actor.system.hp.value - data.amount } }
    });
  }
  else if (operation === 'spell-effect') {
    const sendingActor = Actor.get(sender);
    const spell = sendingActor.items.get(item);
    const effects = spell.effects;
    const actor = targetActor ? targetActor : targetToken ? targetToken.actor : null;
    console.log(spell);
    console.log(actor);
    if (actor && spell) {
      effects.forEach((effect) => {
        const appliedEffect = effect.toObject();
	console.log(appliedEffect);
        appliedEffect.disabled = false;
        appliedEffect.transfer = true;
        actor.createEmbeddedDocuments("ActiveEffect", [appliedEffect]);
      });
    }
  }
}
