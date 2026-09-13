// Génère les sources YAML (src/packs/coc2-objets-sans-description/) d'un compendium Item à partir :
//   - des voies/capacités déclarées dans source/macro-generate-objets-sans-description-coc2.js ;
//   - des équipements (armes, armures, biens divers) déclarés dans
//     source/macro-generate-equipements-coc2.js.
// Dans les deux scripts sources, "description" ne porte qu'une référence de page (déjà au format
// attendu) ; ce générateur se contente de reproduire fidèlement leurs données dans le même pack.
//
// Utilisation : node ./tools/generate-coc2-objets-pack.mjs
// Puis : npm run YMLtoLDB   (compile ces YAML en pack LevelDB dans packs/coc2-objets-sans-description)

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import * as YAML from "js-yaml"

const MODULE_ID = "coc2-base"
const PACK_NAME = "coc2-objets-sans-description"
const SRC_MACRO = new URL("../source/macro-generate-objets-sans-description-coc2.js", import.meta.url)
const EQUIP_MACRO = new URL("../source/macro-generate-equipements-coc2.js", import.meta.url)
const OUT_DIR = new URL(`../src/packs/${PACK_NAME}/`, import.meta.url)

const CORE_VERSION = "14"
const SYSTEM_VERSION = "2.3.0"
const NOW = Date.now()

/** Génère un ID Foundry (16 caractères alphanumériques). */
function genId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = crypto.randomBytes(16)
  let id = ""
  for (let i = 0; i < 16; i++) id += chars[bytes[i] % chars.length]
  return id
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9А-я]/g, "_")
}

function statsBlock() {
  return {
    compendiumSource: null,
    duplicateSource: null,
    coreVersion: CORE_VERSION,
    systemId: "co2",
    systemVersion: SYSTEM_VERSION,
    createdTime: NOW,
    modifiedTime: NOW,
    lastModifiedBy: null,
    exportSource: null,
  }
}

function folderDoc({ id, name, folder, sort }) {
  return {
    name,
    sorting: "m",
    folder: folder ?? null,
    type: "Item",
    _id: id,
    description: "",
    sort,
    color: null,
    flags: {},
    _stats: statsBlock(),
    _key: `!folders!${id}`,
  }
}

function itemDoc({ id, name, type, img, folder, sort, system }) {
  return {
    folder,
    name,
    type,
    img,
    _id: id,
    system,
    effects: [],
    sort,
    ownership: { default: 0 },
    flags: {},
    _stats: statsBlock(),
    _key: `!items!${id}`,
  }
}

async function loadVoies() {
  const text = await fs.readFile(SRC_MACRO, "utf8")
  const match = text.match(/const VOIES = (\[[\s\S]*?\n\])\n/)
  if (!match) throw new Error("Impossible de repérer le tableau VOIES dans le script source.")
  return new Function(`return ${match[1]}`)()
}

/** Rejoue les déclarations de données (const ... = ...) du script équipements, sans ses fonctions Foundry. */
async function loadEquipment() {
  const text = await fs.readFile(EQUIP_MACRO, "utf8")
  const start = text.indexOf("const PAGE_MELEE")
  const end = text.indexOf("/** Prix par défaut")
  if (start === -1 || end === -1) throw new Error("Impossible de repérer les données d'équipement dans le script source.")
  const block = text.slice(start, end)
  const body = `${block}\nreturn { PAGE_MELEE, PAGE_RANGED, PAGE_EXPLOSIVES, PAGE_ARMOR, PAGE_MISC, RANGE_BY_CATEGORY, MELEE_WEAPONS, RANGED_LIGHT_WEAPONS, RANGED_HEAVY_WEAPONS, EXPLOSIVES, ARMORS, MISC_GOODS }`
  return new Function(body)()
}

function pageLabel(page) {
  return String(page).includes("-") ? `pages ${page}` : `page ${page}`
}

function priceField(value) {
  return { value, unit: "usd" }
}

