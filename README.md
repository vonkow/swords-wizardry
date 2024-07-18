# Game System for Swords & Wizardry 
### Swords & Wizardry by Mythmere Games (mythmeregames.com)

![Foundry v12](https://img.shields.io/badge/foundry-v12-green)

### Compatible with the Swords & Wizardry rules

“Swords & Wizardry, S&W, and Mythmere Games are trademarks of Mythmere Games LLC,”

The author is not affiliated in any way with Mythmere Games LLC

### Languages: 

 - English
 - German (by René Kremer)
 
## Documentation
Can be found [here](documentation.md).

## TODOs

- combat improvements
  - Damage application via targeting
  - Attack rolls (and initiative) should make noise
- initiative improvements
  - better roll messages
  - etc (make initiative a subclass of roll?)
- Token Hud improvements
  - Redraw on changes to character sheet
  - Reposition on render()?
  - (maybe too much) thief skills (non-zero) on hud?
  - features with formulas display on hud
- sheet improvements
  - roll saves from sheet (and hud)
  - roll thief skills from sheet 
  - clean up spell memorization
    - make code pretty, move to methods on actor and item from actor-sheet.
    - alert when you can't memorize
  - Roll stats automatically when sheet is created (or option to do so)?
- importer improvements
  - detect old-form save as and convert
  - strip newlines automatically (but smart like)
- fix all the places where localization was skipped
- Support for ascending AC
- Support for quantity of missile weapons (like darts) on sheets
- Support for alternative initiative types
- Maybe verging too far into the land of excess automation:
  - ammo consumed by ranged attacks?
  - Calculate carry weight?
  - Auto-calculate stats from abilities?
