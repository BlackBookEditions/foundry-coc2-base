import ActionMessageData from "../../../../systems/co2/module/models/action-message.mjs"

/**
 * Data model des messages d'action COC2.
 *
 * En COF2, une réussite critique double les dommages : la carte de chat présélectionne le
 * multiplicateur ×2 sur chaque ligne de cible touchée en critique. En COC2 le critique ajoute à la
 * place le bonus critique (BC) de l'arme, déjà intégré au total du jet par le hook `co.postRollAttack`
 * du module : appliquer le ×2 par-dessus doublerait la règle.
 *
 * On ramène donc le multiplicateur par défaut à ×1 sur ces lignes. Le bouton ×2 reste disponible, le
 * MJ gardant la main pour un arbitrage ponctuel.
 */
export default class COC2ActionMessageData extends ActionMessageData {
  /**
   * Rétablit ×1 sur les lignes en critique, après que le système a posé ses propres multiplicateurs.
   *
   * La méthode du système est le dernier point de passage avant `addListeners` : elle réécrit les
   * boutons à chaque rendu, aussi bien au premier affichage (le gabarit `damage-roll-card.hbs` marque
   * lui aussi le ×2) qu'aux rendus suivants. Corriger après elle couvre donc les deux cas.
   *
   * Un choix déjà mémorisé par le MJ (`appliedMultiplier`) ou une valeur forcée à la main
   * (`forcedDamage`) sont respectés : on ne touche qu'au défaut.
   * @inheritDoc
   */
  async alterMessageHTML(message, html) {
    await super.alterMessageHTML(message, html)
    if (!this.isDamage) return

    const total = parseInt(html.querySelector(".damage-card")?.dataset.total) || 0

    for (const tr of message.system.targetResults ?? []) {
      if (!tr.isCritical) continue
      if (tr.forcedDamage !== null && tr.forcedDamage !== undefined) continue
      if (tr.appliedMultiplier !== null && tr.appliedMultiplier !== undefined) continue

      const row = html.querySelector(`.apply-target-row[data-target-uuid="${tr.uuid}"][data-source="targeted"]`)
      if (!row) continue

      row.querySelectorAll(".multiplier-btn").forEach((btn) => btn.classList.toggle("active", parseFloat(btn.dataset.multiplier) === 1))

      const dmgDisplay = row.querySelector(".target-damage")
      if (!dmgDisplay) continue
      const drChecked = row.querySelector(".target-dr")?.checked ?? true
      const targetDr = parseInt(row.dataset.targetDr) || 0
      ActionMessageData.updateDamageDisplay(dmgDisplay, total, 1, drChecked, targetDr)
    }
  }
}
