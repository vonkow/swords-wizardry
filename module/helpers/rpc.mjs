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
  if (data.operation === 'damage') {
    const targetActor = game.actors.get(data.target);
    const targetToken = canvas.tokens.get(data.target);
    if (targetActor) targetActor.update({
      system: { hp: { value: targetActor.system.hp.value - data.amount } }
    });
    else if (targetToken) targetToken.actor.update({
      system: { hp: { value: targetToken.actor.system.hp.value - data.amount } }
    });
  }
}