/** Champs communs à tout équipement (ItemData + squelette EquipmentData) — cf. macro-generate-equipements-coc2.js. */
function baseEquipmentSystem({ subtype, page, martialCategory, damagetype, price }) {
  return {
    description: `<p>Livre des règles ${pageLabel(page)}</p>`,
    subtype,
    martialCategory,
    damagetype: damagetype ?? "",
    price: priceField(price),
    equipped: false,
    properties: { equipable: subtype !== "misc", reloadable: false, stackable: false },
    usage: { oneHand: false, twoHand: false },
    actions: [],
  }
}

/** Action "attack" permanente conditionnée par isEquipped (arme de contact/à distance). */
function attackAction(uuid, { actionType, skillFormula, dmgFormula, crit }) {
  return {
    source: uuid,
    indice: 0,
    label: "",
    chatFlavor: "",
    type: actionType,
    img: "icons/svg/d20-highlight.svg",
    properties: { visible: false, enabled: false, activable: true, temporary: false, noManaCost: false },
    conditions: [{ predicate: "isEquipped" }],
    resolvers: [
      {
        type: "attack",
        bonusDiceAdd: false,
        malusDiceAdd: false,
        skill: { formula: skillFormula, crit: crit ?? "", difficulty: "@cible.def" },
        dmg: { formula: dmgFormula },
        target: { type: "none", number: "0", scope: "all" },
        additionalEffect: { active: false, applyOn: "success", statuses: [], duration: "0", unit: "round" },
      },
    ],
    modifiers: [],
  }
}

/** Action "buff" permanente conditionnée par isEquipped, portant des modifiers de combat/ability. */
function buffAction(uuid, modifiers) {
  return {
    source: uuid,
    indice: 0,
    label: "",
    chatFlavor: "",
    type: "buff",
    img: "icons/svg/d20-highlight.svg",
    properties: { visible: false, enabled: false, activable: false, temporary: false, noManaCost: false },
    conditions: [{ predicate: "isEquipped" }],
    modifiers: modifiers.map((m) => ({ type: "equipment", source: uuid, additionalInfos: "", ...m })),
    resolvers: [],
  }
}

const ICON_MELEE = "icons/svg/sword.svg"
const ICON_RANGED = "icons/svg/combat.svg"
const ICON_ARMOR = "icons/svg/item-bag.svg"
const ICON_MISC = "icons/svg/item-bag.svg"

function buildMeleeItem(w, { PAGE_MELEE }) {
  const id = genId()
  const uuid = `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`
  const sys = baseEquipmentSystem({ subtype: "weapon", page: PAGE_MELEE, martialCategory: "contact", damagetype: w.damagetype, price: w.price })
  sys.tags = w.tags ?? []
  sys.usage = { oneHand: !w.twoHand, twoHand: !!w.twoHand }
  const actions = [attackAction(uuid, { actionType: "melee", skillFormula: "@atc", dmgFormula: `${w.dm} + @for`, crit: w.crit })]
  if (w.initMalus) actions.push(buffAction(uuid, [{ subtype: "combat", target: "init", apply: "self", value: String(w.initMalus) }]))
  sys.actions = actions
  return { id, name: w.nom, type: "equipment", img: ICON_MELEE, system: sys }
}

function buildRangedItem(w, { PAGE_RANGED, RANGE_BY_CATEGORY }, { lourde = false } = {}) {
  const id = genId()
  const uuid = `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`
  const sys = baseEquipmentSystem({
    subtype: "weapon",
    page: PAGE_RANGED,
    martialCategory: lourde ? "distanceLourde" : "distanceLegere",
    damagetype: w.damagetype,
    price: w.price,
  })
  sys.tags = w.tags ?? []
  sys.usage = { oneHand: !w.twoHand, twoHand: !!w.twoHand }
  sys.properties.reloadable = !!(w.magasin || w.magasinLabel)
  if (w.magasin) sys.charges = { current: w.magasin, max: w.magasin, destroyIfEmpty: false }
  const category = RANGE_BY_CATEGORY[w.portee] ?? 0
  sys.range = { base: 0, ability: null, details: w.portee, unit: "m", min: null, max: null, bonuses: { sheet: 0, effects: 0 }, value: category }
  sys.actions = [attackAction(uuid, { actionType: "ranged", skillFormula: "@atd", dmgFormula: w.dm, crit: w.crit })]
  return { id, name: w.nom, type: "equipment", img: ICON_RANGED, system: sys }
}

