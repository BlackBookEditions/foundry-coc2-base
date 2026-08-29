/**
 * Échelle de santé COC2 : 20 échelons, 4 états préjudiciables tous les 5 échelons.
 * Les états sont définis en proportion de l'échelle pour supporter une échelle étendue (bonus/modifiers).
 * Le stockage réutilise attributes.hp : échelons cochés = hp.max - hp.value
 */
export const HEALTH_SCALE = {
  max: 20,
  states: [
    { id: "contusionne", threshold: 0.25 },
    { id: "affaibli", threshold: 0.5 },
    { id: "blesse", threshold: 0.75 },
    { id: "mourant", threshold: 1 },
  ],
}

/**
 * Base de la capacité de guérison (CG) : CG = CON + 3.
 * La CG est le rythme naturel de récupération d'un personnage qui se repose et qui est stabilisé,
 * exprimé en points de dommages (échelons de l'échelle de santé) récupérés par semaine.
 * Exposée dans CONFIG.COC2BASE.healingCapacityBase et lue au calcul : surchargeable à tout moment.
 */
export const HEALING_CAPACITY_BASE = 3

/**
 * Seconde échelle COC2 (« Échelle » dans coc2-base, « Échelle de conscience » dans un module d'univers).
 * Compteur de 20 échelons avec 4 paliers à seuils (échelons 5/10/15/20). Les paliers servent
 * UNIQUEMENT à afficher un libellé de niveau sur la fiche : ce ne sont PAS des statuts, rien n'est
 * ajouté à CONFIG.statusEffects ni posé sur le token. Affichage commandé par le réglage
 * `showSecondScale` (ou le flag `CONFIG.COC2BASE.secondScale.forced`).
 * Le stockage utilise attributes.secondScale.value = nombre d'échelons cochés (0 = échelle vide).
 */
export const SECOND_SCALE = {
  max: 20,
  states: [
    { id: "secondState1", threshold: 0.25 },
    { id: "secondState2", threshold: 0.5 },
    { id: "secondState3", threshold: 0.75 },
    { id: "secondState4", threshold: 1 },
  ],
}

/**
 * Libellés des paliers de la seconde échelle, pour AFFICHAGE UNIQUEMENT (nom du niveau atteint sur la
 * fiche). Ce ne sont PAS des statuts (aucune entrée CONFIG.statusEffects, aucun malus). Indexés par id
 * et surchargeables via CONFIG.COC2BASE.secondScale.states (cf. cth → conscience : Profane/Initié/…).
 */
export const SECOND_SCALE_STATES = Object.fromEntries(
  SECOND_SCALE.states.map((state) => [
    state.id,
    { id: state.id, name: `COC2BASE.secondScale.status.${state.id}`, description: `COC2BASE.secondScale.status.${state.id}Description` },
  ]),
)

/**
 * Malus de chaque état de santé (LdR ch. 5, table « Les états de santé »).
 * Le livre de règles l'applique à l'Init., à la DEF et à toutes les actions physiques.
 */
export const HEALTH_STATE_MALUS = {
  contusionne: -1,
  affaibli: -3,
  blesse: -5,
  mourant: -10,
}

/**
 * Caractéristiques concernées par le malus des états de santé : la règle vise les actions physiques.
 */
export const PHYSICAL_ABILITIES = ["for", "agi", "con"]

/** Champs visés par les malus chiffrés des états, dans l'ordre d'affichage des tooltips */
const COMBAT_CHANGE_KEYS = {
  init: "system.combat.init.bonuses.effects",
  def: "system.combat.def.bonuses.effects",
  melee: "system.combat.melee.bonuses.effects",
  ranged: "system.combat.ranged.bonuses.effects",
}

/**
 * Traduit une description abrégée de malus en changes d'ActiveEffect.
 * ACTIVE_EFFECT_MODES : ADD = 2, OVERRIDE = 5.
 * @param {object} spec Malus par cible : init, def, melee, ranged, et movement en mètres
 * @returns {Array<object>}
 */
function buildChanges({ init, def, melee, ranged, movement } = {}) {
  const changes = []

  for (const [target, value] of Object.entries({ init, def, melee, ranged })) {
    if (value) changes.push({ key: COMBAT_CHANGE_KEYS[target], mode: 2, value })
  }

  // Le mouvement est forcé sur ses trois composantes, comme le font outOfBreath et immobilized dans co2
  if (movement !== undefined) {
    changes.push(
      { key: "system.attributes.movement.base", mode: 5, value: movement },
      { key: "system.attributes.movement.bonuses.sheet", mode: 5, value: 0 },
      { key: "system.attributes.movement.bonuses.effects", mode: 5, value: 0 },
    )
  }

  return changes
}

