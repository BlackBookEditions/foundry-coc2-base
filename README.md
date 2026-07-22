# COC2 Base

Module Foundry VTT pour **Chroniques Oubliées Contemporain 2e édition** (COC2), construit au-dessus du système [co2](https://github.com/BlackBookEditions/co2).

Contrairement à `cof2-base`, ce module ne contient pas de compendiums : il adapte les **mécaniques** du système co2 aux règles de COC2.

## Adaptations apportées

- **Échelle de santé** : les Points de Vigueur sont remplacés par une échelle de 20 échelons avec 4 états préjudiciables posés automatiquement (Contusionné à 5, Blessé à 10, Gravement blessé à 15, Mourant à 20). Le stockage réutilise `attributes.hp` (échelons cochés = `hp.max - hp.value`), ce qui conserve sans modification toute la chaîne de dégâts/soins du système (boutons de chat, queries, barres de token).
- **Progression sans niveaux** : le niveau est gelé et masqué ; les XP gagnés en séance (bouton « +1 séance » dans le header) sont dépensés directement en rangs de voies. Le contrôle de niveau minimal des capacités est supprimé, la progression séquentielle dans la voie est conservée.
- **Initiative et Défense** : Init = 10 + INT + PER, DEF = 10 + AGI + PER (+ armure/bouclier).
- **Création** : sous-types de features pour les Domaines professionnels/extra-professionnels et les Traits distinctifs (avantages/désavantages avec coût en points), tranche d'âge sur la fiche.
- **Entraînements martiaux contemporains** : armes à feu, protections balistiques, etc.

## Architecture

Module « overlay » : le hook `init` du module (exécuté après celui du système) remplace `CONFIG.Actor.documentClass`, `CONFIG.Actor.dataModels.character/encounter` et enregistre une fiche de personnage par défaut. Les classes COC2 héritent des classes co2 et ne surchargent que le nécessaire. Aucune modification du système co2 n'est requise.

## Développement

```bash
npm install
npm run compile   # style/coc-base.less -> coc-base.css (API node du paquet less)
```
