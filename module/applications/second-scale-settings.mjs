import { getSecondScaleModifierProfile, normalizeSecondScaleModifierProfile, SECOND_SCALE_STATE_IDS } from "../config/coc2.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/** Configuration de monde des modificateurs de l'Échelle d'évolution. */
export default class SecondScaleSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "coc2-second-scale-settings",
    tag: "form",
    window: { title: "COC2BASE.settings.secondScaleModifiers.title", icon: "fa-solid fa-chart-line" },
    position: { width: 620, height: "auto" },
    form: { handler: SecondScaleSettings.#onSubmit, closeOnSubmit: true },
  }

  static PARTS = {
    main: { template: "modules/coc2-base/templates/applications/second-scale-settings.hbs" },
  }

  async _prepareContext() {
    const profile = getSecondScaleModifierProfile()
    const abilities = { "": game.i18n.localize("COC2BASE.settings.secondScaleModifiers.none") }
    for (const [id, ability] of Object.entries(game.system.CONST.ABILITIES)) abilities[id] = game.i18n.localize(ability.label)

    return {
      profile,
      abilities,
      tiers: SECOND_SCALE_STATE_IDS.map((id) => ({
        id,
        label: game.i18n.localize(CONFIG.COC2BASE.secondScale.states[id].name),
        bonus: profile.bonus.values[id],
        malus: profile.malus.values[id],
      })),
    }
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object
    const profile = normalizeSecondScaleModifierProfile({
      bonus: {
        ability: data.bonusAbility,
        label: data.bonusLabel,
        values: data.bonus?.values,
      },
      malus: {
        ability: data.malusAbility,
        label: data.malusLabel,
        values: data.malus?.values,
      },
    })
    await game.settings.set("coc2-base", "secondScaleModifiers", profile)

    for (const actor of game.actors) {
      if (actor.sheet?.rendered) actor.sheet.render({ force: true })
    }
    if (game.system.partySheet?.rendered) game.system.partySheet.render({ force: true })
  }
}
