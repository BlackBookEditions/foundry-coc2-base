# Analyse des différences : Chroniques Oubliées Contemporain 2 (COC2) vs Fantasy 2 (COF2)

Ce document synthétise les différences majeures entre les deux systèmes, avec les extraits officiels tirés du livre de règles de COC2.

## 1. La santé et les dommages (Disparition des Points de Vie)
**Résumé :** COC2 abandonne le système classique de Points de Vigueur (PV) ou Points de Vie de COF2 au profit d'une "Échelle de santé" composée de 20 échelons [1-3]. Cette échelle est jalonnée de quatre états préjudiciables qui reflètent la dégradation physique et de plus en plus grave du personnage [3].

> **Extrait COC2 :**
> « La disparition des niveaux, des points de vie et du dé de vie : ces attributs au cœur du système de jeu historique de Chroniques Oubliées ne permettaient pas de retranscrire l’ambiance plus « réaliste » de récits se déroulant dans un monde contemporain. Elles ont donc été remplacées par d’autres mécanismes. » [2]
> « Une échelle de santé permet de tenir la comptabilité des blessures subies par un personnage et de refléter son état de santé à tout moment. Elle est composée de 20 échelons et de quatre états de santé, qui apparaissent tous les 5 échelons, de contusionné (échelon 5) à mourant (échelon 20). » [3]

## 2. La suppression des Niveaux et la nouvelle Progression
**Résumé :** Contrairement à COF2 qui utilise un système par paliers (niveaux), COC2 abolit complètement cette notion [2]. La progression se fait de manière fluide : les points d'expérience gagnés à chaque séance sont dépensés directement pour acheter de nouveaux rangs dans les Voies [4].

> **Extrait COC2 :**
> « Le système de progression : en l’absence de niveaux, la progression des personnages se fait à travers le gain et la dépense de points d’expérience. Très simple d’utilisation, ce mécanisme permet aux personnages de gagner en aptitude en acquérant de nouvelles voies et rangs. » [2]
> « Un personnage gagne un point d’expérience par séance de jeu. Ces points d’expérience peuvent uniquement être utilisés pour acquérir de nouveaux rangs de voies. Le personnage ne progresse donc qu’à travers ces dernières... » [4]

## 3. La création de personnages : Domaines, Âge et Traits
**Résumé :** Au lieu de croiser un Peuple et un Profil [5, 6], COC2 ancre le personnage dans son époque via un Domaines professionnel ou extra-professionnel [7]. De plus, l'âge du personnage détermine le nombre de voies et de caractéristiques accessibles [8]. Enfin, la création s'enrichit d'un système d'Avantages et de Désavantages pour typer l'historique [9].

> **Extrait COC2 :**
> « Les tableaux « Domaines professionnels » et « Domaines extra-professionnels » [...] vous proposent une liste d’activités classées (métiers et occupations) par domaine. » [7]
> « Le nombre de voies et de rangs par voie accessible à la création est déterminé par la tranche d’âge du PJ... » [8]
> « CHOISIR SES TRAITS DISTINCTIFS : Si vous le souhaitez, vous pouvez enrichir l’historique de votre personnage en acquérant jusqu’à cinq points d’avantages et autant de désavantages dans les listes suivantes. » [9]

Quotas par tranche d'âge :

| Tranche d'âge | Points de capacité | Nombre max de voies | Rang max de voies |
|---|---|---|---|
| 16 à 30 ans | 4 | 4 | 2 |
| 31 à 50 ans | 7 | 5 | 3 |
| 51 à 65 ans | 10 | 6 | 4 |

Le coût d'un rang diffère également de COF2, où les rangs 3 et plus valaient 2 points de capacité :

> « Un point de capacité permet d’acheter un rang dans une voie. »

## 4. Le calcul des Caractéristiques Secondaires
**Résumé :** Bien que le jeu ajoute officiellement la Volonté (VOL) pour porter le nombre de caractéristiques à 7 [10], c'est surtout le mode de calcul des statistiques de combat qui diffère de COF2 pour rééquilibrer le système [2]. L'Initiative intègre désormais l'Intelligence, et la Défense intègre la Perception [11].

> **Extrait COC2 :**
> « La manière dont certaines caractéristiques secondaires sont calculées : certains modes de calculs ont été modifiés par souci d’équilibrage entre les caractéristiques principales. » [2]
> « Initiative (Init.) : cette valeur est égale à 10 + INT + PER. [...] Défense (DEF) : cette valeur est égale à 10 + AGI + PER. » [11]

