import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evidenceLabel,
  overlayPublicLocations,
  validatePublicResult,
} from "../frontend/public-result.mjs";

const mockPath = new URL("../data_contract/public_result.mock.json", import.meta.url);

test("mock contract validates and remains simulation-only", async () => {
  const payload = validatePublicResult(JSON.parse(await readFile(mockPath, "utf8")));
  assert.equal(payload.evidence_status, "simulation_only");
  assert.match(evidenceLabel(payload), /仿真数据/);
});

test("invalid budget conservation is rejected", async () => {
  const payload = JSON.parse(await readFile(mockPath, "utf8"));
  payload.budget.allocated_sum -= 1;
  assert.throws(() => validatePublicResult(payload), /budget is not conserved/);
});

test("prediction-backed public fields overlay display data only", async () => {
  const payload = JSON.parse(await readFile(mockPath, "utf8"));
  payload.evidence_status = "prediction_backed";
  payload.locations[0] = {
    ...payload.locations[0],
    accuracy: 0.8,
    previous_accuracy: 0.9,
    forgetting: 0.1,
    risk: 0.4,
    replay_budget: 32,
    recommended_action: "优先补采 + 增量更新",
    evidence_status: "prediction_backed",
  };
  const result = overlayPublicLocations([{ id: "G01", currentAccuracy: 0.5, action: "常规巡检" }], payload);
  assert.equal(result[0].currentAccuracy, 0.8);
  assert.equal(result[0].budget, 32);
  assert.equal(result[0].actionCode, "high");
});

test("diagnostic-only result is visibly blocked from BP use", async () => {
  const payload = JSON.parse(await readFile(mockPath, "utf8"));
  payload.evidence_status = "prediction_backed";
  payload.quality = {
    status: "diagnostic_only",
    recommended_for_bp: false,
    chance_accuracy: 0.1,
    primary_accuracy: 0.2,
    best_comparator_accuracy: 0.3,
    primary_delta_vs_best_comparator: -0.1,
  };
  validatePublicResult(payload);
  assert.match(evidenceLabel(payload), /不可作为BP核心指标/);
});
