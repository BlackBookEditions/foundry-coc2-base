import COPartySheet from "../../../../systems/co2/module/applications/party-sheet.mjs"
import { getHealthState, getSecondScaleState } from "../config/coc2.mjs"

/**
 * Groupe de joueurs COC2 : reprend le tableau COF2 en retirant les colonnes de magie (attaque magique et
 * points de magie, absents de COC2) et en ajoutant, si activée, une colonne pour la seconde échelle
 * (« Échelle » / conscience). Les actions (openSheet, rollAbilityAll, rollAbility) et le rafraîchissement
 * sont hérités : la sous-classe ne redéfinit que le template et le contexte.
 */
export default class COC2PartySheet extends COPartySheet {
  // Ne redéfinir QUE `classes` : ApplicationV2 fusionne DEFAULT_OPTIONS le long de la chaîne d'héritage,
  // donc les actions et l'id "co-party-sheet" (nécessaire à la sidebar et à la sémantique singleton) restent hérités.
  static DEFAULT_OPTIONS = {
    classes: ["coc2"],
  }

  /** @override — remplace uniquement le template du part "party" */
  static PARTS = {
    party: {
      template: "modules/coc2-base/templates/party/party-sheet.hbs",
    },
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options) // members + rules déjà construits par la classe parente

    // Santé : comme sur la fiche, on affiche le nombre d'échelons cochés (dégâts = hp.max - hp.value, de 0 à 20)
    // et, si un état est atteint, son libellé (Contusionné, Affaibli…). Libellés lus depuis CONFIG pour rester
    // surchargeables par un module d'univers. Remplace l'ancienne colonne « Vigueur » (hp restant).
    const healthStates = CONFIG.COC2BASE.healthStates
    for (const member of context.members) {
      const max = member.hp?.max ?? 0
      const damage = max - (member.hp?.value ?? 0)
      const stateId = getHealthState(damage, max)
      member.health = {
        value: damage,
        max,
        stateLabel: stateId ? game.i18n.localize(healthStates[stateId].name) : "",
      }
    }

    // Seconde échelle : compteur + libellé du palier atteint, affichés uniquement si le réglage est actif ou
    // si un module d'univers la force. Libellés lus depuis CONFIG pour rester surchargeables (cf. cth → conscience).
    const cfg = CONFIG.COC2BASE.secondScale
    context.showSecondScale = game.settings.get("coc2-base", "showSecondScale") || cfg.forced
    if (context.showSecondScale) {
      context.secondScaleShort = game.i18n.localize(cfg.labelShort)
      for (const member of context.members) {
        const ss = member.actor?.system?.attributes?.secondScale
        const checked = ss?.value ?? 0
        const max = ss?.max ?? cfg.max
        const stateId = getSecondScaleState(checked, max)
        member.secondScale = {
          value: checked,
          max,
          stateLabel: stateId ? game.i18n.localize(cfg.states[stateId].name) : "",
        }
      }
    }

    return context
  }
}
