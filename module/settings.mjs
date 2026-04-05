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

  // Show welcome message on startup
  game.settings.register("swords-wizardry", "showWelcome", {
    name: "Show welcome message on startup",
    scope: "world",
    config: true,
    type: Boolean,
    requiresReload: false,
    default: true
  });

  // Store system version to show welcome message on startup when the version jumps
  game.settings.register("swords-wizardry", "systemVersion", {
    name: "Stores the system version",
    scope: "world",
    type: String,
    requiresReload: false,
    default: '4.0.0'
  });

}
