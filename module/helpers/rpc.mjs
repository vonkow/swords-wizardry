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
    await game.socket.emit('system.swords-wizardry', packet);
  }
}

export async function handleRPC(data = {}) {
  if (data.recipient === 'GM' && game.user.isGM) {
    // TODO consider adding an event list to prevent duplicate execution.
    await run(data);
  } else {
    // TODO future stub for gm -> player and player -> player rpc
  }
}

async function run(data = {}) {
  const { operation, target, sender, item: itemId } = data;
  const targetActor = game.actors.get(target);
  const targetToken = canvas.tokens.get(target);
  const actor = targetActor ? targetActor : targetToken ? targetToken.actor : null;
  if (!actor) return;
  // TODO try to find sending token too?
  const sendingActor = Actor.get(sender);
  const item = sendingActor.items.get(itemId);
  if (operation ==='apply-damage-and-effects') {
    await item.applyDamageAndEffectsGM(actor, data);
  }
}
