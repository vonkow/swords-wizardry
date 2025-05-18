const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ImportManager {
  static showImportFromStatblock() {
    const form = new ImportSheet('statblock');
    form.render(true);
  }

  static addImportActorButton(app, html) {
    if (game.user.isGM) {
      const $html = $(html);

      const statblockImportButton = $(
        `<button class='import-manager' data-tooltip='Import NPC by statblock'> ` +
        `<i class='fas fa-user-plus'></i>` +
        `Import Statblock` +
        `</button>`
      );

      statblockImportButton.click((_env) => {
        ImportManager.showImportFromStatblock();
      });

      $html.find('.header-actions').append(statblockImportButton);

    }
  }
}

export class ImportSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(type) {
    super(type);
    this.type = type;
  }

  static DEFAULT_OPTIONS = {
    id: 'import-sheet',
    form: {
      handler: ImportSheet.#onSubmit,
      closeOnSubmit: true
    },
    position: {
      height: 400,
      width: 500
    },
    tag: "form",
    window: {
      icon: "fas fa-gear",
      title: "Import Text",
      contentClasses: ['swords-wizardry']
    }
  }

  static PARTS = {
    main: {
      template: 'systems/swords-wizardry/module/importer/importer.hbs'
    }
    // TODO Add generic footer here and buttons to _prepareContext
  }

  get title() {
    return 'Import Text';
  }

  _prepareContext() {
    return {
      type: this.type,
      importText: ''
    };
  }

  // Not used yet.
  //_onRender(context, options) {
  //}

  static #onSubmit(event, form, formData) {
    const text = formData.get('importext');
    try {
      this.importStatBlockText(text);
    } catch (err) {
      // TODO prevent close?
      ui.notifications.error(`Error: ${err}: Import failed, check format of stat block text.`);
    }
  }

  async importStatBlockText(text) {
    const fieldMappings = {
      hd: { matchStrings: ['HD', 'HitDice'], type: 'string' },
      ac: { matchStrings: ['AC'], type: 'string' },
      attack: { matchStrings: ['Atk', 'Attack', 'ATK'], type: 'string' },
      moveRate: { matchStrings: ['Move', 'MV', 'MOVE', 'MOVEMENT'], type: 'string' },
      save: { matchStrings: ['Save', 'SV', 'SAVE'], type: 'string' },
      morale: { matchStrings: ['Morale', 'ML'], type: 'string' },
      alignment: { matchStrings: ['AL'], type: 'string' },
      xp: { matchStrings: ['CL/XP', 'XP', 'EXPERIENCE', 'EXP'], type: 'string' },
      cl: { matchStrings: ['CL/XP', 'XP', 'EXPERIENCE', 'EXP'], type: 'string' },
      special: { matchStrings: ['Special:'], type: 'string' },
    };

    const cleanText = text.replace(/\s+/g, ' ').trim();
    const block = this.parseStatblockText(cleanText, fieldMappings);
    block.xp = parseInt(block.xp.split('/')[1]) || 1;
    block.cl = parseInt(block.cl.split('/')[0]) || 1;
    const npcName = block.name;
    const npcImage = '/systems/swords-wizardry/assets/game-icons-net/cowled.svg';
    const attacks = await this.createAttacks(block.attack);
    // check for if 1d4 and deal with that
    const [hd, mod] = block.hd.split('+');
    // TODO, do someting with mod like add it back to hd?
    const tHAC0 = 19 - Math.min(hd, 15);
    const tHAACB = 19 - tHAC0;
    const newData = {
      hd: block.hd || 1,
      // don't fill this out unless there is block.hp?
      hp: {
        max: block.hp | 0,
        value: block.hp | 0
      },
      ac: {
        value: block.ac || 10,
      },
      tHAC0,
      tHAACB,
      morale: block.morale || '',
      moveRate: {
        value: block.moveRate || '',
      },
      save: {
        value: block.save || this.createSave(hd)
      },
      morale: block.morale || 7,
      alignment: block.alignment || 'n',
      xp: {
        value: block.xp || 1,
      },
      cl: block.cl || 1,
      special: block.special || '',
      description: ''
    };

    this.createNPC(npcName, npcImage, newData, attacks);

  }

  parseStatblockText(text, fieldMappings) {
    let result = {};

    const nameMatch = text.match(/^(.*?):/i);
    result.name = nameMatch ? nameMatch[1] : 'No-Name-Found';

    for (const key in fieldMappings) {
      const { matchStrings, type } = fieldMappings[key];

      const matchString = matchStrings.find((ms) => text.includes(ms));

      if (matchString) {
        // Create a regular expression based on the field type (number or string)
        const regex =
          type === 'number'
            ? new RegExp(`${matchString}\\s+\\d+`)
            : new RegExp(`${matchString}\\s+([a-zA-Z0-9_,\\"\\-\\+\\(\\)\\/'\\s\%]+)`);
        const match = text.match(regex);

        if (match) {
          const value =
            type === 'number'
              ? parseFloat(match[0].replace(matchString, '').trim())
              : match[1].trim();
          result[key] = value;
        }
      }
    }
    return result;
  }

  async createAttacks(attackString) {
    const attackStrings = attackString.split(',');
    const attacks = attackStrings.map(s => {
      let [name, dmg] = s.split('(');
      name = name.slice(0, name.length - 1); // Trim end space
      dmg = dmg.slice(0, dmg.length - 1); // Trim end )
      return { name, dmg };
    });
    const attackItems = [];
    let attack;
    for (let a in attacks) {
      attack = await Item.create({
        name: attacks[a].name,
        type: 'weapon',
        system: {
          formula: 'd20 + @toHit.v',
          damageFormula: attacks[a].dmg
        }
      });
      attackItems.push(attack);
    }
    return attackItems;
  }

  createSave(hd) {
    const effectiveHd = Math.min(hd, 12);
    const saveMap = {
      0: 18,
      1: 17,
      2: 16,
      3: 14,
      4: 13,
      5: 12,
      6: 11,
      7: 9,
      8: 8,
      9: 6,
      10: 5,
      11: 4,
      12: 3
    };
    return saveMap[effectiveHd];
  }

  async createNPC(npcName, npcImage, newData, items) {
    let actor = await Actor.create({
      name: npcName,
      type: 'npc',
      img: npcImage,
      system: {
        ...newData,
      }
    }, {
      renderSheet: true,
    });
    items.forEach(async item => {
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      item.delete();
    });
  }
}
