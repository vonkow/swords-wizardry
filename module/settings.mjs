/**
 * Register all of the system's settings
 */
export function registerSystemSettings() {
  // Use ascending Armor Class
  game.settings.register("swords-wizardry", "useAscendingAC", {
    name: "Use ascending AC",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: false
  });

  // DM must apply damage
  game.settings.register("swords-wizardry", "dmAppliesDamage", {
    name: "DM must apply damage",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: true,
    default: false
  });
}