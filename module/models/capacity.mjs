import CapacityData from "../../../../systems/co2/module/models/capacity.mjs"

/**
 * Data model des capacités COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain
 */
export default class COC2CapacityData extends CapacityData {
  /**
   * RULE : un point de capacité permet d'acheter un rang dans une voie, quel que soit le rang.
   * COF2 facturait 2 points aux rangs 3 et plus.
   * @returns {number} Le coût en points de capacité
   * @override
   */
  getXpCost() {
    // Coût explicite porté par l'item : respecté tel quel, comme dans le système
    if (this.hasCost) return this.cost
    return 1
  }
}
