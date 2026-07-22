import EncounterData from "../../../../systems/co2/module/models/encounter.mjs"
import { HEALTH_SCALE, applyHealthScaleStatuses } from "../config/coc2.mjs"

/**
 * Data model des rencontres COC2 : adapte le modèle COF2 aux règles de Chroniques Oubliées Contemporain.
 * L'échelle de santé reste pilotée par hp.base (le MJ peut réduire ou étendre l'échelle d'une créature),
 * avec 20 échelons par défaut à la création.
 */
export default class COC2EncounterData extends EncounterData {
  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const stats = this.parent._stats
    // Pour un acteur neuf, échelle de santé de 20 échelons, vide
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource && !foundry.utils.hasProperty(data, "system.attributes.hp")) {
      this.parent.updateSource({ "system.attributes.hp": { base: HEALTH_SCALE.max, value: HEALTH_SCALE.max } })
    }
  }

  /**
   * Pose automatique des états préjudiciables selon l'échelle de santé
   * @inheritDoc
   */
  async _preUpdate(changes, options, user) {
    if (!foundry.utils.hasProperty(changes, "system.attributes.hp.value")) return
    await applyHealthScaleStatuses(this.parent, changes.system.attributes.hp.value, this.attributes.hp.max)
  }
}
