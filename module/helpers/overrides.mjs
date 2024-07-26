export class SwordsWizardryChatMessage extends ChatMessage {
  constructor(data){
    console.log(data);
    super(data);
    this.damageFormula = data.damageFormula;
    this.system.item = data.item;
  }

  async getHTML() {
    const html = await super.getHTML();
    this.activateListeners(html);
    return html;
  }

  activateListeners(html) {
    console.log('activat');
    console.log(this);

    $(html).on('click', '.damage-roll-button', (e) => {
      console.log(e);
      console.log(e.currentTarget.dataset.itemId);
      console.log(game.items.get(e.currentTarget.dataset.itemId));
    });
  }
}
