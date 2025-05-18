const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterCreatorManager {
  static showCharacterCreator() {
    const form = new CharacterCreator();
    form.render(true);
  }

  static addCharacterCreationButton(app, html) {
    const $html = $(html);

    const characterCreatorButton = $(
      `<button class='character-creator' data-tooltip='Create a Character'> ` +
      `<i class='fas fa-user-plus'></i>` +
      `Roll a Character` +
      `</button>`
    );

    characterCreatorButton.click((_env) => {
      CharacterCreatorManager.showCharacterCreator();
    });

    $html.find('.header-actions').append(characterCreatorButton);

  }
}
export class CharacterCreator extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: 'character-creator',
    form: {
      handler: CharacterCreator.#onSubmit,
      closeOnSubmit: true
    },
    tag: 'form',
    window: {
      icon: "fas fa-gear", // TODO CHANGEME?,
      title: "CharacterCreator",
      contentClasses: ["swords-wizardry"]
      // TODO Resizable = true?
    }
  }

  static PARTS = {
    main: {
      template: 'systems/swords-wizardry/module/character-creator/character-creator.hbs'
    }
  }

  get title() {
    return 'Character Creator';
  }

  _prepareContext() {
    return {
      folders: game.folders.filter(f => f.type === 'Actor')
    };
  }

  static #onSubmit(event, form, formData) {
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
      img: '/systems/swords-wizardry/assets/game-icons-net/cowled.svg',
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
