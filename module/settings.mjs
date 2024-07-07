/**
 * Register all of the system's settings
 */
export function registerSystemSettings() {
  // Use ascending Armor Class
  /* TODO: DISABLED UNTIL ASCENDING AC IS WORKED OUT
  game.settings.register("swords-wizardry", "useAscendingAC", {
    name: "Use ascending AC",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  */

  // Include thief-like class skils from the Swords & Wizardry Book of Options
  game.settings.register("swords-wizardry", "includeOptionalSkills", {
    name: "Include class skills from Swords & Wizardry Book of Options",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
}
