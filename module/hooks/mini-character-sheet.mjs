import { getHealthScaleContext, updateHealthScale, applyWeeklyRest } from "../config/health-scale.mjs"
import { getSecondScaleContext, updateSecondScale } from "../config/second-scale.mjs"

/**
 * Vue actions (mini-fiche) : adapter la fiche co2 à coc2 par nettoyage/injection DOM (la mini-fiche
 * COMiniCharacterSheet du système n'est pas surchargée et pointe vers les templates bruts co2, on évite
 * ainsi de les dupliquer). On retire les valeurs COF2 (vigueur/PV, mana, niveau/peuple/profils, portrait
 * et nom) et on injecte, sous les caractéristiques, les rubans Santé + Échelle cliquables de coc2.
 */
export async function onRenderMiniCharacterSheet(application, element, context, options) {
  const actor = application.document

  // Barre latérale : retirer PV (vigueur → remplacée par l'échelle de santé) et MP (pas de magie en coc2)
  const sidebar = element.querySelector(".mini-sidebar")
  sidebar?.querySelector(".hp-section")?.remove()
  sidebar?.querySelector('input[name="system.resources.mana.value"]')?.closest(".sidebar-section")?.remove()

  // BDM et CG : badges propres à COC2, insérés avant la RD pour suivre l'ordre COC2 de la fiche complète
  // (DEF, BDM, CG, puis RD)
  if (sidebar) {
    // Idempotence : sur un rendu partiel, on retire l'injection précédente
    sidebar.querySelectorAll(".bdm-section, .cg-section").forEach((node) => node.remove())

    const valuesHtml = await foundry.applications.handlebars.renderTemplate("modules/coc2-base/templates/actors/mini-values.hbs", {
      attributes: actor.system.attributes,
      viewLimited: context.viewLimited,
      editable: context.editable,
    })
    const dr = sidebar.querySelector(".dr-section")
    if (dr) dr.insertAdjacentHTML("beforebegin", valuesHtml)
    else sidebar.insertAdjacentHTML("beforeend", valuesHtml)
    sidebar.querySelector(".cg-rest")?.addEventListener("click", () => applyWeeklyRest(actor))
  }

  // En-tête : ne garder que les caractéristiques ; retirer portrait, nom, niveau et peuple/profils (COF2)
  const header = element.querySelector(".sheet-header")
  header?.querySelector(".image-container")?.remove()
  header?.querySelector(".name")?.remove()
  header?.querySelector(".level")?.remove()
  header?.querySelector(".traits")?.remove()

  // Active les styles des rubans coc2 (scopés .co.actor.coc2), absents de la mini-fiche co2
  element.classList.add("coc2")

  // Rubans Santé + Échelle, injectés sous les caractéristiques
  const abilities = header?.querySelector(".abilities")
  if (!abilities) return

  // Idempotence : sur un rendu partiel où l'en-tête n'est pas régénéré, on retire l'injection précédente
  header.querySelectorAll(".health-bar, .second-scale-bar").forEach((node) => node.remove())

  const scaleContext = {
    ...getHealthScaleContext(actor),
    ...getSecondScaleContext(actor),
    attributes: actor.system.attributes,
    viewLimited: context.viewLimited,
  }
  const html = await foundry.applications.handlebars.renderTemplate("modules/coc2-base/templates/actors/mini-scales.hbs", scaleContext)
  abilities.insertAdjacentHTML("afterend", html)

  // Interactivité : la mini-fiche co2 n'enregistre pas ces actions, on câble les clics à la main.
  // element est recréé à chaque rendu : pas d'accumulation d'écouteurs.
  element.querySelectorAll(".health-step").forEach((step) => step.addEventListener("click", () => updateHealthScale(actor, Number(step.dataset.echelon))))
  element.querySelectorAll(".scale-step").forEach((step) => step.addEventListener("click", () => updateSecondScale(actor, Number(step.dataset.echelon))))
}
