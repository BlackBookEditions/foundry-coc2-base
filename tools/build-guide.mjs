// Reconstruit la source YAML du compendium "COC2 Guide du module" à partir des fichiers HTML de
// guide/html/*.html, sans dépendre d'une session Foundry (contrairement à guide/update-guide.mjs, qui
// met à jour un compendium déjà ouvert en jeu). Usage : node ./tools/build-guide.mjs, puis
// npm run YMLtoLDB pour recompiler le pack.
//
// Les ids de page ci-dessous DOIVENT rester synchronisés avec le mapping fileName_pageId de
// guide/update-guide.mjs : ce sont les mêmes pages du même journal.
import fs from "node:fs";
import path from "node:path";
import * as YAML from "js-yaml";

const MODULE_DIR = process.cwd();
const PACK_DIR = path.join(MODULE_DIR, "src/packs/coc2-guide-du-module");
const journalId = "7H04zEXpHQ8ET3GZ";
const journalName = "Guide du module COC2";

const pages = [
  { file: "introduction", id: "6iOtbHV23vUvHFoz", name: "Introduction", sort: 100000 },
  { file: "acteurs", id: "VLTB62ZkXZXNHCCP", name: "Les Acteurs", sort: 200000 },
  { file: "objets", id: "ccIyTfB7UYkosg6i", name: "Les Objets", sort: 300000 },
  { file: "actions_effets", id: "l9nCx6yP94pq9Ci6", name: "Actions et Effets", sort: 400000 },
  { file: "jets_messages", id: "JqtWAmERoHxZhKn7", name: "Les Jets et les Messages", sort: 500000 },
  { file: "autres_fonctionnalites", id: "TAVDyMPTn4FPIvPP", name: "Autres fonctionnalités", sort: 600000 },
];

// Reprend les createdTime déjà connus (root + pages) depuis la source existante, pour ne pas les
// réinitialiser à chaque reconstruction. Absent au premier lancement : tout part de maintenant.
function loadExistingCreatedTimes() {
  const createdTimes = {};
  if (!fs.existsSync(PACK_DIR)) return createdTimes;
  for (const file of fs.readdirSync(PACK_DIR)) {
    if (!file.endsWith(".yml")) continue;
    const existing = YAML.load(fs.readFileSync(path.join(PACK_DIR, file), "utf8"));
    if (existing?._id) createdTimes[existing._id] = existing._stats?.createdTime;
    for (const page of existing?.pages ?? []) {
      if (page._id) createdTimes[page._id] = page._stats?.createdTime;
    }
  }
  return createdTimes;
}

const createdTimes = loadExistingCreatedTimes();
const now = Date.now();
const stats = (id) => ({
  compendiumSource: null,
  duplicateSource: null,
  coreVersion: "14",
  systemId: "co2",
  systemVersion: "2.3.9",
  createdTime: createdTimes[id] ?? now,
  modifiedTime: now,
  lastModifiedBy: null,
  exportSource: null,
});

const doc = {
  name: journalName,
  pages: pages.map((p) => {
    const html = fs.readFileSync(path.join(MODULE_DIR, "guide/html", `${p.file}.html`), "utf8").replace(/\n$/, "");
    return {
      sort: p.sort,
      name: p.name,
      type: "text",
      _id: p.id,
      system: {},
      title: { show: false, level: 1 },
      image: {},
      text: { format: 1, content: html },
      video: { controls: true, volume: 0.5 },
      src: null,
      category: null,
      ownership: { default: -1 },
      flags: {},
      _stats: stats(p.id),
      _key: `!journal.pages!${journalId}.${p.id}`,
    };
  }),
  folder: null,
  categories: [],
  ownership: { default: 0 },
  flags: { "coc2-base": { isJournalCOC: true } },
  _stats: stats(journalId),
  _id: journalId,
  sort: 0,
  _key: `!journal!${journalId}`,
};

// Même convention de nommage que tools/LDBtoYML.mjs (transformName) : type_nomSûr_id.yml
const safeFileName = journalName.replace(/[^a-zA-Z0-9А-я]/g, "_");
const outFile = path.join(PACK_DIR, `journal_${safeFileName}_${journalId}.yml`);

fs.mkdirSync(PACK_DIR, { recursive: true });
for (const file of fs.existsSync(PACK_DIR) ? fs.readdirSync(PACK_DIR) : []) {
  if (file.endsWith(".yml")) fs.unlinkSync(path.join(PACK_DIR, file));
}
fs.writeFileSync(outFile, YAML.dump(doc, { lineWidth: -1, noRefs: true }));
console.log(`Written ${outFile}`);
