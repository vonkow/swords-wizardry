# Swords & Wizardry
Unofficial system for FoundryVTT

## Introduction
This is an unofficial, third-party implementation of the Swords & Wizardry rules system, copyright and trademark Mythmere Games LLC.

You will need a copy of [Swords & Wizardry](https://www.mythmeregames.com/products/swords-wizardry-complete-revised-pdf) in order to play.

## Installation

You will need GM access to a Foundry VTT server. This requires a [Foundry license](https://foundryvtt.com/purchase/).

1. Launch Foundry VTT.
2. Go to the Game Systems tab, then click Install System.
3. Search for `'Swords & Wizardry'` and click Install.
4. Create a new World using the Swords & Wizardry system.
5. Create system content (see below).

## Content

This system does not ship with any content. You will need to reference your personal copy 
of Swords & Wizardry in order to create:

- Class and ancestry features
- Weapons, armor, items, and spells
- Monsters and other NPCs

The NPC importer can be used to speed up part of this task.

## Settings

The system settings control global, system-wide behavior. They can be accessed under the Configure Settings menu in the right sidebar.

There is one setting currently available:

- Include class skills from the Swords & Wizardry Book of Options
  When toggled, this option displays additional thief-like skills used by classes in the
  Swords & Wizardry Book of Options.

Other settings, such as ascending AC and alternative initiative systems are planned.

## Characters
There are two types of Actors in the Swords & Wizardry system, Characters and NPCs. Characters represent Player Characters. 

To create a new Character, click the Create Actor button on the Actor tab of the right sidebar, choose a name, select type Character, and click Create New Actor. This will create the character and open their sheet.

The Main tab of the character sheet shows:
- Name
- Class
- Ancestry
- Alignment
- Age
- Diety
- HP
- Saving Throw
- AC
- XP
- XP Bonus
- Level
- Movement
- Weight Carried
- Attribute Scores and Prime Attributes
- Attribute Bonuses
- Class and Ancestry Features
- Thieving Skills
- (Optional) Thief-like Skills from the Swords & Wizardry Book of Options

### Features
Class and Ancestry Features can be added to a Character by dragging and dropping an existing feature onto the sheet or by creating a new Feature on the Main tab of the sheet.

### Weapons, Armor, and To-Hit
A Character's Weapons, Armor, and To-Hit Matrix can be viewed in the Combat tab of the Character's sheet.

Weapons and Armor can be added to a Character by dragging and dropping existing items onto their sheet or by creating new Weapons and Armor directly from the Combat tab of the sheet.

The To-Hit Matrix must be filled out in order for combat attacks to function properly.

### Equipment
Gold, treasure, equipment and other miscellaneous items can be managed from the Equipment tab of the character sheet.

Items can be added to a Character by dragging and dropping existing items onto the sheet or by creating a new Item directly from the Equipment tab of their sheet.

### Spells, preparation, and casting
A Character's known and prepared spells can be managed from the Spells tab of their sheet.

Spells can be added to a Character by dragging and dropping existing spells onto the sheet or by creating a new Spell of the appropriate level directly from the Spells tab of their sheet.

The total spell slots per level controls how many spells of a certain level can be prepared.

Clicking the Prepare icon on a known spell will prepare it if the total prepared spell limit for the level of the spell has not been met. Prepared spells are listed at the top of the Spells tab.

Clicking the Cast icon on a prepared spell will cast it and remove it from the prepared spell list.

### Description
A description of the Character can be viewed and edited in The Description tab of their sheet.

## NPCs
NPCs are similar to Characters, but with different/fewer attributes and tabs.

### Importing NPCs
Swords & Wizardry uses a statblock format for describing NPCs and this system comes with an import tool that supports it. If you paste a well-formatted statblock into the the import tool, it will create an NPC using the data provided.

Example Statblock: `Black Bear: HD 4+1; AC 7[12]; Atk 2 claws (1d3), bite (1d6); Move 9; Save 13; Morale 7; AL N; CL/XP 4/120; Special: hug (if both claws hit, additional 1d8 damage).`

**Notes:** HD are not rolled, HP is set at 4 by the importer. Number Encountered, % in Lair, fields and 1d4 HP creatures not yet supported.

## Combat
Swords & Wizardy has a very straightforward initiative system, which this system supports. Support for alternative initiative systems is planned.

Clicking on a weapon while targeting a token will perform an attack against that token's actor. An attack roll message will display the result and allow you to perform a damage roll. _Damage is not automatically applied_.

Support for ascending AC is planned.

## Items
TODO talk more about each item type.

### Features

### Items

### Weapons

### Armor

### Spells
