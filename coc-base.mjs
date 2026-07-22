import COC2CharacterData from "./module/models/character.mjs"
import COC2EncounterData from "./module/models/encounter.mjs"
import COC2Actor from "./module/documents/actor.mjs"
import COC2CharacterSheet from "./module/applications/character-sheet.mjs"
import {
  HEALTH_SCALE,
  HEALTH_STATES,
  HEALTH_STATE_MALUS,
  PHYSICAL_ABILITIES,
  COC2_STATUS_CHANGES,
  REMOVED_STATUS_IDS,
  STATE_TEST_MALUS,
  FEATURE_SUBTYPES_COC2,
  MARTIAL_TRAININGS,
  buildStatusEffects,
  hideMagicUI,
} from "./module/config/coc2.mjs"

/**
 * Configuration publique du module. Exposée dès le chargement du script, et non dans le hook init,
 * pour qu'un module d'univers puisse la modifier depuis son propre hook init quel que soit l'ordre
 * de chargement des modules.
 *
 * Surchargeables : name, img, description et changes des états de santé, les tables de malus, la
 * liste des caractéristiques physiques et la composition de la liste des états. Les ids et les seuils
 * pilotent la mécanique (pose automatique des statuts, flags, classes CSS du ruban) et ne doivent pas
 * être modifiés.
 *
 * Attention : statusChanges et removedStatusIds sont lus au moment du hook init de coc2-base, un
 * module d'univers qui les modifie doit donc être chargé avant. Les libellés et stateTestMalus, eux,
 * sont lus au rendu et peuvent être modifiés à tout moment.
 *
 * @example Renommer un état depuis un module d'univers
 * Hooks.once("init", () => {
 *   CONFIG.COC2BASE.healthStates.affaibli.name = "MONMODULE.status.choque" // clé i18n ou libellé littéral
 * })
 */
CONFIG.COC2BASE = {
  healthScale: HEALTH_SCALE,
  healthStates: HEALTH_STATES,
  healthStateMalus: HEALTH_STATE_MALUS,
  physicalAbilities: PHYSICAL_ABILITIES,
  statusChanges: COC2_STATUS_CHANGES,
  removedStatusIds: REMOVED_STATUS_IDS,
  stateTestMalus: STATE_TEST_MALUS,
}

Hooks.once("init", () => {
  console.info("COC2 Base | Initialisation du module...")

  // Remplacement des classes du système par les variantes COC2 : le hook init du module s'exécute après celui du système
  CONFIG.Actor.documentClass = COC2Actor
  CONFIG.Actor.dataModels.character = COC2CharacterData
  CONFIG.Actor.dataModels.encounter = COC2EncounterData

  foundry.documents.collections.Actors.registerSheet("coc2-base", COC2CharacterSheet, { types: ["character"], makeDefault: true, label: "COC2BASE.sheet.character" })

  // Liste des états alignée sur le livre de règles COC2 : localisée et triée ensuite par le hook i18nInit du système
  CONFIG.statusEffects = buildStatusEffects()

  // Domaines et traits distinctifs : nouveaux sous-types de features proposés dans la fiche feature
  Object.assign(game.system.CONST.FEATURE_SUBTYPE, FEATURE_SUBTYPES_COC2)

  // Attaque magique et points de magie : notions de COF2 absentes du livre de règles COC2
  hideMagicUI()

  // Entraînements martiaux contemporains (même pattern que cof2-base)
  if (game.system.CONST.martialTrainingsWeapons.length === 0) {
    game.system.CONST.martialTrainingsWeapons.push(...MARTIAL_TRAININGS.weapons)
  }
  if (game.system.CONST.martialTrainingsArmors.length === 0) {
    game.system.CONST.martialTrainingsArmors.push(...MARTIAL_TRAININGS.armors)
  }
  if (game.system.CONST.martialTrainingsShields.length === 0) {
    game.system.CONST.martialTrainingsShields.push(...MARTIAL_TRAININGS.shields)
  }

  console.info("COC2 Base | Fin de l'initialisation du module")
})

Hooks.once("ready", async () => {
  console.info("COC2 Base | Module prêt")
})

/*
 * Coût en points des traits distinctifs (avantages/désavantages) : champ injecté dans la fiche feature, stocké en flag
 */
Hooks.on("renderCoFeatureSheet", (application, element, context, options) => {
  const item = application.document
  if (![FEATURE_SUBTYPES_COC2.avantage.id, FEATURE_SUBTYPES_COC2.desavantage.id].includes(item.system.subtype)) return

  const select = element.querySelector('select[name="system.subtype"]')
  if (!select || element.querySelector(".coc2-points")) return

  const points = item.getFlag("coc2-base", "points") ?? 1
  const html = `<div class="form-group coc2-points">
    <label>${game.i18n.localize("COC2BASE.feature.points")}</label>
    <input type="number" name="flags.coc2-base.points" value="${points}" min="0" step="1" data-dtype="Number" />
  </div>`
  const group = select.closest(".form-group") ?? select
  group.insertAdjacentHTML("afterend", html)
})

/*
 * Render Journal Sheet Hook to style the Journal Entry
 */
Hooks.on("renderJournalEntrySheet", (application, element, context, options) => {
  if (application.document.getFlag("coc2-base", "isJournalCOC") === true) {
    element.classList.add("journal-coc-base")
  }
})

/*
 * Hook renderCOSidebarMenu
 */
Hooks.on("renderCOSidebarMenu", async (application, html, context, options) => {
  let element = html.querySelector(".co.support")

  if (element) {
    const renderedHtml = await foundry.applications.handlebars.renderTemplate("modules/coc2-base/templates/sidebar-menu.hbs", {
      user: game.user,
    })

    if (renderedHtml !== "") {
      element.insertAdjacentHTML("afterend", renderedHtml)
    }
  }
})
