import { CORoll } from "../../../../systems/co2/module/documents/_module.mjs"
import { getCriticalBonus } from "../config/combat.mjs"

/**
 * Réussite critique COC2 : au lieu de doubler les dommages (COF2), on ajoute le bonus critique (BC) de
 * l'arme ou de l'attaque, égal par défaut au maximum de son dé de dommages.
 *
 * Le hook est appelé juste après l'évaluation des jets et avant que le système ne sérialise le jet de
 * dommages dans le message d'attaque (`linkedRoll`) : le BC se propage donc à tous les chemins d'affichage
 * (jet combiné, jet différé, jet opposé, recréation après un point de chance).
 *
 * Le jet n'est pas relancé : on reconstruit un jet équivalent à partir de ses termes déjà évalués, auxquels
 * on ajoute un terme fixe. Le total de la carte de chat, et donc tout le pipeline d'application des dégâts
 * (RD, minimum de dommages), suit sans autre intervention. Le multiplicateur ×2 que le système
 * présélectionne sur un critique est neutralisé par COC2ActionMessageData.
 */
export function onPostRollAttack(item, options, rolls) {
  if (options.type !== "attack" || !rolls || rolls.length < 2) return

  const result = CORoll.analyseRollResult(rolls[0], options.hasAttackSuccessThreshold, options.attackSuccessThreshold)
  if (!result.isCritical) return

  // options.damageFormula est figé avant l'ajout des modificateurs de dommages et des options tactiques :
  // c'est la formule de base de l'arme, dés intacts, dont le BC ne doit dépendre que des dés (LdR).
  const bc = getCriticalBonus(item, options.damageFormula)
  if (bc <= 0) return

  const damageRoll = rolls[1]
  const { NumericTerm, OperatorTerm } = foundry.dice.terms
  const plus = new OperatorTerm({ operator: "+" })
  const bonus = new NumericTerm({ number: bc, options: { flavor: game.i18n.localize("COC2BASE.equipment.bcFlavor") } })
  bonus.evaluate()

  const newRoll = damageRoll.constructor.fromTerms([...damageRoll.terms, plus, bonus], { ...damageRoll.options })
  newRoll.options.formulaDamage = newRoll.formula
  rolls[1] = newRoll
}
