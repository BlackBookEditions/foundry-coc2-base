# 0.1.0

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
