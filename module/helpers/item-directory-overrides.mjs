export function unidentifiedItemsShowAliasInItemDirectory() {
  Hooks.on("renderItemDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];

    for (const row of root.querySelectorAll("[data-entry-id]")) {
      const item = game.items.get(row.dataset.entryId);
      if (!item) continue;

      const name = row.querySelector(".entry-name");
      if (!name) continue;
  
      if (!game.user.isGM && !item.system?.identified) {
        name.textContent = `${item.system.alias}`;
      }
    }
  });
}
