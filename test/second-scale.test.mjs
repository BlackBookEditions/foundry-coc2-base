import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import {
  DEFAULT_SECOND_SCALE_MODIFIER_PROFILE,
  SECOND_SCALE_STATES,
  getSecondScaleSkillBonuses,
  normalizeSecondScaleModifierProfile,
} from "../module/config/coc2.mjs"

function installGlobals(profile, enabled = true) {
  globalThis.CONFIG = {
    COC2BASE: {
      secondScale: {
        forced: false,
        modifierProfile: null,
        label: "Évolution",
        states: SECOND_SCALE_STATES,
      },
    },
  }
  globalThis.game = {
    i18n: { localize: (value) => value },
    settings: {
      settings: new Map([
        ["coc2-base.showSecondScale", true],
        ["coc2-base.secondScaleModifiers", true],
      ]),
      get: (namespace, key) => (key === "showSecondScale" ? enabled : profile),
    },
  }
}

function actor(value, { type = "character", archetype = "" } = {}) {
  return {
    type,
    system: { attributes: { secondScale: { value, max: 20 } }, details: { archetype } },
  }
}

test("normalise indépendamment absence, bonus et malus par palier", () => {
  const profile = normalizeSecondScaleModifierProfile({
    bonus: { ability: "vol", values: { secondState1: 0, secondState2: 3, secondState3: -5, secondState4: 10 } },
    malus: { ability: "cha", values: { secondState1: 0, secondState2: -3, secondState3: 5, secondState4: -10 } },
  })

  assert.deepEqual(profile.bonus.values, { secondState1: 0, secondState2: 3, secondState3: 0, secondState4: 10 })
  assert.deepEqual(profile.malus.values, { secondState1: 0, secondState2: -3, secondState3: 0, secondState4: -10 })
})

test("utilise seulement le palier courant et présélectionne le contexte demandé", () => {
  const profile = normalizeSecondScaleModifierProfile({
    bonus: { ability: "vol", label: "Traumatisme", contextId: "trauma", values: DEFAULT_SECOND_SCALE_MODIFIER_PROFILE.bonus.values },
    malus: { ability: "cha", label: "Empathie", values: DEFAULT_SECOND_SCALE_MODIFIER_PROFILE.malus.values },
  })
  installGlobals(profile)

  assert.deepEqual(getSecondScaleSkillBonuses(actor(4), "vol", { rollType: "skill" }), [])
  assert.equal(getSecondScaleSkillBonuses(actor(10), "vol", { rollType: "skill", skillContexts: ["trauma"] })[0].value, 3)
  assert.equal(getSecondScaleSkillBonuses(actor(10), "vol", { rollType: "skill", skillContexts: ["trauma"] })[0].selected, true)
  assert.equal(getSecondScaleSkillBonuses(actor(20), "cha", { rollType: "skill" })[0].value, -10)
})

test("exclut les attaques, les échelles désactivées et les créatures", () => {
  const profile = normalizeSecondScaleModifierProfile({ bonus: { ability: "vol" } })
  installGlobals(profile)

  assert.deepEqual(getSecondScaleSkillBonuses(actor(10), "vol", { rollType: "attack" }), [])
  assert.deepEqual(getSecondScaleSkillBonuses(actor(10, { type: "encounter" }), "vol", { rollType: "skill" }), [])
  assert.equal(getSecondScaleSkillBonuses(actor(10, { type: "encounter", archetype: "premierRole" }), "vol", { rollType: "skill" }).length, 1)

  installGlobals(profile, false)
  assert.deepEqual(getSecondScaleSkillBonuses(actor(10), "vol", { rollType: "skill" }), [])
})

test("le template ApplicationV2 possède un élément racine unique", async () => {
  const template = await readFile(new URL("../templates/applications/second-scale-settings.hbs", import.meta.url), "utf8")
  const markup = template.trim()

  assert.match(markup, /^<div class="coc2-second-scale-settings">/)
  assert.match(markup, /<\/div>$/)
})
