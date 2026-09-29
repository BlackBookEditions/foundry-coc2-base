/**
 * Point d'entrée de compatibilité de la configuration COC2.
 *
 * Le contenu est découpé par domaine de règles dans les fichiers voisins ; ce barrel préserve les
 * imports historiques de ce chemin — un module d'univers dépendant (cf. cth-base) et les tests de
 * `test/` l'importent en dur. Au sein du module, préférer l'import direct du fichier de domaine :
 * `import { computeAutoCriticalBonus } from "../config/combat.mjs"`.
 *
 * `settings.mjs` n'est volontairement pas ré-exporté : il dépend des applications, donc du système co2,
 * et ce barrel doit rester chargeable hors de Foundry (tests node).
 */
export * from "./effect-changes.mjs"
export * from "./health-scale.mjs"
export * from "./second-scale.mjs"
export * from "./statuses.mjs"
export * from "./items.mjs"
export * from "./character.mjs"
export * from "./encounters.mjs"
export * from "./combat.mjs"
export * from "./system-patch.mjs"
