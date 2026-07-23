import EncounterData from "../../../../systems/co2/module/models/encounter.mjs"
import { HEALTH_SCALE, applyHealthScaleStatuses, getEncounterArchetype, getEncounterProfile } from "../config/coc2.mjs"

/**
 * Data model des rencontres COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain.
 * L'échelle de santé reste pilotée par hp.base (le MJ peut réduire ou étendre l'échelle d'une créature),
 * avec 20 échelons par défaut à la création.
 */
export default class COC2EncounterData extends EncounterData {
  /**
   * Ajoute details.archetype (importance narrative d'un adversaire humain) et details.stealth
   * (modificateur de furtivité, issu de la taille pour une créature)
   * @inheritDoc
   */
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = super.defineSchema()
    const details = schema.details

    const archetype = new fields.StringField({ required: true, blank: true, initial: "" })
    archetype.name = "archetype"
    archetype.parent = details
    details.fields.archetype = archetype

    const stealth = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
    stealth.name = "stealth"
    stealth.parent = details
    details.fields.stealth = stealth

    return schema
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const stats = this.parent._stats
    // Pour un acteur neuf, échelle de santé de 20 échelons, vide
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource && !foundry.utils.hasProperty(data, "system.attributes.hp")) {
      this.parent.updateSource({ "system.attributes.hp": { base: HEALTH_SCALE.max, value: HEALTH_SCALE.max } })
    }
  }

  /**
   * Deux automatismes indépendants, à ne pas court-circuiter l'un l'autre :
   * pré-remplissage des valeurs de l'archétype ou de la taille, et pose des états de santé.
   * @inheritDoc
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user)
    if (allowed === false) return false

    // On teste un changement de valeur et non la simple présence de la clé : une soumission de fiche
    // renvoie tous ses champs, un pré-remplissage déclenché à chaque enregistrement écraserait les
    // valeurs saisies à la main par le MJ.
    const newArchetype = foundry.utils.getProperty(changes, "system.details.archetype")
    const newSize = foundry.utils.getProperty(changes, "system.details.size")
    const archetypeChanged = newArchetype !== undefined && newArchetype !== this.details.archetype
    const sizeChanged = newSize !== undefined && newSize !== this.details.size

    // Changer d'archétype pré-remplit les valeurs du livre de règles. Changer de taille ne le fait que
    // pour une créature : l'archétype prime sur la table des TAI (cf. getEncounterProfile).
    const archetype = archetypeChanged ? newArchetype : this.details.archetype
    if (archetypeChanged || (sizeChanged && !archetype)) {
      this.#prefillFromProfile(changes, { details: { archetype, size: sizeChanged ? newSize : this.details.size } })
    }

    if (foundry.utils.hasProperty(changes, "system.attributes.hp.value")) {
      await applyHealthScaleStatuses(this.parent, changes.system.attributes.hp.value, this.#pendingHpMax(changes))
    }
  }

  /**
   * Écrit dans la mise à jour en cours les valeurs de référence de l'archétype ou de la taille.
   * Pré-remplissage et non calcul : le MJ reste libre de tout modifier ensuite, le livre de règles
   * l'autorisant explicitement à calculer Init. et DEF avec les formules des personnages.
   * @param {object} changes Modifications en cours, complétées sur place
   * @param {object} system État du data model après application des changements, pour lire le profil
   */
  #prefillFromProfile(changes, system) {
    const profile = getEncounterProfile(system)
    if (!profile) return

    const prefill = {
      system: {
        combat: { def: { base: profile.def }, init: { base: profile.init } },
        // Une échelle neuve est vide : la santé restante part au maximum
        attributes: { hp: { base: profile.hpBase, value: profile.hpBase } },
      },
    }
    if (profile.stealth !== null) prefill.system.details = { stealth: profile.stealth }

    foundry.utils.mergeObject(changes, prefill)
  }

  /**
   * Taille de l'échelle de santé après application de la mise à jour en cours.
   * hp.max est une valeur dérivée, encore calculée sur l'ancienne base au moment du _preUpdate : la
   * lire telle quelle placerait les états au mauvais échelon quand le pré-remplissage vient justement
   * de changer la longueur de l'échelle. On reporte donc la nouvelle base en conservant les bonus.
   * @param {object} changes Modifications en cours
   * @returns {number}
   */
  #pendingHpMax(changes) {
    const newBase = foundry.utils.getProperty(changes, "system.attributes.hp.base")
    if (newBase === undefined) return this.attributes.hp.max
    return newBase + (this.attributes.hp.max - this.attributes.hp.base)
  }

  /**
   * Réussites critiques COC2 : seul un Premier rôle peut critiquer sur un 20, les adversaires mineurs
   * n'y ont pas droit. Contrairement à la DEF et à l'Initiative, le seuil critique n'est pas
   * pré-remplissable : il n'est pas éditable sur la fiche et le système le réécrit à chaque préparation.
   * Un seuil de 21 ne peut jamais être atteint sur un d20 (roll.mjs teste `résultat >= critique`).
   * Sans archétype (créatures), le comportement du système est conservé.
   * @inheritDoc
   */
  _prepareCombat() {
    super._prepareCombat()

    const archetype = getEncounterArchetype(this)
    if (!archetype || archetype.canCrit) return

    this.combat.crit.value = game.system.CONST.BASE_CRITICAL + 1
    this.combat.crit.tooltipValue = game.i18n.localize("COC2BASE.encounter.noCritical")
  }
}
