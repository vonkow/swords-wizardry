import {
  SPELL_ACTION_KINDS,
  SPELL_ACTION_LIMITS,
  SPELL_ATTACK_MODES,
  SPELL_SAVE_OUTCOMES,
  SPELL_TARGET_MODES
} from './constants.mjs';
import { SpellValidationError, normalizeSpellActions } from './domain.mjs';
import {
  actionsFromFormData,
  actionsFromFormElements,
  effectEditorVisibility,
  moveAction
} from './editor-state.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpellActionEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swords-wizardry-spell-action-editor-{id}',
    tag: 'form',
    classes: ['swords-wizardry', 'spell-action-editor'],
    actions: {
      addAction: this.#addAction,
      removeAction: this.#removeAction,
      moveActionUp: this.#moveActionUp,
      moveActionDown: this.#moveActionDown
    },
    form: {
      handler: this.#save,
      closeOnSubmit: false,
      submitOnChange: false
    },
    position: {
      width: 720,
      height: 720
    },
    window: {
      icon: 'fas fa-wand-magic-sparkles',
      resizable: true
    }
  };

  static PARTS = {
    form: {
      template: `systems/swords-wizardry/module/templates/spells/action-editor.hbs`,
      scrollable: ['.spell-action-editor__list']
    }
  };

  constructor(item, options = {}) {
    super({ ...options, id: `swords-wizardry-spell-action-editor-${item.id}` });
    this.item = item;
    this.draft = normalizeSpellActions(item.system?.actions ?? [], {
      generateId: () => foundry.utils.randomID(16)
    });
    this.validationError = '';
    this.pendingFocusIndex = null;
    this.savedScrollTop = 0;
  }

  get title() {
    return game.i18n.format('SWORDS_WIZARDRY.Spell.Editor.Title', {
      spell: this.item.name
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      item: this.item,
      editable: this.item.isOwner === true,
      actions: this.draft.map((action, index) => ({
        ...action,
        number: index + 1,
        visibility: effectEditorVisibility(action.kind, {
          saveOutcome: action.save.outcome,
          attackMode: action.attack.mode
        })
      })),
      actionKinds: choiceList(SPELL_ACTION_KINDS, 'ActionKinds'),
      targetModes: choiceList(SPELL_TARGET_MODES, 'TargetModes'),
      saveOutcomes: choiceList(SPELL_SAVE_OUTCOMES, 'SaveOutcomes'),
      attackModes: choiceList(SPELL_ATTACK_MODES, 'AttackModes'),
      canAdd: this.draft.length < SPELL_ACTION_LIMITS.count,
      validationError: this.validationError,
      limits: SPELL_ACTION_LIMITS
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const row of this.element.querySelectorAll('[data-action-index]')) {
      const kind = row.querySelector('[data-effect-kind]');
      const save = row.querySelector('[data-effect-save]');
      const attack = row.querySelector('[data-effect-attack]');
      kind?.addEventListener('change', () => this.#syncEffectFields(row, { resetIrrelevant: true }));
      save?.addEventListener('change', () => this.#syncEffectFields(row));
      attack?.addEventListener('change', () => this.#syncEffectFields(row));
      this.#syncEffectFields(row);
    }
    const list = this.element.querySelector('.spell-action-editor__list');
    if (list) list.scrollTop = this.savedScrollTop;
    if (this.pendingFocusIndex != null) {
      const focusTarget = this.element.querySelector(
        `[data-action-index="${this.pendingFocusIndex}"] input[name$=".label"]`
      );
      focusTarget?.focus();
      this.pendingFocusIndex = null;
    }
  }

  #syncEffectFields(row, { resetIrrelevant = false } = {}) {
    const kind = row.querySelector('[data-effect-kind]')?.value ?? 'manual';
    const save = row.querySelector('[data-effect-save]');
    const attack = row.querySelector('[data-effect-attack]');
    const visibility = effectEditorVisibility(kind, {
      saveOutcome: save?.value,
      attackMode: attack?.value
    });

    if (resetIrrelevant) {
      if (!visibility.formula) setValue(row, '[data-effect-input="formula"]', '');
      if (!visibility.save) {
        setValue(row, '[data-effect-save]', 'none');
        setValue(row, '[data-effect-input="save-notes"]', '');
      }
      if (!visibility.attack) {
        setValue(row, '[data-effect-attack]', 'none');
        setValue(row, '[data-effect-input="attack-notes"]', '');
      }
      if (!visibility.reference) setValue(row, '[data-effect-input="reference"]', '');
      if (!visibility.notes) setValue(row, '[data-effect-input="notes"]', '');
    }

    const currentVisibility = effectEditorVisibility(kind, {
      saveOutcome: row.querySelector('[data-effect-save]')?.value,
      attackMode: row.querySelector('[data-effect-attack]')?.value
    });
    for (const [field, visible] of Object.entries(currentVisibility)) {
      const container = row.querySelector(`[data-effect-field="${toKebabCase(field)}"]`);
      if (container) container.hidden = !visible;
    }
  }

  captureDraft() {
    const list = this.element?.querySelector('.spell-action-editor__list');
    if (list) this.savedScrollTop = list.scrollTop;
    if (!this.form) return;
    this.draft = actionsFromFormElements(this.form, this.draft.length);
  }

  static async #addAction() {
    this.captureDraft();
    if (this.draft.length >= SPELL_ACTION_LIMITS.count) return;
    this.draft.push({
      id: foundry.utils.randomID(16),
      kind: 'manual',
      label: game.i18n.localize('SWORDS_WIZARDRY.Spell.Editor.NewAction'),
      formula: '',
      target: { mode: 'none' },
      save: { outcome: 'none', notes: '' },
      attack: { mode: 'none', notes: '' },
      effect: { reference: '' },
      notes: ''
    });
    this.validationError = '';
    this.pendingFocusIndex = this.draft.length - 1;
    await this.render();
  }

  static async #removeAction(_event, target) {
    this.captureDraft();
    const index = Number(target.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.draft.length) return;
    this.draft.splice(index, 1);
    this.validationError = '';
    this.pendingFocusIndex = Math.min(index, this.draft.length - 1);
    await this.render();
  }

  static async #moveActionUp(_event, target) {
    await move(this, Number(target.dataset.index), -1);
  }

  static async #moveActionDown(_event, target) {
    await move(this, Number(target.dataset.index), 1);
  }

  static async #save(event, _form, formData) {
    event.preventDefault();
    if (!this.item.isOwner) return;
    let submittedActions = this.draft;
    try {
      const expandedFormData = foundry.utils.expandObject(formData.object);
      submittedActions = actionsFromFormData(expandedFormData.actions);
      const actions = normalizeSpellActions(submittedActions, {
        generateId: () => foundry.utils.randomID(16)
      });
      await this.item.update({ 'system.actions': actions });
      this.draft = actions;
      this.validationError = '';
      await this.close();
    } catch (error) {
      this.draft = submittedActions;
      this.validationError = localizeValidationError(error);
      await this.render();
    }
  }
}

async function move(editor, index, direction) {
  editor.captureDraft();
  editor.draft = moveAction(editor.draft, index, direction);
  editor.validationError = '';
  editor.pendingFocusIndex = Math.max(0, Math.min(index + direction, editor.draft.length - 1));
  await editor.render();
}

function choiceList(values, group) {
  return values.map((value) => ({
    value,
    label: `SWORDS_WIZARDRY.Spell.${group}.${value}`
  }));
}

function localizeValidationError(error) {
  const code = error instanceof SpellValidationError ? error.code : 'UNKNOWN';
  const key = `SWORDS_WIZARDRY.Spell.Validation.${code}`;
  const localized = game.i18n.localize(key);
  return localized === key
    ? game.i18n.localize('SWORDS_WIZARDRY.Spell.Validation.UNKNOWN')
    : localized;
}

function setValue(root, selector, value) {
  const control = root.querySelector(selector);
  if (control) control.value = value;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