function buildExplosiveItem(e, { PAGE_EXPLOSIVES }) {
  const id = genId()
  const sys = baseEquipmentSystem({ subtype: "weapon", page: PAGE_EXPLOSIVES, martialCategory: "explosif", damagetype: "", price: e.price })
  sys.tags = []
  // Pas d'action : dégâts en zone dégressifs / déclenchement spécial, non représentables par une simple formule.
  return { id, name: e.nom, type: "equipment", img: ICON_RANGED, system: sys }
}

function buildArmorItem(a, { PAGE_ARMOR }) {
  const id = genId()
  const uuid = `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`
  const sys = baseEquipmentSystem({ subtype: "armor", page: PAGE_ARMOR, martialCategory: "protection", damagetype: "", price: a.price })
  sys.tags = []
  sys.defense = null
  sys.magicalDefense = null
  sys.actions = [
    buffAction(uuid, [
      { subtype: "combat", target: "dr", apply: "self", value: String(a.rd) },
      { subtype: "combat", target: "init", apply: "self", value: String(a.malus) },
      { subtype: "ability", target: "agi", apply: "self", value: String(a.malus) },
      { subtype: "combat", target: "melee", apply: "self", value: String(a.malus) },
    ]),
  ]
  return { id, name: a.nom, type: "equipment", img: ICON_ARMOR, system: sys }
}

function buildMiscItem(g, { PAGE_MISC }) {
  const id = genId()
  const sys = baseEquipmentSystem({ subtype: "misc", page: PAGE_MISC, martialCategory: "divers", damagetype: "", price: g.price })
  sys.tags = []
  return { id, name: g.nom, type: "equipment", img: ICON_MISC, system: sys }
}

