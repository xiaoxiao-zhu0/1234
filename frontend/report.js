import { loadAuditedPublicResult } from "./public-result.js";

const $ = (selector) => document.querySelector(selector);
const pct = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;
const pp = (value) => `${(value * 100).toFixed(2)} 个百分点`;
const safe = (value) => String(value ?? "-").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

let currentPayload = null;

function riskClass(value) {
  if (value >= 0.38) return "risk-high";
  if (value >= 0.22) return "risk-watch";
  return "risk-normal";
}

function methodByName(payload, name) {
  return payload.methods.find((method) => method.name === name);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function render(payload) {
  currentPayload = payload;
  const primary = methodByName(payload, payload.primary_method);
  const comparator = payload.methods.find((method) => method.name !== payload.primary_method);
  const accuracyDelta = primary.average_accuracy - comparator.average_accuracy;
  const forgettingDelta = comparator.average_forgetting - primary.average_forgetting;
  const sortedLocations = [...payload.locations].sort((a, b) => b.risk - a.risk);
  const topThree = sortedLocations.slice(0, 3);
  const topBudget = topThree.reduce((sum, location) => sum + location.replay_budget, 0);
  const lowestAccuracy = [...payload.locations].sort((a, b) => a.accuracy - b.accuracy)[0];
  const highestForgetting = [...payload.locations].sort((a, b) => b.forgetting - a.forgetting)[0];

  $("#releaseId").textContent = payload.release_id;
  $("#footerRelease").textContent = `${payload.release_id} · contract ${payload.contract_version}`;
  $("#evidenceStatus").textContent = "模型预测支撑";
  $("#qualityStatus").textContent = payload.quality.recommended_for_bp ? "竞赛候选结果" : "内部诊断结果";
  $("#generatedAt").textContent = formatTime(payload.generated_at);
  $("#primaryAccuracy").textContent = pct(primary.average_accuracy);
  $("#accuracyComparison").textContent = `较 ${comparator.name} 提升 ${pp(accuracyDelta)}`;
  $("#primaryForgetting").textContent = pct(primary.average_forgetting);
  $("#forgettingComparison").textContent = `较 ${comparator.name} 降低 ${pp(forgettingDelta)}`;
  $("#topRiskName").textContent = topThree[0].name;
  $("#topRiskDetail").textContent = `风险 ${Math.round(topThree[0].risk * 100)} · ${topThree[0].recommended_action}`;
  $("#diagnosisSummary").textContent = `${payload.primary_method}在 ${payload.dataset.prediction_count} 条公开预测上取得 ${pct(primary.average_accuracy)} 的最终识别率，较 ${comparator.name} 提升 ${pp(accuracyDelta)}；平均遗忘率降低 ${pp(forgettingDelta)}。区域诊断显示，${highestForgetting.name} 的遗忘率最高（${pct(highestForgetting.forgetting)}），${lowestAccuracy.name} 的当前识别率最低（${pct(lowestAccuracy.accuracy)}）。建议优先对 ${topThree.map((item) => item.name).join("、")} 执行补采、复飞与增量更新。`;

  $("#datasetName").textContent = payload.dataset.name;
  $("#predictionCount").textContent = `${payload.dataset.prediction_count} 条（元数据 ${payload.dataset.metadata_count} 条）`;
  $("#taskProtocol").textContent = `${payload.dataset.class_count} 类 / ${payload.dataset.task_count} 个顺序任务`;
  $("#budgetProtocol").textContent = `${payload.budget.total} 个语义回放槽位，分配合计 ${payload.budget.allocated_sum}`;

  $("#methodRows").innerHTML = payload.methods.map((method) => `
    <tr class="${method.name === payload.primary_method ? "primary-row" : ""}">
      <td>${safe(method.name)}</td><td>${pct(method.average_accuracy)}</td><td>${pct(method.macro_accuracy)}</td>
      <td>${pct(method.average_forgetting)}</td><td>${method.name === payload.primary_method ? '<span class="status-tag">主方法</span>' : "对比基线"}</td>
    </tr>`).join("");

  $("#metricBars").innerHTML = payload.methods.map((method) => `
    <div class="metric-bar"><span>${safe(method.name)}</span><div class="metric-track"><div class="metric-fill" style="width:${method.average_accuracy * 100}%"></div></div><b>${pct(method.average_accuracy)}</b></div>
  `).join("");

  $("#locationRows").innerHTML = sortedLocations.map((location) => `
    <tr>
      <td><b>${safe(location.name)}</b><br>${safe(location.location_id)}</td><td>${location.sample_count}</td>
      <td>${pct(location.accuracy)}</td><td>${pct(location.previous_accuracy)}</td><td>${pct(location.forgetting)}</td>
      <td>${location.position_error_mean_m.toFixed(2)} m</td><td><span class="risk-score ${riskClass(location.risk)}">${Math.round(location.risk * 100)}</span></td>
      <td>${location.replay_budget}</td><td>${safe(location.recommended_action)}</td>
    </tr>`).join("");

  $("#priorityRegions").textContent = topThree.map((item) => `${item.location_id} ${item.name}`).join("、");
  $("#priorityBudgetShare").textContent = `${topBudget} / ${payload.budget.total}（${pct(topBudget / payload.budget.total, 1)}）`;
  $("#budgetConservation").textContent = payload.budget.total === payload.budget.allocated_sum ? "通过" : "异常";
  $("#recommendations").innerHTML = [
    `<b>优先补采：</b>将 ${topThree.map((item) => item.name).join("、")} 列入重点复飞队列，增加低视角、逆光和遮挡条件下的有效样本。`,
    `<b>持续更新：</b>保持总预算 ${payload.budget.total} 不变，优先保留高风险区域的历史语义证据，避免均匀回放掩盖局部失效。`,
    `<b>人工复核：</b>对 ${highestForgetting.name} 的高遗忘目标建立人工确认闭环，新类别确认后再进入增量训练任务。`,
    `<b>部署前验证：</b>在真实北斗终端、真实航线和机载算力条件下复核定位误差、推理时延与存储占用，当前结果不得直接外推为现场性能。`,
  ].map((item) => `<li>${item}</li>`).join("");
  $("#disclosure").textContent = payload.disclosure;
  $("#downloadJson").disabled = false;
  $("#printReport").disabled = false;
  $("#reportRoot").setAttribute("aria-busy", "false");
}

function showError(error) {
  $("#executiveSection").hidden = true;
  $("#reportError").hidden = false;
  $("#errorMessage").textContent = error.message;
  $("#reportRoot").setAttribute("aria-busy", "false");
  console.error(error);
}

function downloadPayload() {
  if (!currentPayload) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(currentPayload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `beidou-public-result-${currentPayload.release_id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

$("#downloadJson").addEventListener("click", downloadPayload);
$("#printReport").addEventListener("click", () => window.print());
loadAuditedPublicResult().then(render).catch(showError);
