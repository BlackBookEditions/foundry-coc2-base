import CharacterData from "../../../../systems/co2/module/models/character.mjs"
import Utils from "../../../../systems/co2/module/helpers/utils.mjs"
import { HEALTH_SCALE, applyHealthScaleStatuses, SECOND_SCALE, getAgeBracket } from "../config/coc2.mjs"

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

    // Seconde échelle : value = nombre d'échelons cochés (0 = échelle vide). max dérivé en prepareDerivedData.
    const attributes = schema.attributes
    const secondScale = new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
    })
    secondScale.name = "secondScale"
    secondScale.parent = attributes
    attributes.fields.secondScale = secondScale

    return schema
  }

  /**
   * Phase de création : le personnage n'a encore joué aucune séance. Les plafonds de voies et de rang
   * de la tranche d'âge ne sont signalés que pendant cette phase, la progression par XP étant libre ensuite.
   * @returns {boolean}
   */
  get isCreation() {
    return this.attributes.xp.earned === 0
  }

  /**
   * Progression COC2 : pas de niveaux, le plafond de points de capacité est la somme des points
   * accordés par la tranche d'âge à la création et des XP gagnés en séances
   * @inheritDoc
   */
  prepareDerivedData() {
    super.prepareDerivedData()
    this.attributes.xp.max = (getAgeBracket(this)?.capacityPoints ?? 0) + this.attributes.xp.earned

    // Seconde échelle : taille fixe issue de la config. TODO : bonus/modifiers d'échelle étendue, comme _prepareHPMax.
    this.attributes.secondScale.max = SECOND_SCALE.max
    if (this.attributes.secondScale.value > this.attributes.secondScale.max) this.attributes.secondScale.value = this.attributes.secondScale.max
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
    if (foundry.utils.hasProperty(changes, "system.attributes.hp.value")) {
      await applyHealthScaleStatuses(this.parent, changes.system.attributes.hp.value, this.attributes.hp.max)
    }
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
   * Caractéristiques COC2 : réécriture complète de la méthode du système pour supprimer le plafonnement
   * de l'AGI par l'armure (COF2 : max = 8 − DEF de l'armure). En COC2, le port d'une protection n'impose
   * plus de plafond d'AGI mais un malus fixe d'encombrement (cf. #applyArmorEncumbrance), appliqué à Init,
   * ATC et aux jets d'AGI. Le bloc de plafonnement n'étant pas isolable, on reprend la boucle du système
   * sans lui — même parti pris que _prepareAttack.
   * @override
   */
  _prepareAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      const bonuses = Object.values(ability.bonuses).reduce((prev, curr) => prev + curr)
      const abilityModifiers = this.computeTotalModifiersByTarget(this.abilityModifiers, key)

      // Prise en compte d'un modifier qui donne un dé bonus
      if (this.bonusDiceModifiers) {
        const bonusDice = this.bonusDiceModifiers.find((m) => m.target === key)
        if (bonusDice) ability.superior = true
      }

      ability.modifiers = abilityModifiers.total
      ability.value = ability.base + bonuses + ability.modifiers
      ability.tooltipValue = Utils.getTooltip(Utils.getAbilityName(key), ability.base).concat(abilityModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
    }
  }

  /**
   * Attaques COC2 : la valeur est strictement égale à la caractéristique (ATC = FOR, ATD = AGI),
   * sans le bonus de niveau de COF2 puisque les niveaux n'existent pas.
   * Réécriture complète de la méthode du système, dont le bonus de niveau n'est pas isolable.
   * L'attaque au contact (ATC) subit en plus le malus fixe d'encombrement de l'armure ; l'attaque à
   * distance (ATD) n'est pas concernée.
   * @param {string} key Clef de la valeur de combat : melee, ranged ou magic
   * @param {*} skill
   * @param {*} abilityBonus Valeur de la caractéristique associée
   * @param {*} bonuses Somme des bonus de la fiche et des active effects
   * @override
   */
  _prepareAttack(key, skill, abilityBonus, bonuses) {
    const combatModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, key)

    skill.base = abilityBonus
    skill.tooltipBase = Utils.getTooltip(Utils.getAbilityName(skill.ability), abilityBonus)

    skill.value = skill.base + bonuses + combatModifiers.total
    skill.tooltipValue = skill.tooltipBase.concat(combatModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))

    if (key === game.system.CONST.COMBAT.melee.id) this.#applyArmorEncumbrance(skill)
  }

  /**
   * Initiative COC2 : 10 + INT + PER, là où COF2 ne compte que 10 + PER.
   * L'Initiative subit en plus le malus fixe d'encombrement de l'armure.
   * @param {*} skill
   * @param {*} abilityBonus Valeur de la perception
   * @param {*} bonuses
   */
  _prepareInit(skill, abilityBonus, bonuses) {
    super._prepareInit(skill, abilityBonus, bonuses)
    this.#addSecondaryAbility(skill, game.system.CONST.COMBAT.init.id, "int", bonuses)
    this.#applyArmorEncumbrance(skill)
  }

  /**
   * Applique le malus fixe d'encombrement de l'armure équipée à une valeur de combat (Init ou ATC).
   * La source est le getter `malusFromArmor` de l'acteur (valeur négative), rebranché sur le champ
   * `encumbrance` de la protection via COC2EquipmentData. Le même malus alimente déjà les jets d'AGI
   * (rollSkill du système).
   * @param {*} skill Valeur de combat déjà préparée (combat.init ou combat.melee)
   */
  #applyArmorEncumbrance(skill) {
    const malus = this.parent.malusFromArmor
    if (!malus) return
    skill.value += malus
    skill.tooltipValue = skill.tooltipValue.concat(Utils.getTooltip("Encombrement", malus))
  }

  /**
   * Défense COC2 : 10 + AGI + PER, là où COF2 ne compte que 10 + AGI
   * L'armure et le bouclier ajoutés par COF2 restent pris en compte tant que les protections
   * COC2 (RD au lieu de DEF) ne sont pas implémentées
   * @param {*} skill
   * @param {*} abilityBonus Valeur de l'agilité
   * @param {*} bonuses
   */
  _prepareDef(skill, abilityBonus, bonuses) {
    super._prepareDef(skill, abilityBonus, bonuses)
    this.#addSecondaryAbility(skill, game.system.CONST.COMBAT.def.id, "per", bonuses)
  }

  /**
   * Ajoute une caractéristique secondaire à une valeur de combat déjà calculée par le système,
   * et reconstruit tooltipValue à partir de tooltipBase pour conserver l'ordre
   * base + caractéristiques, puis modifiers, puis bonus de fiche.
   * @param {*} skill Valeur de combat préparée par le système (combat.init ou combat.def)
   * @param {string} combatId Identifiant de la valeur de combat, pour retrouver ses modifiers
   * @param {string} abilityKey Caractéristique à ajouter
   * @param {number} bonuses Somme des bonus de la fiche et des active effects
   */
  #addSecondaryAbility(skill, combatId, abilityKey, bonuses) {
    const value = this.abilities[abilityKey].value
    skill.base += value
    skill.value += value
    skill.tooltipBase = skill.tooltipBase.concat(Utils.getTooltip(Utils.getAbilityName(abilityKey), value))

    const modifiers = this.computeTotalModifiersByTarget(this.combatModifiers, combatId)
    skill.tooltipValue = skill.tooltipBase.concat(modifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }
}
