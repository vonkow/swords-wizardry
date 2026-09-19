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
  const actor = targetActor ? targetActor : targetToken ? targetToken.actor : null;
  if (!actor) return;
  if (operation === 'damage') {
    actor.update({ system: { hp: { value: actor.system.hp.value - data.amount } } });
  }
  else if (operation === 'spell-effect') {
    const sendingActor = Actor.get(sender);
    const spell = sendingActor.items.get(item);
    if (actor && spell) {
      const effects = spell.effects;
      effects.forEach(async (effect) => {
        const effectData = effect.toObject();
        if (effectData.system.targeted) {
          effectData.disabled = false;
          effectData.transfer = true;
          effectData.system.targeted = false;
          if (effectData.system.durationFormula) {
            const roll = new Roll(effectData.system.durationFormula, sendingActor.getRollData());
            const result = await roll.evaluate();
            effectData.duration.value = result.total;
            effectData.duration.units = effectData.system.durationFormulaUnits;
          }
          actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        }
      });
    }
  }
}
