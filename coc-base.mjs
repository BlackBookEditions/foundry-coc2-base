import COC2CharacterData from "./module/models/character.mjs"
import COC2EncounterData from "./module/models/encounter.mjs"
import COC2CapacityData from "./module/models/capacity.mjs"
import COC2EquipmentData from "./module/models/equipment.mjs"
import COC2AttackData from "./module/models/attack.mjs"
import COC2ActionMessageData from "./module/models/action-message.mjs"
import COC2Actor from "./module/documents/actor.mjs"
import { CORoll } from "../../systems/co2/module/documents/roll.mjs"
import COC2CharacterSheet from "./module/applications/character-sheet.mjs"
import COC2EncounterSheet from "./module/applications/encounter-sheet.mjs"
import COC2PartySheet from "./module/applications/party-sheet.mjs"
import {
  HEALTH_SCALE,
  HEALTH_STATES,
  HEALTH_STATE_MALUS,
  SECOND_SCALE,
  SECOND_SCALE_STATES,
  HEALING_CAPACITY_BASE,
  COC2_CURRENCIES,
  PHYSICAL_ABILITIES,
  COC2_STATUS_CHANGES,
  REMOVED_STATUS_IDS,
  STATE_TEST_MALUS,
  FEATURE_SUBTYPES_COC2,
  REMOVED_FEATURE_SUBTYPE_IDS,
  REMOVED_PATH_SUBTYPE_IDS,
  removeSubtypeOptions,
  AGE_BRACKETS,
  computeAutoCriticalBonus,
  getCriticalBonus,
  ENCOUNTER_ARCHETYPES,
  CREATURE_SIZES,
  COC2_SIZE_LABELS,
  MARTIAL_TRAININGS,
  buildStatusEffects,
  hideMagicUI,
  getHealthScaleContext,
  getSecondScaleContext,
  updateHealthScale,
  updateSecondScale,
  applyWeeklyRest,
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
  // Sous-types masqués dans la liste déroulante des fiches de trait et de voie. Lues au rendu, donc
  // modifiables à tout moment par un module d'univers (ajout ou retrait d'un id).
  removedFeatureSubtypeIds: REMOVED_FEATURE_SUBTYPE_IDS,
  removedPathSubtypeIds: REMOVED_PATH_SUBTYPE_IDS,
  ageBrackets: AGE_BRACKETS,
  // Adversaires : archétypes humains (Figurant / Second rôle / Premier rôle) et table des créatures par
  // TAI. Lus au rendu de la fiche et au pré-remplissage, donc modifiables à tout moment par un module
  // d'univers — à l'exception des ids, qui pilotent le stockage (details.archetype et details.size).
  encounterArchetypes: ENCOUNTER_ARCHETYPES,
  creatureSizes: CREATURE_SIZES,
  // Base de la capacité de guérison : CG = CON + healingCapacityBase. Lue au calcul de la fiche,
  // un module d'univers peut donc la modifier à tout moment.
  healingCapacityBase: HEALING_CAPACITY_BASE,
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

  // Ambiance « action décomplexée » : échelles de santé raccourcies pour les adversaires mineurs et
  // allongée pour le Premier rôle. Le réglage est lu au moment du pré-remplissage : le basculer ne
  // touche pas aux adversaires déjà créés, il ne change que les prochaines sélections d'archétype.
  game.settings.register("coc2-base", "pulpHealthScales", {
    name: "COC2BASE.settings.pulpHealthScales.name",
    hint: "COC2BASE.settings.pulpHealthScales.hint",
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

  // Encombrement des protections (malus fixe Init/AGI/ATC en lieu et place du plafond d'AGI de COF2)
  // et bonus critique des armes
  CONFIG.Item.dataModels.equipment = COC2EquipmentData

  // Bonus critique des attaques naturelles des créatures
  CONFIG.Item.dataModels.attack = COC2AttackData

  // Carte de dommages : le critique n'y double plus les DM, il y ajoute le bonus critique
  CONFIG.ChatMessage.dataModels.action = COC2ActionMessageData

  foundry.documents.collections.Actors.registerSheet("coc2-base", COC2CharacterSheet, { types: ["character"], makeDefault: true, label: "COC2BASE.sheet.character" })
  foundry.documents.collections.Actors.registerSheet("coc2-base", COC2EncounterSheet, { types: ["encounter"], makeDefault: true, label: "COC2BASE.sheet.encounter" })

  // Liste des états alignée sur le livre de règles COC2 : localisée et triée ensuite par le hook i18nInit du système
  CONFIG.statusEffects = buildStatusEffects()

  // Domaines et traits distinctifs : nouveaux sous-types de features proposés dans la fiche feature
  Object.assign(game.system.CONST.FEATURE_SUBTYPE, FEATURE_SUBTYPES_COC2)

  // Devise du monde : le dollar remplace les pièces or/argent/cuivre (COF2) héritées du système. Le schéma
  // wealth des acteurs, construit paresseusement (au plus tôt à setup/ready), lira cette valeur — donc après
  // ce hook init. Le data path de la richesse devient system.wealth.usd.value (cf. COC2BASE.currency.usd dans le lang).
  game.system.CONST.CURRENCY = CONFIG.COC2BASE.currencies

  // Nomenclature COC2 des tailles : « Énorme » devient « Très grand » et « Colossale » « Gigantesque ».
  // Seuls les libellés sont remplacés, les clés restant celles du système (elles valident le champ
  // details.size et indexent SYSTEM.TOKEN_SIZE).
  Object.assign(game.system.CONST.SIZES, COC2_SIZE_LABELS)

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
 * Sous-types sans équivalent COC2 (peuple) : options retirées des listes déroulantes des fiches de trait et de voie
 */
Hooks.on("renderCoFeatureSheet", (application, element, context, options) => {
  removeSubtypeOptions(element, application.document, CONFIG.COC2BASE.removedFeatureSubtypeIds)
})

Hooks.on("renderCoPathSheet", (application, element, context, options) => {
  removeSubtypeOptions(element, application.document, CONFIG.COC2BASE.removedPathSubtypeIds)
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
 * Protections COC2 (armure/bouclier) sur la fiche d'équipement co2 (CoEquipmentSheet non surchargée, on
 * retouche le DOM plutôt que de dupliquer son template) :
 *  - le champ `system.defense` porte désormais la RD (réduction de dégâts), pas la DEF : on le relabellise
 *  - `system.magicalDefense` (défense magique, notion COF2/magie absente de COC2) est masqué
 *  - injection du champ d'encombrement `system.encumbrance` (ajouté par COC2EquipmentData)
 */
Hooks.on("renderCoEquipmentSheet", (application, element, context, options) => {
  const item = application.document
  if (!["armor", "shield"].includes(item.system.subtype)) return

  const defense = element.querySelector('[name="system.defense"]')
  if (!defense) return
  const defenseGroup = defense.closest(".form-group") ?? defense

  // Relabelliser Défense → RD (idempotent)
  const defenseLabel = defenseGroup.querySelector?.("label")
  if (defenseLabel) defenseLabel.textContent = game.i18n.localize("COC2BASE.equipment.rd")

  // Masquer la défense magique (idempotent : null après première suppression)
  element.querySelector('[name="system.magicalDefense"]')?.closest(".form-group")?.remove()

  // Injecter l'encombrement (garde anti-doublon)
  if (element.querySelector(".coc2-encumbrance")) return
  const value = item.system.encumbrance ?? 0
  const locked = context.locked ? "disabled" : ""
  const html = `<div class="form-group coc2-encumbrance">
    <label>${game.i18n.localize("COC2BASE.equipment.encumbrance")}</label>
    <input type="number" name="system.encumbrance" value="${value}" min="0" step="1" data-dtype="Number" ${locked} />
    <p class="hint">${game.i18n.localize("COC2BASE.equipment.encumbranceHint")}</p>
  </div>`
  defenseGroup.insertAdjacentHTML("afterend", html)
})

/**
 * Construit le groupe de formulaire du bonus critique, commun à la fiche d'arme et à la fiche d'attaque.
 * Le champ est nullable : laissé vide, il affiche en indication la valeur déduite du dé de dommages, qui
 * est celle réellement utilisée en jeu.
 * @param {number|null} value La valeur saisie sur l'item
 * @param {string} damageFormula La formule de dommages de référence, pour l'indication de valeur automatique
 * @param {boolean} locked Vrai si la fiche est verrouillée
 * @returns {string} Le fragment HTML à injecter
 */
function criticalBonusFormGroup(value, damageFormula, locked) {
  const auto = computeAutoCriticalBonus(damageFormula)
  const hint = game.i18n.format("COC2BASE.equipment.bcHint", { auto })
  return `<div class="form-group coc2-critical-bonus">
    <label>${game.i18n.localize("COC2BASE.equipment.bc")}</label>
    <input type="number" name="system.criticalBonus" value="${value ?? ""}" placeholder="${auto}" min="0" step="1" data-dtype="Number" ${locked ? "disabled" : ""} />
    <p class="hint">${hint}</p>
  </div>`
}

/*
 * Bonus critique des armes : en COC2 une réussite critique n'ajoute plus le double des DM mais le BC de
 * l'arme. Injection du champ `system.criticalBonus` (ajouté par COC2EquipmentData) sous le type de
 * dommages de la fiche d'équipement co2.
 */
Hooks.on("renderCoEquipmentSheet", (application, element, context, options) => {
  const item = application.document
  if (item.system.subtype !== "weapon") return

  // Garde anti-doublon : la fiche peut être rendue partiellement
  if (element.querySelector(".coc2-critical-bonus")) return

  const damageType = element.querySelector('[name="system.damagetype"]')
  if (!damageType) return
  const anchor = damageType.closest(".form-group") ?? damageType
  anchor.insertAdjacentHTML("afterend", criticalBonusFormGroup(item.system.criticalBonus, item.system.damage, context.locked))
})

/*
 * Bonus critique des attaques : les fiches techniques des créatures précisent leur propre BC pour leurs
 * attaques naturelles (ex. griffes 1d8+7, BC +8), valeur qui ne se déduit pas toujours du dé de dommages.
 */
Hooks.on("renderCoAttackSheet", (application, element, context, options) => {
  const item = application.document
  if (element.querySelector(".coc2-critical-bonus")) return

  const properties = element.querySelector("fieldset.properties")
  if (!properties) return
  properties.insertAdjacentHTML("beforeend", criticalBonusFormGroup(item.system.criticalBonus, item.system.displayValues.damage, context.locked))
})

/*
 * Réussite critique COC2 : au lieu de doubler les dommages (COF2), on ajoute le bonus critique (BC) de
 * l'arme ou de l'attaque, égal par défaut au maximum de son dé de dommages.
 *
 * Le hook est appelé juste après l'évaluation des jets et avant que le système ne sérialise le jet de
 * dommages dans le message d'attaque (`linkedRoll`) : le BC se propage donc à tous les chemins d'affichage
 * (jet combiné, jet différé, jet opposé, recréation après un point de chance).
 *
 * Le jet n'est pas relancé : on reconstruit un jet équivalent à partir de ses termes déjà évalués, auxquels
 * on ajoute un terme fixe. Le total de la carte de chat, et donc tout le pipeline d'application des dégâts
 * (RD, minimum de dommages), suit sans autre intervention. Le multiplicateur ×2 que le système
 * présélectionne sur un critique est neutralisé par COC2ActionMessageData.
 */
Hooks.on("co.postRollAttack", (item, options, rolls) => {
  if (options.type !== "attack" || !rolls || rolls.length < 2) return

  const result = CORoll.analyseRollResult(rolls[0], options.hasAttackSuccessThreshold, options.attackSuccessThreshold)
  if (!result.isCritical) return

  // options.damageFormula est figé avant l'ajout des modificateurs de dommages et des options tactiques :
  // c'est la formule de base de l'arme, dés intacts, dont le BC ne doit dépendre que des dés (LdR).
  const bc = getCriticalBonus(item, options.damageFormula)
  if (bc <= 0) return

  const damageRoll = rolls[1]
  const { NumericTerm, OperatorTerm } = foundry.dice.terms
  const plus = new OperatorTerm({ operator: "+" })
  const bonus = new NumericTerm({ number: bc, options: { flavor: game.i18n.localize("COC2BASE.equipment.bcFlavor") } })
  bonus.evaluate()

  const newRoll = damageRoll.constructor.fromTerms([...damageRoll.terms, plus, bonus], { ...damageRoll.options })
  newRoll.options.formulaDamage = newRoll.formula
  rolls[1] = newRoll
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
