import CharacterData from "../../../../systems/co2/module/models/character.mjs"
import Utils from "../../../../systems/co2/module/helpers/utils.mjs"
import { HEALTH_SCALE, applyHealthScaleStatuses } from "../config/coc2.mjs"

/**
 * Data model des personnages COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain
 */
export default class COC2CharacterData extends CharacterData {
  /**
   * Ajoute attributes.xp.earned : XP gagnés en séances (1 par séance), seule source de progression en COC2
   * @inheritDoc
   */
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = super.defineSchema()

    const xp = schema.attributes.fields.xp
    const earned = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
    earned.name = "earned"
    earned.parent = xp
    xp.fields.earned = earned

    // Tranche d'âge : détermine les quotas de voies et de caractéristiques à la création (informatif)
    const details = schema.details
    const ageBracket = new fields.StringField({ required: true, blank: true, initial: "" })
    ageBracket.name = "ageBracket"
    ageBracket.parent = details
    details.fields.ageBracket = ageBracket

    return schema
  }

  /**
   * Progression COC2 : pas de niveaux, le plafond d'XP dépensables est le total gagné en séances
   * @inheritDoc
   */
  prepareDerivedData() {
    super.prepareDerivedData()
    this.attributes.xp.max = this.attributes.xp.earned
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const stats = this.parent._stats
    // Pour un acteur neuf, l'échelle de santé démarre vide : santé restante au maximum
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource && !foundry.utils.hasProperty(data, "system.attributes.hp")) {
      this.parent.updateSource({ "system.attributes.hp.value": HEALTH_SCALE.max })
    }
  }

  /**
   * Échelle de santé COC2 : remplace la pose des statuts affaibli/inconscient de COF2
   * par les états préjudiciables (contusionné, blessé, gravement blessé, mourant)
   * @inheritDoc
   */
  async _preUpdate(changes, options, user) {
    if (!foundry.utils.hasProperty(changes, "system.attributes.hp.value")) return
    await applyHealthScaleStatuses(this.parent, changes.system.attributes.hp.value, this.attributes.hp.max)
  }

  /**
   * Échelle de santé COC2 : 20 échelons fixes, sans niveau ni PV de profil.
   * Les bonus et modifiers hp restent appliqués pour permettre une échelle étendue.
   * @override
   */
  _prepareHPMax() {
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)
    const hpMaxModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "hp")

    this.attributes.hp.base = HEALTH_SCALE.max
    this.attributes.hp.max = this.attributes.hp.base + hpMaxBonuses + hpMaxModifiers.total
    this.attributes.hp.tooltip = Utils.getTooltip("Échelle de santé", this.attributes.hp.base).concat(hpMaxModifiers.tooltip, Utils.getTooltip("Bonus", hpMaxBonuses))

    if (this.attributes.hp.value > this.attributes.hp.max) this.attributes.hp.value = this.attributes.hp.max
  }

  /**
   * Initiative COC2 : 10 + INT + PER
   * @param {*} skill
   * @param {*} abilityBonus Valeur de la perception
   * @param {*} bonuses
   */
  _prepareInit(skill, abilityBonus, bonuses) {
    super._prepareInit(skill, abilityBonus, bonuses)

    const intValue = this.abilities.int.value
    skill.base += intValue
    skill.value += intValue
    const intTooltip = Utils.getTooltip(Utils.getAbilityName("int"), intValue)
    skill.tooltipBase = skill.tooltipBase.concat(intTooltip)
    skill.tooltipValue = skill.tooltipValue.concat(intTooltip)
  }

  /**
   * Défense COC2 : 10 + AGI + PER + armure + bouclier
   * @param {*} skill
   * @param {*} abilityBonus Valeur de l'agilité
   * @param {*} bonuses
   */
  _prepareDef(skill, abilityBonus, bonuses) {
    super._prepareDef(skill, abilityBonus, bonuses)

    const perValue = this.abilities.per.value
    skill.base += perValue
    skill.value += perValue
    const perTooltip = Utils.getTooltip(Utils.getAbilityName("per"), perValue)
    skill.tooltipBase = skill.tooltipBase.concat(perTooltip)
    skill.tooltipValue = skill.tooltipValue.concat(perTooltip)
  }
}
