/*
 * Adversaires COC2 : archétypes humains (Figurant / Second rôle / Premier rôle), table des créatures par
 * TAI, et profil de référence qui unifie les deux — source unique consommée par le data model
 * (pré-remplissage, droit au critique) et par la fiche (compteurs et rappels de création).
 */

/**
 * Valeur d'un « bonus » de caractéristique d'adversaire : le livre de règles raisonne en nombre de
 * caractéristiques « à +2 ». On convertit en points totaux pour gérer nativement le cumul autorisé au
 * Premier rôle (deux +2 fusionnés en un +4).
 */
export const ABILITY_BONUS_VALUE = 2

/**
 * Archétypes d'adversaires humains (LdR ch. « Les adversaires »). L'importance narrative détermine
 * toutes les valeurs mécaniques : caractéristiques bonifiées, DEF et Init. fixes, points de capacité,
 * longueur de l'échelle de santé et droit au critique.
 * healthScale.pulp : échelles raccourcies de l'ambiance « action décomplexée », commandées par le
 * réglage de monde `pulpHealthScales`. Le Premier rôle y gagne au contraire une échelle allongée,
 * pour des combats de boss plus épiques.
 */
export const ENCOUNTER_ARCHETYPES = {
  figurant: {
    id: "figurant",
    label: "COC2BASE.encounter.archetype.figurant",
    abilityBonuses: 1,
    capacityPoints: 1,
    def: 10,
    init: 10,
    canCrit: false,
    healthScale: { standard: 20, pulp: 4 },
  },
  secondRole: {
    id: "secondRole",
    label: "COC2BASE.encounter.archetype.secondRole",
    abilityBonuses: 3,
    capacityPoints: 3,
    def: 12,
    init: 12,
    canCrit: false,
    healthScale: { standard: 20, pulp: 12 },
  },
  premierRole: {
    id: "premierRole",
    label: "COC2BASE.encounter.archetype.premierRole",
    abilityBonuses: 5,
    capacityPoints: 5,
    def: 15,
    init: 15,
    canCrit: true,
    healthScale: { standard: 20, pulp: 24 },
  },
}

/**
 * Créatures non humaines : la taille (TAI) détermine toutes les valeurs de base (LdR, création des
 * créatures). Les clés sont celles de SYSTEM.SIZES, seuls les libellés changent en COC2 (cf.
 * COC2_SIZE_LABELS). DEF et Init. partagent une valeur unique (defInit).
 * healthScale : fourchette [min, max] recommandée, le pré-remplissage retenant le minimum.
 * maxPerAbility : plafond par caractéristique ; null = aucun plafond (Gigantesque, « 12 et + »).
 */
export const CREATURE_SIZES = {
  tiny: { id: "tiny", abilityPoints: 0, maxPerAbility: 0, meleeDamage: "", defInit: 18, stealth: 10, healthScale: [1, 1] },
  verySmall: { id: "verySmall", abilityPoints: 2, maxPerAbility: 2, meleeDamage: "1d2", defInit: 16, stealth: 5, healthScale: [4, 8] },
  small: { id: "small", abilityPoints: 4, maxPerAbility: 4, meleeDamage: "1d4", defInit: 14, stealth: 2, healthScale: [12, 16] },
  medium: { id: "medium", abilityPoints: 6, maxPerAbility: 6, meleeDamage: "1d6", defInit: 12, stealth: 0, healthScale: [20, 24] },
  large: { id: "large", abilityPoints: 8, maxPerAbility: 8, meleeDamage: "1d8", defInit: 10, stealth: -2, healthScale: [28, 36] },
  huge: { id: "huge", abilityPoints: 10, maxPerAbility: 10, meleeDamage: "1d10", defInit: 8, stealth: -5, healthScale: [40, 56] },
  colossal: { id: "colossal", abilityPoints: 12, maxPerAbility: null, meleeDamage: "1d12", defInit: 6, stealth: -10, healthScale: [60, 60] },
}

/**
 * Libellés des tailles en nomenclature COC2, injectés dans game.system.CONST.SIZES au hook init.
 * Les clés du système sont conservées (le champ details.size les valide via `choices`, et
 * SYSTEM.TOKEN_SIZE les utilise) : seuls les libellés changent — « Énorme » devient « Très grand »
 * et « Colossale » devient « Gigantesque », les autres passant au masculin.
 */
export const COC2_SIZE_LABELS = Object.fromEntries(Object.keys(CREATURE_SIZES).map((id) => [id, `COC2BASE.size.${id}`]))

/**
 * Archétype d'un adversaire, lu depuis CONFIG pour rester surchargeable par un module d'univers.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} L'archétype, ou null si aucun n'est renseigné
 */
export function getEncounterArchetype(system) {
  const id = system.details?.archetype
  if (!id) return null
  return CONFIG.COC2BASE.encounterArchetypes[id] ?? null
}

/**
 * Ligne de la table des créatures correspondant à la taille d'un adversaire.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} La ligne de la table, ou null si la taille est inconnue
 */
export function getCreatureSize(system) {
  const id = system.details?.size
  if (!id) return null
  return CONFIG.COC2BASE.creatureSizes[id] ?? null
}

/**
 * Profil de référence d'un adversaire : source unique des valeurs attendues, consommée par le data
 * model (pré-remplissage, critique) et par la fiche (compteurs et rappels).
 * L'archétype prime : renseigné, l'adversaire suit les règles des humains ; vide, il suit la table
 * des créatures pilotée par la TAI. La taxonomie details.category (héritée de COF2) n'entre pas en
 * jeu, elle est trop floue en contemporain pour arbitrer.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} Profil normalisé, ou null si ni archétype ni taille connue
 */
export function getEncounterProfile(system) {
  const archetype = getEncounterArchetype(system)
  if (archetype) {
    const pulp = game.settings.get("coc2-base", "pulpHealthScales")
    const hpBase = pulp ? archetype.healthScale.pulp : archetype.healthScale.standard
    return {
      kind: "archetype",
      id: archetype.id,
      label: archetype.label,
      def: archetype.def,
      init: archetype.init,
      hpBase,
      hpRange: [hpBase, hpBase],
      abilityPoints: archetype.abilityBonuses * ABILITY_BONUS_VALUE,
      maxPerAbility: null,
      capacityPoints: archetype.capacityPoints,
      canCrit: archetype.canCrit,
      stealth: null,
      meleeDamage: "",
    }
  }

  const size = getCreatureSize(system)
  if (!size) return null
  return {
    kind: "creature",
    id: size.id,
    label: game.system.CONST.SIZES[size.id],
    def: size.defInit,
    init: size.defInit,
    hpBase: size.healthScale[0],
    hpRange: size.healthScale,
    abilityPoints: size.abilityPoints,
    maxPerAbility: size.maxPerAbility,
    // Le livre de règles ne fixe pas de budget de capacités aux créatures : le compteur ne s'applique pas
    capacityPoints: null,
    canCrit: true,
    stealth: size.stealth,
    meleeDamage: size.meleeDamage,
  }
}
