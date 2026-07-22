/**
 * Échelle de santé COC2 : 20 échelons, 4 états préjudiciables tous les 5 échelons.
 * Les états sont définis en proportion de l'échelle pour supporter une échelle étendue (bonus/modifiers).
 * Le stockage réutilise attributes.hp : échelons cochés = hp.max - hp.value
 */
export const HEALTH_SCALE = {
  max: 20,
  states: [
    { id: "contusionne", threshold: 0.25 },
    { id: "blesse", threshold: 0.5 },
    { id: "gravementBlesse", threshold: 0.75 },
    { id: "mourant", threshold: 1 },
  ],
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
  },
  {
    id: "blesse",
    name: "COC2BASE.status.blesse",
    img: "icons/svg/degen.svg",
    description: "COC2BASE.status.blesseDescription",
  },
  {
    id: "gravementBlesse",
    name: "COC2BASE.status.gravementBlesse",
    img: "icons/svg/falling.svg",
    description: "COC2BASE.status.gravementBlesseDescription",
  },
  {
    id: "mourant",
    name: "COC2BASE.status.mourant",
    img: "icons/svg/bones.svg",
    description: "COC2BASE.status.mourantDescription",
  },
]

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
