/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/swords-wizardry/templates/actor/parts/actor-features.hbs',
    'systems/swords-wizardry/templates/actor/parts/actor-weapons.hbs',
    'systems/swords-wizardry/templates/actor/parts/actor-items.hbs',
    'systems/swords-wizardry/templates/actor/parts/actor-spell-slots.hbs',
    'systems/swords-wizardry/templates/actor/parts/actor-spells.hbs',
    'systems/swords-wizardry/templates/actor/parts/actor-effects.hbs',
    // Item partials
    'systems/swords-wizardry/templates/item/parts/item-effects.hbs',
  ]);
};
