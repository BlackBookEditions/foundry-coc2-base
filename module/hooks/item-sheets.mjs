import { checkboxField, numberField } from "../helpers/form-fields.mjs"
import { computeAutoCriticalBonus } from "../config/combat.mjs"
import { FEATURE_SUBTYPES_COC2 } from "../config/items.mjs"

/*
 * Adaptation des fiches d'item du système co2 aux règles COC2, par retouche du DOM au rendu.
 *
 * Les fiches co2 (trait, voie, profil, équipement, attaque) ne sont pas surchargées : on évite ainsi de
 * dupliquer leurs templates pour trois champs. Deux opérations reviennent partout :
 *  - masquer un champ système sans objet en COC2 — son groupe de formulaire est retiré, mais le champ
 *    reste valide côté schéma et la valeur éventuellement stockée est conservée, simplement plus éditable ;
 *  - injecter un champ COC2 absent des templates du système, derrière une garde anti-doublon, la fiche
 *    pouvant être rendue partiellement.
 *
 * Un seul handler par fiche : les gardes de sous-type sont internes, dans l'ordre historique des
 * retouches.
 */

/**
 * Retire de la liste déroulante des sous-types d'une fiche d'item les options sans équivalent COC2.
 * L'option est conservée si l'item porte déjà ce sous-type (item hérité de COF2), afin que la valeur affichée
 * reste celle de l'item et ne soit pas remplacée en silence à la première sauvegarde.
 * @param {HTMLElement} element   Élément racine de la fiche
 * @param {Item} item             Item affiché
 * @param {string[]} removedIds   Ids des sous-types à masquer
 */
function removeSubtypeOptions(element, item, removedIds) {
  const select = element.querySelector('select[name="system.subtype"]')
  if (!select) return

  for (const id of removedIds) {
    if (id === item.system.subtype) continue
    select.querySelector(`option[value="${id}"]`)?.remove()
  }
}

/**
 * Construit le groupe de formulaire du bonus critique, commun à la fiche d'arme et à la fiche d'attaque.
 * Le champ est nullable : laissé vide, il affiche en indication (placeholder) la valeur déduite du dé de
 * dommages, qui est celle réellement utilisée en jeu.
 * @param {number|null} value La valeur saisie sur l'item
 * @param {string} damageFormula La formule de dommages de référence, pour l'indication de valeur automatique
 * @param {boolean} locked Vrai si la fiche est verrouillée
 * @returns {string} Le fragment HTML à injecter
 */
function criticalBonusFormGroup(value, damageFormula, locked) {
  const auto = computeAutoCriticalBonus(damageFormula)
  return numberField({
    cssClass: "coc2-critical-bonus",
    label: game.i18n.localize("COC2BASE.equipment.bcShort"),
    tooltip: game.i18n.format("COC2BASE.equipment.bcTooltip", { auto }),
    name: "system.criticalBonus",
    value,
    placeholder: auto,
    locked,
  })
}

/**
 * Fiche de trait :
 *  - sous-types sans équivalent COC2 (peuple) retirés de la liste déroulante ;
 *  - coût en points des traits distinctifs (avantages/désavantages), champ injecté et stocké en flag.
 */
export function onRenderFeatureSheet(application, element, context, options) {
  const item = application.document

  removeSubtypeOptions(element, item, CONFIG.COC2BASE.removedFeatureSubtypeIds)

  if (![FEATURE_SUBTYPES_COC2.avantage.id, FEATURE_SUBTYPES_COC2.desavantage.id].includes(item.system.subtype)) return

  const select = element.querySelector('select[name="system.subtype"]')
  if (!select || element.querySelector(".coc2-points")) return

  const html = numberField({
    cssClass: "coc2-points",
    label: game.i18n.localize("COC2BASE.feature.points"),
    name: "flags.coc2-base.points",
    value: item.getFlag("coc2-base", "points") ?? 1,
    locked: context.locked,
  })
  const group = select.closest(".form-group") ?? select
  group.insertAdjacentHTML("afterend", html)
}

/**
 * Fiche de voie :
 *  - sous-types sans équivalent COC2 (peuple) retirés de la liste déroulante ;
 *  - `system.maxDefenseArmor` masqué (cf. onRenderProfileSheet).
 */
export function onRenderPathSheet(application, element, context, options) {
  removeSubtypeOptions(element, application.document, CONFIG.COC2BASE.removedPathSubtypeIds)

  // Idempotent : null après la première suppression (la fiche peut être rendue partiellement)
  element.querySelector('[name="system.maxDefenseArmor"]')?.closest(".form-group")?.remove()
}

/**
 * Fiche de profil : `system.maxDefenseArmor` masqué.
 *
 * Défense max de l'armure : plafond de Défense d'armure avant surcoût en PM lors du lancement d'un sort
 * (profils hybrides COF2, cf. COActor#getManaCostFromArmor) — notion de magie/PM absente de COC2.
 */
