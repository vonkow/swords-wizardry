import {
  SpellValidationError,
  applyHitPointChange,
  fingerprintAction,
  normalizeSpellAction,
  validateApplicationRequest
} from './domain.mjs';
import {
  SPELL_APPLICATION_OPERATION,
  SPELL_APPLICATION_SCHEMA_VERSION,
  SPELL_FLAG_KEY,
  SPELL_MESSAGE_SCHEMA_VERSION,
  SYSTEM_ID
} from './constants.mjs';

export class SpellApplicationService {
  #deps;
  #locks = new Set();

  constructor(dependencies) {
    if (typeof dependencies?.resolveUuid !== 'function') {
      throw new TypeError('SpellApplicationService requires resolveUuid.');
    }
    if (typeof dependencies?.getCurrentUser !== 'function') {
      throw new TypeError('SpellApplicationService requires getCurrentUser.');
    }
    if (typeof dependencies?.getUserById !== 'function') {
      throw new TypeError('SpellApplicationService requires getUserById.');
    }
    this.#deps = dependencies;
  }

  async applyAutomatically(messageOrUuid, options = {}) {
    const currentUser = this.#deps.getCurrentUser();
    if (!currentUser?.isGM) return failure('GM_REQUIRED');

    try {
      const message = typeof messageOrUuid === 'string'
        ? await this.#deps.resolveUuid(messageOrUuid)
        : messageOrUuid;
      if (!message) return failure('MESSAGE_NOT_FOUND');

      const flags = message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
        ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY];
      if (
        flags?.schemaVersion !== SPELL_MESSAGE_SCHEMA_VERSION
        || flags?.messageKind !== 'spell-result'
        || !['damage', 'healing'].includes(flags?.action?.kind)
      ) {
        return failure('ACTION_NOT_APPLICABLE');
      }

      const requestingUserId = String(options.requestingUserId ?? '');
      const requestingUser = this.#deps.getUserById(requestingUserId);
      const authorId = message.author?.id ?? message.user?.id ?? message.user;
      if (!requestingUser || authorId !== requestingUserId) {
        return failure('AUTO_APPLICATION_NOT_AUTHORIZED');
      }

      const sourceMessage = await this.#deps.resolveUuid(flags.sourceMessageUuid);
      const sourceFlags = sourceMessage?.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
        ?? sourceMessage?.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY];
      if (
        sourceFlags?.schemaVersion !== SPELL_MESSAGE_SCHEMA_VERSION
        || sourceFlags?.messageKind !== 'spell-card'
        || sourceFlags.sourceItemUuid !== flags.sourceItemUuid
      ) {
        return failure('AUTO_APPLICATION_SOURCE_INVALID');
      }

      const sourceStoredAction = sourceFlags.actions?.find(
        (entry) => entry.id === flags.action.id
      );
      if (!sourceStoredAction) return failure('AUTO_APPLICATION_SOURCE_INVALID');
      const { fingerprint: sourceFingerprint, ...sourceActionData } = sourceStoredAction;
      const sourceAction = normalizeSpellAction(sourceActionData);
      if (
        sourceFingerprint !== fingerprintAction(sourceAction)
        || sourceFingerprint !== flags.action.fingerprint
      ) {
        return failure('STALE_ACTION');
      }

      const sourceItem = await this.#deps.resolveUuid(flags.sourceItemUuid);
      const ownsSource = requestingUser.isGM
        || sourceItem?.testUserPermission?.(requestingUser, 'OWNER') === true;
      if (sourceItem?.type !== 'spell' || !ownsSource) {
        return failure('AUTO_APPLICATION_NOT_AUTHORIZED');
      }

