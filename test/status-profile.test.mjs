import test from "node:test";
import assert from "node:assert/strict";

import {
  COC2_STATUS_CHANGES,
  COC2_STATUS_EFFECTS,
  COC2_STATUS_OVERRIDES,
  HEALTH_STATUS_EFFECTS,
  buildStatusEffects,
} from "../module/config/coc2.mjs";

const base = [
  { id: "blind", description: "cof.blind", changes: [] },
  { id: "stun", description: "cof.stun", changes: [] },
  { id: "immobilized", description: "cof.immobilized", changes: [] },
  { id: "unconscious", description: "cof.unconscious", changes: [] },
];

function profile(overrides = {}) {
  return {
    statusChanges: { ...COC2_STATUS_CHANGES },
    removedStatusIds: ["stun"],
    additionalStatusEffects: COC2_STATUS_EFFECTS,
    statusOverrides: { ...COC2_STATUS_OVERRIDES },
    ...overrides,
  };
}

test("le profil COC2 conserve Inconscient et retire Étourdi", () => {
  const effects = buildStatusEffects(profile(), base);
  const ids = effects.map((effect) => effect.id);

  assert.equal(ids.includes("unconscious"), true);
  assert.equal(ids.includes("stun"), false);
  assert.equal(
    effects.find((effect) => effect.id === "blind").description,
    "COC2BASE.status.blindDescription",
  );
  assert.equal(
    HEALTH_STATUS_EFFECTS.every((effect) => ids.includes(effect.id)),
    true,
  );
});

test("un profil CTH peut réintroduire Étourdi et retirer Inconscient", () => {
  const cth = profile({
    removedStatusIds: ["unconscious"],
    statusChanges: {
      ...COC2_STATUS_CHANGES,
      blind: { init: -5, def: -5 },
      stun: { def: -5 },
    },
    statusOverrides: {
      ...COC2_STATUS_OVERRIDES,
      stun: { description: "CTHBASE.status.stunDescription" },
    },
  });
  const effects = buildStatusEffects(cth, base);
  const ids = effects.map((effect) => effect.id);

  assert.equal(ids.includes("unconscious"), false);
  assert.equal(ids.includes("stun"), true);
  assert.equal(
    effects.find((effect) => effect.id === "stun").description,
    "CTHBASE.status.stunDescription",
  );
  assert.equal(
    effects
      .find((effect) => effect.id === "blind")
      .changes.some((change) => change.key.includes("combat.init")),
    true,
  );
});
