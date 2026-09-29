/*
 * Seconde échelle COC2 (« Échelle », devenue « Échelle de conscience » dans un module d'univers) :
 * constantes de l'échelle, profil de modificateurs configurable par le MJ, lecture du palier courant,
 * contexte de rendu du ruban et action qui écrit sur l'acteur.
 *
 * Contrairement à l'échelle de santé, aucun statut n'est posé sur le token : les paliers ne servent
 * qu'à afficher un libellé et à proposer des lignes de bonus/malus dans les fenêtres de jet.
 */

/**
 * Seconde échelle COC2 (« Échelle » dans coc2-base, « Échelle de conscience » dans un module d'univers).
 * Compteur de 20 échelons avec 4 paliers à seuils (échelons 5/10/15/20). Les paliers servent
 * UNIQUEMENT à afficher un libellé de niveau sur la fiche : ce ne sont PAS des statuts, rien n'est
 * ajouté à CONFIG.statusEffects ni posé sur le token. Affichage commandé par le réglage
 * `showSecondScale` (ou le flag `CONFIG.COC2BASE.secondScale.forced`).
 * Le stockage utilise attributes.secondScale.value = nombre d'échelons cochés (0 = échelle vide).
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
 * Libellés des paliers de la seconde échelle (nom du niveau atteint sur la fiche et infobulles).
 * Ce ne sont pas des statuts Foundry. Les libellés et le profil de modificateurs sont surchargeables
 * via CONFIG.COC2BASE.secondScale (cf. CTH : Profane/Initié/…).
 */
export const SECOND_SCALE_STATES = Object.fromEntries(
  SECOND_SCALE.states.map((state) => [
    state.id,
    { id: state.id, name: `COC2BASE.secondScale.status.${state.id}`, description: `COC2BASE.secondScale.status.${state.id}Description` },
  ]),
)

export const SECOND_SCALE_STATE_IDS = SECOND_SCALE.states.map((state) => state.id)

/**
 * Profil neutre de l'Échelle d'évolution. Les valeurs standard sont préremplies, mais aucune
 * caractéristique n'est ciblée tant que le MJ ne l'a pas configurée.
 */
export const DEFAULT_SECOND_SCALE_MODIFIER_PROFILE = {
  bonus: {
    ability: "",
    label: "COC2BASE.secondScale.modifiers.bonusContext",
    contextId: "",
    values: { secondState1: 1, secondState2: 3, secondState3: 5, secondState4: 10 },
  },
  malus: {
    ability: "",
    label: "COC2BASE.secondScale.modifiers.malusContext",
    contextId: "",
    values: { secondState1: -1, secondState2: -3, secondState3: -5, secondState4: -10 },
  },
}

/**
 * Normalise un profil issu des réglages ou d'un module d'univers.
 * @param {object} profile Profil brut.
 * @returns {object} Profil complet avec valeurs entières et signes cohérents.
 */
export function normalizeSecondScaleModifierProfile(profile = {}) {
  const normalizeSide = (side, sign) => {
    const source = profile[side] ?? {}
    const defaults = DEFAULT_SECOND_SCALE_MODIFIER_PROFILE[side]
    const values = Object.fromEntries(
      SECOND_SCALE_STATE_IDS.map((id) => {
        const parsed = Number(source.values?.[id] ?? defaults.values[id])
        const integer = Number.isFinite(parsed) ? Math.trunc(parsed) : defaults.values[id]
        return [id, sign > 0 ? Math.max(0, integer) : Math.min(0, integer)]
      }),
    )
    return {
      ability: typeof source.ability === "string" ? source.ability : "",
      label: typeof source.label === "string" && source.label.trim() ? source.label.trim() : defaults.label,
      contextId: typeof source.contextId === "string" ? source.contextId : "",
      values,
    }
  }

  return { bonus: normalizeSide("bonus", 1), malus: normalizeSide("malus", -1) }
}

/** Retourne le preset d'univers, ou à défaut le profil configuré dans le monde COC2. */
export function getSecondScaleModifierProfile() {
  const preset = CONFIG.COC2BASE.secondScale.modifierProfile
  if (preset) return normalizeSecondScaleModifierProfile(preset)
  const key = "coc2-base.secondScaleModifiers"
  const stored = game.settings.settings.has(key) ? game.settings.get("coc2-base", "secondScaleModifiers") : DEFAULT_SECOND_SCALE_MODIFIER_PROFILE
  return normalizeSecondScaleModifierProfile(stored)
}

/** Indique si la seconde échelle est active mécaniquement et visuellement. */
export function isSecondScaleEnabled() {
  return CONFIG.COC2BASE.secondScale.forced || game.settings.get("coc2-base", "showSecondScale")
}

/** Personnages et antagonistes humains peuvent recevoir les modificateurs ; les créatures sont exclues. */
export function canUseSecondScaleModifiers(actor) {
  if (!actor?.system?.attributes?.secondScale) return false
  if (actor.type === "character") return true
  return actor.type === "encounter" && !!actor.system.details?.archetype
}

