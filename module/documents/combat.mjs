export class SwordsWizardryCombatTracker extends CombatTracker {
  /** @override
    * we do this so we can inject "game" into the combat.turns and turns
    *
    */
  async getData(options) {
    const data = await super.getData(options);
    data.game = game;
    return data;
  }

}

export class SwordsWizardryCombat extends Combat {
  async _onUpdate(data, options, id) {
    await this.combatTurn(data, options, id);
    this.#handleCombatantSheetRefreshes();
  }

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    this.#handleCombatantSheetRefreshes();
  }
  _onDelete(options, userId) {
    this.#handleCombatantSheetRefreshes();
    super._onDelete(options, userId);
  }

  #handleCombatantSheetRefreshes() {
    for (const actor of game.combat.combatants.map((co) => co.actor)) {
      if (actor.isOwner && actor.sheet && actor.sheet.rendered) {
        actor.sheet.render();
      }
    }

    // refresh active combat huds for initiative buttons (end turn/etc)
    // Not used (yet)
    //for (const combatant of this.combatants) {
    //const token = combatant?.token?.object;
    //if (token.combatHud && token.actor.isOwner) token.combatHud.render(true);
    //}
  }

  /**@override so we can reset the current initiative indicator to 0 on rollAll 
   * and force a call to roundStart
   */
  async rollAll(options) {
    await this.update({ turn: 0 });
    await this.roundStart();
  }

  // TODO Hide the rollNPC button?


  async roundStart() {
    const _roll = async (formula) => {
      let roll;
      try {
        roll = await new Roll(String(formula)).evaluate();
      } catch (err) {
        console.error(err);
        return 1;
      }
      roll.diceToolTip = await roll.getTooltip();
      return roll;
    };
    const initiativeFormula = '1d6'
    const npcRoll = await _roll(initiativeFormula);
    const pcRoll = await _roll(initiativeFormula);
    for (const c of this.turns) {
      if (c.isOwner) {
        await c.update({
          initiative: c.token.disposition > 0
            ? pcRoll.total
            : npcRoll.total
        });
      }
    }
    await this.update({ turn: 0 });
    const chatMessageForSideVSideInitiative = (speaker, title, roll) => {
      const content = title;/* await renderTemplate('systems/ars/templates/chat/parts/chatCard-sidevside-roll.hbs', {
        title,
        roll,
      }); */

      let chatData = {
        title: title,
        content: content,
        //author: game.user.id,
        rolls: [roll],
        //rollMode: game.settings.get('core', 'rollMode'),
        speaker: speaker//,
        //style: game.swordswizardry.const.CHAT_MESSAGE_STYLES.OTHER,
      };
      ChatMessage.create(chatData);
    };

    //show chat msg
    chatMessageForSideVSideInitiative(
      ChatMessage.getSpeaker(),
      `Opponents Initiative ${npcRoll.total}`,
      npcRoll
    );
    chatMessageForSideVSideInitiative(
      ChatMessage.getSpeaker(),
      `Party Initiative ${pcRoll.total}`,
      pcRoll
    );
  }

  async combatTurn(data, options, id) {
    const isRound = foundry.utils.hasProperty(data, 'round');
    const isTurn = foundry.utils.hasProperty(data, 'turn');
    if (isRound) {
      //if (game.user.isDM) { // TODO figure out equivalent
      await this.roundStart();
      //}
    }
    if (isTurn) {
      const token = this.combatant.token;
      if (token.isOwner) {
        if (token && token.object) {
          token.object.control({ releaseOthers: true });
        }
        canvas.animatePan({ x: token.x, y: token.y, scale: Math.max(1, canvas.stage.scale.x), duration: 1000 });
      }
    }
  }
}
