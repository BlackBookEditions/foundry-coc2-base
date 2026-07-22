import COActor from "../../../../systems/co2/module/documents/actor.mjs"
import { getStateSkillBonuses } from "../config/coc2.mjs"

/**
 * Document Actor COC2 : adapte le document COF2 aux règles de Chroniques Oubliées Contemporain
 */
export default class COC2Actor extends COActor {
  /**
   * Progression COC2 : pas de niveau minimal pour apprendre une capacité,
   * seule la progression séquentielle dans la voie s'applique
   * @override
   */
  canLearnCapacity(capacity, path) {
    if (this.type === "encounter") return true

    // RULE : Pour apprendre une capacité, il faut avoir appris les précédentes
    const pos = path.system.getCapacityRank(capacity.uuid)
    for (let i = 0; i < pos; i++) {
      const c = path.system.capacities[i]
      const { id } = foundry.utils.parseUuid(c)
      const current = this.items.get(id)
      if (!current.system.learned) {
        ui.notifications.warn(game.i18n.localize("CO.notif.warningNeedLearnedCapacities"))
        return false
      }
    }

    return true
  }

  /**
   * Propose dans la fenêtre de jet les malus des états actifs qui ne sont pas exprimables en
   * ActiveEffect : ceux qui portent « à tous les tests », « à toutes les actions » ou « aux actions
   * basées sur la vue ». Les caractéristiques ne sont volontairement pas modifiées pour ne pas
   * pénaliser deux fois la DEF et les attaques qui en dérivent.
   * @inheritDoc
   */
  getSkillBonuses(ability) {
    const bonuses = super.getSkillBonuses(ability)
    bonuses.push(...getStateSkillBonuses(this, ability))
    return bonuses
  }

  /**
   * Contrôle informatif des XP disponibles après apprentissage : en COC2 les rangs s'achètent avec les XP de séance
   * @inheritDoc
   */
  async toggleCapacityLearned(capacityId, state) {
    await super.toggleCapacityLearned(capacityId, state)

    if (state && this.type === "character") {
      const available = await this.system.getAvailableXP()
      if (available < 0) ui.notifications.warn(game.i18n.localize("COC2BASE.notif.warningNotEnoughXP"))
    }
  }
}
