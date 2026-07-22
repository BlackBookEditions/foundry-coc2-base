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
 * Seconde échelle COC2 (« Échelle » dans coc2-base, « Échelle de conscience » dans un module d'univers).
 * Même structure que l'échelle de santé : 20 échelons, 4 états à seuils. Son affichage est commandé par
 * le réglage `showSecondScale` (ou le flag `CONFIG.COC2BASE.secondScale.forced`).
 * Le stockage utilise attributes.secondScale.value = nombre d'échelons cochés (0 = échelle vide).
 * TODO : renseigner les ids, seuils et libellés définitifs des états (placeholders provisoires).
 */
export const SECOND_SCALE = {
  max: 20,
  states: [
    { id: "secondState1", threshold: 0.25 },
    { id: "secondState2", threshold: 0.5 },
    { id: "secondState3", threshold: 0.75 },
    { id: "secondState4", threshold: 1 },
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
 * Malus de chaque état de la seconde échelle.
 * TODO : renseigner les valeurs définitives (placeholders calqués sur l'échelle de santé).
 */
export const SECOND_SCALE_STATE_MALUS = {
  secondState1: -1,
  secondState2: -3,
  secondState3: -5,
  secondState4: -10,
}

/**
 * Caractéristiques concernées par le malus des états de santé : la règle vise les actions physiques.
 */
export const PHYSICAL_ABILITIES = ["for", "agi", "con"]

/** Champs visés par les malus chiffrés des états, dans l'ordre d'affichage des tooltips */
const COMBAT_CHANGE_KEYS = {
  init: "system.combat.init.bonuses.effects",
  def: "system.combat.def.bonuses.effects",
  melee: "system.combat.melee.bonuses.effects",
  ranged: "system.combat.ranged.bonuses.effects",
}

/**
 * Traduit une description abrégée de malus en changes d'ActiveEffect.
 * ACTIVE_EFFECT_MODES : ADD = 2, OVERRIDE = 5.
 * @param {object} spec Malus par cible : init, def, melee, ranged, et movement en mètres
 * @returns {Array<object>}
 */
function buildChanges({ init, def, melee, ranged, movement } = {}) {
  const changes = []

  for (const [target, value] of Object.entries({ init, def, melee, ranged })) {
    if (value) changes.push({ key: COMBAT_CHANGE_KEYS[target], mode: 2, value })
  }

  // Le mouvement est forcé sur ses trois composantes, comme le font outOfBreath et immobilized dans co2
  if (movement !== undefined) {
    changes.push(
      { key: "system.attributes.movement.base", mode: 5, value: movement },
      { key: "system.attributes.movement.bonuses.sheet", mode: 5, value: 0 },
      { key: "system.attributes.movement.bonuses.effects", mode: 5, value: 0 },
    )
  }

  return changes
}

/**
 * Changes d'ActiveEffect portant le malus d'un état de santé.
 * Seules l'Init. et la DEF sont appliquées d'office. La DEF et les attaques dérivant des
 * caractéristiques dans co2 (DEF = 10 + AGI + PER, ATC = FOR, ATD = AGI), poser aussi le malus sur
 * AGI ou FOR le compterait deux fois : les tests de caractéristique passent par getStateSkillBonuses.
 * Les états de santé s'excluant mutuellement, ces malus ne se cumulent jamais.
 * @param {string} id Identifiant de l'état de santé
 * @returns {Array<object>}
 */
function healthStateChanges(id) {
  const malus = HEALTH_STATE_MALUS[id]
  return buildChanges({ init: malus, def: malus })
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
 * Changes d'ActiveEffect portant le malus d'un état de la seconde échelle.
 * TODO : les cibles du malus restent à définir. Tant qu'elles ne le sont pas, aucune cible n'est
 * câblée (l'état est posé/retiré, mais ne modifie encore aucune valeur). Renseigner un buildChanges
 * dès que les règles fixent les cibles, ex. buildChanges({ init: malus, def: malus }).
 * @param {string} id Identifiant de l'état de la seconde échelle
 * @returns {Array<object>}
 */
function secondScaleStateChanges(id) {
  // TODO : câbler les cibles depuis SECOND_SCALE_STATE_MALUS[id], ex. buildChanges({ init: malus, def: malus })
  return buildChanges({})
}

/**
 * Statuts des états de la seconde échelle, ajoutés à CONFIG.statusEffects.
 * Icônes core provisoires, à remplacer par des icônes dédiées dans assets/icons.
 * TODO : renseigner libellés et descriptions définitifs (clés i18n COC2BASE.secondScale.status.<id>).
 */
export const SECOND_SCALE_STATUS_EFFECTS = SECOND_SCALE.states.map((state) => ({
  id: state.id,
  name: `COC2BASE.secondScale.status.${state.id}`,
  img: "icons/svg/aura.svg",
  description: `COC2BASE.secondScale.status.${state.id}Description`,
  changes: secondScaleStateChanges(state.id),
}))

/**
 * États de la seconde échelle indexés par id, pour la configuration publique du module.
 * Les objets sont ceux de SECOND_SCALE_STATUS_EFFECTS : muter un nom ici le mute partout.
 */
export const SECOND_SCALE_STATES = Object.fromEntries(SECOND_SCALE_STATUS_EFFECTS.map((effect) => [effect.id, effect]))

/**
 * Malus chiffrés des états préjudiciables COC2 (LdR ch. 4), par identifiant de statut du système.
 * Les valeurs de COF2 sont écrasées : la table COC2 diffère pour presque tous les états conservés.
 */
export const COC2_STATUS_CHANGES = {
  blind: { def: -5 },
  slowed: { init: -5, def: -5, melee: -5, ranged: -5, movement: 5 },
  immobilized: { def: -5, movement: 0 },
  unconscious: { def: -5, movement: 0 },
  surprised: { def: -5 },
  overturned: { def: -5, melee: -5, ranged: -5 },
  outOfBreath: { init: -2, def: -2, movement: 5 },
  asphyxie: { init: -5, def: -5 },
}

/** États préjudiciables de COF2 sans équivalent dans le livre de règles COC2 */
export const REMOVED_STATUS_IDS = ["weakened", "stun", "invalid", "paralysis"]

/**
 * États propres à COC2, absents de COF2. Libellés et descriptions suivent la convention
 * COC2BASE.status.<id> / <id>Description. Icônes core provisoires, comme pour l'échelle de santé.
 */
export const COC2_STATUS_EFFECTS = [
  { id: "asphyxie", img: "icons/svg/silenced.svg" },
  { id: "fatigue", img: "icons/svg/sleep.svg" },
  { id: "epuise", img: "icons/svg/downgrade.svg" },
]

/**
 * Malus proposés à cocher dans les fenêtres de jet, par identifiant de statut.
 * Ils couvrent ce qu'un ActiveEffect ne peut pas exprimer : « à toutes les actions », « à tous les
 * tests », « aux actions basées sur la vue ». Les poser sur les caractéristiques baisserait aussi la
 * DEF et les attaques qui en dérivent, d'où ce canal, où le joueur arbitre au cas par cas.
 * abilities absent = proposé sur toutes les caractéristiques.
 */
export const STATE_TEST_MALUS = {
  // États de santé : le livre de règles limite leur malus aux actions physiques
  ...Object.fromEntries(
    Object.entries(HEALTH_STATE_MALUS).map(([id, malus]) => [id, { malus, abilities: PHYSICAL_ABILITIES, hint: "COC2BASE.healthScale.malusHint" }]),
  ),
  fatigue: { malus: -2 },
  epuise: { malus: -5 },
  asphyxie: { malus: -5, hint: "COC2BASE.status.hint.actions" },
  blind: { malus: -10, hint: "COC2BASE.status.hint.sight" },
}

/**
 * Reconstruit la liste des statuts pour COC2 : retire les états absents du livre de règles, réécrit
 * les malus des états conservés, puis ajoute les états propres à COC2 et ceux de l'échelle de santé.
 * Les entrées modifiées sont recopiées et non mutées : le tableau du système reste intact, désactiver
 * le module restaure la liste COF2.
 * À appeler depuis le hook init, avant le hook i18nInit du système qui localise et trie la liste.
 * @returns {Array<object>} Nouvelle valeur de CONFIG.statusEffects
 */
export function buildStatusEffects() {
  const kept = CONFIG.statusEffects
    .filter((effect) => !REMOVED_STATUS_IDS.includes(effect.id))
    .map((effect) => (COC2_STATUS_CHANGES[effect.id] ? { ...effect, changes: buildChanges(COC2_STATUS_CHANGES[effect.id]) } : effect))

  const added = COC2_STATUS_EFFECTS.map(({ id, img }) => ({
    id,
    img,
    name: `COC2BASE.status.${id}`,
    description: `COC2BASE.status.${id}Description`,
    changes: buildChanges(COC2_STATUS_CHANGES[id]),
  }))

  return [...kept, ...added, ...HEALTH_STATUS_EFFECTS, ...SECOND_SCALE_STATUS_EFFECTS]
}

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
 * Lignes de malus à proposer dans la fenêtre de jet d'un test de caractéristique, pour les états
 * actifs sur l'acteur. Le système affiche ces lignes décochées : c'est au joueur de les appliquer
 * quand le test entre bien dans le champ de l'état, ce qui évite notamment de pénaliser les tests de
 * CON que les états de santé imposent eux-mêmes.
 * @param {Actor} actor Acteur qui effectue le test
 * @param {string} ability Caractéristique testée
 * @returns {Array<object>} Bonus au format attendu par les fenêtres de jet
 */
export function getStateSkillBonuses(actor, ability) {
  const bonuses = []

  for (const [id, entry] of Object.entries(STATE_TEST_MALUS)) {
    if (!entry.malus || !actor.statuses.has(id)) continue
    if (entry.abilities && !entry.abilities.includes(ability)) continue

    // Après le hook i18nInit du système les noms sont déjà localisés ; localize les laisse alors inchangés
    const name = game.i18n.localize(CONFIG.statusEffects.find((effect) => effect.id === id)?.name ?? id)
    bonuses.push({
      sourceType: "coc2State",
      name,
      description: name,
      pathName: game.i18n.localize("COC2BASE.status.pathName"),
      hasPathName: true,
      value: entry.malus,
      additionalInfos: entry.hint ? game.i18n.localize(entry.hint) : "",
    })
  }

  return bonuses
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

/**
 * Retourne l'id de l'état de la seconde échelle atteint pour un nombre d'échelons cochés, ou null si aucun.
 * Contrairement à l'échelle de santé, la valeur stockée est déjà le nombre d'échelons cochés.
 * @param {number} checked Nombre d'échelons cochés (attributes.secondScale.value)
 * @param {number} max Taille de l'échelle
 * @returns {string|null}
 */
export function getSecondScaleState(checked, max) {
  let current = null
  for (const state of SECOND_SCALE.states) {
    if (checked >= Math.ceil(state.threshold * max)) current = state.id
  }
  return current
}

/**
 * Pose/retire automatiquement les statuts d'état de la seconde échelle selon sa nouvelle valeur.
 * Seul l'état le plus grave atteint est actif ; seuls les statuts posés par cette automatisation sont retirés.
 * @param {Actor} actor
 * @param {number} newValue Nouveau nombre d'échelons cochés (attributes.secondScale.value)
 * @param {number} max Taille de l'échelle
 */
export async function applySecondScaleStatuses(actor, newValue, max) {
  const target = getSecondScaleState(newValue, max)
  for (const state of SECOND_SCALE.states) {
    const active = actor.statuses.has(state.id)
    if (state.id === target && !active) {
      await actor.toggleStatusEffect(state.id, { active: true })
      await actor.setFlag("coc2-base", `statuses.${state.id}FromSecondScale`, true)
    } else if (state.id !== target && active && actor.getFlag("coc2-base", `statuses.${state.id}FromSecondScale`)) {
      await actor.toggleStatusEffect(state.id, { active: false })
      await actor.unsetFlag("coc2-base", `statuses.${state.id}FromSecondScale`)
    }
  }
}
