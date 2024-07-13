export class CombatHud extends Application {
  constructor(token, options = {}) {
    super(options);
    this.token = token;
    this.actor = token.actor;
    if (game.user.combatHuds == null) game.user.combatHuds = [];
    game.user.combatHuds.push(this);
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
    html.on('click', '.item', (ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data('itemId'));
      if (!item) return;
      item.roll();
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
      const itemCount = token.actor.items.filter(i => i.type === 'weapon' || i.type === 'spell').length;
      const verticalOffset = 224 + (27.5 * itemCount);
      const hud = new CombatHud(token, {top: viewportHeight - verticalOffset});
      await hud.render(true);
    }
  }
};
