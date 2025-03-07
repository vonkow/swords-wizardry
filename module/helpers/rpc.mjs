export async function rpc(data = {}) {
  if (!data.recipient) data.recipient = 'GM';
  if (data.recipient === 'GM' && game.user.isGM && game.user.id === game.user.activeGM.id) {
    await run(data);
  } else {
    const packet = {
      requestId: foundry.utils.randomID(16),
      type: 'rpc',
      ...data
    };
    console.log('rpc', data);
    console.log(game.socket);
    await game.socket.emit('system.swords-wizardry', packet);
  }
}

export async function handleRPC(data = {}) {
  console.log('handleRPC', data);
  if (data.recipient === 'GM' && game.user.isGM && game.user.id === game.user.activeGM.id) {
    // TODO consider adding an event list to prevent duplicate execution.
    await run(data);
  } else {
    // TODO future stub for gm -> player and player -> player rpc
    console.log('got an RPC', data);
  }
}

async function run(data = {}) {
  if (data.operation === 'update') {
    const target = game.actors.get(data.target);
    if (target) target.update(data.data);
  }
}