/**
 * Changes d'ActiveEffect portant le malus d'un état de santé.
 * Seules l'Init. et la DEF sont appliquées d'office. La DEF et les attaques dérivant des
 * caractéristiques dans co2 (DEF = 10 + AGI + PER, ATC = FOR, ATD = AGI), poser aussi le malus sur
 * AGI ou FOR le compterait deux fois : les tests de caractéristique passent par getStateSkillBonuses.
 * Les états de santé s'excluant mutuellement, ces malus ne se cumulent jamais.
 * @param {string} id Identifiant de l'état de santé
 * @returns {Array<object>}
 */
function healthStateChanges(id) {
  const malus = HEALTH_STATE_MALUS[id]
  return buildChanges({ init: malus, def: malus })
}

/**
 * Statuts des états de santé, ajoutés à CONFIG.statusEffects
 * Les icônes core sont provisoires, à remplacer par des icônes dédiées dans assets/icons
 */
export const HEALTH_STATUS_EFFECTS = [
  {
    id: "contusionne",
    name: "COC2BASE.status.contusionne",
    img: "icons/svg/blood.svg",
    description: "COC2BASE.status.contusionneDescription",
    changes: healthStateChanges("contusionne"),
  },
  {
    id: "affaibli",
    name: "COC2BASE.status.affaibli",
    img: "icons/svg/degen.svg",
    description: "COC2BASE.status.affaibliDescription",
    changes: healthStateChanges("affaibli"),
  },
  {
    id: "blesse",
    name: "COC2BASE.status.blesse",
    img: "icons/svg/falling.svg",
    description: "COC2BASE.status.blesseDescription",
    changes: healthStateChanges("blesse"),
  },
  {
    id: "mourant",
    name: "COC2BASE.status.mourant",
    img: "icons/svg/bones.svg",
    description: "COC2BASE.status.mourantDescription",
    changes: healthStateChanges("mourant"),
  },
]

/**
 * États de santé indexés par id, pour la configuration publique du module (CONFIG.COC2BASE).
 * Les objets sont ceux de HEALTH_STATUS_EFFECTS : muter un nom ici le mute partout.
 */
export const HEALTH_STATES = Object.fromEntries(HEALTH_STATUS_EFFECTS.map((effect) => [effect.id, effect]))


/**
 * Malus chiffrés des états préjudiciables COC2 (LdR ch. 4), par identifiant de statut du système.
 * Les valeurs de COF2 sont écrasées : la table COC2 diffère pour presque tous les états conservés.
 */
export const COC2_STATUS_CHANGES = {
  blind: { def: -5 },
  slowed: { init: -5, def: -5, melee: -5, ranged: -5, movement: 5 },
  immobilized: { def: -5, movement: 0 },
  unconscious: { def: -5, movement: 0 },
  surprised: { def: -5 },
  overturned: { def: -5, melee: -5, ranged: -5 },
  outOfBreath: { init: -2, def: -2, movement: 5 },
  asphyxie: { init: -5, def: -5 },
}

/** Textes COC2 des états communs dont les effets diffèrent de la base COF2. */
export const COC2_STATUS_OVERRIDES = {
  blind: { description: "COC2BASE.status.blindDescription" },
  immobilized: { description: "COC2BASE.status.immobilizedDescription" },
  unconscious: { description: "COC2BASE.status.unconsciousDescription" },
}

/** États préjudiciables de COF2 sans équivalent dans le livre de règles COC2 */
export const REMOVED_STATUS_IDS = ["weakened", "stun", "invalid", "paralysis"]

/**
 * États propres à COC2, absents de COF2. Libellés et descriptions suivent la convention
 * COC2BASE.status.<id> / <id>Description. Icônes core provisoires, comme pour l'échelle de santé.
 */
export const COC2_STATUS_EFFECTS = [
  { id: "asphyxie", img: "icons/svg/silenced.svg" },
  { id: "fatigue", img: "icons/svg/sleep.svg" },
  { id: "epuise", img: "icons/svg/downgrade.svg" },
]

/**
 * Malus proposés à cocher dans les fenêtres de jet, par identifiant de statut.
 * Ils couvrent ce qu'un ActiveEffect ne peut pas exprimer : « à toutes les actions », « à tous les
 * tests », « aux actions basées sur la vue ». Les poser sur les caractéristiques baisserait aussi la
 * DEF et les attaques qui en dérivent, d'où ce canal, où le joueur arbitre au cas par cas.
 * abilities absent = proposé sur toutes les caractéristiques.
 */
export const STATE_TEST_MALUS = {
  // États de santé : le livre de règles limite leur malus aux actions physiques
  ...Object.fromEntries(
    Object.entries(HEALTH_STATE_MALUS).map(([id, malus]) => [id, { malus, abilities: PHYSICAL_ABILITIES, hint: "COC2BASE.healthScale.malusHint" }]),
  ),
  fatigue: { malus: -2 },
  epuise: { malus: -5 },
  asphyxie: { malus: -5, hint: "COC2BASE.status.hint.actions" },
  blind: { malus: -10, hint: "COC2BASE.status.hint.sight" },
}

