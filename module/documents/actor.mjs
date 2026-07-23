import COActor from "../../../../systems/co2/module/documents/actor.mjs"
import { getStateSkillBonuses, getAgeBracket } from "../config/coc2.mjs"

/**
 * Document Actor COC2 : adapte le document COF2 aux règles de Chroniques Oubliées Contemporain
 */
export default class COC2Actor extends COActor {
  /**
   * Expose le BDM et la CG dans les données de jet, pour que les formules puissent les utiliser :
   * les DM d'une arme de contact s'écrivent « 1d6 + @bdm ».
   * Repli à 0 pour les créatures, qui n'ont ni BDM ni CG : une variable absente n'est pas remplacée
   * par Roll.replaceFormulaData, le terme resterait dans la formule et casserait le jet si une arme
   * de personnage leur était confiée.
   * @inheritDoc
   */
  getRollData() {
    const rollData = super.getRollData()
    rollData.bdm = this.type === "character" ? this.system.attributes.bdm.value : 0
    rollData.cg = this.type === "character" ? this.system.attributes.cg.value : 0
    return rollData
  }

  /**
   * Progression COC2 : pas de niveau minimal pour apprendre une capacité,
   * seule la progression séquentielle dans la voie s'applique.
   * Le rang maximum de la tranche d'âge est signalé mais n'interdit pas l'achat.
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

    // RULE : à la création, le rang de voie accessible est plafonné par la tranche d'âge.
    // Simple avertissement : le MJ reste maître des exceptions, et le compteur de l'onglet Voies signale le dépassement.
    const bracket = getAgeBracket(this.system)
    if (bracket && this.system.isCreation && capacity.system.rank > bracket.maxRank) {
      ui.notifications.warn(
        game.i18n.format("COC2BASE.notif.warningRankAboveAgeBracket", {
          rank: capacity.system.rank,
          maxRank: bracket.maxRank,
          bracket: game.i18n.localize(bracket.label),
        }),
      )
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
   * Maîtrise des armes COC2 : les formations martiales de COF2 (armes restreintes par profil) n'existent pas.
   * N'importe quel personnage utilise n'importe quelle arme sans dé malus.
   * En renvoyant toujours `true`, on neutralise le dé malus d'arme non maîtrisée de rollAttack et on affiche
   * systématiquement l'arme comme maîtrisée dans l'inventaire.
   * @override
   */
  isTrainedWithWeapon(itemId) {
    return true
  }

  /**
   * Maîtrise des armures COC2 : le port d'une protection n'est plus conditionné par une maîtrise et ne bloque
   * plus les capacités. En renvoyant toujours `true`, canUseCapacities reste vrai quelle que soit l'armure portée.
   * @override
   */
  isTrainedWithArmor(itemId) {
    return true
  }

  /**
   * Maîtrise des boucliers COC2 : même règle que les armures, aucun blocage de capacité selon le bouclier porté.
   * @override
   */
  isTrainedWithShield(itemId) {
    return true
  }

  /**
   * Malus d'encombrement COC2 : somme des malus de toutes les protections équipées (armures ET boucliers),
   * renvoyée en négatif. Remplace le calcul COF2 (première armure équipée uniquement) pour prendre en compte
   * le port simultané de plusieurs protections. Source unique du malus fixe : jets d'AGI (rollSkill du système),
   * Initiative et attaque au contact (appliqués par COC2CharacterData).
   * @returns {number} Le malus d'encombrement total (≤ 0).
   * @override
   */
  get malusFromArmor() {
    const protections = [...this.equippedArmors, ...this.equippedShields]
    const total = protections.reduce((sum, item) => sum + (item.system.overloadMalus ?? 0), 0)
    return -total
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
