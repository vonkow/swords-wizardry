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
This system ships with no content, but all AELF-licensed monsters, items, and class/ancestry features are available in the [Swords & Wizardry Content Module]()

You will need to reference your copy of Swords & Wizardry for all other rules and tables.

Additionally, The Import Statblock feature can be used to import monsters using the format that they are presented in in Swords & Wizardry Complete and similar products.

## Settings

The system settings control global, system-wide behavior. They can be accessed under the Configure Settings menu in the right sidebar.

There is currently only one setting, Ascending AC. When this setting is enabled, the Ascending AC rules will be used and to-hit matrixes will be replaced with an Attack Bonus field. Changes made to characters and NPCs in one mode will be converted to the other mode automatically.

## Characters
There are three types of Actors in the Swords & Wizardry system, Characters, Containers, and NPCs. Characters represent Player Characters, NPCs represent monsters and other non-player characters, and Containers are a special case that can be used to represent anything from treasure chests, to merchants, to a party's shared earnings.

To roll a new Player Character, automatically generating starting scores and funds, use the Roll a Character button.

To create a new Character without rolling stats or to create a Container or NPC, click the Create Actor button on the Actor tab of the right sidebar, choose a name, select the type of Actor, and click Create New Actor. This will create the actor and open their sheet.

Character sheets have a top section that displays important information and tabs below which display additional information about the character.

The top section includes the following fields:

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

### Attributes and Features
The Main tab of the character sheet shows:

- Attribute Scores and Prime Attributes
- Attribute Bonuses
- Class and Ancestry Features
- Thieving Skills
- (Optional) Thief-like Skills from the Swords & Wizardry Book of Options

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

**Notes:** HD are not rolled. Number Encountered, % in Lair, fields and 1d4 HP creatures not yet supported.

## Containers
Containers are a special type of Actor that can be used to hold items. Containers are useful for creating treasure chests or other "lootable" items, representing a merchant and their inventory, or as a shared storage space for a party's earnings. Containers can also be used to represent a party in situations such as on a large overland map or when navigating a dungeon using an established marching order.

## Combat
Swords & Wizardy has a very straightforward initiative system, which this system supports. Support for alternative initiative systems is planned.

Clicking on a weapon while targeting a token will perform an attack against that token's actor. An attack roll message will display the result and allow you to perform a damage roll. _Damage is not automatically applied_.

If you prefer to use Ascending AC, an option to use it can be found in the system's settings.

## Items
TODO talk more about each item type and any attributes it may have.

### Features

### Items

### Weapons

### Armor

### Spells
