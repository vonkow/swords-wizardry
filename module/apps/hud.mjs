export class CombatHud extends Application {
  constructor(token, options = {}) {
    super(options);
    this.token = token;
    this.actor = token.actor;
    if (game.user.combatHuds == null) game.user.combatHuds = [];
    game.user.combatHuds.push(this);

    // Subscribe to changes in the actor requiring re-render
    const rerenderEvents = [
      'createItem', 
      'updateItem', 
      'deleteItem', 
      'updateActor'
    ];
    for (const event of rerenderEvents) {
      Hooks.on(event, (actor) => {
        const characterActor = actor.type === 'character' ? actor : actor.parent;
        if (characterActor === this.actor) this.render(true, { focus: false });
      });
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swords-wizardry', 'swords-wizardry-combat-hud'],
      template: 'systems/swords-wizardry/templates/apps/combat-hud.hbs',
      title: 'Combat HUD',
      height: 'auto',
      width: 200,
      resizable: true,
      left: 15
      //dragDrop []
    });
  }

  get id() {
    return `swords-wizardry-combat-hud-${this.token.id}`;
  }

  get title() {
    //TODO do AC and HP
    return `${this.actor.name}`;
  }

  getData() {
    return {
      token: this.token,
      actor: this.actor
    }
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on('click', '.save-roll', (ev) => {
      const item = this.actor.rollSave();
    });

    html.on('click', '.item', (ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      item.roll();
    });

    html.on('click', '.item-feature', (ev) => {
      const li = $(ev.currentTarget);
      const itemId = li.data('itemId');
      const item = this.actor.items.get(itemId);
      if (!item) return;
      item.roll();
    });

    html.on('click', '.item-cast', (ev) => {
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
    return super.close();
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
      const itemCount = token.actor.items.filter(i => i.type === 'weapon').length
      const preparedCount = Object.values(token.actor.system.spellSlots).reduce(
        (t, s) => t + s.memorized.length, 0)
      ;
      const verticalOffset = 224 + (32 * (itemCount + preparedCount));
      const hud = new CombatHud(token, {top: viewportHeight - verticalOffset});
      await hud.render(true);
    }
  }
};