async function main() {
  const VOIES = await loadVoies()
  const EQUIP = await loadEquipment()
  const ICON_VOIE = "icons/svg/aura.svg"
  const ICON_CAP = "icons/svg/upgrade.svg"

  await fs.rm(OUT_DIR, { recursive: true, force: true })
  await fs.mkdir(OUT_DIR, { recursive: true })

  const files = []

  const voiesFolderId = genId()
  const capsFolderId = genId()
  files.push(["folders", folderDoc({ id: voiesFolderId, name: "Voies", sort: 100000 })])
  files.push(["folders", folderDoc({ id: capsFolderId, name: "Capacités", sort: 200000 })])

  for (const [index, voie] of VOIES.entries()) {
    const voieCapFolderId = genId()
    files.push([
      "folders",
      folderDoc({ id: voieCapFolderId, name: voie.nom, folder: capsFolderId, sort: (index + 1) * 100000 }),
    ])

    // 1. IDs des capacités d'abord (rang -> id), pour pouvoir déjà référencer voie <-> capacités.
    const capIds = new Map() // rang -> id
    for (const c of voie.capacites) capIds.set(c.rang, genId())

    const voieId = genId()
    const voieUuid = `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${voieId}`

    // 2. Capacités : system.path pointe vers la voie, system.actions porte les modifiers (source = soi-même).
    for (const c of voie.capacites) {
      const capId = capIds.get(c.rang)
      const capUuid = `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${capId}`
      const system = {
        description: `<p>${c.description}</p>`,
        rank: c.rang,
        learned: false,
        path: voieUuid,
      }
      if (c.modifiers?.length) {
        system.actions = [
          {
            source: capUuid,
            indice: 0,
            type: "buff",
            img: ICON_CAP,
            label: c.nom,
            chatFlavor: "",
            actionType: "none",
            properties: { visible: false, activable: false, enabled: false, temporary: false, noManaCost: false, noChargesUsed: false },
            conditions: [{ predicate: "isLearned", object: "" }],
            modifiers: c.modifiers.map((m) => ({
              source: capUuid,
              type: "capacity",
              subtype: m.subtype,
              target: m.target,
              apply: m.apply ?? "self",
              value: m.value,
              choiceGroup: 0,
              additionalInfos: m.info ?? "",
            })),
            resolvers: [],
          },
        ]
      }
      files.push([
        "items",
        itemDoc({
          id: capId,
          name: c.nom,
          type: "capacity",
          img: ICON_CAP,
          folder: voieCapFolderId,
          sort: c.rang * 100000,
          system,
        }),
      ])
    }

    // 3. Voie : reliée à ses capacités DANS L'ORDRE DES RANGS (slot N = rang N, comme la macro).
    const capacitiesInRankOrder = [...capIds.entries()].sort((a, b) => a[0] - b[0]).map(([, id]) => `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`)
    files.push([
      "items",
      itemDoc({
        id: voieId,
        name: voie.nom,
        type: "path",
        img: ICON_VOIE,
        folder: voiesFolderId,
        sort: (index + 1) * 100000,
        system: { subtype: "profile", description: voie.entete, capacities: capacitiesInRankOrder },
      }),
    ])
  }

  // Équipements (armes, armures, biens divers) — dans le même pack, à côté de Voies/Capacités.
  const armesFolderId = genId()
  const armuresFolderId = genId()
  const diversFolderId = genId()
  files.push(["folders", folderDoc({ id: armesFolderId, name: "Armes", sort: 300000 })])
  files.push(["folders", folderDoc({ id: armuresFolderId, name: "Armures", sort: 400000 })])
  files.push(["folders", folderDoc({ id: diversFolderId, name: "Équipements divers", sort: 500000 })])

  const contactFolderId = genId()
  const distLegereFolderId = genId()
  const distLourdeFolderId = genId()
  const explosifsFolderId = genId()
  files.push(["folders", folderDoc({ id: contactFolderId, name: "Armes de contact", folder: armesFolderId, sort: 100000 })])
  files.push(["folders", folderDoc({ id: distLegereFolderId, name: "Armes à distance légères", folder: armesFolderId, sort: 200000 })])
  files.push(["folders", folderDoc({ id: distLourdeFolderId, name: "Armes à distance lourdes", folder: armesFolderId, sort: 300000 })])
  files.push(["folders", folderDoc({ id: explosifsFolderId, name: "Explosifs", folder: armesFolderId, sort: 400000 })])

  const addItems = (folderId, built) => {
    built.forEach((it, i) => {
      files.push(["items", itemDoc({ ...it, folder: folderId, sort: (i + 1) * 100000 })])
    })
  }

  addItems(contactFolderId, EQUIP.MELEE_WEAPONS.map((w) => buildMeleeItem(w, EQUIP)))
  addItems(distLegereFolderId, EQUIP.RANGED_LIGHT_WEAPONS.map((w) => buildRangedItem(w, EQUIP)))
  addItems(distLourdeFolderId, EQUIP.RANGED_HEAVY_WEAPONS.map((w) => buildRangedItem(w, EQUIP, { lourde: true })))
  addItems(explosifsFolderId, EQUIP.EXPLOSIVES.map((e) => buildExplosiveItem(e, EQUIP)))
  addItems(armuresFolderId, EQUIP.ARMORS.map((a) => buildArmorItem(a, EQUIP)))
  addItems(diversFolderId, EQUIP.MISC_GOODS.map((g) => buildMiscItem(g, EQUIP)))

  for (const [kind, doc] of files) {
    const prefix = kind === "folders" ? "folders" : doc.type
    const filename = `${prefix}_${safeName(doc.name)}_${doc._id}.yml`
    await fs.writeFile(new URL(filename, OUT_DIR), YAML.dump(doc))
  }

  const nbFolders = files.filter(([k]) => k === "folders").length
  const nbItems = files.filter(([k]) => k === "items").length
  console.log(`Écrit ${nbFolders} dossiers et ${nbItems} items dans src/packs/${PACK_NAME}/`)
}

main()
