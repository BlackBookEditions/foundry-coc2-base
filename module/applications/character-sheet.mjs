import COCharacterSheet from "../../../../systems/co2/module/applications/sheets/character-sheet.mjs"
import { HEALTH_SCALE, HEALTH_STATUS_EFFECTS, getHealthState, FEATURE_SUBTYPES_COC2, AGE_BRACKETS, TRAIT_POINTS_MAX } from "../config/coc2.mjs"

/**
 * Fiche de personnage COC2 : reprend la fiche COF2 en surchargeant les parties spécifiques (échelle de santé, progression sans niveaux)
 */
export default class COC2CharacterSheet extends COCharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["coc2"],
    actions: {
      clickHealthScale: COC2CharacterSheet.#onClickHealthScale,
      addSession: COC2CharacterSheet.#onAddSession,
    },
  }

  /** @override */
  static PARTS = foundry.utils.mergeObject(
    super.PARTS,
    {
      header: { template: "modules/coc2-base/templates/actors/character-header.hbs" },
      sidebar: { template: "modules/coc2-base/templates/actors/character-sidebar.hbs" },
    },
    { inplace: false },
  )

  /** @inheritDoc */
  async _prepareContext() {
    const context = await super._prepareContext()

    // Échelle de santé : échelons cochés = hp.max - hp.value
    const max = this.document.system.attributes.hp.max
    const damage = max - this.document.system.attributes.hp.value
    const stateLabels = HEALTH_STATUS_EFFECTS.reduce((obj, effect) => {
      obj[effect.id] = game.i18n.localize(effect.name)
      return obj
    }, {})
    const thresholds = HEALTH_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * max), id: state.id }))

    context.healthDamage = damage
    context.healthScale = Array.fromRange(max, 1).map((echelon) => {
      const milestone = thresholds.find((t) => t.echelon === echelon)
      return {
        echelon,
        filled: echelon <= damage,
        milestone: !!milestone,
        state: milestone?.id ?? "",
        tooltip: milestone ? `${echelon} — ${stateLabels[milestone.id]}` : String(echelon),
      }
    })

    const currentState = getHealthState(damage, max)
    context.healthStateId = currentState
    context.healthStateLabel = currentState ? stateLabels[currentState] : null

    // Domaines : remplacent peuple et profils dans le header
    const features = this.document.items.filter((item) => item.type === "feature")
    context.domaines = features.filter((f) => [FEATURE_SUBTYPES_COC2.domainePro.id, FEATURE_SUBTYPES_COC2.domaineExtraPro.id].includes(f.system.subtype))

    // Tranche d'âge
    context.choiceAgeBrackets = Object.fromEntries(Object.entries(AGE_BRACKETS).map(([key, bracket]) => [key, bracket.label]))
    const currentBracket = AGE_BRACKETS[this.document.system.details.ageBracket]
    context.ageBracketLabel = currentBracket ? game.i18n.localize(currentBracket.label) : null

    // Traits distinctifs : compteur informatif des points d'avantages et de désavantages
    const traitPoints = (subtype) =>
      features.filter((f) => f.system.subtype === subtype).reduce((acc, f) => acc + (f.getFlag("coc2-base", "points") ?? 1), 0)
    context.avantagePoints = traitPoints(FEATURE_SUBTYPES_COC2.avantage.id)
    context.desavantagePoints = traitPoints(FEATURE_SUBTYPES_COC2.desavantage.id)
    context.traitPointsMax = TRAIT_POINTS_MAX

    return context
  }

  /**
   * Clic sur un échelon de l'échelle de santé : coche jusqu'à l'échelon cliqué, ou décoche le dernier échelon coché
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClickHealthScale(event, target) {
    const echelon = Number(target.dataset.echelon)
    const max = this.document.system.attributes.hp.max
    const damage = max - this.document.system.attributes.hp.value
    const newDamage = echelon === damage ? echelon - 1 : echelon
    await this.document.update({ "system.attributes.hp.value": max - newDamage })
  }

  /**
   * Fin de séance : le personnage gagne 1 XP
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddSession(event, target) {
    await this.document.update({ "system.attributes.xp.earned": this.document.system.attributes.xp.earned + 1 })
  }
}