      return this.apply(message, {
        targetUuid: options.targetUuid,
        kind: flags.action.kind,
        multiplier: 1
      });
    } catch (error) {
      if (error instanceof SpellValidationError) {
        return failure(error.code, { error, details: error.details });
      }
      return failure('APPLICATION_FAILED', { error });
    }
  }

  async apply(messageOrUuid, options = {}) {
    const user = this.#deps.getCurrentUser();
    if (!user?.isGM) return failure('GM_REQUIRED');

    let message;
    try {
      message = typeof messageOrUuid === 'string'
        ? await this.#deps.resolveUuid(messageOrUuid)
        : messageOrUuid;
      if (!message) return failure('MESSAGE_NOT_FOUND');

      const flags = structuredCopy(
        message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
        ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY]
        ?? {}
      );
      if (
        flags.schemaVersion !== SPELL_MESSAGE_SCHEMA_VERSION
        || flags.messageKind !== 'spell-result'
      ) {
        return failure('INVALID_MESSAGE_SCHEMA');
      }

      const { fingerprint: storedFingerprint, ...actionSource } = flags.action ?? {};
      const action = normalizeSpellAction(actionSource);
      if (storedFingerprint !== fingerprintAction(action)) return failure('STALE_ACTION');
      if (!['damage', 'healing'].includes(action.kind)) return failure('ACTION_NOT_APPLICABLE');
      if (options.kind !== action.kind) return failure('ACTION_KIND_MISMATCH');

      const targetUuid = String(options.targetUuid ?? '');
      if (!flags.targetUuids?.includes(targetUuid)) return failure('TARGET_NOT_IN_RESULT');
      const applicationId = createApplicationId({
        messageUuid: message.uuid,
        actionId: action.id,
        targetUuid
      });
      const applicationEntries = flags.application?.entries ?? {};
      const existing = applicationEntries[applicationId];
      if (existing && isApplicationEntryForMessage(applicationId, existing, message.uuid)) {
        return { status: 'duplicate', application: existing };
      }
      if (this.#locks.has(applicationId)) return failure('APPLICATION_IN_PROGRESS');
      this.#locks.add(applicationId);

      try {
        const amount = Number(flags.result?.total);
        const request = validateApplicationRequest({
          schemaVersion: SPELL_APPLICATION_SCHEMA_VERSION,
          requestId: applicationId,
          operation: SPELL_APPLICATION_OPERATION,
          messageUuid: message.uuid,
          actionId: action.id,
          actionFingerprint: storedFingerprint,
          targetUuid,
          kind: action.kind,
          amount,
          multiplier: Number(options.multiplier ?? 1)
        });

        const target = await this.#deps.resolveUuid(request.targetUuid);
        const actor = target?.actor ?? (target?.documentName === 'Actor' ? target : null);
        if (!actor) return failure('TARGET_NOT_FOUND');

        const change = applyHitPointChange({
          kind: request.kind,
          current: actor.system?.hp?.value,
          maximum: actor.system?.hp?.max,
          amount: request.amount,
          multiplier: request.multiplier
        });
        const entry = {
          applicationId,
          requestId: request.requestId,
          status: 'applied',
          actionId: action.id,
          actionFingerprint: storedFingerprint,
          targetUuid,
          actorUuid: actor.uuid ?? null,
          kind: request.kind,
          multiplier: request.multiplier,
          requestedAmount: change.requestedAmount,
          appliedAmount: change.appliedAmount,
          oldHP: change.oldHP,
          newHP: change.newHP,
          appliedBy: user.id,
          appliedAt: this.#deps.now?.() ?? Date.now()
        };

        try {
          await actor.update({ 'system.hp.value': change.newHP });
        } catch (error) {
          return failure('TARGET_UPDATE_FAILED', { error });
        }

        const entriesPath = `flags.${SYSTEM_ID}.${SPELL_FLAG_KEY}.application.entries`;
        const auditUpdate = { [`${entriesPath}.${applicationId}`]: entry };
        for (const [entryId, application] of Object.entries(applicationEntries)) {
          if (!isApplicationEntryForMessage(entryId, application, message.uuid)) {
            auditUpdate[`${entriesPath}.-=${entryId}`] = null;
          }
        }
        try {
          await message.update(auditUpdate);
        } catch (auditError) {
          try {
            await actor.update({ 'system.hp.value': change.oldHP });
          } catch (rollbackError) {
            return {
              status: 'unsafe',
              code: 'ROLLBACK_FAILED',
              change,
              auditError,
              rollbackError
            };
          }
          return failure('AUDIT_FAILED_ROLLED_BACK', { change, error: auditError });
        }

        return { status: 'success', application: entry, change };
      } finally {
        this.#locks.delete(applicationId);
      }
    } catch (error) {
      if (error instanceof SpellValidationError) {
        return failure(error.code, { error, details: error.details });
      }
      return failure('APPLICATION_FAILED', { error });
    }
  }
}

export function createFoundrySpellApplicationService() {
  const resolveUuid = foundry.utils.fromUuid ?? globalThis.fromUuid;
  return new SpellApplicationService({
    resolveUuid: (uuid) => resolveUuid(uuid),
    getCurrentUser: () => game.user,
    getUserById: (id) => game.users.get(id),
    now: () => Date.now()
  });
}

export function createApplicationId({ messageUuid, actionId, targetUuid }) {
  return `apply-${fingerprintAction({ messageUuid, actionId, targetUuid })}`;
}

export function isApplicationEntryForMessage(applicationId, entry, messageUuid) {
  if (!entry || typeof entry !== 'object') return false;
  return applicationId === createApplicationId({
    messageUuid,
    actionId: entry.actionId,
    targetUuid: entry.targetUuid
  });
}

function failure(code, extra = {}) {
  return { status: 'failure', code, ...extra };
}

function structuredCopy(value) {
  return JSON.parse(JSON.stringify(value));
}
