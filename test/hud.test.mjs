import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {
        constructor() {
          this.element = { handlers: [] };
        }

        async render() {
          this._onRender?.({}, {});
          return this;
        }

        async close() {
          return this;
        }
      },
      HandlebarsApplicationMixin: (Base) => Base
    }
  }
};

const hooks = {
  nextId: 1,
  registered: new Map(),
  on(event, fn) {
    const id = this.nextId++;
    this.registered.set(id, { event, fn });
    return id;
  },
  off(_event, id) {
    this.registered.delete(id);
  }
};

globalThis.Hooks = hooks;

globalThis.$ = (element) => ({
  on(event, selector, handler) {
    element.handlers.push({ event, selector, handler });
    return this;
  },
  off(namespace) {
    element.handlers = element.handlers.filter(
      (handler) => !handler.event.endsWith(namespace)
    );
    return this;
  },
  data(name) {
    return element.dataset?.[name];
  }
});

globalThis.document = {
  documentElement: {
    clientHeight: 900
  }
};

const { CombatHud } = await import('../module/hud/hud.mjs');

function actorWithItems(items = []) {
  return {
    items,
    system: {
      spellSlots: null
    }
  };
}

function token(id, actor = actorWithItems()) {
  return { id, actor };
}

function resetFoundryState(controlled = []) {
  globalThis.game = {
    settings: {
      get() {
        return false;
      }
    },
    user: {
      combatHuds: []
    }
  };
  globalThis.canvas = {
    tokens: { controlled }
  };
  hooks.nextId = 1;
  hooks.registered.clear();
}

test('activating an already selected token replaces the previous HUD instance', async () => {
  const selected = token('token-a', actorWithItems());
  resetFoundryState([selected]);

  await CombatHud.activateHud(selected, true);
  await CombatHud.activateHud(selected, true);

  assert.equal(game.user.combatHuds.length, 1);
  assert.equal(game.user.combatHuds[0].token, selected);
  assert.equal(hooks.registered.size, 4);
});

test('rerendering a HUD keeps one delegated click handler per action', () => {
  const selected = token('token-a', actorWithItems());
  resetFoundryState([selected]);
  const hud = new CombatHud(selected);

  hud._onRender({}, {});
  hud._onRender({}, {});

  assert.deepEqual(
    hud.element.handlers.map((handler) => `${handler.event} ${handler.selector}`),
    [
      'click.swords-wizardry-combat-hud .save-roll',
      'click.swords-wizardry-combat-hud .item',
      'click.swords-wizardry-combat-hud .item-feature',
      'click.swords-wizardry-combat-hud .item-cast'
    ]
  );
});
