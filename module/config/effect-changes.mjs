/**
 * Traduction des malus chiffrés en `changes` d'ActiveEffect.
 *
 * Socle commun de l'échelle de santé (health-scale.mjs) et des états préjudiciables (statuses.mjs) :
 * ce fichier existe pour que ces deux modules partagent `buildChanges` sans dépendre l'un de l'autre.
 * Rien d'autre ne devrait l'importer.
 */

/** Champs visés par les malus chiffrés des états, dans l'ordre d'affichage des tooltips */
export const COMBAT_CHANGE_KEYS = {
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
export function buildChanges({ init, def, melee, ranged, movement } = {}) {
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