/**
 * Reconstruit la liste des statuts pour COC2 : retire les états absents du livre de règles, réécrit
 * les malus des états conservés, puis ajoute les états propres à COC2 et ceux de l'échelle de santé.
 * Les entrées modifiées sont recopiées et non mutées : le tableau du système reste intact, désactiver
 * le module restaure la liste COF2.
 * À appeler depuis le hook init, avant le hook i18nInit du système qui localise et trie la liste.
 * @returns {Array<object>} Nouvelle valeur de CONFIG.statusEffects
 */
export function buildStatusEffects(profile = CONFIG.COC2BASE, baseStatusEffects = CONFIG.statusEffects) {
  const removedStatusIds = profile.removedStatusIds ?? REMOVED_STATUS_IDS
  const statusChanges = profile.statusChanges ?? COC2_STATUS_CHANGES
  const statusOverrides = profile.statusOverrides ?? COC2_STATUS_OVERRIDES
  const additionalStatusEffects = profile.additionalStatusEffects ?? COC2_STATUS_EFFECTS

  const kept = baseStatusEffects
    .filter((effect) => !removedStatusIds.includes(effect.id))
    .map((effect) => ({
      ...effect,
      ...(statusOverrides[effect.id] ?? {}),
      ...(statusChanges[effect.id] ? { changes: buildChanges(statusChanges[effect.id]) } : {}),
    }))

  const added = additionalStatusEffects.map(({ id, img }) => ({
    id,
    img,
    name: `COC2BASE.status.${id}`,
    description: `COC2BASE.status.${id}Description`,
    changes: buildChanges(statusChanges[id]),
  }))

  return [...kept, ...added, ...HEALTH_STATUS_EFFECTS]
}

/**
 * Sous-types de features COC2, ajoutés à SYSTEM.FEATURE_SUBTYPE :
 * domaines professionnels/extra-professionnels (remplacent peuples et profils)
 * et traits distinctifs (avantages/désavantages)
 */
export const FEATURE_SUBTYPES_COC2 = {
  domainePro: {
    id: "domainePro",
    label: "COC2BASE.feature.subtypes.domainePro",
  },
  domaineExtraPro: {
    id: "domaineExtraPro",
    label: "COC2BASE.feature.subtypes.domaineExtraPro",
  },
  avantage: {
    id: "avantage",
    label: "COC2BASE.feature.subtypes.avantage",
  },
  desavantage: {
    id: "desavantage",
    label: "COC2BASE.feature.subtypes.desavantage",
  },
}

/**
 * Sous-types de traits de COF2 sans équivalent dans le livre de règles COC2 : ils sont retirés de la liste
 * déroulante de la fiche de trait au rendu, et non de SYSTEM.FEATURE_SUBTYPE (que le système déréférence
 * directement, cf. COActor#peoples).
 */
export const REMOVED_FEATURE_SUBTYPE_IDS = ["people"]

/**
 * Sous-types de voies de COF2 sans équivalent dans le livre de règles COC2 : même retrait au rendu que pour
 * les traits. SYSTEM.PATH_TYPES reste intact, le système le déréférence (cf. PathData#displayRank) et
 * s'en sert comme liste de valeurs valides du champ subtype des voies.
 */
export const REMOVED_PATH_SUBTYPE_IDS = ["people"]

/**
 * Retire de la liste déroulante des sous-types d'une fiche d'item les options sans équivalent COC2.
 * L'option est conservée si l'item porte déjà ce sous-type (item hérité de COF2), afin que la valeur affichée
 * reste celle de l'item et ne soit pas remplacée en silence à la première sauvegarde.
 * À appeler depuis un hook de rendu de fiche d'item.
 * @param {HTMLElement} element   Élément racine de la fiche
 * @param {Item} item             Item affiché
 * @param {string[]} removedIds   Ids des sous-types à masquer
 */
export function removeSubtypeOptions(element, item, removedIds) {
  const select = element.querySelector('select[name="system.subtype"]')
  if (!select) return

  for (const id of removedIds) {
    if (id === item.system.subtype) continue
    select.querySelector(`option[value="${id}"]`)?.remove()
  }
}

/** Plafond de points d'avantages (et autant de désavantages) à la création */
export const TRAIT_POINTS_MAX = 5

/**
 * Entraînements martiaux contemporains, injectés dans game.system.CONST (même pattern que cof2-base).
 * TODO : aligner les listes sur l'équipement officiel du livre de règles COC2
 */
