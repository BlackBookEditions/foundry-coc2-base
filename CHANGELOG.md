# 0.9.0
- Première release officielle
- Ajout des compendiums des voies, capacités, équipement

# 0.8.2
- Ajout de l'échelle d'évolution configurable
- Configuration des statuts spécifiques à COC2

# 0.8.1

## Interface

- XP gagnés en séances éditables directement dans l'en-tête de la fiche de personnage, pour le MJ seul et en mode Édition, en complément du bouton « Fin de séance : +1 XP ». Le total de points de capacité affiché (points de la tranche d'âge + XP gagnés) en découle
- Les capacités apprises pendant la phase de création portent un discret repère dans la case de leur rang, dans l'onglet Voies, visible en mode Édition

## Règles

- Coût des capacités : tant que le personnage n'a gagné aucun XP de séance, il est en phase de création et tout rang coûte 1 point. Une fois que les XPs gagnés sont différents de 0, seuls les rangs achetés à partir de ce moment coûtent leur numéro (rang 3 → 3 XP) ; ceux achetés à la création restent à 1 point. Remettre les XP gagnés à 0 retarife donc l'intégralité du personnage au barème de création, ce qui permet de corriger un historique d'achats sans désapprendre puis réapprendre les capacités

# 0.8.0

## Interface

- Identité visuelle propre au module : adoption de la palette « parchemin » — texture de fond sur toute la fiche, bandeau d'en-tête encre et texte sombre dans les deux thèmes Foundry, clair comme sombre
- Cartes de chat lisibles en thème sombre : les accents de la palette parchemin sont des encres quasi-noires, qui servaient de couleur de titre, de bordure et de bouton sur le fond sombre du journal de chat (bouton « Appliquer les dommages », cartes de jet de compétence). Un jeu d'accents sépia clairs leur est substitué dans ce seul thème
- Logo du module affiché dans la fenêtre d'installation de Foundry

## Corrections

- Clés de traduction affichées brutes (`COC2BASE.healthScale.short`, `COC2BASE.combat.bdm`, `COC2BASE.recovery.cg`…) pour les utilisateurs dont le client Foundry est en anglais : le fichier `lang/fr.json` est désormais déclaré sous les langues `fr` et `en`, comme le fait le système `co2`

## Technique

- Imports du point d'entrée alignés sur le mécanisme du système `co2` : un barrel `_module.mjs` par dossier, consommé par des imports de namespace
- Le module expose son API sous `game.modules.get("coc2-base").api` (`models`, `documents`, `applications`, `config`), sur le modèle de `game.system.api`

# 0.7.0

Première version du module : adaptation du système `co2` aux règles de Chroniques Oubliées Contemporain 2e édition.

## Fiche de personnage

- Gestion de l'échelle de santé
- Ajout d'une seconde échelle (conscience) avec libellé de palier, sans statut de token ni entrée dans le HUD
- Gestion des traits distinctifs : compteur et contrôle dans l'onglet Biographie (équilibre, plafond de 5)
- Gestion des tranches d'âge : points de capacité, nombre maximum de voies et rang maximum de voies
- Masquage de tout ce qui est lié à l'ATM et aux PM
- Richesse exprimée en `$` par défaut
- Affichage du BDM (bonus de dommages au contact) et de la CG (capacité de guérison), avec bonus de fiche
- Bouton de repos hebdomadaire : décoche CG échelons de l'échelle de santé
- Protections : marqueur d'encombrement à côté de l'AGI, colonnes RD, Encombrement et Cumulable dans l'inventaire (avec avertissement si l'encombrement n'est pas renseigné, et ligne barrée pour une protection non retenue), et ligne nommant la source du malus dans la fenêtre de test d'AGI
- Retrait du malus d'encombrement affiché sur la DEF : en COC2 la DEF n'est pas concernée
- Retrait des coches de maîtrise des armes, armures et boucliers dans l'inventaire : notion absente de COC2

## Règles

- Adaptation de l'initiative et de la défense
- Protections : RD (réduction de dégâts) et malus d'encombrement fixe, en lieu et place de la DEF d'armure et du plafond d'AGI de Chroniques Oubliées Fantasy — le malus porte sur l'Initiative, l'ATC et les tests d'AGI, jamais sur la valeur d'AGI, la DEF ni l'ATD
- Protections cumulables : case Cumulable sur les armures et les boucliers. Sont retenues la meilleure des protections non cumulables et toutes les protections cumulables (le casque complète l'armure, un second gilet non) ; RD et encombrement se calculent sur ce seul ensemble, et le joueur est averti à l'équipement d'une protection écartée
- Ajout du BDM (= FOR), utilisable dans les formules de dommages sous `@bdm`, et de la CG (= CON + 3)
- Gestion des statuts d'état
- Récupération et DM temporaires : règles propres à Chroniques Oubliées Fantasy, désactivées par le module
- Réussite critique : ajout du bonus critique (BC) de l'arme aux dommages, en lieu et place du doublement des DM de Chroniques Oubliées Fantasy
- Champ BC sur les armes et sur les attaques des créatures, laissé vide pour un calcul automatique (maximum du dé de dommages)
- BC de référence de l'acteur utilisable dans les formules sous `@bc`, pour les capacités qui l'ajoutent hors critique (ex. Attaque déloyale)

## Interface

- Thème visuel COC2
- Adaptation COC2 de la mini-fiche, BDM et CG compris (avec bouton de repos)
- Adaptation COC2 de l'application « Groupe de joueurs », colonnes BDM et CG comprises
