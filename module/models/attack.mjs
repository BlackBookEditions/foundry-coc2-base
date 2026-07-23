import AttackData from "../../../../systems/co2/module/models/attack.mjs"
import { computeAutoCriticalBonus } from "../config/coc2.mjs"

/**
 * Data model des attaques COC2 : les attaques naturelles des créatures portent leur propre bonus
 * critique (BC), que leur fiche technique précise explicitement — ainsi les griffes de « Celui qui
 * hante les ténèbres », 1d8+7 DM et BC +8. Un champ dédié est donc nécessaire : la valeur ne se
 * déduit pas toujours du dé de dommages, contrairement aux armes du commerce.
 */
export default class COC2AttackData extends AttackData {
  /**
   * Ajoute `criticalBonus` : bonus critique de l'attaque. Nullable : laissé vide, il est déduit du dé
   * de dommages de l'attaque.
   * @inheritDoc
   */
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      criticalBonus: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
    })
  }

  /**
   * Bonus critique effectif de l'attaque : la valeur saisie, ou à défaut le maximum de son dé de dommages.
   * La formule de référence est celle du premier résolveur de la première action, comme pour le getter
   * `damage` des équipements du système.
   * @returns {number} Le bonus critique
   */
  get criticalBonusValue() {
    if (Number.isFinite(this.criticalBonus)) return this.criticalBonus
    return computeAutoCriticalBonus(this.displayValues.damage)
  }
}