export const MARTIAL_TRAININGS = {
  weapons: [
    { key: "unarmed", label: "COC2BASE.config.martialTrainingWeapon.unarmed" },
    { key: "knife", label: "COC2BASE.config.martialTrainingWeapon.knife" },
    { key: "club", label: "COC2BASE.config.martialTrainingWeapon.club" },
    { key: "baseballBat", label: "COC2BASE.config.martialTrainingWeapon.baseballBat" },
    { key: "sword", label: "COC2BASE.config.martialTrainingWeapon.sword" },
    { key: "bow", label: "COC2BASE.config.martialTrainingWeapon.bow" },
    { key: "crossbow", label: "COC2BASE.config.martialTrainingWeapon.crossbow" },
    { key: "taser", label: "COC2BASE.config.martialTrainingWeapon.taser" },
    { key: "pepperSpray", label: "COC2BASE.config.martialTrainingWeapon.pepperSpray" },
    { key: "handgun", label: "COC2BASE.config.martialTrainingWeapon.handgun" },
    { key: "revolver", label: "COC2BASE.config.martialTrainingWeapon.revolver" },
    { key: "shotgun", label: "COC2BASE.config.martialTrainingWeapon.shotgun" },
    { key: "huntingRifle", label: "COC2BASE.config.martialTrainingWeapon.huntingRifle" },
    { key: "assaultRifle", label: "COC2BASE.config.martialTrainingWeapon.assaultRifle" },
    { key: "submachineGun", label: "COC2BASE.config.martialTrainingWeapon.submachineGun" },
    { key: "sniperRifle", label: "COC2BASE.config.martialTrainingWeapon.sniperRifle" },
    { key: "machineGun", label: "COC2BASE.config.martialTrainingWeapon.machineGun" },
    { key: "grenade", label: "COC2BASE.config.martialTrainingWeapon.grenade" },
  ],
  armors: [
    { key: "reinforcedClothing", label: "COC2BASE.config.martialTrainingArmor.reinforcedClothing" },
    { key: "lightBulletproofVest", label: "COC2BASE.config.martialTrainingArmor.lightBulletproofVest" },
    { key: "heavyBulletproofVest", label: "COC2BASE.config.martialTrainingArmor.heavyBulletproofVest" },
    { key: "militaryArmor", label: "COC2BASE.config.martialTrainingArmor.militaryArmor" },
  ],
  shields: [
    { key: "riotShield", label: "COC2BASE.config.martialTrainingShield.riotShield" },
    { key: "ballisticShield", label: "COC2BASE.config.martialTrainingShield.ballisticShield" },
  ],
}

/**
 * Devise COC2 : le dollar, devise unique (le livre de règles COC2 est contemporain).
 * Remplace les pièces or/argent/cuivre (gp/sp/cp) de COF2 héritées du système : injectée dans
 * game.system.CONST.CURRENCY au hook init (cf. coc-base.mjs), elle est lue ensuite par le schéma
 * `wealth` des acteurs (character/encounter), construit paresseusement par le système. Le data path
 * de la richesse devient alors system.wealth.usd.value.
 * Contrat système : chaque entrée = { id, label } ; `label` est une clé i18n localisée par le helper
 * `getCurrencyLabel` du système — on la porte donc dans NOTRE namespace (COC2BASE.currency.usd).
 * Surchargeable via CONFIG.COC2BASE.currencies avant le hook init de coc2-base (cf. cth-base, qui
 * peut la remplacer, ou poser directement game.system.CONST.CURRENCY à son propre init, chargé après).
 */
export const COC2_CURRENCIES = {
  usd: {
    id: "usd",
    label: "COC2BASE.currency.usd",
  },
}

/**
 * Tranches d'âge : déterminent le budget de points de capacité, le nombre de voies et le rang
 * de voie maximum accessibles à la création.
 * capacityPoints alimente attributes.xp.max ; maxPaths et maxRank ne sont que signalés (compteur
 * de l'onglet Voies et avertissement à l'achat), jamais bloquants.
 */
export const AGE_BRACKETS = {
  jeune: {
    id: "jeune",
    label: "COC2BASE.age.jeune",
    capacityPoints: 4,
    maxPaths: 4,
    maxRank: 2,
  },
  adulte: {
    id: "adulte",
    label: "COC2BASE.age.adulte",
    capacityPoints: 7,
    maxPaths: 5,
    maxRank: 3,
  },
  experimente: {
    id: "experimente",
    label: "COC2BASE.age.experimente",
    capacityPoints: 10,
    maxPaths: 6,
    maxRank: 4,
  },
}

/**
 * Tranche d'âge d'un personnage, lue depuis CONFIG pour rester surchargeable par un module d'univers.
 * @param {object} system Le data model du personnage
 * @returns {object|null} La tranche d'âge, ou null si aucune n'est renseignée
 */
export function getAgeBracket(system) {
  const id = system.details?.ageBracket
  if (!id) return null
  return CONFIG.COC2BASE.ageBrackets[id] ?? null
}

/**
 * Valeur d'un « bonus » de caractéristique d'adversaire : le livre de règles raisonne en nombre de
 * caractéristiques « à +2 ». On convertit en points totaux pour gérer nativement le cumul autorisé au
 * Premier rôle (deux +2 fusionnés en un +4).
 */
