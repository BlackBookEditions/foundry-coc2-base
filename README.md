# COC2 Base

Module Foundry VTT pour **Chroniques Oubliées Contemporain 2e édition** (COC2), construit au-dessus du système [co2](https://github.com/BlackBookEditions/co2).

Contrairement à `cof2-base`, ce module ne contient pas de compendiums : il adapte les **mécaniques** du système co2 aux règles de COC2.

## Adaptations apportées

- **Échelle de santé** : les Points de Vigueur sont remplacés par une échelle de 20 échelons avec 4 états préjudiciables posés automatiquement (Contusionné à 5, Affaibli à 10, Blessé à 15, Mourant à 20). Elle est rendue en ruban pleine largeur dans le header, sous les caractéristiques. Le malus de l'état atteint (−1 / −3 / −5 / −10) est appliqué automatiquement à l'Initiative et à la Défense, et proposé à cocher dans la fenêtre de jet des tests de FOR, AGI et CON — le livre de règles ne le fait porter que sur les actions physiques, ce que le système ne peut pas deviner. Les états s'excluant mutuellement, les malus ne se cumulent jamais. Le stockage réutilise `attributes.hp` (échelons cochés = `hp.max - hp.value`), ce qui conserve sans modification toute la chaîne de dégâts/soins du système (boutons de chat, queries, barres de token).
- **Progression sans niveaux** : le niveau est gelé et masqué ; les XP gagnés en séance (bouton « +1 séance » dans le header) sont dépensés directement en rangs de voies. Le contrôle de niveau minimal des capacités est supprimé, la progression séquentielle dans la voie est conservée.
- **Initiative et Défense** : Init = 10 + INT + PER, DEF = 10 + AGI + PER (+ armure/bouclier).
- **Attaques** : ATC = FOR et ATD = AGI, sans bonus de niveau. L'attaque magique et les points de magie de COF2 sont retirés de l'interface.
- **États préjudiciables** : la liste des statuts est alignée sur le livre de règles COC2. Affaibli (le dé malus de COF2), Étourdi, Invalide et Paralysé sont retirés — sans équivalent en COC2 ; Asphyxié, Fatigué et Épuisé sont ajoutés ; les malus des états conservés sont réécrits aux valeurs COC2 (Ralenti passe de « aucun effet chiffré » à −5 en Init./DEF/attaques et 5 m, Essoufflé gagne −2 en Init. et DEF, etc.). Les malus qui portent « à tous les tests », « à toutes les actions » ou « aux actions basées sur la vue » ne sont pas appliqués d'office mais proposés à cocher dans les fenêtres de jet.
- **Création** : sous-types de features pour les Domaines professionnels/extra-professionnels et les Traits distinctifs (avantages/désavantages avec coût en points), tranche d'âge sur la fiche.
- **Entraînements martiaux contemporains** : armes à feu, protections balistiques, etc.
- **Thème monochrome** : `style/palette.less` surcharge la palette du système (`systems/co2/styles/palette.less`) par une échelle de gris — l'or, le bleu, le rouge et le vert de la Fantasy disparaissent des fiches, de la sidebar, des fenêtres de jet, des fiches d'objets et des cartes de chat. Les couleurs des résultats de jet (`--co-result-*`) ne sont volontairement pas surchargées : succès, échec, critique et fumble restent des repères de lecture.

## Configuration par un module d'univers

`CONFIG.COC2BASE` est publié dès le chargement du script du module, avant tout hook `init` : un module
d'univers peut donc le modifier depuis son propre hook `init`, quel que soit l'ordre de chargement des
modules.

```js
Hooks.once("init", () => {
  // Clé de traduction ou libellé littéral, les deux fonctionnent
  CONFIG.COC2BASE.healthStates.affaibli.name = "MONMODULE.status.choque"
})
```

Sont prévus pour être surchargés :

| Clé | Rôle | Lue |
|---|---|---|
| `healthStates[<id>].name` / `.img` / `.description` | Libellé, icône et description d'un état de santé | au rendu |
| `healthStates[<id>].changes` | Changes d'ActiveEffect appliqués d'office (Init. et DEF) | à la pose du statut |
| `healthStateMalus[<id>]` | Valeur proposée à cocher sur les tests de caractéristique | au rendu |
| `physicalAbilities` | Caractéristiques auxquelles la ligne des états de santé est proposée | au rendu |
| `stateTestMalus[<id>]` | Malus proposés à cocher pour les autres états (`{ malus, abilities, hint }`) | au rendu |
| `statusChanges[<id>]` | Malus chiffrés des états préjudiciables (`{ init, def, melee, ranged, movement }`) | **au hook `init`** |
| `removedStatusIds` | États du système retirés de la liste | **au hook `init`** |

`statusChanges` et `removedStatusIds` servent à reconstruire `CONFIG.statusEffects` pendant le hook
`init` de coc2-base : un module d'univers qui les modifie doit donc être chargé avant lui. Les autres
clés sont lues au moment du rendu et peuvent être modifiées à tout moment.

```js
CONFIG.COC2BASE.healthStates.blesse.changes = [{ key: "system.combat.def.bonuses.effects", mode: 2, value: -5 }]
CONFIG.COC2BASE.healthStateMalus.blesse = -5
```

La valeur du malus vit à deux endroits parce qu'il s'agit de deux mécanismes distincts : `changes`
pour l'application automatique à l'Initiative et à la Défense, `healthStateMalus` pour la ligne
proposée aux tests de caractéristique. Un module d'univers qui modifie l'un doit modifier l'autre.

En revanche les identifiants (`contusionne`, `affaibli`, `blesse`, `mourant`) et les seuils de
`healthScale` pilotent la mécanique — pose automatique des statuts, flags et couleurs du ruban — et ne
doivent pas être modifiés.

## Architecture

Module « overlay » : le hook `init` du module (exécuté après celui du système) remplace `CONFIG.Actor.documentClass`, `CONFIG.Actor.dataModels.character/encounter` et enregistre une fiche de personnage par défaut. Les classes COC2 héritent des classes co2 et ne surchargent que le nécessaire. Aucune modification du système co2 n'est requise.

## Développement

```bash
npm install
npm run compile   # style/coc-base.less -> coc-base.css (API node du paquet less)
```
