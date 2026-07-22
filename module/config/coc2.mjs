/**
 * Échelle de santé COC2 : 20 échelons, 4 états préjudiciables tous les 5 échelons.
 * Les états sont définis en proportion de l'échelle pour supporter une échelle étendue (bonus/modifiers).
 * Le stockage réutilise attributes.hp : échelons cochés = hp.max - hp.value
 */
export const HEALTH_SCALE = {
  max: 20,
  states: [
    { id: "contusionne", threshold: 0.25 },
    { id: "affaibli", threshold: 0.5 },
    { id: "blesse", threshold: 0.75 },
    { id: "mourant", threshold: 1 },
  ],
}

/**
 * Malus de chaque état de santé (LdR ch. 5, table « Les états de santé »).
 * Le livre de règles l'applique à l'Init., à la DEF et à toutes les actions physiques.
 */
export const HEALTH_STATE_MALUS = {
  contusionne: -1,
  affaibli: -3,
  blesse: -5,
  mourant: -10,
}

/**
 * Caractéristiques concernées par le malus des états de santé : la règle vise les actions physiques.
 */
export const PHYSICAL_ABILITIES = ["for", "agi", "con"]

/**
 * Changes d'ActiveEffect portant le malus d'un état de santé (ACTIVE_EFFECT_MODES : ADD = 2).
 * Seules l'Init. et la DEF sont appliquées d'office. La DEF et les attaques dérivant des
 * caractéristiques dans co2 (DEF = 10 + AGI + PER, ATC = FOR, ATD = AGI), poser aussi le malus sur
 * AGI ou FOR le compterait deux fois : les tests de caractéristique passent par getHealthStateSkillBonus.
 * Les états s'excluant mutuellement, ces malus ne se cumulent jamais.
 * @param {string} id Identifiant de l'état de santé
 * @returns {Array<object>}
 */
function healthStateChanges(id) {
  const malus = HEALTH_STATE_MALUS[id]
  return [
    { key: "system.combat.init.bonuses.effects", mode: 2, value: malus },
    { key: "system.combat.def.bonuses.effects", mode: 2, value: malus },
  ]
}

/**
 * Statuts des états de santé, ajoutés à CONFIG.statusEffects
 * Les icônes core sont provisoires, à remplacer par des icônes dédiées dans assets/icons
 */
export const HEALTH_STATUS_EFFECTS = [
  {
    id: "contusionne",
    name: "COC2BASE.status.contusionne",
    img: "icons/svg/blood.svg",
    description: "COC2BASE.status.contusionneDescription",
    changes: healthStateChanges("contusionne"),
  },
  {
    id: "affaibli",
    name: "COC2BASE.status.affaibli",
    img: "icons/svg/degen.svg",
    description: "COC2BASE.status.affaibliDescription",
    changes: healthStateChanges("affaibli"),
  },
  {
    id: "blesse",
    name: "COC2BASE.status.blesse",
    img: "icons/svg/falling.svg",
    description: "COC2BASE.status.blesseDescription",
    changes: healthStateChanges("blesse"),
  },
  {
    id: "mourant",
    name: "COC2BASE.status.mourant",
    img: "icons/svg/bones.svg",
    description: "COC2BASE.status.mourantDescription",
    changes: healthStateChanges("mourant"),
  },
]

/**
 * États de santé indexés par id, pour la configuration publique du module (CONFIG.COC2BASE).
 * Les objets sont ceux de HEALTH_STATUS_EFFECTS : muter un nom ici le mute partout.
 */
export const HEALTH_STATES = Object.fromEntries(HEALTH_STATUS_EFFECTS.map((effect) => [effect.id, effect]))

/**
 * Sous-types de features COC2, ajoutés à SYSTEM.FEATURE_SUBTYPE :
 * domaines professionnels/extra-professionnels (remplacent peuples et profils)
 * et traits distinctifs (avantages/désavantages)
 */