export const ABILITY_BONUS_VALUE = 2

/**
 * Archétypes d'adversaires humains (LdR ch. « Les adversaires »). L'importance narrative détermine
 * toutes les valeurs mécaniques : caractéristiques bonifiées, DEF et Init. fixes, points de capacité,
 * longueur de l'échelle de santé et droit au critique.
 * healthScale.pulp : échelles raccourcies de l'ambiance « action décomplexée », commandées par le
 * réglage de monde `pulpHealthScales`. Le Premier rôle y gagne au contraire une échelle allongée,
 * pour des combats de boss plus épiques.
 */
export const ENCOUNTER_ARCHETYPES = {
  figurant: {
    id: "figurant",
    label: "COC2BASE.encounter.archetype.figurant",
    abilityBonuses: 1,
    capacityPoints: 1,
    def: 10,
    init: 10,
    canCrit: false,
    healthScale: { standard: 20, pulp: 4 },
  },
  secondRole: {
    id: "secondRole",
    label: "COC2BASE.encounter.archetype.secondRole",
    abilityBonuses: 3,
    capacityPoints: 3,
    def: 12,
    init: 12,
    canCrit: false,
    healthScale: { standard: 20, pulp: 12 },
  },
  premierRole: {
    id: "premierRole",
    label: "COC2BASE.encounter.archetype.premierRole",
    abilityBonuses: 5,
    capacityPoints: 5,
    def: 15,
    init: 15,
    canCrit: true,
    healthScale: { standard: 20, pulp: 24 },
  },
}

/**
 * Créatures non humaines : la taille (TAI) détermine toutes les valeurs de base (LdR, création des
 * créatures). Les clés sont celles de SYSTEM.SIZES, seuls les libellés changent en COC2 (cf.
 * COC2_SIZE_LABELS). DEF et Init. partagent une valeur unique (defInit).
 * healthScale : fourchette [min, max] recommandée, le pré-remplissage retenant le minimum.
 * maxPerAbility : plafond par caractéristique ; null = aucun plafond (Gigantesque, « 12 et + »).
 */
export const CREATURE_SIZES = {
  tiny: { id: "tiny", abilityPoints: 0, maxPerAbility: 0, meleeDamage: "", defInit: 18, stealth: 10, healthScale: [1, 1] },
  verySmall: { id: "verySmall", abilityPoints: 2, maxPerAbility: 2, meleeDamage: "1d2", defInit: 16, stealth: 5, healthScale: [4, 8] },
  small: { id: "small", abilityPoints: 4, maxPerAbility: 4, meleeDamage: "1d4", defInit: 14, stealth: 2, healthScale: [12, 16] },
  medium: { id: "medium", abilityPoints: 6, maxPerAbility: 6, meleeDamage: "1d6", defInit: 12, stealth: 0, healthScale: [20, 24] },
  large: { id: "large", abilityPoints: 8, maxPerAbility: 8, meleeDamage: "1d8", defInit: 10, stealth: -2, healthScale: [28, 36] },
  huge: { id: "huge", abilityPoints: 10, maxPerAbility: 10, meleeDamage: "1d10", defInit: 8, stealth: -5, healthScale: [40, 56] },
  colossal: { id: "colossal", abilityPoints: 12, maxPerAbility: null, meleeDamage: "1d12", defInit: 6, stealth: -10, healthScale: [60, 60] },
}

/**
 * Libellés des tailles en nomenclature COC2, injectés dans game.system.CONST.SIZES au hook init.
 * Les clés du système sont conservées (le champ details.size les valide via `choices`, et
 * SYSTEM.TOKEN_SIZE les utilise) : seuls les libellés changent — « Énorme » devient « Très grand »
 * et « Colossale » devient « Gigantesque », les autres passant au masculin.
 */
export const COC2_SIZE_LABELS = Object.fromEntries(Object.keys(CREATURE_SIZES).map((id) => [id, `COC2BASE.size.${id}`]))

/**
 * Minimum de dommages infligés par une attaque qui touche : si les dommages tombent à zéro ou moins
 * à cause de malus de caractéristiques, 1 DM est toujours infligé (LdR, création des créatures).
 */
export const MINIMUM_DAMAGE = 1

/**
 * Repère les dés d'une formule de dommages. Une expression régulière plutôt que le parseur de Foundry :
 * la formule stockée sur un item peut contenir @arme.dmg, @rang ou un dé évolutif (d4°), que
 * `new Roll(...)` refuserait tant que ces valeurs ne sont pas résolues.
 */
const DICE_TERM_REGEX = /(\d*)[dD](\d+)/g

/**
 * Bonus critique déduit d'une formule de dommages : somme des résultats maximum de ses dés.
 * Les termes fixes (bonus de FOR/BDM, bonus d'arme) sont exclus, conformément au livre de règles :
 * le BC ne dépend que du dé de dommages. 1d8 → 8, 2d6 → 12, 1d4 (mains nues) → 4.
 * @param {string} formula La formule de dommages
 * @returns {number} Le bonus critique, 0 si la formule ne contient aucun dé
 */
