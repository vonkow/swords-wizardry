import {
  SpellValidationError,
  buildSpellMessageSnapshot,
  consumePreparedSpell,
  fingerprintAction,
  normalizeSpellAction,
  planSpellAction,
  resolveCasterLevel
} from './domain.mjs';
import {
  SPELL_FLAG_KEY,
  SPELL_MESSAGE_SCHEMA_VERSION,
  SYSTEM_ID
} from './constants.mjs';
import { evaluateAttackPlan } from './attack-plan.mjs';

const SPELL_CARD_TEMPLATE = `systems/${SYSTEM_ID}/module/templates/spells/spell-card.hbs`;
const SPELL_RESULT_TEMPLATE = `systems/${SYSTEM_ID}/module/templates/spells/action-result.hbs`;
const VISIBILITY_MODES = Object.freeze({
  publicroll: 'public',
  gmroll: 'gm',
  blindroll: 'blind',
  selfroll: 'self',
  roll: undefined
});
const LEGACY_ROLL_MODES = Object.freeze({
  public: 'publicroll',
  gm: 'gmroll',
  blind: 'blindroll',
  self: 'selfroll'
});

export class SpellService {
  #deps;
  #castLocks = new Set();
  #actionLocks = new Set();

  constructor(dependencies) {
    this.#deps = validateDependencies(dependencies);
  }

  async post(itemOrUuid, options = {}) {
    try {
      const item = await this.#resolveSpellItem(itemOrUuid);
      const authorization = await this.#canUseItem(item);
      if (!authorization) return failure('NOT_AUTHORIZED');
      return await this.#createSpellCard(item, options);
    } catch (error) {
      return this.#toFailure(error, 'POST_FAILED');
    }
  }