/**
 * Construit les lignes contextuelles proposées dans un test de caractéristique.
 * @param {Actor} actor Acteur qui effectue le test.
 * @param {string} ability Caractéristique testée.
 * @param {object} options Contexte transmis par rollSkill.
 * @returns {Array<object>} Lignes au format Actor#getSkillBonuses.
 */
export function getSecondScaleSkillBonuses(actor, ability, { rollType, skillContexts = [] } = {}) {
  if (rollType !== "skill" || !isSecondScaleEnabled() || !canUseSecondScaleModifiers(actor)) return []

  const attributes = actor.system.attributes.secondScale
  const stateId = getSecondScaleState(attributes.value, attributes.max)
  if (!stateId) return []

  const cfg = CONFIG.COC2BASE.secondScale
  const stateName = game.i18n.localize(cfg.states[stateId].name)
  const profile = getSecondScaleModifierProfile()
  const contexts = new Set(skillContexts)

  return [profile.bonus, profile.malus]
    .filter((entry) => entry.ability === ability && entry.values[stateId] !== 0)
    .map((entry) => ({
      sourceType: "coc2SecondScale",
      name: stateName,
      description: stateName,
      pathName: game.i18n.localize(cfg.label),
      hasPathName: true,
      value: entry.values[stateId],
      additionalInfos: game.i18n.localize(entry.label),
      selected: !!entry.contextId && contexts.has(entry.contextId),
    }))
}

/** Résumé localisé des modificateurs d'un palier, destiné aux infobulles de l'échelle. */
export function getSecondScaleModifierSummary(stateId) {
  const profile = getSecondScaleModifierProfile()
  return [profile.bonus, profile.malus]
    .filter((entry) => entry.ability && entry.values[stateId] !== 0)
    .map((entry) => {
      const value = entry.values[stateId]
      const ability = game.i18n.localize(`CO.abilities.long.${entry.ability}`)
      const context = game.i18n.localize(entry.label)
      return `${value > 0 ? "+" : ""}${value} ${ability}${context ? ` (${context})` : ""}`
    })
    .join(" · ")
}

/**
 * Retourne l'id du palier de la seconde échelle atteint pour un nombre d'échelons cochés, ou null si aucun.
 * Sert uniquement à l'affichage du libellé de niveau sur la fiche (aucun statut posé sur le token).
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
 * Contexte de rendu du ruban de la seconde échelle, partagé par la fiche complète et la Vue actions.
 * Affichée si le réglage `showSecondScale` est actif ou si un module d'univers la force ; renvoie
 * `{ showSecondScale: false }` sinon. Libellés lus depuis CONFIG.COC2BASE.secondScale (surchargeables).
 * @param {Actor} actor
 * @returns {object}
 */
export function getSecondScaleContext(actor) {
  const secondScaleConfig = CONFIG.COC2BASE.secondScale
  const showSecondScale = isSecondScaleEnabled()
  if (!showSecondScale) return { showSecondScale: false }

  const scaleMax = actor.system.attributes.secondScale.max
  const checked = actor.system.attributes.secondScale.value
  const secondStateLabels = Object.fromEntries(Object.entries(secondScaleConfig.states).map(([id, state]) => [id, game.i18n.localize(state.name)]))
  const secondThresholds = SECOND_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * scaleMax), id: state.id }))

  const modifierSummaries = Object.fromEntries(SECOND_SCALE_STATE_IDS.map((id) => [id, getSecondScaleModifierSummary(id)]))
  const secondScale = Array.fromRange(scaleMax, 1).map((echelon) => {
    const milestone = secondThresholds.find((t) => t.echelon === echelon)
    return {
      echelon,
      filled: echelon <= checked,
      milestone: !!milestone,
      state: milestone?.id ?? "",
      tooltip: milestone
        ? `${echelon} — ${secondStateLabels[milestone.id]}${modifierSummaries[milestone.id] ? ` · ${modifierSummaries[milestone.id]}` : ""}`
        : String(echelon),
    }
  })

  const secondCurrentState = getSecondScaleState(checked, scaleMax)
  return {
    showSecondScale: true,
    secondScaleValue: checked,
    secondScaleMax: scaleMax,
    secondScaleLabel: game.i18n.localize(secondScaleConfig.label),
    secondScaleShort: game.i18n.localize(secondScaleConfig.labelShort),
    secondScale,
    secondScaleStateId: secondCurrentState,
    secondScaleStateLabel: secondCurrentState ? secondStateLabels[secondCurrentState] : null,
  }
}

/**
 * Coche/décoche la seconde échelle jusqu'à l'échelon cliqué (ou décoche le dernier échelon coché).
 * La valeur stockée est directement le nombre d'échelons cochés (0 = échelle vide).
 * Partagé par la fiche complète et la Vue actions.
 * @param {Actor} actor
 * @param {number} echelon Échelon cliqué
 */
export async function updateSecondScale(actor, echelon) {
  const value = actor.system.attributes.secondScale.value
  const newValue = echelon === value ? echelon - 1 : echelon
  await actor.update({ "system.attributes.secondScale.value": newValue })
}
