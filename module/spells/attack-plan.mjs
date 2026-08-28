export function evaluateAttackPlan({
  total,
  mode,
  useAscendingAC,
  attacker,
  targets = []
}) {
  if (!Number.isFinite(Number(total))) throw new TypeError('Attack total must be finite.');
  return targets.map((target) => {
    if (target.status === 'missing') return { uuid: target.uuid, outcome: 'missing' };
    if (mode === 'custom') return { uuid: target.uuid, outcome: 'manual' };
    const targetNumber = useAscendingAC
      ? Number(target.aac)
      : Number(attacker?.tHAC0) - Number(target.ac);
    if (!Number.isFinite(targetNumber)) return { uuid: target.uuid, outcome: 'manual' };
    return {
      uuid: target.uuid,
      outcome: Number(total) >= targetNumber ? 'hit' : 'miss',
      targetNumber
    };
  });
}
export function captureTargetSnapshots(targets = []) {
  return Array.from(targets).map((target) => {
    const document = target.document ?? target;
    const actor = target.actor ?? document.actor ?? null;
    return {
      uuid: document.uuid ?? target.uuid ?? null,
      actorUuid: actor?.uuid ?? null,
      name: target.name ?? document.name ?? actor?.name ?? '',
      status: actor ? 'resolved' : 'missing',
      ac: actor?.system?.ac?.value ?? null,
      aac: actor?.system?.aac?.value ?? null
    };
  }).filter((target) => target.uuid);
}