  async cast(itemOrUuid, options = {}) {
    let item;
    try {
      item = await this.#resolveSpellItem(itemOrUuid);
    } catch (error) {
      return this.#toFailure(error, 'ITEM_NOT_FOUND');
    }
    const actor = item.actor ?? item.parent ?? null;
    if (!actor?.uuid || !actor.isOwner) return failure('NOT_AUTHORIZED');

    const lockKey = `${actor.uuid}:${item.id ?? item._id}`;
    if (this.#castLocks.has(lockKey)) return failure('CAST_IN_PROGRESS');
    this.#castLocks.add(lockKey);

    try {
      const prepared = this.#getPrepared(actor, item);
      if (prepared.status === 'missing') return failure('SPELL_NOT_PREPARED');

      const posted = await this.#createSpellCard(item, {
        ...options,
        consumption: { status: 'pending' }
      });
      if (posted.status !== 'success') return posted;

      const currentPrepared = this.#getPrepared(actor, item);
      if (currentPrepared.status === 'missing') {
        await this.#markConsumption(posted.message, {
          status: 'failed',
          reason: 'STALE_PREPARATION'
        });
        return failure('STALE_PREPARATION', { message: posted.message });
      }

      try {
        await actor.update({
          [currentPrepared.path]: currentPrepared.prepared
        });
      } catch (error) {
        await this.#markConsumption(posted.message, {
          status: 'failed',
          reason: 'CONSUMPTION_FAILED'
        });
        return failure('CONSUMPTION_FAILED', { message: posted.message, error });
      }

      try {
        await this.#markConsumption(posted.message, {
          status: 'consumed',
          actorUuid: actor.uuid,
          spellId: item.id ?? item._id,
          preparedIndex: currentPrepared.index
        });
      } catch (error) {
        this.#deps.notify?.('warn', 'SWORDS_WIZARDRY.Spell.Notifications.AuditFailed');
      }

      return {
        ...posted,
        consumption: { status: 'consumed', index: currentPrepared.index }
      };
    } finally {
      this.#castLocks.delete(lockKey);
    }
  }

  async invoke(messageOrUuid, actionId, options = {}) {
    let message;
    try {
      message = await this.#resolveDocument(messageOrUuid);
      if (!message) return failure('MESSAGE_NOT_FOUND');
      const snapshot = message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
        ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY];
      if (
        snapshot?.schemaVersion !== SPELL_MESSAGE_SCHEMA_VERSION
        || snapshot?.messageKind !== 'spell-card'
      ) {
        return failure('INVALID_MESSAGE_SCHEMA');
      }
      if (!await this.#canInvokeMessage(message, snapshot)) {
        return failure('NOT_AUTHORIZED');
      }

      const storedAction = snapshot.actions?.find((entry) => entry.id === actionId);
      if (!storedAction) return failure('ACTION_NOT_FOUND');
      const { fingerprint: storedFingerprint, ...actionSource } = storedAction;
      const action = normalizeSpellAction(actionSource);
      if (storedFingerprint !== fingerprintAction(action)) return failure('STALE_ACTION');

      const lockKey = `${message.uuid}:${action.id}`;
      if (this.#actionLocks.has(lockKey)) return failure('ACTION_IN_PROGRESS');
      this.#actionLocks.add(lockKey);
      try {
        const targetUuids = this.#resolveInvocationTargets(action, options);
        const plan = planSpellAction({
          action,
          spellLevel: snapshot.item.spellLevel,
          casterLevel: snapshot.casting.casterLevel,
          abilityModifier: options.abilityModifier ?? null,
          targetUuids
        });
        const targetSummaries = await this.#resolveTargetSummaries(targetUuids);
        const evaluation = plan.formula
          ? await this.#deps.evaluateRoll(plan.formula, plan.rollData, {
              rollMode: options.rollMode ?? this.#deps.getRollMode()
            })
          : null;
        if (evaluation && !Number.isFinite(evaluation.total)) {
          return failure('NON_FINITE_ROLL');
        }

        const caster = snapshot.casterUuid
          ? await this.#deps.resolveUuid(snapshot.casterUuid)
          : null;
        const attackResults = plan.kind === 'attack'
          ? evaluateAttackPlan({
              total: evaluation?.total,
              mode: plan.attack.mode,
              useAscendingAC: this.#deps.useAscendingAC?.() === true,
              attacker: caster?.system ?? {},
              targets: targetSummaries
            })
          : [];
        const resultTargets = targetSummaries.map((target) => {
          const attackResult = attackResults.find((entry) => entry.uuid === target.uuid);
          return attackResult
            ? {
                ...target,
                attackOutcome: attackResult.outcome,
                attackTargetNumber: attackResult.targetNumber ?? null
              }
            : target;
        });
        const resultFlags = {
          schemaVersion: SPELL_MESSAGE_SCHEMA_VERSION,
          messageKind: 'spell-result',
          sourceMessageUuid: message.uuid,
          sourceItemUuid: snapshot.sourceItemUuid,
          sourceActorUuid: snapshot.sourceActorUuid,
          casterUuid: snapshot.casterUuid,
          casting: structuredCopy(snapshot.casting),
          item: structuredCopy(snapshot.item),
          action: { ...action, fingerprint: storedFingerprint },
          targetUuids: [...targetUuids],
          targets: resultTargets,
          result: {
            formula: evaluation?.formula ?? plan.formula,
            total: evaluation?.total ?? null,
            attackResults
          },
          application: { entries: {} }
        };
        const renderSpell = {
          ...resultFlags,
          targets: resultFlags.targets.map((target) => ({
            ...target,
            attackOutcomeLabel: target.attackOutcome
              ? this.#deps.localize(
                  `SWORDS_WIZARDRY.Spell.Card.AttackOutcome.${target.attackOutcome}`
                )
              : ''
          }))
        };
        const content = await this.#deps.renderTemplate(SPELL_RESULT_TEMPLATE, {
          spell: renderSpell,
          rollHTML: evaluation?.html ?? ''
        });
        const created = await this.#deps.createChatMessage({
          speaker: this.#deps.getSpeaker({ actor: caster }),
          rollMode: options.rollMode ?? this.#deps.getRollMode(),
          content,
          rolls: evaluation?.roll ? [evaluation.roll] : [],
          flags: { [SYSTEM_ID]: { [SPELL_FLAG_KEY]: resultFlags } }
        });
        return { status: 'success', message: created, plan, result: resultFlags };
      } finally {
        this.#actionLocks.delete(lockKey);
      }
    } catch (error) {
      return this.#toFailure(error, 'ACTION_FAILED');
    }
  }

  async #createSpellCard(item, options) {
    const actor = item.actor ?? item.parent ?? null;
    const resolved = resolveCasterLevel(item.system?.casting ?? {}, actor);
    let casterLevel;
    let casterLevelSource = resolved.source;
    if (resolved.status === 'prompt') {
      const prompted = await this.#deps.promptCasterLevel({
        item,
        actor,
        reason: resolved.reason
      });
      if (prompted == null || prompted === '') return { status: 'cancelled' };
      casterLevel = normalizePromptedLevel(prompted);
      casterLevelSource = 'prompt';
    } else {
      casterLevel = resolved.value;
    }

    const snapshot = buildSpellMessageSnapshot({
      item,
      caster: actor,
      casting: { casterLevel, source: casterLevelSource },
      targetUuids: options.targetUuids ?? []
    });
    const flags = {
      ...structuredCopy(snapshot),
      consumption: structuredCopy(options.consumption ?? { status: 'not-applicable' })
    };
    const descriptionHTML = await this.#deps.enrichHTML(snapshot.item.description, {
      relativeTo: item,
      rollData: snapshot.casting
    });
    const content = await this.#deps.renderTemplate(SPELL_CARD_TEMPLATE, {
      spell: flags,
      descriptionHTML
    });

    try {
      const message = await this.#deps.createChatMessage({
        speaker: this.#deps.getSpeaker({ actor }),
        rollMode: options.rollMode ?? this.#deps.getRollMode(),
        content,
        flags: { [SYSTEM_ID]: { [SPELL_FLAG_KEY]: flags } }
      });
      return { status: 'success', message, snapshot: flags };
    } catch (error) {
      return failure('MESSAGE_CREATE_FAILED', { error });
    }
  }

  async #resolveSpellItem(itemOrUuid) {
    const item = await this.#resolveDocument(itemOrUuid);
    if (!item || item.type !== 'spell') throw new SpellValidationError('ITEM_NOT_FOUND');
    return item;
  }

  async #resolveDocument(documentOrUuid) {
    if (typeof documentOrUuid === 'string') {
      return this.#deps.resolveUuid(documentOrUuid);
    }
    return documentOrUuid ?? null;
  }

  async #canUseItem(item) {
    if (this.#deps.getCurrentUser()?.isGM) return true;
    return item.isOwner === true;
  }

  async #canInvokeMessage(message, snapshot) {
    const user = this.#deps.getCurrentUser();
    if (!user) return false;
    if (user.isGM || message.author?.id === user.id || message.user?.id === user.id) return true;
    if (!snapshot.casterUuid) return false;
    const caster = await this.#deps.resolveUuid(snapshot.casterUuid);
    return caster?.isOwner === true;
  }

  #getPrepared(actor, item) {
    const level = item.system?.spellLevel;
    const path = `system.spellSlots.${level}.memorized`;
    const memorized = actor.system?.spellSlots?.[level]?.memorized;
    if (!Array.isArray(memorized)) return { status: 'missing', path, index: -1 };
    const consumed = consumePreparedSpell(memorized, item.id ?? item._id);
    return { ...consumed, path };
  }

  async #markConsumption(message, consumption) {
    const currentFlags = structuredCopy(
      message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
      ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY]
      ?? {}
    );
    currentFlags.consumption = consumption;
    await message.update({
      [`flags.${SYSTEM_ID}.${SPELL_FLAG_KEY}`]: currentFlags
    });
  }

  #resolveInvocationTargets(action, options) {
    const supplied = options.targetUuids ?? this.#deps.getSelectedTargetUuids();
    const targetUuids = [...new Set(supplied ?? [])];
    if (action.target.mode === 'none') return [];
    if (action.target.mode === 'single' && targetUuids.length !== 1) {
      throw new SpellValidationError('SINGLE_TARGET_REQUIRED');
    }
    if (action.target.mode === 'selected' && targetUuids.length === 0) {
      throw new SpellValidationError('TARGET_REQUIRED');
    }
    return targetUuids;
  }

  async #resolveTargetSummaries(targetUuids) {
    const summaries = [];
    for (const uuid of targetUuids) {
      const document = await this.#deps.resolveUuid(uuid);
      const actor = document?.actor ?? (document?.documentName === 'Actor' ? document : null);
      summaries.push({
        uuid,
        actorUuid: actor?.uuid ?? null,
        name: document?.name ?? actor?.name ?? uuid,
        status: actor ? 'resolved' : 'missing',
        ac: actor?.system?.ac?.value ?? null,
        aac: actor?.system?.aac?.value ?? null
      });
    }
    return summaries;
  }

  #toFailure(error, fallbackCode) {
    if (error instanceof SpellValidationError) {
      return failure(error.code, { error, details: error.details });
    }
    return failure(fallbackCode, { error });
  }
}

