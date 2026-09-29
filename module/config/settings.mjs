import { DEFAULT_SECOND_SCALE_MODIFIER_PROFILE } from "./second-scale.mjs"
import { SecondScaleSettings } from "../applications/_module.mjs"

/**
 * Enregistre les réglages de monde du module et le menu de configuration de la seconde échelle.
 * À appeler depuis le hook init.
 */
export function registerSettings() {
  // Réglage commandant l'affichage de la seconde échelle sur les fiches (premier réglage du module)
  game.settings.register("coc2-base", "showSecondScale", {
    name: "COC2BASE.settings.showSecondScale.name",
    hint: "COC2BASE.settings.showSecondScale.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  })

  game.settings.register("coc2-base", "secondScaleModifiers", {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_SECOND_SCALE_MODIFIER_PROFILE,
  })

  game.settings.registerMenu("coc2-base", "secondScaleConfiguration", {
    name: "COC2BASE.settings.secondScaleModifiers.name",
    label: "COC2BASE.settings.secondScaleModifiers.label",
    hint: "COC2BASE.settings.secondScaleModifiers.hint",
    icon: "fa-solid fa-chart-line",
    type: SecondScaleSettings,
    restricted: true,
  })

  // Ambiance « action décomplexée » : échelles de santé raccourcies pour les adversaires mineurs et
  // allongée pour le Premier rôle. Le réglage est lu au moment du pré-remplissage : le basculer ne
  // touche pas aux adversaires déjà créés, il ne change que les prochaines sélections d'archétype.
  game.settings.register("coc2-base", "pulpHealthScales", {
    name: "COC2BASE.settings.pulpHealthScales.name",
    hint: "COC2BASE.settings.pulpHealthScales.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  })

  // Dernière version des notes affichée (voir applications.COC2ReleaseNotes) : scope "user" pour que
  // chaque MJ ait son propre suivi de lecture, config: false car piloté par la case à cocher de la fenêtre.
  game.settings.register("coc2-base", "lastReleaseNotesSeen", {
    scope: "user",
    config: false,
    type: String,
    default: "",
  })
}
