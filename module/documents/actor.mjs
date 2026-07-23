import COActor from "../../../../systems/co2/module/documents/actor.mjs"
import { getStateSkillBonuses, getAgeBracket, MINIMUM_DAMAGE } from "../config/coc2.mjs"

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
    rollData.bc = this.referenceCriticalBonus
    return rollData
  }

  /**
   * Bonus critique de référence de l'acteur, exposé aux formules sous `@bc` sur le modèle de `@arme.dmg` :
   * celui de la première arme équipée pour un personnage, celui de la première attaque pour une créature.
   *
   * Sert aux capacités qui manipulent le BC en dehors d'une réussite critique — ainsi l'Attaque déloyale,
   * qui ajoute le BC de la créature à ses dommages quand elle attaque par surprise : sa formule s'écrit
   * `@arme.dmg + @bc`. Sur une véritable réussite critique, le BC ajouté automatiquement au jet vient s'y
   * ajouter une seconde fois, comme le prévoit la capacité.
   * @returns {number} Le bonus critique de référence, 0 si l'acteur n'a ni arme équipée ni attaque
   */
  get referenceCriticalBonus() {
    const source = this.type === "character" ? this.equippedWeapons[0] : this.items.find((item) => item.type === "attack")
    return source?.system?.criticalBonusValue ?? 0
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
   * Y ajoute, sur les tests d'AGI, une ligne nommant la source du malus d'encombrement déjà pré-rempli.
   * @inheritDoc
   */
  getSkillBonuses(ability) {
    const bonuses = super.getSkillBonuses(ability)
    bonuses.push(...getStateSkillBonuses(this, ability))

    // Encombrement des protections : rollSkill du système pré-remplit déjà le champ « Malus » de la fenêtre
    // pour les tests d'AGI, sans dire d'où vient le chiffre. On ajoute donc une ligne purement informative,
    // de valeur 0 : les lignes de bonus sont cochables et s'ajoutent au total, une valeur réelle compterait
    // le malus une seconde fois. Le pré-remplissage du système valant pour tout acteur, on ne filtre pas sur le type.
    const armorMalus = this.malusFromArmor
    if (ability === "agi" && armorMalus) {
      bonuses.push({
        sourceType: "coc2Encumbrance",
        name: game.i18n.localize("COC2BASE.equipment.encumbranceRollName"),
        description: game.i18n.localize("COC2BASE.equipment.encumbranceRollName"),
        pathName: game.i18n.localize("COC2BASE.equipment.encumbrancePathName"),
        hasPathName: true,
        value: 0,
        additionalInfos: game.i18n.format("COC2BASE.equipment.encumbranceRollHint", { malus: armorMalus }),
      })
    }

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
   * Protections équipées, armures et boucliers confondus.
   * @returns {COItem[]}
   */
  get equippedProtections() {
    return [...this.equippedArmors, ...this.equippedShields]
  }

  /**
   * Protections COC2 effectivement prises en compte : la meilleure des protections non cumulables, plus
   * toutes les protections cumulables. Un gilet ne se cumule pas avec un autre gilet, un casque s'ajoute
   * à celui qui est retenu (cf. le champ `cumulative` de COC2EquipmentData).
   *
   * Armures et boucliers forment un seul ensemble : porter un gilet et un bouclier tous deux non
   * cumulables n'en retient qu'un. À RD égale, on retient la protection la moins encombrante, pour ne pas
   * pénaliser le personnage sur un départage arbitraire.
   *
   * Source unique de la RD et du malus d'encombrement : une protection écartée ici ne protège pas et ne
   * gêne pas non plus.
   * @returns {COItem[]}
   */
  get retainedProtections() {
    const cumulative = []
    let best = null
    for (const item of this.equippedProtections) {
      if (item.system.cumulative) {
        cumulative.push(item)
        continue
      }
      if (!best) {
        best = item
        continue
      }
      const rd = item.system.totalDefense ?? 0
      const bestRd = best.system.totalDefense ?? 0
      if (rd > bestRd || (rd === bestRd && (item.system.overloadMalus ?? 0) < (best.system.overloadMalus ?? 0))) best = item
    }
    return best ? [best, ...cumulative] : cumulative
  }

  /**
   * Protections équipées écartées du calcul : les protections non cumulables qu'une autre, meilleure, supplante.
   * Consommée par la fiche (marquage de l'inventaire) et par l'avertissement à l'équipement.
   * @returns {COItem[]}
   */
  get ignoredProtections() {
    const retained = new Set(this.retainedProtections.map((item) => item.id))
    return this.equippedProtections.filter((item) => !retained.has(item.id))
  }

  /**
   * Malus d'encombrement COC2 : somme des malus des protections retenues, renvoyée en négatif. Remplace le
   * calcul COF2 (première armure équipée uniquement) pour prendre en compte le port simultané de plusieurs
   * protections (casque + gilet, gilet + bouclier). Source unique du malus fixe : tests d'AGI (rollSkill du
   * système), Initiative et attaque au contact (appliqués par COC2CharacterData).
   * La caractéristique AGI, la DEF et l'ATD ne sont pas minorées : le livre de règles ne vise que les tests.
   * @returns {number} Le malus d'encombrement total (≤ 0).
   * @override
   */
  get malusFromArmor() {
    const total = this.retainedProtections.reduce((sum, item) => sum + (item.system.overloadMalus ?? 0), 0)
    return -total
  }

  /**
   * RD (réduction de dégâts) COC2 : somme de la protection des protections retenues, pour gérer le cumul
   * casque + armure. En COC2 le champ `defense` de l'équipement porte la RD (il n'alimente plus la DEF) ;
   * `magicalDefense` étant inutilisé, totalDefense = defense.
   * Alimente combat.dr (cf. COC2CharacterData._prepareDR), soustrait des DM par le pipeline du système.
   * @returns {number} La RD totale des protections retenues (≥ 0).
   */
  get protectionRD() {
    return this.retainedProtections.reduce((sum, item) => sum + (item.system.totalDefense ?? 0), 0)
  }

  /**
   * Avertit le joueur quand la protection qu'il vient d'équiper entre en concurrence avec une autre : seule
   * la meilleure des protections non cumulables compte, les autres ne protègent ni ne gênent.
   *
   * L'avertissement est posé ici et non dans la préparation des données, qui est rejouée à chaque calcul de
   * fiche et noierait l'interface de notifications. Le marquage de l'inventaire prend le relais une fois la
   * notification disparue.
   * @inheritDoc
   */
  async toggleEquipmentEquipped(itemId, bypassChecks) {
    await super.toggleEquipmentEquipped(itemId, bypassChecks)

    const item = this.items.get(itemId)
    if (!item?.system.equipped) return
    if (!item.system.isArmor && !item.system.isShield) return

    const ignored = this.ignoredProtections
    if (ignored.length === 0) return

    ui.notifications.warn(
      game.i18n.format("COC2BASE.equipment.protectionIgnoredWarning", {
        retained: this.retainedProtections.find((protection) => !protection.system.cumulative)?.name ?? "",
        ignored: ignored.map((protection) => protection.name).join(", "),
      }),
    )
  }

  /**
   * Minimum de dommages COC2 : une attaque qui touche inflige toujours au moins 1 DM, même si les malus
   * de caractéristiques ramènent la formule à zéro ou dans le négatif. Le clamp porte sur les dommages
   * de la formule, en amont de la réduction de dommages : la RD garde le droit de tout absorber.
   * C'est le seul point de passage à intercepter, toutes les applications de dégâts convergeant ici, et
   * la méthode du système sortant sans rien faire dès que le total est nul.
   * @inheritDoc
   */
  async applyDamage({ damage, ...rest } = {}) {
    // Une valeur non numérique est laissée telle quelle : c'est au système de la rejeter
    const clamped = Number.isFinite(damage) && damage <= 0 ? MINIMUM_DAMAGE : damage
    return super.applyDamage({ damage: clamped, ...rest })
  }

  /**
   * Contrôle informatif des XP disponibles après apprentissage : en COC2 les rangs s'achètent avec les XP de séance.
   * Mémorise en plus la PHASE d'acquisition de chaque capacité (création vs jeu) via le flag `coc2-base.learnedInPlay`,
   * consommé par COC2CapacityData.getXpCost pour facturer 1 à la création et le rang visé en jeu.
   * @inheritDoc
   */
  async toggleCapacityLearned(capacityId, state) {
    await super.toggleCapacityLearned(capacityId, state)

    if (this.type !== "character") return

    // La capacité et son éventuelle capacité liée sont basculées par super : on synchronise le flag de phase sur
    // leur état `learned` réel (super peut refuser l'apprentissage — ordre séquentiel — sans changer `learned`).
    const capacity = this.items.get(capacityId)
    if (capacity) await this.#syncLearnedPhase(capacity)
    if (capacity?.system.allowLinkedCapacity && capacity.system.linkedCapacity) {
      const linked = await fromUuid(capacity.system.linkedCapacity)
      if (linked && linked.actor === this) await this.#syncLearnedPhase(linked)
    }

    if (state) {
      const available = await this.system.getAvailableXP()
      if (available < 0) ui.notifications.warn(game.i18n.localize("COC2BASE.notif.warningNotEnoughXP"))
    }
  }

  /**
   * Aligne le flag `coc2-base.learnedInPlay` d'une capacité sur son état appris courant :
   * posé (= phase de jeu ou non) à l'apprentissage, retiré au désapprentissage pour qu'un ré-apprentissage
   * ultérieur réévalue la phase. N'écrit que si la valeur change, pour éviter un update/re-render inutile.
   * @param {COItem} capacity La capacité dont synchroniser le flag
   */
  async #syncLearnedPhase(capacity) {
    const current = capacity.getFlag("coc2-base", "learnedInPlay")
    if (capacity.system.learned) {
      const learnedInPlay = !this.system.isCreation
      if (current !== learnedInPlay) await capacity.setFlag("coc2-base", "learnedInPlay", learnedInPlay)
    } else if (current !== undefined) {
      await capacity.unsetFlag("coc2-base", "learnedInPlay")
    }
  }
}