export function createFoundrySpellService() {
  const TextEditor = foundry.applications.ux.TextEditor;
  const DialogV2 = foundry.applications.api.DialogV2;
  const renderTemplate = foundry.applications.handlebars.renderTemplate;
  const resolveUuid = foundry.utils.fromUuid ?? globalThis.fromUuid;

  return new SpellService({
    resolveUuid: (uuid) => resolveUuid(uuid),
    enrichHTML: (html, options) => TextEditor.enrichHTML(html, options),
    renderTemplate,
    createChatMessage: (data) => ChatMessage.create(
      applyFoundryChatVisibility(ChatMessage, data)
    ),
    async evaluateRoll(formula, data) {
      if (!Roll.validate(formula)) throw new SpellValidationError('INVALID_ROLL_FORMULA');
      const roll = await new Roll(formula, data).evaluate();
      return {
        formula,
        data,
        total: roll.total,
        roll,
        html: await roll.render()
      };
    },
    async promptCasterLevel({ item }) {
      const values = await DialogV2.input({
        window: { title: game.i18n.localize('SWORDS_WIZARDRY.Spell.CasterLevelPrompt.Title') },
        content: `<label>${game.i18n.localize('SWORDS_WIZARDRY.Spell.CasterLevelPrompt.Label')}<input name="casterLevel" type="number" min="1" max="100" step="1" value="${Math.max(1, Number(item.system?.spellLevel) || 1)}" autofocus></label>`,
        ok: { label: game.i18n.localize('SWORDS_WIZARDRY.Spell.Actions.Continue') },
        rejectClose: false,
        modal: true
      });
      return values?.casterLevel ?? null;
    },
    getSelectedTargetUuids() {
      return Array.from(game.user?.targets ?? []).map((target) => (
        target.document?.uuid ?? target.uuid
      )).filter(Boolean);
    },
    getRollMode: () => game.settings.get('core', 'rollMode'),
    getSpeaker: ({ actor }) => ChatMessage.getSpeaker({ actor }),
    getCurrentUser: () => game.user,
    localize: (key, data) => game.i18n.format(key, data),
    notify: (level, key) => ui.notifications?.[level]?.(game.i18n.localize(key)),
    useAscendingAC: () => game.settings.get(SYSTEM_ID, 'useAscendingAC')
  });
}

