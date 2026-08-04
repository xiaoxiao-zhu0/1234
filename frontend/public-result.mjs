const CONTRACT_VERSION = "1.0";
const EVIDENCE_STATES = new Set(["simulation_only", "position_only", "prediction_backed"]);

function assertFiniteProbability(value, field, allowNull = true) {
  if (value === null && allowNull) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be null or a finite number in [0, 1]`);
  }
}

export function validatePublicResult(payload) {
  if (!payload || typeof payload !== "object") throw new Error("public result must be an object");
  if (payload.contract_version !== CONTRACT_VERSION) throw new Error("unsupported public-result contract");
  if (!EVIDENCE_STATES.has(payload.evidence_status)) throw new Error("invalid evidence_status");
  if (!Array.isArray(payload.methods) || payload.methods.length === 0) throw new Error("methods must not be empty");
  if (!Array.isArray(payload.locations) || payload.locations.length === 0) throw new Error("locations must not be empty");
  if (!payload.methods.some((method) => method.name === payload.primary_method)) {
    throw new Error("primary_method is absent from methods");
  }
  if (payload.budget.total !== payload.budget.allocated_sum) throw new Error("replay budget is not conserved");
  if (payload.quality) {
    assertFiniteProbability(payload.quality.chance_accuracy, "quality.chance_accuracy", false);
    assertFiniteProbability(payload.quality.primary_accuracy, "quality.primary_accuracy", false);
    assertFiniteProbability(payload.quality.best_comparator_accuracy, "quality.best_comparator_accuracy");
    if (payload.quality.recommended_for_bp !== (payload.quality.status === "competition_candidate")) {
      throw new Error("quality status is inconsistent");
    }
  }
  const ids = new Set();
  payload.locations.forEach((location) => {
    if (!/^G\d{2}$/.test(location.location_id)) throw new Error("invalid location_id");
    if (ids.has(location.location_id)) throw new Error("duplicate location_id");
    ids.add(location.location_id);
    assertFiniteProbability(location.accuracy, `${location.location_id}.accuracy`);
    assertFiniteProbability(location.forgetting, `${location.location_id}.forgetting`);
    assertFiniteProbability(location.risk, `${location.location_id}.risk`);
  });
  return payload;
}

export async function loadPublicResult() {
  const candidates = ["../data_contract/public_result.json", "../data_contract/public_result.mock.json"];
  let lastError;
  for (const path of candidates) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;
      return validatePublicResult(await response.json());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("no public result file is available");
}

export function overlayPublicLocations(allocated, payload) {
  if (!payload || payload.evidence_status === "simulation_only") return allocated;
  const index = new Map(payload.locations.map((location) => [location.location_id, location]));
  return allocated.map((region) => {
    const external = index.get(region.id);
    if (!external) return region;
    const action = external.recommended_action ?? region.action;
    const actionCode = action.includes("立即") ? "critical"
      : action.includes("优先") ? "high"
        : action.includes("重点") ? "watch" : "monitor";
    return {
      ...region,
      currentAccuracy: external.accuracy ?? region.currentAccuracy,
      previousAccuracy: external.previous_accuracy ?? region.previousAccuracy,
      forgetting: external.forgetting ?? region.forgetting,
      coordinateQuality: external.position_quality_mean ?? region.coordinateQuality,
      instability: external.instability ?? region.instability,
      consequence: external.business_consequence,
      risk: external.risk ?? region.risk,
      budget: external.replay_budget ?? region.budget,
      sampleCount: external.sample_count || region.sampleCount,
      action,
      actionCode,
      evidenceStatus: external.evidence_status,
    };
  });
}

export function evidenceLabel(payload) {
  if (!payload || payload.evidence_status === "simulation_only") {
    return "竞赛功能原型 · 仿真数据 · 非现场部署结果";
  }
  if (payload.evidence_status === "position_only") {
    return "数据链路验证 · 虚拟北斗坐标 · 暂无模型性能结论";
  }
  if (payload.quality && !payload.quality.recommended_for_bp) {
    return "公开数据预测指标 · 内部诊断结果 · 不可作为BP核心指标";
  }
  return "公开数据模型预测指标 · 虚拟北斗坐标 · 非现场部署结果";
}
