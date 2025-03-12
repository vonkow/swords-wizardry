/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    'systems/swords-wizardry/module/actor/features.hbs',
    'systems/swords-wizardry/module/actor/weapons.hbs',
    'systems/swords-wizardry/module/actor/items.hbs',
    'systems/swords-wizardry/module/actor/spells.hbs',
    'systems/swords-wizardry/module/actor/effects.hbs'
  ]);
};
