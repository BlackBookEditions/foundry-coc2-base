import COCharacterSheet from "../../../../systems/co2/module/applications/sheets/character-sheet.mjs"
import {
  getHealthScaleContext,
  getSecondScaleContext,
  updateHealthScale,
  updateSecondScale,
  applyWeeklyRest,
  FEATURE_SUBTYPES_COC2,
  getAgeBracket,
  TRAIT_POINTS_MAX,
} from "../config/coc2.mjs"

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
      restWeek: COC2CharacterSheet.#onRestWeek,
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

    // Échelle de santé et seconde échelle : contextes mutualisés avec la Vue actions (cf. config/coc2.mjs)
    Object.assign(context, getHealthScaleContext(this.document))
    Object.assign(context, getSecondScaleContext(this.document))

    // Domaines : remplacent peuple et profils dans le header
    const features = this.document.items.filter((item) => item.type === "feature")
    context.domaines = features.filter((f) => [FEATURE_SUBTYPES_COC2.domainePro.id, FEATURE_SUBTYPES_COC2.domaineExtraPro.id].includes(f.system.subtype))

    // Tranche d'âge : liste lue depuis CONFIG pour rester surchargeable par un module d'univers
    const brackets = CONFIG.COC2BASE.ageBrackets
    context.choiceAgeBrackets = Object.fromEntries(Object.entries(brackets).map(([key, bracket]) => [key, bracket.label]))
    const currentBracket = getAgeBracket(this.document.system)
    context.ageBracketLabel = currentBracket ? game.i18n.localize(currentBracket.label) : null

    // Plafonds de création liés à la tranche d'âge : compteur injecté dans l'onglet Voies par _onRender.
    // null dès que le personnage a gagné un XP de séance : la progression n'est plus plafonnée.
    context.ageLimits =
      currentBracket && this.document.system.isCreation
        ? {
            bracket: context.ageBracketLabel,
            pathCount: this.document.paths.filter((p) => p.system.numberLearnedCapacities > 0).length,
            maxPaths: currentBracket.maxPaths,
            // Le plafond porte sur les rangs de voie : les capacités hors voie sont hors sujet
            highestRank: Math.max(0, ...this.document.learnedCapacities.filter((c) => c.system.path !== null).map((c) => c.system.rank ?? 0)),
            maxRank: currentBracket.maxRank,
          }
        : null
    // Sans tranche d'âge, le personnage n'a aucun point de capacité de création : signalé en permanence
    context.missingAgeBracket = !currentBracket

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

    // Bloc « Profil & Traits » de l'onglet Biographie : profils + traits génériques + domaines
    // (on exclut avantages/désavantages, désormais dans leur propre bloc, et people qui n'existe plus en COC2)
    const mainBlockSubtypes = ["trait", FEATURE_SUBTYPES_COC2.domainePro.id, FEATURE_SUBTYPES_COC2.domaineExtraPro.id]
    context.features = features.filter((f) => mainBlockSubtypes.includes(f.system.subtype))

    // Nouveau bloc « Avantages & Désavantages » : injecté dans l'onglet Biographie par _onRender
    context.avantagesDesavantages = features.filter((f) =>
      [FEATURE_SUBTYPES_COC2.avantage.id, FEATURE_SUBTYPES_COC2.desavantage.id].includes(f.system.subtype),
    )

    return context
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    this.#renderTraitBalance(context)
    await this.#renderAvantagesDesavantages(context)
    this.#renderAgeLimits(context)
  }

  /**
   * Compteur des traits distinctifs : injecté en tête de l'onglet Biographie, avant le bloc « Profils & Traits ».
   * Injection DOM plutôt qu'un override du template biographie (propriété du système co2) afin de ne pas le dupliquer.
   * @param {object} context Contexte de rendu
   */
  #renderTraitBalance(context) {
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
   * Bloc « Avantages & Désavantages » : injecté juste après le bloc « Profil & Traits » de l'onglet
   * Biographie. Injection DOM plutôt qu'un override du template biographie (propriété du système co2), afin
   * de ne pas le dupliquer — même motif que le compteur des traits distinctifs.
   * @param {object} context Contexte de rendu
   */
  async #renderAvantagesDesavantages(context) {
    const biographyPart = this.element?.querySelector('[data-application-part="biography"]')
    if (!biographyPart) return

    // Idempotence : on retire toute injection précédente (re-render partiel de l'onglet)
    biographyPart.querySelector(".coc2-avantages")?.remove()

    // Vue limitée : le bloc principal est masqué par le template co2 ({{#unless viewLimited}}), on aligne le comportement
    if (context.viewLimited) return

    // Aucun avantage/désavantage : pas de bloc
    if (!context.avantagesDesavantages?.length) return

    // Ancre : le premier .features.section-container est le bloc « Profil & Traits » d'origine (co2)
    const anchor = biographyPart.querySelector(".features.section-container")
    if (!anchor) return

    const html = await foundry.applications.handlebars.renderTemplate("modules/coc2-base/templates/actors/character-avantages.hbs", {
      items: context.avantagesDesavantages,
      unlocked: context.unlocked,
    })
    anchor.insertAdjacentHTML("afterend", html)
  }

  /**
   * Compteur des plafonds de création (voies et rang de voie) issus de la tranche d'âge : injecté dans
   * l'onglet Voies, sous les notifications d'XP du système. Même motif d'injection DOM que le compteur
   * des traits distinctifs, pour ne pas dupliquer le template paths.hbs du système.
   * @param {object} context Contexte de rendu
   */
  #renderAgeLimits(context) {
    const pathsPart = this.element?.querySelector('[data-application-part="paths"]')
    if (!pathsPart) return

    // Idempotence : on retire toute injection précédente (re-render partiel de l'onglet)
    pathsPart.querySelector(".coc2-age-limits")?.remove()

    const target = pathsPart.querySelector(".path-grid") ?? pathsPart.lastElementChild
    if (!target) return

    // Tranche d'âge non renseignée : aucun point de capacité de création, signalé en permanence
    if (context.missingAgeBracket) {
      const message = game.i18n.localize("COC2BASE.age.limits.noBracket")
      target.insertAdjacentHTML("beforebegin", `<div class="notification info permanent coc2-age-limits">${message}</div>`)
      return
    }

    // Le personnage a déjà joué : la progression par XP n'est plus plafonnée
    const limits = context.ageLimits
    if (!limits) return

    const tooManyPaths = limits.pathCount > limits.maxPaths
    const rankTooHigh = limits.highestRank > limits.maxRank
    const message = game.i18n.format("COC2BASE.age.limits.label", limits)
    const errors = []
    if (tooManyPaths) errors.push(game.i18n.localize("COC2BASE.age.limits.tooManyPaths"))
    if (rankTooHigh) errors.push(game.i18n.localize("COC2BASE.age.limits.rankTooHigh"))
    const suffix = errors.length ? ` — ${errors.join(", ")}` : ""
    const status = errors.length ? "error" : "info"
    const html = `<div class="notification ${status} permanent coc2-age-limits">${message}${suffix}</div>`
    target.insertAdjacentHTML("beforebegin", html)
  }

  /**
   * Clic sur un échelon de l'échelle de santé : coche jusqu'à l'échelon cliqué, ou décoche le dernier échelon coché
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClickHealthScale(event, target) {
    await updateHealthScale(this.document, Number(target.dataset.echelon))
  }

  /**
   * Clic sur un échelon de la seconde échelle : coche jusqu'à l'échelon cliqué, ou décoche le dernier.
   * La valeur stockée est directement le nombre d'échelons cochés (0 = échelle vide).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClickSecondScale(event, target) {
    await updateSecondScale(this.document, Number(target.dataset.echelon))
  }

  /**
   * Fin de séance : le personnage gagne 1 XP
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddSession(event, target) {
    await this.document.update({ "system.attributes.xp.earned": this.document.system.attributes.xp.earned + 1 })
  }

  /**
   * Repos d'une semaine : le personnage récupère CG échelons de l'échelle de santé
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRestWeek(event, target) {
    await applyWeeklyRest(this.document)
  }
}
