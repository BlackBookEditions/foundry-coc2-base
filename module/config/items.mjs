/*
 * Sous-types d'items COC2 : ceux que le module ajoute au système (domaines, traits distinctifs) et ceux
 * qu'il masque dans les listes déroulantes faute d'équivalent COC2.
 *
 * Le retrait effectif des options se fait au rendu des fiches, cf. module/hooks/item-sheets.mjs.
 */

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
