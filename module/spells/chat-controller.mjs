import { SPELL_FLAG_KEY, SYSTEM_ID } from './constants.mjs';
import { isApplicationEntryForMessage } from './application.mjs';

export class SpellChatController {
  #deps;
  #renderHookId = null;
  #createHookId = null;
  #renderHandler;
  #createHandler;

  constructor(dependencies) {
    this.#deps = {
      getActiveGM: () => null,
      dmAppliesDamage: () => true,
      ...dependencies
    };
    this.#renderHandler = (message, html) => this.#onRender(message, html);
    this.#createHandler = (message, _options, userId) => (
      this.#onCreate(message, userId).catch((error) => {
        console.error('Swords & Wizardry | Automatic spell application failed.', error);
      })
    );
  }

  start() {
    if (this.#renderHookId != null || this.#createHookId != null) return;
    this.#renderHookId = this.#deps.hooks.on(
      'renderChatMessageHTML',
      this.#renderHandler
    );
    this.#createHookId = this.#deps.hooks.on('createChatMessage', this.#createHandler);
  }

  stop() {
    if (this.#renderHookId != null) {
      this.#deps.hooks.off('renderChatMessageHTML', this.#renderHookId);
      this.#renderHookId = null;
    }
    if (this.#createHookId != null) {
      this.#deps.hooks.off('createChatMessage', this.#createHookId);
      this.#createHookId = null;
    }
  }

  async #onCreate(message, requestingUserId) {
    if (this.#deps.dmAppliesDamage()) return;

    const currentUser = this.#deps.getCurrentUser();
    const activeGM = this.#deps.getActiveGM();
    if (!currentUser?.isGM || activeGM?.id !== currentUser.id) return;

    const spell = message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
      ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY];
    if (
      spell?.messageKind !== 'spell-result'
      || !['damage', 'healing'].includes(spell.action?.kind)
    ) return;

    const failures = [];
    for (const targetUuid of spell.targetUuids ?? []) {
      const result = await this.#deps.applicationService.applyAutomatically(message, {
        requestingUserId,
        targetUuid
      });
      if (!['success', 'duplicate'].includes(result?.status)) failures.push(result);
    }
    if (!failures.length) return;

    this.#deps.notify(
      failures.some((result) => result?.status === 'unsafe') ? 'error' : 'warn',
      this.#deps.localize('SWORDS_WIZARDRY.Spell.Notifications.AutoApplicationFailed', {
        count: failures.length
      })
    );
  }

  #onRender(message, html) {
    const spell = message.getFlag?.(SYSTEM_ID, SPELL_FLAG_KEY)
      ?? message.flags?.[SYSTEM_ID]?.[SPELL_FLAG_KEY];
    if (!spell) return;
    const root = html.matches?.('[data-spell-message-kind]')
      ? html
      : html.querySelector?.('[data-spell-message-kind]') ?? html;
    if (!root?.dataset) return;

    this.#decorate(message, root, spell);
    if (root.dataset.spellControllerBound === 'true') return;
    root.dataset.spellControllerBound = 'true';
    root.addEventListener('click', async (event) => {
      const button = event.target?.closest?.('button[data-action]');
      if (!button || (root.contains && !root.contains(button))) return;
      if (button.dataset.action === 'spellAction') {
        await this.#runButton(button, () => this.#deps.spellService.invoke(
          message,
          button.dataset.spellActionId
        ));
      }
      if (button.dataset.action === 'spellApply') {
        await this.#runButton(button, () => this.#deps.applicationService.apply(message, {
          targetUuid: button.dataset.targetUuid,
          kind: button.dataset.kind,
          multiplier: Number(button.dataset.multiplier)
        }));
      }
    });
  }

  async #runButton(button, operation) {
    button.disabled = true;
    try {
      const result = await operation();
      if (result?.status === 'success' || result?.status === 'duplicate') return;
      const key = `SWORDS_WIZARDRY.Spell.Validation.${result?.code ?? 'UNKNOWN'}`;
      const localized = this.#deps.localize(key);
      this.#deps.notify(
        result?.status === 'unsafe' ? 'error' : 'warn',
        localized === key
          ? this.#deps.localize('SWORDS_WIZARDRY.Spell.Validation.UNKNOWN')
          : localized
      );
    } finally {
      button.disabled = false;
    }
  }

  #decorate(message, root, spell) {
    const isGM = this.#deps.getCurrentUser()?.isGM === true;
    const automaticApplication = (
      spell.messageKind === 'spell-result'
      && ['damage', 'healing'].includes(spell.action?.kind)
      && !this.#deps.dmAppliesDamage()
    );
    if (!isGM || automaticApplication) {
      for (const controls of root.querySelectorAll?.('.spell-result__application-controls') ?? []) {
        controls.remove();
      }
    }

    for (const [applicationId, entry] of Object.entries(spell.application?.entries ?? {})) {
      if (!isApplicationEntryForMessage(applicationId, entry, message.uuid)) continue;
      const target = Array.from(
        root.querySelectorAll?.('[data-spell-target-uuid]') ?? []
      ).find((element) => element.dataset.spellTargetUuid === entry.targetUuid);
      if (!target) continue;
      for (const controls of target.querySelectorAll('.spell-result__application-controls')) {
        controls.remove();
      }
      const status = target.querySelector('.spell-result__application-status');
      if (status) {
        status.textContent = this.#deps.localize('SWORDS_WIZARDRY.Spell.Card.Applied', {
          amount: entry.appliedAmount
        });
      }
    }

    if (spell.consumption?.status === 'failed' && !root.querySelector?.('.spell-card__warning')) {
      const warning = document.createElement('p');
      warning.className = 'spell-card__warning';
      warning.setAttribute('role', 'alert');
      warning.textContent = this.#deps.localize('SWORDS_WIZARDRY.Spell.Card.ConsumptionFailed');
      root.append(warning);
    }
  }
}

export function createFoundrySpellChatController(spellService, applicationService) {
  return new SpellChatController({
    hooks: Hooks,
    spellService,
    applicationService,
    getCurrentUser: () => game.user,
    getActiveGM: () => game.users.activeGM,
    dmAppliesDamage: () => game.settings.get(SYSTEM_ID, 'dmAppliesDamage'),
    localize: (key, data = {}) => game.i18n.format(key, data),
    notify: (level, message) => ui.notifications?.[level]?.(message)
  });
}