export function computeAutoCriticalBonus(formula) {
  if (!formula) return 0
  let total = 0
  for (const [, number, faces] of String(formula).matchAll(DICE_TERM_REGEX)) {
    total += (parseInt(number) || 1) * (parseInt(faces) || 0)
  }
  return total
}

/**
 * Bonus critique effectif d'une attaque : la valeur saisie sur l'item si elle est renseignée, sinon
 * le calcul automatique à partir de la formule de dommages.
 * Le champ n'existe que sur les armes et les attaques (cf. COC2EquipmentData et COC2AttackData) ;
 * toute autre source de dommages (capacité, mains nues) retombe sur le calcul automatique.
 * @param {COItem} item L'item à l'origine de l'attaque
 * @param {string} damageFormula La formule de dommages de base, dés intacts
 * @returns {number} Le bonus critique à ajouter aux dommages
 */
export function getCriticalBonus(item, damageFormula) {
  const declared = item?.system?.criticalBonus
  if (Number.isFinite(declared)) return declared
  return computeAutoCriticalBonus(damageFormula)
}

/**
 * Archétype d'un adversaire, lu depuis CONFIG pour rester surchargeable par un module d'univers.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} L'archétype, ou null si aucun n'est renseigné
 */
export function getEncounterArchetype(system) {
  const id = system.details?.archetype
  if (!id) return null
  return CONFIG.COC2BASE.encounterArchetypes[id] ?? null
}

/**
 * Ligne de la table des créatures correspondant à la taille d'un adversaire.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} La ligne de la table, ou null si la taille est inconnue
 */
export function getCreatureSize(system) {
  const id = system.details?.size
  if (!id) return null
  return CONFIG.COC2BASE.creatureSizes[id] ?? null
}

/**
 * Profil de référence d'un adversaire : source unique des valeurs attendues, consommée par le data
 * model (pré-remplissage, critique) et par la fiche (compteurs et rappels).
 * L'archétype prime : renseigné, l'adversaire suit les règles des humains ; vide, il suit la table
 * des créatures pilotée par la TAI. La taxonomie details.category (héritée de COF2) n'entre pas en
 * jeu, elle est trop floue en contemporain pour arbitrer.
 * @param {object} system Le data model de la rencontre
 * @returns {object|null} Profil normalisé, ou null si ni archétype ni taille connue
 */
export function getEncounterProfile(system) {
  const archetype = getEncounterArchetype(system)
  if (archetype) {
    const pulp = game.settings.get("coc2-base", "pulpHealthScales")
    const hpBase = pulp ? archetype.healthScale.pulp : archetype.healthScale.standard
    return {
      kind: "archetype",
      id: archetype.id,
      label: archetype.label,
      def: archetype.def,
      init: archetype.init,
      hpBase,
      hpRange: [hpBase, hpBase],
      abilityPoints: archetype.abilityBonuses * ABILITY_BONUS_VALUE,
      maxPerAbility: null,
      capacityPoints: archetype.capacityPoints,
      canCrit: archetype.canCrit,
      stealth: null,
      meleeDamage: "",
    }
  }

  const size = getCreatureSize(system)
  if (!size) return null
  return {
    kind: "creature",
    id: size.id,
    label: game.system.CONST.SIZES[size.id],
    def: size.defInit,
    init: size.defInit,
    hpBase: size.healthScale[0],
    hpRange: size.healthScale,
    abilityPoints: size.abilityPoints,
    maxPerAbility: size.maxPerAbility,
    // Le livre de règles ne fixe pas de budget de capacités aux créatures : le compteur ne s'applique pas
    capacityPoints: null,
    canCrit: true,
    stealth: size.stealth,
    meleeDamage: size.meleeDamage,
  }
}

/**
 * Sous-type de regroupement attribué aux cibles de modificateurs à masquer.
 * Les fiches d'items construisent leurs listes déroulantes en filtrant MODIFIERS_TARGET sur des sous-types
 * connus (ability, combat, attack, attribute, resource, state) : une valeur inconnue les fait disparaître
 * de toutes les listes, sans supprimer l'entrée du système.
 */
export const HIDDEN_MODIFIER_SUBTYPE = "coc2Hidden"

/**
 * Éléments de COF2 sans objet en COC2, retirés de l'interface au chargement du module.
 * Le livre de règles ne connaît que l'ATC (FOR) et l'ATD (AGI) : ni attaque magique, ni points de magie.
 */
export const HIDDEN_MAGIC_UI = {
  // Cibles de modificateurs retirées des listes déroulantes de l'éditeur de modificateurs
  modifierTargets: ["magic", "damMagic", "mp"],
  // Sous-types retirés du select des items de type attaque
  attackTypes: ["magic"],
}

