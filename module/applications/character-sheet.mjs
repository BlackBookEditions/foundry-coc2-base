import COCharacterSheet from "../../../../systems/co2/module/applications/sheets/character-sheet.mjs"
import { HEALTH_SCALE, HEALTH_STATUS_EFFECTS, getHealthState, SECOND_SCALE, getSecondScaleState, FEATURE_SUBTYPES_COC2, AGE_BRACKETS, TRAIT_POINTS_MAX } from "../config/coc2.mjs"

/**
 * Fiche de personnage COC2 : reprend la fiche COF2 en surchargeant les parties spécifiques (échelle de santé, progression sans niveaux)
 */
export default class COC2CharacterSheet extends COCharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["coc2"],
    actions: {
      clickHealthScale: COC2CharacterSheet.#onClickHealthScale,
      clickSecondScale: COC2CharacterSheet.#onClickSecondScale,
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

    // Seconde échelle : affichée si le réglage est actif ou si un module d'univers la force.
    // Libellés et noms d'états lus depuis CONFIG.COC2BASE pour rester surchargeables (cf. cth).
    const secondScaleConfig = CONFIG.COC2BASE.secondScale
    context.showSecondScale = game.settings.get("coc2-base", "showSecondScale") || secondScaleConfig.forced
    if (context.showSecondScale) {
      const scaleMax = this.document.system.attributes.secondScale.max
      const checked = this.document.system.attributes.secondScale.value
      const secondStateLabels = Object.fromEntries(Object.entries(secondScaleConfig.states).map(([id, effect]) => [id, game.i18n.localize(effect.name)]))
      const secondThresholds = SECOND_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * scaleMax), id: state.id }))

      context.secondScaleValue = checked
      context.secondScaleMax = scaleMax
      context.secondScaleLabel = game.i18n.localize(secondScaleConfig.label)
      context.secondScaleShort = game.i18n.localize(secondScaleConfig.labelShort)
      context.secondScale = Array.fromRange(scaleMax, 1).map((echelon) => {
        const milestone = secondThresholds.find((t) => t.echelon === echelon)
        return {
          echelon,
          filled: echelon <= checked,
          milestone: !!milestone,
          state: milestone?.id ?? "",
          tooltip: milestone ? `${echelon} — ${secondStateLabels[milestone.id]}` : String(echelon),
        }
      })
      const secondCurrentState = getSecondScaleState(checked, scaleMax)
      context.secondScaleStateId = secondCurrentState
      context.secondScaleStateLabel = secondCurrentState ? secondStateLabels[secondCurrentState] : null
    }

    // Domaines : remplacent peuple et profils dans le header
    const features = this.document.items.filter((item) => item.type === "feature")
    context.domaines = features.filter((f) => [FEATURE_SUBTYPES_COC2.domainePro.id, FEATURE_SUBTYPES_COC2.domaineExtraPro.id].includes(f.system.subtype))

    // Tranche d'âge
    context.choiceAgeBrackets = Object.fromEntries(Object.entries(AGE_BRACKETS).map(([key, bracket]) => [key, bracket.label]))
    const currentBracket = AGE_BRACKETS[this.document.system.details.ageBracket]
    context.ageBracketLabel = currentBracket ? game.i18n.localize(currentBracket.label) : null

    // Formules des caractéristiques secondaires : figées par les règles, affichées à la place des selects de COF2
    const shortAbility = (key) => game.i18n.localize(`CO.abilities.short.${key}`)
    context.initFormula = `10 + ${shortAbility("int")} + ${shortAbility("per")}`
    context.defFormula = `10 + ${shortAbility("agi")} + ${shortAbility("per")}`

    // Traits distinctifs : compteur des points d'avantages et de désavantages, injecté dans l'onglet Biographie par _onRender
    const traitPoints = (subtype) =>
      features.filter((f) => f.system.subtype === subtype).reduce((acc, f) => acc + (f.getFlag("coc2-base", "points") ?? 1), 0)
    context.avantagePoints = traitPoints(FEATURE_SUBTYPES_COC2.avantage.id)
    context.desavantagePoints = traitPoints(FEATURE_SUBTYPES_COC2.desavantage.id)
    context.traitPointsMax = TRAIT_POINTS_MAX
    // Le message ne s'affiche que si le personnage possède au moins un trait distinctif
    context.hasTraits = features.some((f) => [FEATURE_SUBTYPES_COC2.avantage.id, FEATURE_SUBTYPES_COC2.desavantage.id].includes(f.system.subtype))
    // Règle : équilibre avantages = désavantages, et plafond de 5 points de chaque côté
    context.traitBalanced = context.avantagePoints === context.desavantagePoints
    context.traitWithinCap = context.avantagePoints <= TRAIT_POINTS_MAX && context.desavantagePoints <= TRAIT_POINTS_MAX
    context.traitValid = context.traitBalanced && context.traitWithinCap

    return context
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Compteur des traits distinctifs : injecté en tête de l'onglet Biographie, avant le bloc « Profils & Traits ».
    // Injection DOM plutôt qu'un override du template biographie (propriété du système co2) afin de ne pas le dupliquer.
    const biographyPart = this.element?.querySelector('[data-application-part="biography"]')
    if (!biographyPart) return

    // Idempotence : on retire toute injection précédente (re-render partiel de l'onglet)
    biographyPart.querySelector(".coc2-trait-balance")?.remove()

    // Aucun trait avantage/désavantage : pas de message
    if (!context.hasTraits) return

    const target = biographyPart.querySelector(".features.section-container")
    if (!target) return

    const message = game.i18n.format("COC2BASE.feature.traitBalance", {
      av: context.avantagePoints,
      dav: context.desavantagePoints,
      max: context.traitPointsMax,
    })
    const suffix = context.traitValid ? "" : game.i18n.localize("COC2BASE.feature.traitError")
    const status = context.traitValid ? "info" : "error"
    const html = `<div class="notification ${status} permanent coc2-trait-balance">${message}${suffix}</div>`
    target.insertAdjacentHTML("beforebegin", html)
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
   * Clic sur un échelon de la seconde échelle : coche jusqu'à l'échelon cliqué, ou décoche le dernier.
   * La valeur stockée est directement le nombre d'échelons cochés (0 = échelle vide).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClickSecondScale(event, target) {
    const echelon = Number(target.dataset.echelon)
    const value = this.document.system.attributes.secondScale.value
    const newValue = echelon === value ? echelon - 1 : echelon
    await this.document.update({ "system.attributes.secondScale.value": newValue })
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
