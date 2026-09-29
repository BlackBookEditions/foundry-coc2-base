// Configuration
import * as config from "./module/config/coc2.mjs"
import { registerSettings } from "./module/config/settings.mjs"
import { patchSystemConstants } from "./module/config/system-patch.mjs"

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import * as hooks from "./module/hooks/_module.mjs"

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
 * Attention : statusChanges, statusOverrides, additionalStatusEffects et removedStatusIds sont lus
 * au hook init de coc2-base. Un module d'univers dépendant doit donc les modifier au chargement de
 * son script, avant que les hooks init ne soient déclenchés. stateTestMalus reste lu au rendu.
 *
 * @example Renommer un état depuis un module d'univers
 * Hooks.once("init", () => {
 *   CONFIG.COC2BASE.healthStates.affaibli.name = "MONMODULE.status.choque" // clé i18n ou libellé littéral
 * })
 */
CONFIG.COC2BASE = {
  healthScale: config.HEALTH_SCALE,
  healthStates: config.HEALTH_STATES,
  healthStateMalus: config.HEALTH_STATE_MALUS,
  physicalAbilities: config.PHYSICAL_ABILITIES,
  statusChanges: config.COC2_STATUS_CHANGES,
  removedStatusIds: config.REMOVED_STATUS_IDS,
  additionalStatusEffects: config.COC2_STATUS_EFFECTS,
  statusOverrides: config.COC2_STATUS_OVERRIDES,
  stateTestMalus: config.STATE_TEST_MALUS,
  // Sous-types masqués dans la liste déroulante des fiches de trait et de voie. Lues au rendu, donc
  // modifiables à tout moment par un module d'univers (ajout ou retrait d'un id).
  removedFeatureSubtypeIds: config.REMOVED_FEATURE_SUBTYPE_IDS,
  removedPathSubtypeIds: config.REMOVED_PATH_SUBTYPE_IDS,
  ageBrackets: config.AGE_BRACKETS,
  // Adversaires : archétypes humains (Figurant / Second rôle / Premier rôle) et table des créatures par
  // TAI. Lus au rendu de la fiche et au pré-remplissage, donc modifiables à tout moment par un module
  // d'univers — à l'exception des ids, qui pilotent le stockage (details.archetype et details.size).
  encounterArchetypes: config.ENCOUNTER_ARCHETYPES,
  creatureSizes: config.CREATURE_SIZES,
  // Base de la capacité de guérison : CG = CON + healingCapacityBase. Lue au calcul de la fiche,
  // un module d'univers peut donc la modifier à tout moment.
  healingCapacityBase: config.HEALING_CAPACITY_BASE,
  // Devise du monde COC2 : le dollar remplace or/argent/cuivre de COF2. Lue au hook init de coc2-base ;
  // un module d'univers qui la modifie doit être chargé avant (ou poser game.system.CONST.CURRENCY à son init).
  currencies: config.COC2_CURRENCIES,
  /**
   * Seconde échelle (« Échelle ») : compteur avec libellé de palier affiché sur la fiche, SANS statut de
   * token (rien dans CONFIG.statusEffects). Masquée par défaut : son affichage est commandé par le réglage
   * `showSecondScale` OU par le flag `forced` ci-dessous. Un module d'univers (cth) la force, la renomme
   * (label/labelShort) et renomme ses paliers (states.<id>.name/description) depuis son hook init.
   */
  secondScale: {
    scale: config.SECOND_SCALE,
    states: config.SECOND_SCALE_STATES,
    max: config.SECOND_SCALE.max,
    forced: false,
    modifierProfile: null,
    label: "COC2BASE.secondScale.label",
    labelShort: "COC2BASE.secondScale.short",
  },
}

Hooks.once("init", () => {
  console.info("COC2 Base | Initialisation du module...")

  // Expose the module API
  game.modules.get("coc2-base").api = {
    models,
    documents,
    applications,
    hooks,
    config,
  }

  registerSettings()

  // Remplacement des classes du système par les variantes COC2 : le hook init du module s'exécute après celui du système
  CONFIG.Actor.documentClass = documents.COC2Actor
  CONFIG.Actor.dataModels.character = models.COC2CharacterData
  CONFIG.Actor.dataModels.encounter = models.COC2EncounterData

  // Coût uniforme d'un rang de voie : 1 point de capacité, quel que soit le rang
  CONFIG.Item.dataModels.capacity = models.COC2CapacityData

  // Encombrement des protections (malus fixe Init/AGI/ATC en lieu et place du plafond d'AGI de COF2) et bonus critique des armes
  CONFIG.Item.dataModels.equipment = models.COC2EquipmentData

  // Bonus critique des attaques naturelles des créatures
  CONFIG.Item.dataModels.attack = models.COC2AttackData

  // Carte de dommages : le critique n'y double plus les DM, il y ajoute le bonus critique
  CONFIG.ChatMessage.dataModels.action = models.COC2ActionMessageData

  foundry.documents.collections.Actors.registerSheet("coc2-base", applications.COC2CharacterSheet, { types: ["character"], makeDefault: true, label: "COC2BASE.sheet.character" })
  foundry.documents.collections.Actors.registerSheet("coc2-base", applications.COC2EncounterSheet, { types: ["encounter"], makeDefault: true, label: "COC2BASE.sheet.encounter" })

  // Constantes et listes injectées dans l'espace du système (états, devise, tailles, entraînements…)
  patchSystemConstants()

  console.info("COC2 Base | Fin de l'initialisation du module")
})

Hooks.once("ready", () => {
  console.info("COC2 Base | Module prêt")

  // Groupe de joueurs COC2 : impose notre sous-classe à game.system.partySheet malgré la ready asynchrone du système, qui retombe après celle-ci (cf. COC2PartySheet.install)
  applications.COC2PartySheet.install()

  // Notes de version du module (garde MJ interne à displayIfNeeded)
  applications.COC2ReleaseNotes.displayIfNeeded()
})

/*
 * Retouches des fiches et des jets du système, implémentées dans module/hooks/. L'ordre d'enregistrement est celui d'origine : un module d'univers dépendant s'insère derrière (cf. cth-base).
 */
Hooks.on("renderCoFeatureSheet", hooks.onRenderFeatureSheet)
Hooks.on("renderCoPathSheet", hooks.onRenderPathSheet)
Hooks.on("renderCoProfileSheet", hooks.onRenderProfileSheet)
Hooks.on("renderCoEquipmentSheet", hooks.onRenderEquipmentSheet)
Hooks.on("renderCoAttackSheet", hooks.onRenderAttackSheet)
Hooks.on("co.postRollAttack", hooks.onPostRollAttack)
Hooks.on("renderCOMiniCharacterSheet", hooks.onRenderMiniCharacterSheet)
Hooks.on("renderJournalEntrySheet", hooks.onRenderJournalEntrySheet)
Hooks.on("renderCOSidebarMenu", hooks.onRenderSidebarMenu)