/**
 * Retire de l'interface les éléments de magie hérités de COF2.
 * Les cibles de modificateurs sont masquées et non supprimées : elles restent des valeurs valides pour le
 * champ target du schéma Modifier (validé par `choices`) et pour les libellés des effets déjà en place.
 */
export function hideMagicUI() {
  for (const target of HIDDEN_MAGIC_UI.modifierTargets) {
    const modifierTarget = game.system.CONST.MODIFIERS_TARGET[target]
    if (modifierTarget) modifierTarget.subtype = HIDDEN_MODIFIER_SUBTYPE
  }

  for (const attackType of HIDDEN_MAGIC_UI.attackTypes) {
    delete game.system.CONST.ATTACK_TYPE[attackType]
  }
}

/**
 * Retourne l'id de l'état de santé atteint pour un nombre d'échelons cochés, ou null si aucun
 * @param {number} damage Nombre d'échelons cochés (hp.max - hp.value)
 * @param {number} max Taille de l'échelle
 * @returns {string|null}
 */
export function getHealthState(damage, max) {
  let current = null
  for (const state of HEALTH_SCALE.states) {
    if (damage >= Math.ceil(state.threshold * max)) current = state.id
  }
  return current
}

/**
 * Lignes de malus à proposer dans la fenêtre de jet d'un test de caractéristique, pour les états
 * actifs sur l'acteur. Le système affiche ces lignes décochées : c'est au joueur de les appliquer
 * quand le test entre bien dans le champ de l'état, ce qui évite notamment de pénaliser les tests de
 * CON que les états de santé imposent eux-mêmes.
 * @param {Actor} actor Acteur qui effectue le test
 * @param {string} ability Caractéristique testée
 * @returns {Array<object>} Bonus au format attendu par les fenêtres de jet
 */
export function getStateSkillBonuses(actor, ability) {
  const bonuses = []

  for (const [id, entry] of Object.entries(STATE_TEST_MALUS)) {
    if (!entry.malus || !actor.statuses.has(id)) continue
    if (entry.abilities && !entry.abilities.includes(ability)) continue

    // Après le hook i18nInit du système les noms sont déjà localisés ; localize les laisse alors inchangés
    const name = game.i18n.localize(CONFIG.statusEffects.find((effect) => effect.id === id)?.name ?? id)
    bonuses.push({
      sourceType: "coc2State",
      name,
      description: name,
      pathName: game.i18n.localize("COC2BASE.status.pathName"),
      hasPathName: true,
      value: entry.malus,
      additionalInfos: entry.hint ? game.i18n.localize(entry.hint) : "",
    })
  }

  return bonuses
}

/**
 * Pose/retire automatiquement les statuts d'état de santé selon la nouvelle valeur de l'échelle.
 * Seul l'état le plus grave atteint est actif ; seuls les statuts posés par cette automatisation sont retirés.
 * @param {Actor} actor
 * @param {number} newHp Nouvelle valeur de hp.value
 * @param {number} max Valeur de hp.max
 */
export async function applyHealthScaleStatuses(actor, newHp, max) {
  const target = getHealthState(max - newHp, max)
  for (const state of HEALTH_SCALE.states) {
    const active = actor.statuses.has(state.id)
    if (state.id === target && !active) {
      await actor.toggleStatusEffect(state.id, { active: true })
      await actor.setFlag("coc2-base", `statuses.${state.id}FromHealthScale`, true)
    } else if (state.id !== target && active && actor.getFlag("coc2-base", `statuses.${state.id}FromHealthScale`)) {
      await actor.toggleStatusEffect(state.id, { active: false })
      await actor.unsetFlag("coc2-base", `statuses.${state.id}FromHealthScale`)
    }
  }
}

/**
 * Retourne l'id du palier de la seconde échelle atteint pour un nombre d'échelons cochés, ou null si aucun.
 * Sert uniquement à l'affichage du libellé de niveau sur la fiche (aucun statut posé sur le token).
 * @param {number} checked Nombre d'échelons cochés (attributes.secondScale.value)
 * @param {number} max Taille de l'échelle
 * @returns {string|null}
 */
export function getSecondScaleState(checked, max) {
  let current = null
  for (const state of SECOND_SCALE.states) {
    if (checked >= Math.ceil(state.threshold * max)) current = state.id
  }
  return current
}

/**
 * Contexte de rendu du ruban de l'échelle de santé, partagé par la fiche complète et la Vue actions.
 * Réutilise attributes.hp : échelons cochés = hp.max - hp.value.
 * @param {Actor} actor
 * @returns {{ healthDamage: number, healthScale: Array<object>, healthStateId: string|null, healthStateLabel: string|null }}
 */
