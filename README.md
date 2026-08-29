# COC2 Base

Module Foundry VTT pour **Chroniques Oubliées Contemporain 2e édition** (COC2), construit au-dessus du système [co2](https://github.com/BlackBookEditions/co2).

Contrairement à `cof2-base`, ce module ne contient pas de compendiums : il adapte les **mécaniques** du système co2 aux règles de COC2.

## Adaptations apportées

- **Échelle de santé** : les Points de Vigueur sont remplacés par une échelle de 20 échelons avec 4 états préjudiciables posés automatiquement (Contusionné à 5, Affaibli à 10, Blessé à 15, Mourant à 20). Elle est rendue en ruban pleine largeur dans le header, sous les caractéristiques. Le malus de l'état atteint (−1 / −3 / −5 / −10) est appliqué automatiquement à l'Initiative et à la Défense, et proposé à cocher dans la fenêtre de jet des tests de FOR, AGI et CON — le livre de règles ne le fait porter que sur les actions physiques, ce que le système ne peut pas deviner. Les états s'excluant mutuellement, les malus ne se cumulent jamais. Le stockage réutilise `attributes.hp` (échelons cochés = `hp.max - hp.value`), ce qui conserve sans modification toute la chaîne de dégâts/soins du système (boutons de chat, queries, barres de token).
- **Échelle d'évolution optionnelle** : le réglage de monde affiche une seconde échelle de 20 échelons et rend disponibles, dans les fenêtres de tests, un bonus et un malus contextuels configurables. Chaque palier (5/10/15/20) accepte indépendamment une valeur nulle, positive ou négative ; les caractéristiques cibles et les libellés de contexte sont communs à l'échelle. Les valeurs proposées par défaut sont ±1/±3/±5/±10, sans caractéristique cible, donc sans effet tant que le MJ ne les configure pas.
- **Progression sans niveaux** : le niveau est gelé et masqué ; les points de capacité accordés à la création par la tranche d'âge, puis les XP gagnés en séance (bouton « +1 séance » dans le header), sont dépensés directement en rangs de voies. **Un point achète un rang, quel que soit le rang** — là où COF2 facturait 2 points aux rangs 3 et plus. Le contrôle de niveau minimal des capacités est supprimé, la progression séquentielle dans la voie est conservée.
- **Initiative et Défense** : Init = 10 + INT + PER, DEF = 10 + AGI + PER (+ armure/bouclier).
- **Attaques** : ATC = FOR et ATD = AGI, sans bonus de niveau. L'attaque magique et les points de magie de COF2 sont retirés de l'interface.
- **États préjudiciables** : la liste des statuts est alignée sur le livre de règles COC2. Affaibli (le dé malus de COF2), Étourdi, Invalide et Paralysé sont retirés — sans équivalent en COC2 ; Asphyxié, Fatigué et Épuisé sont ajoutés ; les malus des états conservés sont réécrits aux valeurs COC2 (Ralenti passe de « aucun effet chiffré » à −5 en Init./DEF/attaques et 5 m, Essoufflé gagne −2 en Init. et DEF, etc.). Les malus qui portent « à tous les tests », « à toutes les actions » ou « aux actions basées sur la vue » ne sont pas appliqués d'office mais proposés à cocher dans les fenêtres de jet.
- **Création** : sous-types de features pour les Domaines professionnels/extra-professionnels et les Traits distinctifs (avantages/désavantages avec coût en points). La tranche d'âge choisie sur la fiche pilote le budget de points de capacité et les plafonds de création :

  | Tranche d'âge | Points de capacité | Nb max de voies | Rang max de voie |
  |---|---|---|---|
  | Jeune (16 à 30 ans) | 4 | 4 | 2 |
  | Adulte (31 à 50 ans) | 7 | 5 | 3 |
  | Expérimenté (51 à 65 ans) | 10 | 6 | 4 |

  Les points alimentent `attributes.xp.max` et sont donc décomptés par les compteurs d'XP du système. Les plafonds de voies et de rang ne sont **que signalés** (compteur permanent dans l'onglet Voies, avertissement à l'achat), jamais bloquants, et uniquement tant que le personnage n'a gagné aucun XP de séance : passée la création, la progression est libre.
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
| `ageBrackets[<id>].label` / `.capacityPoints` / `.maxPaths` / `.maxRank` | Libellé et quotas de création d'une tranche d'âge | au rendu |
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

Module « overlay » : le hook `init` du module (exécuté après celui du système) remplace `CONFIG.Actor.documentClass`, `CONFIG.Actor.dataModels.character/encounter` et enregistre une fiche de personnage par défaut. Les classes COC2 héritent des classes co2 et ne surchargent que le nécessaire. La présélection des modificateurs contextuels repose sur l'API de jet fournie par la version compatible de `co2`.

## Développement

### Templates ApplicationV2

Chaque template Handlebars déclaré comme une entrée de `ApplicationV2.PARTS` doit produire exactement
un élément HTML racine. Envelopper donc tout le contenu de chaque part dans un conteneur unique, même
si le template contient plusieurs blocs frères (`p`, `fieldset`, `footer`, etc.).

```bash
npm install
npm run compile   # style/coc-base.less -> coc-base.css (API node du paquet less)
```
