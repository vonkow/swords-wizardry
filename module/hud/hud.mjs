const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CombatHud extends HandlebarsApplicationMixin(ApplicationV2) {
  RERENDER_EVENTS = [
    'createItem',
    'updateItem',
    'deleteItem',
    'updateActor'
  ];

  constructor(token, options = {}) {
    super(options);
    this.token = token;
    this.actor = token.actor;
    if (game.user.combatHuds == null) game.user.combatHuds = [];
    game.user.combatHuds.push(this);
    this.registeredHooks = {};
    this._registerHooks();
  }

  static DEFAULT_OPTIONS = {
    position: {
      left: 15,
      width: 200
    },
    window: {
      icon: 'fa fa-gear', // TODO CHANGEME
      title: 'Combat HUD',
      contentClasses: ['swords-wizardry', 'swords-wizardry-combat-hud']
    }
  }

  static PARTS = {
    main: {
      template: 'systems/swords-wizardry/module/hud/hud.hbs'
    }
  }

  get id() {
    return `swords-wizardry-combat-hud-${this.token.id}`;
  }

  get title() {
    return 'Combat HUD';
  }

  get title() {
    //TODO do AC and HP
    return `${this.actor.name}`;
  }

  _prepareContext() {
    return {
      token: this.token,
      actor: this.actor,
      useAscendingAC: game.settings.get('swords-wizardry', 'useAscendingAC')
    }
  }

  _onRender(context, options) {
    // TODO de-jQuery-ify
    const $html = $(this.element);

    $html.on('click', '.save-roll', (ev) => {
      const item = this.actor.rollSave();
    });

    $html.on('click', '.item', (ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      item.roll();
    });

    $html.on('click', '.item-feature', (ev) => {
      const li = $(ev.currentTarget);
      const itemId = li.data('itemId');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      item.roll();
    });

    $html.on('click', '.item-cast', (ev) => {
      const li = $(ev.currentTarget);
      const itemId = li.data('itemId');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      item.roll();
      const { spellLevel } = item.system;
      const slots = this.actor.system.spellSlots[spellLevel];
      const mIndex = slots.memorized.indexOf(itemId);
      if (mIndex > -1) slots.memorized.splice(mIndex, 1);
      const sIndex = slots.memorizedSpells.indexOf(item);
      if (sIndex > -1) slots.memorizedSpells.splice(sIndex, 1);
      this.render();
    });

  }

  async close() {
    const index = game.user.combatHuds.indexOf(this);
    if (index !== -1) game.user.combatHuds.splice(index, 1);
    this._unregisterHooks();
    return super.close();
  }

  _registerHooks() {
   for (const event of this.RERENDER_EVENTS) {
      const hookId = Hooks.on(event, (actor) => {
        const characterActor = actor.type === "character" || actor.type === "npc" ? actor : actor.parent;
        if (characterActor === this.actor) this.render(true, { focus: false });
      });
      this.registeredHooks[event] = hookId;
    }
  }

  _unregisterHooks() {
    for (const [event, hookId] of Object.entries(this.registeredHooks)) {
      Hooks.off(event, hookId);
    }
  }

  static async activateHud(token, selected) {
    if (game.user.combatHuds?.length) {
      const controlled = canvas.tokens.controlled;
      for (const hud of game.user.combatHuds) {
        if (!controlled.includes(token)) {
          await hud.close();
        }
      }
    }

    if (selected) {
      const viewportHeight = document.documentElement.clientHeight;
      // TODO better calculate height of hud and postition accordingly
      const itemCount = token.actor.items.filter(i => i.type === 'weapon').length;
      let verticalOffset = 224 + (32 * itemCount);
      if (token.actor.system.spellSlots) {
        const preparedCount = Object.values(token.actor.system.spellSlots).reduce(
          (t, s) => t + s.memorized.length, 0
        );
        verticalOffset += 32 * preparedCount;
      }
      const hud = new CombatHud(token, {top: viewportHeight - verticalOffset});
      await hud.render(true);
    }
  }
};
