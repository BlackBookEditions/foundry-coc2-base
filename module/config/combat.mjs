/*
 * Résolution des dommages COC2 : minimum infligé par une attaque qui touche, et bonus critique (BC) qui
 * remplace le doublement des dommages de COF2.
 */

/**
 * Minimum de dommages infligés par une attaque qui touche : si les dommages tombent à zéro ou moins
 * à cause de malus de caractéristiques, 1 DM est toujours infligé (LdR, création des créatures).
 */
export const MINIMUM_DAMAGE = 1

/**
 * Repère les dés d'une formule de dommages. Une expression régulière plutôt que le parseur de Foundry :
 * la formule stockée sur un item peut contenir @arme.dmg, @rang ou un dé évolutif (d4°), que
 * `new Roll(...)` refuserait tant que ces valeurs ne sont pas résolues.
 */
const DICE_TERM_REGEX = /(\d*)[dD](\d+)/g

/**
 * Bonus critique déduit d'une formule de dommages : somme des résultats maximum de ses dés.
 * Les termes fixes (bonus de FOR/BDM, bonus d'arme) sont exclus, conformément au livre de règles :
 * le BC ne dépend que du dé de dommages. 1d8 → 8, 2d6 → 12, 1d4 (mains nues) → 4.
 * @param {string} formula La formule de dommages
 * @returns {number} Le bonus critique, 0 si la formule ne contient aucun dé
 */
export function computeAutoCriticalBonus(formula) {
  if (!formula) return 0
  let total = 0
  for (const [, number, faces] of String(formula).matchAll(DICE_TERM_REGEX)) {
    total += (parseInt(number) || 1) * (parseInt(faces) || 0)
  }
  return total
}

/**
 * Bonus critique effectif d'une attaque : la valeur saisie sur l'item si elle est renseignée, sinon
 * le calcul automatique à partir de la formule de dommages.
 * Le champ n'existe que sur les armes et les attaques (cf. COC2EquipmentData et COC2AttackData) ;
 * toute autre source de dommages (capacité, mains nues) retombe sur le calcul automatique.
 * @param {COItem} item L'item à l'origine de l'attaque
 * @param {string} damageFormula La formule de dommages de base, dés intacts
 * @returns {number} Le bonus critique à ajouter aux dommages
 */
export function getCriticalBonus(item, damageFormula) {
  const declared = item?.system?.criticalBonus
  if (Number.isFinite(declared)) return declared
  return computeAutoCriticalBonus(damageFormula)
}