export function getHealthScaleContext(actor) {
  const max = actor.system.attributes.hp.max
  const damage = max - actor.system.attributes.hp.value
  const stateLabels = HEALTH_STATUS_EFFECTS.reduce((obj, effect) => {
    obj[effect.id] = game.i18n.localize(effect.name)
    return obj
  }, {})
  const thresholds = HEALTH_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * max), id: state.id }))

  const healthScale = Array.fromRange(max, 1).map((echelon) => {
    const milestone = thresholds.find((t) => t.echelon === echelon)
    return {
      echelon,
      filled: echelon <= damage,
      milestone: !!milestone,
      state: milestone?.id ?? "",
      tooltip: milestone ? `${echelon} — ${stateLabels[milestone.id]}` : String(echelon),
    }
  })

  const currentState = getHealthState(damage, max)
  return {
    healthDamage: damage,
    healthScale,
    healthStateId: currentState,
    healthStateLabel: currentState ? stateLabels[currentState] : null,
  }
}

/**
 * Contexte de rendu du ruban de la seconde échelle, partagé par la fiche complète et la Vue actions.
 * Affichée si le réglage `showSecondScale` est actif ou si un module d'univers la force ; renvoie
 * `{ showSecondScale: false }` sinon. Libellés lus depuis CONFIG.COC2BASE.secondScale (surchargeables).
 * @param {Actor} actor
 * @returns {object}
 */
export function getSecondScaleContext(actor) {
  const secondScaleConfig = CONFIG.COC2BASE.secondScale
  const showSecondScale = game.settings.get("coc2-base", "showSecondScale") || secondScaleConfig.forced
  if (!showSecondScale) return { showSecondScale: false }

  const scaleMax = actor.system.attributes.secondScale.max
  const checked = actor.system.attributes.secondScale.value
  const secondStateLabels = Object.fromEntries(Object.entries(secondScaleConfig.states).map(([id, state]) => [id, game.i18n.localize(state.name)]))
  const secondThresholds = SECOND_SCALE.states.map((state) => ({ echelon: Math.ceil(state.threshold * scaleMax), id: state.id }))

  const secondScale = Array.fromRange(scaleMax, 1).map((echelon) => {
    const milestone = secondThresholds.find((t) => t.echelon === echelon)
    return {
      echelon,
      filled: echelon <= checked,
      milestone: !!milestone,
      state: milestone?.id ?? "",
      tooltip: milestone ? `${echelon} — ${secondStateLabels[milestone.id]}` : String(echelon),
    }
  })

  const secondCurrentState = getSecondScaleState(checked, scaleMax)
  return {
    showSecondScale: true,
    secondScaleValue: checked,
    secondScaleMax: scaleMax,
    secondScaleLabel: game.i18n.localize(secondScaleConfig.label),
    secondScaleShort: game.i18n.localize(secondScaleConfig.labelShort),
    secondScale,
    secondScaleStateId: secondCurrentState,
    secondScaleStateLabel: secondCurrentState ? secondStateLabels[secondCurrentState] : null,
  }
}

/**
 * Coche/décoche l'échelle de santé jusqu'à l'échelon cliqué (ou décoche le dernier échelon coché).
 * Partagé par la fiche complète et la Vue actions.
 * @param {Actor} actor
 * @param {number} echelon Échelon cliqué
 */
export async function updateHealthScale(actor, echelon) {
  const max = actor.system.attributes.hp.max
  const damage = max - actor.system.attributes.hp.value
  const newDamage = echelon === damage ? echelon - 1 : echelon
  await actor.update({ "system.attributes.hp.value": max - newDamage })
}

/**
 * Repos d'une semaine : décoche CG échelons de l'échelle de santé (soit hp.value + CG, plafonné au max).
 * Les états préjudiciables devenus caducs sont retirés par _preUpdate du data model (applyHealthScaleStatuses).
 * La règle suppose un personnage stabilisé et au repos : c'est au MJ d'en juger, le bouton n'impose rien.
 * @param {Actor} actor
 */
export async function applyWeeklyRest(actor) {
  const { value, max } = actor.system.attributes.hp
  if (value >= max) return ui.notifications.info(game.i18n.localize("COC2BASE.recovery.restNoInjury"))

  const newValue = Math.min(max, value + actor.system.attributes.cg.value)
  await actor.update({ "system.attributes.hp.value": newValue })
  ui.notifications.info(game.i18n.format("COC2BASE.recovery.restDone", { healed: newValue - value }))
}

/**
 * Coche/décoche la seconde échelle jusqu'à l'échelon cliqué (ou décoche le dernier échelon coché).
 * La valeur stockée est directement le nombre d'échelons cochés (0 = échelle vide).
 * Partagé par la fiche complète et la Vue actions.
 * @param {Actor} actor
 * @param {number} echelon Échelon cliqué
 */
export async function updateSecondScale(actor, echelon) {
  const value = actor.system.attributes.secondScale.value
  const newValue = echelon === value ? echelon - 1 : echelon
  await actor.update({ "system.attributes.secondScale.value": newValue })
}
