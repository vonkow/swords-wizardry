const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { AutoGenerator, ensurePack, getAvailableClassesFromPack, getAvailableAncestriesFromPack, fetchClassFeatures, fetchAncestryFeatures, normalizeClassKey, normalizeAncestryKey, localizeClassKey, localizeAncestryKey } from './auto-generator.mjs';

// 100 fantasy names used if the input name is blank
const RANDOM_NAMES = [
  'Aldric','Elowen','Thorin','Lyra','Garruk','Seraphine','Dorian','Kaelin','Mirella','Brom','Isolde','Kestrel','Rowan','Vaelin','Nymera','Lucan','Tamsin','Eldric','Ysara','Draven',
  'Calder','Sorrel','Maeve','Ronan','Selene','Alaric','Brynn','Corvin','Elara','Fenris','Galen','Hester','Ivar','Jora','Kelric','Liora','Marek','Nerys','Orin','Phaedra',
  'Quen','Rhea','Sylas','Torin','Uriel','Vesper','Wren','Xara','Yorric','Zara','Arian','Briala','Cassian','Daelin','Eira','Faelan','Gwyneira','Hadrian','Iskra',
  'Jarek','Kaida','Luther','Maelis','Nolan','Ophira','Perin','Quilla','Riven','Sable','Taelon','Ula','Varyn','Wystan','Xander','Ysolda','Zeph','Arlen','Briar',
  'Cyril','Delphine','Eamon','Fiora','Garran','Helene','Ishara','Jasper','Kara','Leoric','Mira','Nikolai','Ondine','Petra','Quorin','Rhosyn','Soren','Talia','Ulric','Violetta'
];

export class CharacterCreatorManager {
  static showCharacterCreator() {
    const form = new CharacterCreator();
    form.render(true);
  }

  static addCharacterCreationButton(app, html) {
    const $html = $(html);
    const i18n = game.i18n;
    const autoLabel = i18n.localize('SWORDS_WIZARDRY.CharacterCreator.Mode.Auto');
    const blankLabel = i18n.localize('SWORDS_WIZARDRY.CharacterCreator.Mode.Blank');

    const autoButton = $(
      `<button class='character-creator' data-tooltip='${autoLabel}'> ` +
      `<i class='fas fa-magic'></i>` +
      ` ${autoLabel}` +
      `</button>`
    );

    const blankButton = $(
      `<button class='character-creator' data-tooltip='${blankLabel}'> ` +
      `<i class='fas fa-user-plus'></i>` +
      ` ${blankLabel}` +
      `</button>`
    );

    autoButton.click((_env) => {
      CharacterCreatorManager.showCharacterCreator();
    });

    blankButton.click(async (_ev) => {
      const defaultName = i18n.localize('SWORDS_WIZARDRY.CharacterCreator.DefaultName');
      await Actor.create({
        name: defaultName,
        type: 'character',
        img: '/systems/swords-wizardry/assets/game-icons-net/cowled.svg',
        permission: { default: 3 }
      });
    });

    $html.find('.header-actions').append(autoButton).append(blankButton);

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
      title: game.i18n?.localize('SWORDS_WIZARDRY.CharacterCreator.Title') ?? "CharacterCreator",
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
    return game.i18n?.localize('SWORDS_WIZARDRY.CharacterCreator.Title') ?? 'Character Creator';
  }

    async _prepareContext() {
    // Build UI context: actor folders, possible classes, and available Item packs
    const folders = game.folders.filter(f => f.type === 'Actor');
    // Try to derive classes from magia-acero-content pack
    const defaultClasses = ['Fighter', 'Wizard', 'Cleric', 'Thief', 'Paladin', 'Ranger', 'Druid', 'Assassin', 'Monk'];
    const magiaPack = await ensurePack();
    const classes = await getAvailableClassesFromPack(magiaPack).catch(() => defaultClasses.map(k => ({ key: k, label: localizeClassKey(k) })));
    const ancestries = await getAvailableAncestriesFromPack(magiaPack).catch(() => ['Human','Half-Elf','Dwarf','Elf','Halfling'].map(k => ({ key: k, label: localizeAncestryKey(k) })));
    return { folders, classes, ancestries };
  }

  static #onSubmit(event, form, formData) {
    this.createCharacter(formData);
  }

  async createCharacter(formData) {
    const folder = formData.get('folder');
    const rawName = (formData.get('name') || '').toString().trim();
    const name = rawName || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const fixedClass = (formData.get('class') || '').toString().trim();
    const fixedAncestry = (formData.get('ancestry') || '').toString().trim();
    // Always auto-generate with equipment and spells; pack chosen by language
    await AutoGenerator.generateLevel1({ name, folder, fixedClass, fixedAncestry });
  }
}
