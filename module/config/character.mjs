/*
 * Création de personnage COC2 : tranches d'âge (budget de points de capacité, nombre de voies et rang
 * maximum) et plafond des traits distinctifs.
 */

/** Plafond de points d'avantages (et autant de désavantages) à la création */
export const TRAIT_POINTS_MAX = 5

/**
 * Tranches d'âge : déterminent le budget de points de capacité, le nombre de voies et le rang
 * de voie maximum accessibles à la création.
 * capacityPoints alimente attributes.xp.max ; maxPaths et maxRank ne sont que signalés (compteur
 * de l'onglet Voies et avertissement à l'achat), jamais bloquants.
 */
export const AGE_BRACKETS = {
  jeune: {
    id: "jeune",
    label: "COC2BASE.age.jeune",
    capacityPoints: 4,
    maxPaths: 4,
    maxRank: 2,
  },
  adulte: {
    id: "adulte",
    label: "COC2BASE.age.adulte",
    capacityPoints: 7,
    maxPaths: 5,
    maxRank: 3,
  },
  experimente: {
    id: "experimente",
    label: "COC2BASE.age.experimente",
    capacityPoints: 10,
    maxPaths: 6,
    maxRank: 4,
  },
}

/**
 * Tranche d'âge d'un personnage, lue depuis CONFIG pour rester surchargeable par un module d'univers.
 * @param {object} system Le data model du personnage
 * @returns {object|null} La tranche d'âge, ou null si aucune n'est renseignée
 */
export function getAgeBracket(system) {
  const id = system.details?.ageBracket
  if (!id) return null
  return CONFIG.COC2BASE.ageBrackets[id] ?? null
}