export function applyFoundryChatVisibility(ChatMessageClass, data) {
  const { rollMode, ...chatData } = data;
  if (typeof ChatMessageClass?.applyMode === 'function') {
    const visibilityMode = Object.hasOwn(VISIBILITY_MODES, rollMode)
      ? VISIBILITY_MODES[rollMode]
      : rollMode;
    return ChatMessageClass.applyMode(chatData, visibilityMode) ?? chatData;
  }
  if (typeof ChatMessageClass?.applyRollMode === 'function') {
    const legacyRollMode = LEGACY_ROLL_MODES[rollMode] ?? rollMode;
    return ChatMessageClass.applyRollMode(chatData, legacyRollMode) ?? chatData;
  }
  throw new TypeError('ChatMessage visibility API is unavailable.');
}

function validateDependencies(dependencies) {
  const required = [
    'resolveUuid',
    'enrichHTML',
    'renderTemplate',
    'createChatMessage',
    'evaluateRoll',
    'promptCasterLevel',
    'getSelectedTargetUuids',
    'getRollMode',
    'getSpeaker',
    'getCurrentUser',
    'localize'
  ];
  for (const key of required) {
    if (typeof dependencies?.[key] !== 'function') {
      throw new TypeError(`SpellService dependency ${key} must be a function.`);
    }
  }
  return dependencies;
}

function normalizePromptedLevel(value) {
  const level = Number(value);
  if (!Number.isSafeInteger(level) || level < 1 || level > 100) {
    throw new SpellValidationError('INVALID_CASTER_LEVEL');
  }
  return level;
}

function failure(code, extra = {}) {
  return { status: 'failure', code, ...extra };
}

function structuredCopy(value) {
  return JSON.parse(JSON.stringify(value));
}
