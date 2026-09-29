/*
 * Fragments de formulaire injectés dans les fiches d'item du système co2.
 *
 * Les fiches co2 ne sont pas surchargées : plutôt que de dupliquer leurs templates pour y ajouter trois
 * champs, on injecte le markup au rendu (cf. module/hooks/item-sheets.mjs). Ces helpers produisent le
 * `.form-group` attendu par la feuille de style du système.
 *
 * Fonctions pures : les libellés et infobulles sont reçus **déjà localisés**, les appelants utilisant
 * tantôt `game.i18n.localize`, tantôt `game.i18n.format`.
 */

/**
 * Construit le bloc d'un champ numérique.
 * @param {object} options
 * @param {string} options.cssClass    Classe du form-group, qui sert aussi de garde anti-doublon à l'appelant
 * @param {string} options.label       Libellé localisé
 * @param {string} [options.tooltip]   Infobulle localisée, portée par le libellé (les fiches d'item sont
 *                                     denses : un paragraphe d'aide sous le champ y déséquilibre la mise en page)
 * @param {string} options.name        Attribut name du champ (chemin de donnée ou de flag)
 * @param {number|null} options.value  Valeur courante ; null ou undefined laisse le champ vide
 * @param {number|string} [options.placeholder] Valeur indicative affichée quand le champ est vide
 * @param {number} [options.min]
 * @param {number} [options.step]
 * @param {boolean} [options.locked]   Vrai si la fiche est en mode consultation
 * @returns {string} Le fragment HTML à injecter
 */
export function numberField({ cssClass, label, tooltip = "", name, value, placeholder = "", min = 0, step = 1, locked = false }) {
  return `<div class="form-group ${cssClass}">
    <label${tooltip ? ` data-tooltip="${tooltip}"` : ""}>${label}</label>
    <input type="number" name="${name}" value="${value ?? ""}" placeholder="${placeholder}" min="${min}" step="${step}" data-dtype="Number" ${locked ? "disabled" : ""} />
  </div>`
}

/**
 * Construit le bloc d'une case à cocher. Mêmes conventions que {@link numberField}.
 * @param {object} options
 * @param {string} options.cssClass
 * @param {string} options.label
 * @param {string} [options.tooltip]
 * @param {string} options.name
 * @param {boolean} options.checked
 * @param {boolean} [options.locked]
 * @returns {string} Le fragment HTML à injecter
 */
export function checkboxField({ cssClass, label, tooltip = "", name, checked, locked = false }) {
  return `<div class="form-group ${cssClass}">
    <label${tooltip ? ` data-tooltip="${tooltip}"` : ""}>${label}</label>
    <input type="checkbox" name="${name}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} />
  </div>`
}
