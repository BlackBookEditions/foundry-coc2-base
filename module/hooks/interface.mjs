import { COC2ReleaseNotes } from "../applications/_module.mjs"

/**
 * Journaux du module : active l'habillage COC2 sur les entrées portant le flag `isJournalCOC`.
 */
export function onRenderJournalEntrySheet(application, element, context, options) {
  if (application.document.getFlag("coc2-base", "isJournalCOC") === true) {
    element.classList.add("journal-coc-base")
  }
}

/**
 * Menu de la barre latérale du système : ajoute la section coc2-base (bouton des notes de version),
 * insérée après la section support du système.
 */
export async function onRenderSidebarMenu(application, html, context, options) {
  let element = html.querySelector(".co.support")

  if (element) {
    const renderedHtml = await foundry.applications.handlebars.renderTemplate("modules/coc2-base/templates/sidebar-menu.hbs", {
      user: game.user,
    })

    if (renderedHtml !== "") {
      element.insertAdjacentHTML("afterend", renderedHtml)
      // Pas d'ApplicationV2 ici (template injecté en HTML brut) : câblage manuel, garde anti-double-ouverture
      // sur le même principe que le bouton équivalent du système (COSidebarMenu#onOpenApp)
      element.parentElement.querySelector(".coc2-base-release-notes")?.addEventListener("click", () => {
        if (!foundry.applications.instances.has("coc2-base-release-notes")) COC2ReleaseNotes.displayAll()
      })
    }
  }
}