export const FEATURE_SUBTYPES_COC2 = {
  domainePro: {
    id: "domainePro",
    label: "COC2BASE.feature.subtypes.domainePro",
  },
  domaineExtraPro: {
    id: "domaineExtraPro",
    label: "COC2BASE.feature.subtypes.domaineExtraPro",
  },
  avantage: {
    id: "avantage",
    label: "COC2BASE.feature.subtypes.avantage",
  },
  desavantage: {
    id: "desavantage",
    label: "COC2BASE.feature.subtypes.desavantage",
  },
}

/** Plafond de points d'avantages (et autant de désavantages) à la création */
export const TRAIT_POINTS_MAX = 5

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
 * Tranches d'âge : déterminent le nombre de voies et de points de caractéristiques à la création.
 * TODO : renseigner les quotas (voies, rangs, caracs) d'après le livre de règles COC2
 */
export const AGE_BRACKETS = {
  jeune: {
    id: "jeune",
    label: "COC2BASE.age.jeune",
  },
  adulte: {
    id: "adulte",
    label: "COC2BASE.age.adulte",
  },
  experimente: {
    id: "experimente",
    label: "COC2BASE.age.experimente",
  },
  veteran: {
    id: "veteran",
    label: "COC2BASE.age.veteran",
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
 * Retourne l'id de l'état de santé atteint pour un nombre d'échelons cochés, ou null si aucun
 * @param {number} damage Nombre d'échelons cochés (hp.max - hp.value)
 * @param {number} max Taille de l'échelle
 * @returns {string|null}
 */
export function getHealthState(damage, max) {
  let current = null
  for (const state of HEALTH_SCALE.states) {
    if (damage >= Math.ceil(state.threshold * max)) current = state.id
  }
  return current
}

/**
 * Ligne de malus à proposer dans la fenêtre de jet pour un test de caractéristique physique.
 * Le système affiche ces lignes décochées : c'est au joueur de l'appliquer quand le test correspond
 * bien à une action physique au sens du livre de règles, ce qui évite notamment de pénaliser les
 * tests de CON que les états de santé imposent eux-mêmes.
 * @param {Actor} actor Acteur qui effectue le test
 * @param {string} ability Caractéristique testée
 * @returns {object|null} Bonus au format attendu par les fenêtres de jet, ou null s'il n'y a rien à proposer
 */
export function getHealthStateSkillBonus(actor, ability) {
  if (!PHYSICAL_ABILITIES.includes(ability)) return null

  // Un seul état de santé est actif à la fois : applyHealthScaleStatuses retire les autres
  const state = HEALTH_SCALE.states.find((s) => actor.statuses.has(s.id))
  const malus = state ? HEALTH_STATE_MALUS[state.id] : 0
  if (!malus) return null

  const name = game.i18n.localize(HEALTH_STATES[state.id].name)
  return {
    sourceType: "healthState",
    name,
    description: name,
    pathName: game.i18n.localize("COC2BASE.healthScale.label"),
    hasPathName: true,
    value: malus,
    additionalInfos: game.i18n.localize("COC2BASE.healthScale.malusHint"),
  }
}

/**
 * Pose/retire automatiquement les statuts d'état de santé selon la nouvelle valeur de l'échelle.
 * Seul l'état le plus grave atteint est actif ; seuls les statuts posés par cette automatisation sont retirés.
 * @param {Actor} actor
 * @param {number} newHp Nouvelle valeur de hp.value
 * @param {number} max Valeur de hp.max
 */
export async function applyHealthScaleStatuses(actor, newHp, max) {
  const target = getHealthState(max - newHp, max)
  for (const state of HEALTH_SCALE.states) {
    const active = actor.statuses.has(state.id)
    if (state.id === target && !active) {
      await actor.toggleStatusEffect(state.id, { active: true })
      await actor.setFlag("coc2-base", `statuses.${state.id}FromHealthScale`, true)
    } else if (state.id !== target && active && actor.getFlag("coc2-base", `statuses.${state.id}FromHealthScale`)) {
      await actor.toggleStatusEffect(state.id, { active: false })
      await actor.unsetFlag("coc2-base", `statuses.${state.id}FromHealthScale`)
    }
  }
}