### 4 bis. Le BDM et la CG
**Résumé :** COC2 nomme et isole deux valeurs dérivées que COF2 ne connaît pas. Le **BDM** (bonus de dommages au contact) est égal à la Force et s'ajoute aux DM de base de l'arme sur une attaque au contact ou à mains nues. La **CG** (capacité de guérison) est égale à CON + 3 et exprime le rythme naturel de récupération, en échelons de l'échelle de santé regagnés par semaine de repos.

> **Extrait COC2 :**
> « BDM (Bonus de dommages au contact) : il s'agit de la valeur qui vient s'ajouter aux dommages (DM) de base de l'arme lorsque le personnage réussit une attaque au contact ou à mains nues. Ce bonus est égal à la Force (FOR) du personnage. »
> « CG (Capacité de guérison) : c'est la valeur qui indique le rythme naturel auquel le personnage récupère de ses blessures (points de dommages ou échelons de l'échelle de santé) lorsqu'il se repose et qu'il est stabilisé. Elle est généralement égale à Constitution (CON) + 3 et s'exprime en points récupérés par semaine. »

**Mise en œuvre dans le module :** les deux valeurs sont calculées et affichées dans la barre latérale de la fiche, avec un bonus de fiche éditable, ainsi que dans la Vue actions et dans le tableau du groupe de joueurs. Le BDM est exposé dans les données de jet sous `@bdm` : c'est la formule de dommages de l'arme qui le porte (« 1d6 + @bdm »), afin de ne pas le compter deux fois avec les modificateurs `damMelee` que le système ajoute déjà au jet de dommages. La CG est accompagnée d'un bouton de repos qui décoche CG échelons de l'échelle de santé.

## 5. Les Échelles d'évolution narrative
**Résumé :** Pour gérer des mécaniques narratives propres à certains univers (comme la santé mentale, la corruption ou l'héroïsme), COC2 introduit des Échelles d'évolution personnalisables qui accompagnent l'Échelle de santé [12, 13].

> **Extrait COC2 :**
> « En plus de l’échelle de santé, les personnages peuvent être dotés d’une seconde échelle, l’échelle d’évolution, spécifique à chaque univers de Chroniques Oubliées Contemporain... » [12]
> « En plus de l’échelle de santé, une seconde échelle permet de refléter l’évolution du personnage dans l’univers dans lequel il évolue. Entre autres choses, elle peut servir à mesurer la progression vers un objectif personnel, l’étendue de pouvoirs, la gravité de traumatismes ou d’une malédiction ou encore, l’impact de l’acquisition de connaissances interdites sur la psyché. » [13]

## 6. La règle optionnelle des 3d6
**Résumé :** Pour s'éloigner du côté extrêmement épique et aléatoire du dé à 20 faces de la Fantasy, COC2 propose un système optionnel remplaçant le d20 par le lancer de 3d6 [10, 14]. Cela produit une courbe de résultats en cloche, rendant les actions beaucoup plus prévisibles et dramatiques [14].

> **Extrait COC2 :**
> « JOUER AVEC 3D6 : Par défaut, le système de jeu de Chroniques Oubliées Contemporain utilise l’iconique d20. L’aléa propre au d20 est adapté aux épopées héroïques des univers médiévaux-fantastiques ou au style haut en couleur des récits d’aventures Pulp [...] Toutefois, si vous souhaitez donner une tonalité plus dramatique à vos parties, vous pouvez limiter l’aléa de vos jets de dés en remplaçant le d20 par 3d6 lors des tests. » [14]
## 7. La réussite critique : le Bonus Critique au lieu du doublement des DM
**Résumé :** En COF2, une réussite critique double les dommages infligés. COC2 remplace ce doublement par un **Bonus Critique (BC)** : un nombre fixe de DM ajouté au jet de dommages, égal au résultat maximum du dé de dommages de l'arme, sans tenir compte du bonus de FOR ou du BDM. Mains nues (1d4) → BC +4 ; pistolet moyen (1d8) → BC +8 ; fusil d'assaut (1d12) → BC +12.

Le droit au critique dépend par ailleurs du rôle narratif de l'adversaire : les **Figurants** et les **Seconds rôles** ne peuvent pas obtenir de réussite critique, seuls les **Premiers rôles** le peuvent, sur un 20. Les créatures conservent le critique du système et disposent d'un BC propre, précisé par leur fiche technique (ainsi les griffes de *Celui qui hante les ténèbres*, 1d8+7 DM et BC +8) ; certaines capacités monstrueuses s'appuient explicitement sur cette valeur, comme l'*Attaque déloyale* qui ajoute le BC aux dommages d'une attaque par surprise, et une seconde fois sur une véritable réussite critique.
