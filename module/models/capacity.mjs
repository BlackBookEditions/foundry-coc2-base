import CapacityData from "../../../../systems/co2/module/models/capacity.mjs"

/**
 * Data model des capacités COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain
 */
export default class COC2CapacityData extends CapacityData {
  /**
   * RULE : le coût d'un rang dépend de la PHASE de vie où il est acheté.
   * - À la création (budget de la tranche d'âge), un point achète un rang, quel que soit le rang → coût 1.
   * - Une fois la création terminée, la progression par expérience coûte le numéro du rang visé (rang 1 → 1, rang 2 → 2, … rang 5 → 5).
   *
   * Tant que le personnage est en phase de création (aucun XP de séance gagné), TOUT rang coûte 1 point,
   * quelle que soit la phase mémorisée sur la capacité : c'est le levier de correction du MJ, qui remet les
   * XP gagnés à 0 pour retarifer un build entier sans avoir à désapprendre puis réapprendre chaque capacité.
   *
   * Une fois la création quittée, la phase mémorisée par capacité à l'apprentissage tranche, via le flag
   * `coc2-base.learnedInPlay` (posé par COC2Actor.toggleCapacityLearned) : sans cette mémoire, l'entrée en
   * jeu re-tariferait rétroactivement tout le build de création. Flag absent → coût 1 (capacités apprises
   * avant cette évolution, ou apprises à la création).
   * @returns {number} Le coût en points de capacité
   * @override
   */
  getXpCost() {
    // Coût explicite porté par l'item : respecté tel quel, comme dans le système
    if (this.hasCost) return this.cost
    // Capacité hors voie : toujours 1 point
    if (this.path === null) return 1
    // isCreation n'existe que sur les personnages COC2 : adversaires et items hors acteur retombent sur le flag
    if (this.parent?.actor?.system?.isCreation) return 1
    const learnedInPlay = this.parent?.getFlag("coc2-base", "learnedInPlay") === true
    return learnedInPlay ? this.rank : 1
  }
}
