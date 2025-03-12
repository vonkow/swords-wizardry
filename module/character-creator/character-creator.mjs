export class CharacterCreatorManager {
  static showCharacterCreator() {
    const form = new CharacterCreator();
    form.render(true);
  }

  static addCharacterCreationButton(app, html) {
    if (app.id == 'actors') {
      const flexBlock = $(`<div class='character-creator-buttons' style='display: flex;flex-direction: row;'>` + `</div>`);
      html.find('.header-actions').append(flexBlock);

      const characterCreatorButton = $(
        `<button class='character-creator' data-tooltip='Create a Character'> ` +
        `<i class='fas fa-user-plus'></i>` +
        `Roll a Character` +
        `</button>`
      );

      characterCreatorButton.click(function(env) {
        CharacterCreatorManager.showCharacterCreator();
      });

      html.find('.character-creator-buttons').prepend(characterCreatorButton);

    }
  }
}
export class CharacterCreator extends FormApplication {
  constructor() {
    super();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swords-wizardry'],
      id: 'character-creator',
      resizable: true,
      closeOnSubit: true,
      submitOnClose: false,
      title: 'Character Creator',
      template: 'systems/swords-wizardry/module/character-creator/character-creator.hbs'
    });
  }

  /** @override */
  async _updateObject(event, formData) {
    // this.render();
  }

  async getData() {
    return {
      folders: game.folders.filter(f => f.type === 'Actor')
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('#character-form').submit(this.handleSubmit.bind(this));
  }

  handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    this.createCharacter(formData);
  }

  async createCharacter(formData) {
    const folder = formData.get('folder');
    const name = formData.get('name');
    const str = await new Roll('3d6').evaluate();
    const dex = await new Roll('3d6').evaluate();
    const con = await new Roll('3d6').evaluate();
    const int = await new Roll('3d6').evaluate();
    const wis = await new Roll('3d6').evaluate();
    const cha = await new Roll('3d6').evaluate();
    const gp = await new Roll('3d6').evaluate();
    await Actor.create({
      name,
      type: 'character',
      img: 'systems/swords-wizardry/assets/game-icons-net/cowled.svg',
      system: {
        abilities: {
          str: { value: str.total },
          dex: { value: dex.total },
          con: { value: con.total },
          int: { value: int.total },
          wis: { value: wis.total },
          cha: { value: cha.total }
        },
        treasure: { gp: gp.total * 10 }
      },
      permission: { default: 3 },
      folder
    });
  }
}
