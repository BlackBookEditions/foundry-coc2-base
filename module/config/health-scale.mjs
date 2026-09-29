import { buildChanges } from "./effect-changes.mjs"

/*
 * Échelle de santé COC2 : constantes de l'échelle, statuts des quatre états, lecture de l'état courant,
 * contexte de rendu du ruban et actions qui écrivent sur l'acteur (clic sur un échelon, repos hebdomadaire).
 */

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
 * Base de la capacité de guérison (CG) : CG = CON + 3.
 * La CG est le rythme naturel de récupération d'un personnage qui se repose et qui est stabilisé,
 * exprimé en points de dommages (échelons de l'échelle de santé) récupérés par semaine.
 * Exposée dans CONFIG.COC2BASE.healingCapacityBase et lue au calcul : surchargeable à tout moment.
 */
export const HEALING_CAPACITY_BASE = 3

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

/**
 * Contexte de rendu du ruban de l'échelle de santé, partagé par la fiche complète et la Vue actions.
 * Réutilise attributes.hp : échelons cochés = hp.max - hp.value.
 * @param {Actor} actor
 * @returns {{ healthDamage: number, healthScale: Array<object>, healthStateId: string|null, healthStateLabel: string|null }}
 */
export function getHealthScaleContext(actor) {
  const max = actor.system.attributes.hp.max
  const damage = max - actor.system.attributes.hp.value
  const stateLabels = HEALTH_STATUS_EFFECTS.reduce((obj, effect) => {
    obj[effect.id] = game.i18n.localize(effect.name)
    return obj
  }, {})
  const thresholds = HEALTH_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * max), id: state.id }))

  const healthScale = Array.fromRange(max, 1).map((echelon) => {
    const milestone = thresholds.find((t) => t.echelon === echelon)
    return {
      echelon,
      filled: echelon <= damage,
      milestone: !!milestone,
      state: milestone?.id ?? "",
      tooltip: milestone ? `${echelon} — ${stateLabels[milestone.id]}` : String(echelon),
    }
  })

  const currentState = getHealthState(damage, max)
  return {
    healthDamage: damage,
    healthScale,
    healthStateId: currentState,
    healthStateLabel: currentState ? stateLabels[currentState] : null,
  }
}

/**
 * Coche/décoche l'échelle de santé jusqu'à l'échelon cliqué (ou décoche le dernier échelon coché).
 * Partagé par la fiche complète et la Vue actions.
 * @param {Actor} actor
 * @param {number} echelon Échelon cliqué
 */
export async function updateHealthScale(actor, echelon) {
  const max = actor.system.attributes.hp.max
  const damage = max - actor.system.attributes.hp.value
  const newDamage = echelon === damage ? echelon - 1 : echelon
  await actor.update({ "system.attributes.hp.value": max - newDamage })
}

/**
 * Repos d'une semaine : décoche CG échelons de l'échelle de santé (soit hp.value + CG, plafonné au max).
 * Les états préjudiciables devenus caducs sont retirés par _preUpdate du data model (applyHealthScaleStatuses).
 * La règle suppose un personnage stabilisé et au repos : c'est au MJ d'en juger, le bouton n'impose rien.
 * @param {Actor} actor
 */
export async function applyWeeklyRest(actor) {
  const { value, max } = actor.system.attributes.hp
  if (value >= max) return ui.notifications.info(game.i18n.localize("COC2BASE.recovery.restNoInjury"))

  const newValue = Math.min(max, value + actor.system.attributes.cg.value)
  await actor.update({ "system.attributes.hp.value": newValue })
  ui.notifications.info(game.i18n.format("COC2BASE.recovery.restDone", { healed: newValue - value }))
}
