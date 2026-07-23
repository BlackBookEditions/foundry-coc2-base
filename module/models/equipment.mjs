import EquipmentData from "../../../../systems/co2/module/models/equipment.mjs"
import { computeAutoCriticalBonus } from "../config/coc2.mjs"

/**
 * Data model des équipements COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain.
 *
 * En COC2, le port d'une protection n'est plus conditionné par une maîtrise et ne plafonne plus l'agilité :
 * il impose un malus fixe d'encombrement à l'Initiative, à l'AGI et à l'attaque au contact (ATC).
 * Ce malus est une donnée propre à chaque protection (ex. −2 gilet souple, −4 gilet rigide/plaques),
 * indépendante de la valeur de protection, d'où un champ dédié `encumbrance`.
 *
 * Une réussite critique n'y double pas non plus les dommages : elle ajoute le bonus critique (BC) de
 * l'arme, égal au maximum de son dé de dommages, d'où un champ dédié `criticalBonus`.
 */
export default class COC2EquipmentData extends EquipmentData {
  /**
   * Ajoute :
   *  - `encumbrance` : malus fixe d'encombrement de la protection (valeur positive, appliquée en négatif) ;
   *  - `criticalBonus` : bonus critique de l'arme. Nullable : laissé vide, il est déduit du dé de dommages.
   * @inheritDoc
   */
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      encumbrance: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      criticalBonus: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
    })
  }

  /**
   * Bonus critique effectif de l'arme : la valeur saisie, ou à défaut le maximum de son dé de dommages.
   * Les armes du livre de règles suivent toutes le calcul automatique ; le champ n'existe que pour les
   * cas particuliers (armes exotiques, matériel dont la fiche technique impose une autre valeur).
   * @returns {number} Le bonus critique, 0 si l'équipement n'est pas une arme
   */
  get criticalBonusValue() {
    if (!this.isWeapon) return 0
    if (Number.isFinite(this.criticalBonus)) return this.criticalBonus
    return computeAutoCriticalBonus(this.damage)
  }

  /**
   * Malus d'encombrement COC2 : on rebranche le getter du système sur le champ dédié `encumbrance`.
   * Le getter `malusFromArmor` de l'acteur co2 lit `armor.system.overloadMalus` ; en le surchargeant ici,
   * le malus d'AGI sur les jets de compétence (rollSkill) utilise la valeur COC2 sans autre modification,
   * et sert de source unique aux malus d'Init et d'ATC appliqués par COC2CharacterData.
   * @returns {number} Le malus d'encombrement (armure/bouclier uniquement), 0 sinon.
   * @override
   */
  get overloadMalus() {
    if (!this.isArmor && !this.isShield) return 0
    return this.encumbrance
  }
}
