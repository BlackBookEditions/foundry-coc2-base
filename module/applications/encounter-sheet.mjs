import COEncounterSheet from "../../../../systems/co2/module/applications/sheets/encounter-sheet.mjs"
import { getHealthScaleContext, updateHealthScale, getEncounterProfile } from "../config/coc2.mjs"

/**
 * Fiche de rencontre COC2 : reprend la fiche COF2 en surchargeant l'en-tête et la barre latérale, pour
 * y porter l'échelle de santé, l'archétype de l'adversaire et les compteurs de création.
 */
export default class COC2EncounterSheet extends COEncounterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["coc2"],
    actions: {
      clickHealthScale: COC2EncounterSheet.#onClickHealthScale,
    },
  }

  /** @override */
  static PARTS = foundry.utils.mergeObject(
    super.PARTS,
    {
      header: { template: "modules/coc2-base/templates/actors/encounter-header.hbs" },
      sidebar: { template: "modules/coc2-base/templates/actors/encounter-sidebar.hbs" },
    },
    { inplace: false },
  )

  /** @inheritDoc */
  async _prepareContext() {
    const context = await super._prepareContext()

    // Échelle de santé : contexte mutualisé avec la fiche de personnage (cf. config/coc2.mjs)
    Object.assign(context, getHealthScaleContext(this.document))
    // La seconde échelle n'existe que sur le schéma des personnages : ne pas l'appeler ici

    // Archétype : liste lue depuis CONFIG pour rester surchargeable par un module d'univers
    const archetypes = CONFIG.COC2BASE.encounterArchetypes
    context.choiceArchetypes = Object.fromEntries(Object.entries(archetypes).map(([key, archetype]) => [key, archetype.label]))

    // Valeurs de référence de l'adversaire : archétype s'il est renseigné, sinon table des créatures
    const profile = getEncounterProfile(this.document.system)
    context.profile = profile
    context.isCreature = profile?.kind === "creature"
    // Libellé affiché en mode lecture à côté de la taille : uniquement pour un archétype. Le profil
    // d'une créature porte comme libellé celui de sa taille, qui serait alors affiché deux fois.
    context.archetypeLabel = profile?.kind === "archetype" ? game.i18n.localize(profile.label) : null
    context.hpRangeLabel = profile && profile.hpRange[0] !== profile.hpRange[1] ? `${profile.hpRange[0]} – ${profile.hpRange[1]}` : null

    Object.assign(context, this.#prepareQuotas(profile))

    return context
  }

  /**
   * Compteurs de création : points de caractéristiques dépensés et capacités apprises, comparés aux quotas du profil. 
   * Purement informatifs — rien n'est bloqué, le MJ reste maître des exceptions.
   * Le décompte des caractéristiques raisonne en points totaux et non en nombre de caractéristiques bonifiées : 
   * le Premier rôle peut cumuler deux +2 en un +4, et les créatures ont un plafond par caractéristique, vérifié à part.
   * @param {object|null} profile Profil de référence (cf. getEncounterProfile)
   * @returns {object} Fragment de contexte de rendu
   */
  #prepareQuotas(profile) {
    if (!profile) return { hasQuotas: false }

    const abilities = Object.values(this.document.system.abilities)
    const abilityPoints = abilities.reduce((total, ability) => total + Math.max(0, ability.base), 0)
    const highestAbility = Math.max(0, ...abilities.map((ability) => ability.base))
    const capacityCount = this.document.learnedCapacities.length

    const tooManyAbilities = abilityPoints > profile.abilityPoints
    const abilityAboveCap = profile.maxPerAbility !== null && highestAbility > profile.maxPerAbility
    const tooManyCapacities = profile.capacityPoints !== null && capacityCount > profile.capacityPoints

    // Message assemblé ici plutôt qu'en Handlebars : le libellé des capacités est optionnel (les créatures n'ont pas de budget) et les erreurs se cumulent, comme pour le compteur de traits des PJ
    const parts = [game.i18n.format("COC2BASE.encounter.quotas.abilities", { points: abilityPoints, max: profile.abilityPoints })]
    if (profile.maxPerAbility !== null) parts.push(game.i18n.format("COC2BASE.encounter.quotas.perAbility", { max: profile.maxPerAbility }))
    if (profile.capacityPoints !== null) {
      parts.push(game.i18n.format("COC2BASE.encounter.quotas.capacities", { count: capacityCount, max: profile.capacityPoints }))
    }

    const errors = []
    if (tooManyAbilities) errors.push(game.i18n.localize("COC2BASE.encounter.quotas.tooManyAbilities"))
    if (abilityAboveCap) errors.push(game.i18n.format("COC2BASE.encounter.quotas.abilityAboveCap", { max: profile.maxPerAbility }))
    if (tooManyCapacities) errors.push(game.i18n.localize("COC2BASE.encounter.quotas.tooManyCapacities"))

    return {
      hasQuotas: true,
      quotasValid: errors.length === 0,
      quotasMessage: parts.join(" · "),
      quotasErrors: errors.length ? ` — ${errors.join(", ")}` : "",
    }
  }

  /**
   * Clic sur un échelon de l'échelle de santé : coche jusqu'à l'échelon cliqué, ou décoche le dernier échelon coché
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClickHealthScale(event, target) {
    await updateHealthScale(this.document, Number(target.dataset.echelon))
  }
}