export function onRenderProfileSheet(application, element, context, options) {
  element.querySelector('[name="system.maxDefenseArmor"]')?.closest(".form-group")?.remove()
}

/**
 * Protections COC2 (armure/bouclier) : `system.defense` porte désormais la RD (réduction de dégâts) et non
 * la DEF, on le relabellise ; `system.magicalDefense` (notion COF2/magie absente de COC2) est masqué ;
 * l'encombrement et la case Cumulable (ajoutés par COC2EquipmentData) sont injectés.
 */
function applyProtectionFields(element, item, context) {
  const defense = element.querySelector('[name="system.defense"]')
  if (!defense) return
  const defenseGroup = defense.closest(".form-group") ?? defense

  // Relabelliser Défense → RD (idempotent). Comme l'encombrement et la case Cumulable, le libellé est
  // réduit à son sigle et l'explication portée en infobulle, pour ne pas déséquilibrer la mise en page.
  const defenseLabel = defenseGroup.querySelector?.("label")
  if (defenseLabel) {
    defenseLabel.textContent = game.i18n.localize("COC2BASE.equipment.rdShort")
    defenseLabel.dataset.tooltip = game.i18n.localize("COC2BASE.equipment.rdTooltip")
  }

  // Masquer la défense magique (idempotent : null après première suppression)
  element.querySelector('[name="system.magicalDefense"]')?.closest(".form-group")?.remove()

  // Injecter l'encombrement et la case Cumulable, d'un bloc (garde anti-doublon commune)
  if (element.querySelector(".coc2-encumbrance")) return
  const html =
    numberField({
      cssClass: "coc2-encumbrance",
      label: game.i18n.localize("COC2BASE.equipment.encumbrance"),
      tooltip: game.i18n.localize("COC2BASE.equipment.encumbranceHint"),
      name: "system.encumbrance",
      value: item.system.encumbrance ?? 0,
      locked: context.locked,
    }) +
    "\n  " +
    checkboxField({
      cssClass: "coc2-cumulative",
      label: game.i18n.localize("COC2BASE.equipment.cumulative"),
      tooltip: game.i18n.localize("COC2BASE.equipment.cumulativeHint"),
      name: "system.cumulative",
      checked: item.system.cumulative,
      locked: context.locked,
    })
  defenseGroup.insertAdjacentHTML("afterend", html)
}

/**
 * Bonus critique des armes : en COC2 une réussite critique n'ajoute plus le double des DM mais le BC de
 * l'arme. Champ injecté sous le type de dommages de la fiche d'équipement co2.
 */
function applyWeaponCriticalBonus(element, item, context) {
  // Garde anti-doublon : la fiche peut être rendue partiellement
  if (element.querySelector(".coc2-critical-bonus")) return

  const damageType = element.querySelector('[name="system.damagetype"]')
  if (!damageType) return
  const anchor = damageType.closest(".form-group") ?? damageType
  anchor.insertAdjacentHTML("afterend", criticalBonusFormGroup(item.system.criticalBonus, item.system.damage, context.locked))
}

/**
 * Fiche d'équipement : les trois retouches COC2, dans leur ordre historique. Chacune est isolée dans sa
 * propre fonction pour qu'une sortie anticipée (champ absent, injection déjà faite) n'empêche pas les
 * suivantes de s'appliquer — c'était le comportement des trois hooks distincts d'origine.
 */
export function onRenderEquipmentSheet(application, element, context, options) {
  const item = application.document

  if (["armor", "shield"].includes(item.system.subtype)) applyProtectionFields(element, item, context)

  // Catégorie martiale : la formation martiale COF2 (arme/armure/bouclier restreints par profil) est
  // neutralisée en COC2 (cf. COC2Actor#isTrainedWith*, qui renvoie toujours true). Idempotent.
  if (["weapon", "armor", "shield"].includes(item.system.subtype)) {
    element.querySelector('[name="system.martialCategory"]')?.closest(".form-group")?.remove()
  }

  if (item.system.subtype === "weapon") applyWeaponCriticalBonus(element, item, context)
}

/**
 * Fiche d'attaque : bonus critique des attaques naturelles des créatures. Les fiches techniques précisent
 * leur propre BC (ex. griffes 1d8+7, BC +8), valeur qui ne se déduit pas toujours du dé de dommages.
 */
export function onRenderAttackSheet(application, element, context, options) {
  const item = application.document
  if (element.querySelector(".coc2-critical-bonus")) return

  const properties = element.querySelector("fieldset.properties")
  if (!properties) return
  properties.insertAdjacentHTML("beforeend", criticalBonusFormGroup(item.system.criticalBonus, item.system.displayValues.damage, context.locked))
}
