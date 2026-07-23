import COC2CharacterData from "./module/models/character.mjs"
import COC2EncounterData from "./module/models/encounter.mjs"
import COC2CapacityData from "./module/models/capacity.mjs"
import COC2Actor from "./module/documents/actor.mjs"
import COC2CharacterSheet from "./module/applications/character-sheet.mjs"
import COC2PartySheet from "./module/applications/party-sheet.mjs"
import {
  HEALTH_SCALE,
  HEALTH_STATES,
  HEALTH_STATE_MALUS,
  SECOND_SCALE,
  SECOND_SCALE_STATES,
  COC2_CURRENCIES,
  PHYSICAL_ABILITIES,
  COC2_STATUS_CHANGES,
  REMOVED_STATUS_IDS,
  STATE_TEST_MALUS,
  FEATURE_SUBTYPES_COC2,
  AGE_BRACKETS,
  MARTIAL_TRAININGS,
  buildStatusEffects,
  hideMagicUI,
  getHealthScaleContext,
  getSecondScaleContext,
  updateHealthScale,
  updateSecondScale,
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
  ageBrackets: AGE_BRACKETS,
  // Devise du monde COC2 : le dollar remplace or/argent/cuivre de COF2. Lue au hook init de coc2-base ;
  // un module d'univers qui la modifie doit être chargé avant (ou poser game.system.CONST.CURRENCY à son init).
  currencies: COC2_CURRENCIES,
  /**
   * Seconde échelle (« Échelle ») : compteur avec libellé de palier affiché sur la fiche, SANS statut de
   * token (rien dans CONFIG.statusEffects). Masquée par défaut : son affichage est commandé par le réglage
   * `showSecondScale` OU par le flag `forced` ci-dessous. Un module d'univers (cth) la force, la renomme
   * (label/labelShort) et renomme ses paliers (states.<id>.name/description) depuis son hook init.
   */
  secondScale: {
    scale: SECOND_SCALE,
    states: SECOND_SCALE_STATES,
    max: SECOND_SCALE.max,
    forced: false,
    label: "COC2BASE.secondScale.label",
    labelShort: "COC2BASE.secondScale.short",
  },
}

Hooks.once("init", () => {
  console.info("COC2 Base | Initialisation du module...")

  // Réglage commandant l'affichage de la seconde échelle sur les fiches (premier réglage du module)
  game.settings.register("coc2-base", "showSecondScale", {
    name: "COC2BASE.settings.showSecondScale.name",
    hint: "COC2BASE.settings.showSecondScale.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  })

  // Remplacement des classes du système par les variantes COC2 : le hook init du module s'exécute après celui du système
  CONFIG.Actor.documentClass = COC2Actor
  CONFIG.Actor.dataModels.character = COC2CharacterData
  CONFIG.Actor.dataModels.encounter = COC2EncounterData

  // Coût uniforme d'un rang de voie : 1 point de capacité, quel que soit le rang
  CONFIG.Item.dataModels.capacity = COC2CapacityData

  foundry.documents.collections.Actors.registerSheet("coc2-base", COC2CharacterSheet, { types: ["character"], makeDefault: true, label: "COC2BASE.sheet.character" })

  // Liste des états alignée sur le livre de règles COC2 : localisée et triée ensuite par le hook i18nInit du système
  CONFIG.statusEffects = buildStatusEffects()

  // Domaines et traits distinctifs : nouveaux sous-types de features proposés dans la fiche feature
  Object.assign(game.system.CONST.FEATURE_SUBTYPE, FEATURE_SUBTYPES_COC2)

  // Devise du monde : le dollar remplace les pièces or/argent/cuivre (COF2) héritées du système. Le schéma
  // wealth des acteurs, construit paresseusement (au plus tôt à setup/ready), lira cette valeur — donc après
  // ce hook init. Le data path de la richesse devient system.wealth.usd.value (cf. COC2BASE.currency.usd dans le lang).
  game.system.CONST.CURRENCY = CONFIG.COC2BASE.currencies

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

Hooks.once("ready", () => {
  console.info("COC2 Base | Module prêt")

  // Groupe de joueurs COC2 : on impose notre sous-classe à game.system.partySheet (la sidebar et co.mjs lisent
  // cette instance ; remplacer CONFIG ne suffirait pas, la référence importée y est figée).
  //
  // Attention à la course : le système assigne game.system.partySheet à la FIN de sa propre ready asynchrone
  // (co.mjs:255), APRÈS des await (co.mjs:244/249). Cette affectation retombe donc APRÈS ce hook et écraserait
  // une simple réaffectation. On remplace donc la propriété par un accesseur qui n'accepte QUE la sous-classe
  // COC2 et ignore l'instance COF2 du système, quel que soit l'ordre d'exécution des deux ready.
  const existing = game.system.partySheet
  let instance = existing instanceof COC2PartySheet ? existing : null

  // Si le système a déjà posé (et, pour le MJ, rendu) sa version COF2 avant ce hook, on la ferme.
  const replacedRendered = existing && !instance && existing.rendered
  if (existing && !instance) existing.close()

  Object.defineProperty(game.system, "partySheet", {
    configurable: true,
    enumerable: true,
    get() {
      return (instance ??= new COC2PartySheet())
    },
    set(value) {
      // On ignore l'affectation de la classe système (COPartySheet) ; seule la sous-classe COC2 est acceptée.
      if (value instanceof COC2PartySheet) instance = value
    },
  })

  // Reproduit l'auto-rendu MJ du système, mais avec notre version, si sa fenêtre était déjà ouverte.
  if (game.user.isGM && replacedRendered) game.system.partySheet.render({ force: true })
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
 * Vue actions (mini-fiche) : adapter la fiche co2 à coc2 par nettoyage/injection DOM (la mini-fiche
 * COMiniCharacterSheet du système n'est pas surchargée et pointe vers les templates bruts co2, on évite
 * ainsi de les dupliquer). On retire les valeurs COF2 (vigueur/PV, mana, niveau/peuple/profils, portrait
 * et nom) et on injecte, sous les caractéristiques, les rubans Santé + Échelle cliquables de coc2.
 */
Hooks.on("renderCOMiniCharacterSheet", async (application, element, context, options) => {
  const actor = application.document

  // Barre latérale : retirer PV (vigueur → remplacée par l'échelle de santé) et MP (pas de magie en coc2)
  element.querySelector(".mini-sidebar .hp-section")?.remove()
  element.querySelector('.mini-sidebar input[name="system.resources.mana.value"]')?.closest(".sidebar-section")?.remove()

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
