export class ImportManager {
  static showImportFromStatblock() {
    const form = new ImportSheet('statblock');
    form.render(true);
  }

  static addImportActorButton(app, html) {
    if (game.user.isGM && app.id == 'actors') {
      const flexBlock = $(`<div class='npc-import-buttons' style='display: flex;flex-direction: row;'>` + `</div>`);
      html.find('.header-actions').append(flexBlock);

      const statblockImportButton = $(
        `<button class='import-manager' data-tooltip='Import NPC by statblock'> ` +
        `<i class='fas fa-user-plus'></i>` +
        `Import Statblock` +
        `</button>`
      );

      statblockImportButton.click(function(env) {
        ImportManager.showImportFromStatblock();
      });

      html.find('.npc-import-buttons').prepend(statblockImportButton);

    }
  }
} // end ImportManager

export class ImportSheet extends FormApplication {
  constructor(type) {
    super(type);
    this.type = type;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      actionId: undefined,
      classes: ['swords-wizardry'],
      closeOnSubmit: false,
      height: 400,
      id: 'import-sheet',
      resizable: true,
      submitOnClose: true,
      template: 'systems/swords-wizardry/templates/apps/import-sheet.hbs',
      title: 'Import Text',
      width: 500,
    });
  }

  async getData() {
    const page = {
      type: this.type,
      expected: 'TODO',
      importText: '',
      //addMarkup: true,
    };
    return page;
  }

  /** @override */
  async _updateObject(event, formData) {
    // console.log('import-tools.js _updateObject', { event, formData });
    // this.render();
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('#importform').submit(this._importTextSubmit.bind(this));
  }

  _importTextSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const addMarkup = formData.get('inputAddMarkup') === 'true';
    const text = formData.get('importext');

    try {
      this.importStatBlockText(text, addMarkup);
    } catch (err) {
      ui.notifications.error(`Error: ${err}: Import failed, check format of stat block text.`);
    }
    this.close();
  }


  async importStatBlockText(text, addMarkup = false) {
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

    const block = this.parseStatblockText(text, fieldMappings);
    block.xp = parseInt(block.xp.split('/')[1]) || 1;
    block.cl = parseInt(block.cl.split('/')[0]) || 1;
    console.log('import-tools.js importStatBlockText', { text, block });
    const npcName = block.name;
    const npcImage = 'icons/svg/mystery-man.svg';
    const attacks = await this.createAttacks(block.attack);
    const newData = {
      hd: block.hd || 1,
      ac: {
        value: block.ac || 10,
      },
      morale: block.morale || '',
      moveRate: {
        value: block.moveRate || '',
      },
      save: {
        value: block.save || 15
      },
      morale: block.morale || 7,
      alignment: block.alignment || 'n',
      xp: {
        value: block.xp || 1,
      },
      cl: block.cl || 1,
      special: block.special || '',
      description: '',
    };

    this.createNPC(npcName, npcImage, newData, attacks);

  }
  /**
   * Parses input text using provided field mappings and returns an object with the collected values.
   *
   * @param {string} text - The input text to be parsed.
   * @param {object} fieldMappings - An object containing match strings and data types for the fields to be parsed.
   * @return {object} - An object containing the parsed field values.
   */
  parseStatblockText(text, fieldMappings) {
    // Initialize the result object to store parsed field values
    let result = {};

    // Extract the name from the input text and store it in the result object
    const nameMatch = text.match(/^(.*?):/i);
    result.name = nameMatch ? nameMatch[1] : 'No-Name-Found';

    // Iterate through the keys in the fieldMappings object
    for (const key in fieldMappings) {
      // Destructure the matchStrings and type properties from the current fieldMapping
      const { matchStrings, type } = fieldMappings[key];

      // Find the first match string present in the input text
      const matchString = matchStrings.find((ms) => text.includes(ms));

      // If a match string is found
      if (matchString) {
        // Create a regular expression based on the field type (number or string)
        const regex =
          type === 'number'
            ? new RegExp(`${matchString}\\s+\\d+`)
            : new RegExp(`${matchString}\\s+([a-zA-Z0-9_,\\"\\-\\+\\(\\)\\/'\\s\%]+)`);
        // Find the matching value in the input text using the regular expression
        const match = text.match(regex);

        // If a matching value is found
        if (match) {
          // Extract the value based on the field type (number or string) and store it in the result object
          const value = type === 'number' ? parseFloat(match[0].replace(matchString, '').trim()) : match[1].trim();
          result[key] = value;
        }
      }
    }

    // Return the result object containing the parsed field values
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
    })
  }

} // end ImportSheet
