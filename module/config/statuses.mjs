import { buildChanges } from "./effect-changes.mjs"
import { HEALTH_STATE_MALUS, HEALTH_STATUS_EFFECTS, PHYSICAL_ABILITIES } from "./health-scale.mjs"

/*
 * États préjudiciables COC2 : réécriture de la liste héritée de COF2 (retraits, malus, textes), états
 * propres à COC2, et lignes de malus proposées dans les fenêtres de jet.
 *
 * Dépend de health-scale.mjs (les quatre états de santé rejoignent la liste des statuts et la table des
 * malus de test) — jamais l'inverse.
 */

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

/** Textes COC2 des états communs dont les effets diffèrent de la base COF2. */
export const COC2_STATUS_OVERRIDES = {
  blind: { description: "COC2BASE.status.blindDescription" },
  immobilized: { description: "COC2BASE.status.immobilizedDescription" },
  unconscious: { description: "COC2BASE.status.unconsciousDescription" },
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
export function buildStatusEffects(profile = CONFIG.COC2BASE, baseStatusEffects = CONFIG.statusEffects) {
  const removedStatusIds = profile.removedStatusIds ?? REMOVED_STATUS_IDS
  const statusChanges = profile.statusChanges ?? COC2_STATUS_CHANGES
  const statusOverrides = profile.statusOverrides ?? COC2_STATUS_OVERRIDES
  const additionalStatusEffects = profile.additionalStatusEffects ?? COC2_STATUS_EFFECTS

  const kept = baseStatusEffects
    .filter((effect) => !removedStatusIds.includes(effect.id))
    .map((effect) => ({
      ...effect,
      ...(statusOverrides[effect.id] ?? {}),
      ...(statusChanges[effect.id] ? { changes: buildChanges(statusChanges[effect.id]) } : {}),
    }))

  const added = additionalStatusEffects.map(({ id, img }) => ({
    id,
    img,
    name: `COC2BASE.status.${id}`,
    description: `COC2BASE.status.${id}Description`,
    changes: buildChanges(statusChanges[id]),
  }))

  return [...kept, ...added, ...HEALTH_STATUS_EFFECTS]
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
