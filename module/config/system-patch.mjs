import { buildStatusEffects } from "./statuses.mjs"
import { COC2_SIZE_LABELS } from "./encounters.mjs"
import { FEATURE_SUBTYPES_COC2 } from "./items.mjs"

/*
 * Ce que le module injecte dans l'espace du système (`game.system.CONST` et `CONFIG`) au hook init :
 * les données COC2 qui n'ont pas d'autre consommateur (entraînements martiaux, devise, éléments de magie
 * à masquer) et la fonction qui les applique.
 *
 * Toutes ces mutations sont regroupées ici pour qu'on puisse lire d'un seul coup d'œil la surface du
 * système que l'overlay modifie.
 */

/**
 * Entraînements martiaux contemporains, injectés dans game.system.CONST (même pattern que cof2-base).
 * TODO : aligner les listes sur l'équipement officiel du livre de règles COC2
 */
export const MARTIAL_TRAININGS = {
  weapons: [
    { key: "unarmed", label: "COC2BASE.config.martialTrainingWeapon.unarmed" },
    { key: "knife", label: "COC2BASE.config.martialTrainingWeapon.knife" },
    { key: "club", label: "COC2BASE.config.martialTrainingWeapon.club" },
    { key: "baseballBat", label: "COC2BASE.config.martialTrainingWeapon.baseballBat" },
    { key: "sword", label: "COC2BASE.config.martialTrainingWeapon.sword" },
    { key: "bow", label: "COC2BASE.config.martialTrainingWeapon.bow" },
    { key: "crossbow", label: "COC2BASE.config.martialTrainingWeapon.crossbow" },
    { key: "taser", label: "COC2BASE.config.martialTrainingWeapon.taser" },
    { key: "pepperSpray", label: "COC2BASE.config.martialTrainingWeapon.pepperSpray" },
    { key: "handgun", label: "COC2BASE.config.martialTrainingWeapon.handgun" },
    { key: "revolver", label: "COC2BASE.config.martialTrainingWeapon.revolver" },
    { key: "shotgun", label: "COC2BASE.config.martialTrainingWeapon.shotgun" },
    { key: "huntingRifle", label: "COC2BASE.config.martialTrainingWeapon.huntingRifle" },
    { key: "assaultRifle", label: "COC2BASE.config.martialTrainingWeapon.assaultRifle" },
    { key: "submachineGun", label: "COC2BASE.config.martialTrainingWeapon.submachineGun" },
    { key: "sniperRifle", label: "COC2BASE.config.martialTrainingWeapon.sniperRifle" },
    { key: "machineGun", label: "COC2BASE.config.martialTrainingWeapon.machineGun" },
    { key: "grenade", label: "COC2BASE.config.martialTrainingWeapon.grenade" },
  ],
  armors: [
    { key: "reinforcedClothing", label: "COC2BASE.config.martialTrainingArmor.reinforcedClothing" },
    { key: "lightBulletproofVest", label: "COC2BASE.config.martialTrainingArmor.lightBulletproofVest" },
    { key: "heavyBulletproofVest", label: "COC2BASE.config.martialTrainingArmor.heavyBulletproofVest" },
    { key: "militaryArmor", label: "COC2BASE.config.martialTrainingArmor.militaryArmor" },
  ],
  shields: [
    { key: "riotShield", label: "COC2BASE.config.martialTrainingShield.riotShield" },
    { key: "ballisticShield", label: "COC2BASE.config.martialTrainingShield.ballisticShield" },
  ],
}

/**
 * Devise COC2 : le dollar, devise unique (le livre de règles COC2 est contemporain).
 * Remplace les pièces or/argent/cuivre (gp/sp/cp) de COF2 héritées du système : injectée dans
 * game.system.CONST.CURRENCY au hook init (cf. coc-base.mjs), elle est lue ensuite par le schéma
 * `wealth` des acteurs (character/encounter), construit paresseusement par le système. Le data path
 * de la richesse devient alors system.wealth.usd.value.
 * Contrat système : chaque entrée = { id, label } ; `label` est une clé i18n localisée par le helper
 * `getCurrencyLabel` du système — on la porte donc dans NOTRE namespace (COC2BASE.currency.usd).
 * Surchargeable via CONFIG.COC2BASE.currencies avant le hook init de coc2-base (cf. cth-base, qui
 * peut la remplacer, ou poser directement game.system.CONST.CURRENCY à son propre init, chargé après).
 */
export const COC2_CURRENCIES = {
  usd: {
    id: "usd",
    label: "COC2BASE.currency.usd",
  },
}

/**
 * Sous-type de regroupement attribué aux cibles de modificateurs à masquer.
 * Les fiches d'items construisent leurs listes déroulantes en filtrant MODIFIERS_TARGET sur des sous-types
 * connus (ability, combat, attack, attribute, resource, state) : une valeur inconnue les fait disparaître
 * de toutes les listes, sans supprimer l'entrée du système.
 */
export const HIDDEN_MODIFIER_SUBTYPE = "coc2Hidden"

/**
 * Éléments de COF2 sans objet en COC2, retirés de l'interface au chargement du module.
 * Le livre de règles ne connaît que l'ATC (FOR) et l'ATD (AGI) : ni attaque magique, ni points de magie.
 */
export const HIDDEN_MAGIC_UI = {
  // Cibles de modificateurs retirées des listes déroulantes de l'éditeur de modificateurs
  modifierTargets: ["magic", "damMagic", "mp"],
  // Sous-types retirés du select des items de type attaque
  attackTypes: ["magic"],
}

/**
 * Retire de l'interface les éléments de magie hérités de COF2.
 * Les cibles de modificateurs sont masquées et non supprimées : elles restent des valeurs valides pour le
 * champ target du schéma Modifier (validé par `choices`) et pour les libellés des effets déjà en place.
 */
export function hideMagicUI() {
  for (const target of HIDDEN_MAGIC_UI.modifierTargets) {
    const modifierTarget = game.system.CONST.MODIFIERS_TARGET[target]
    if (modifierTarget) modifierTarget.subtype = HIDDEN_MODIFIER_SUBTYPE
  }

  for (const attackType of HIDDEN_MAGIC_UI.attackTypes) {
    delete game.system.CONST.ATTACK_TYPE[attackType]
  }
}

/**
 * Applique à l'espace du système les constantes et les listes propres à COC2.
 * À appeler depuis le hook init du module, qui s'exécute après celui du système.
 */
export function patchSystemConstants() {
  // Liste des états alignée sur le livre de règles COC2 : localisée et triée ensuite par le hook i18nInit du système
  CONFIG.statusEffects = buildStatusEffects(CONFIG.COC2BASE)

  // En COC2, une cible immobilisée subit un critique automatique au contact. Le « bout portant »
  // reste arbitré manuellement : le moteur ne force ici que les actions explicitement de type melee.
  game.system.CONST.statusRules.incomingAttack.immobilized = { automaticCritical: ["melee"] }

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
}
