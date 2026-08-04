import { evidenceLabel, loadPublicResult } from "./public-result.mjs";

const $ = (selector) => document.querySelector(selector);
const pct = (value) => value === null || value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;
const safe = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

function riskClass(value) {
  if (value === null || value === undefined) return "unknown";
  if (value >= 0.55) return "critical";
  if (value >= 0.38) return "high";
  if (value >= 0.22) return "watch";
  return "normal";
}

function render(payload) {
  $("#evidence").textContent = evidenceLabel(payload);
  $("#evidence").dataset.status = payload.evidence_status;
  $("#evidence").dataset.quality = payload.quality?.status ?? "unrated";
  $("#datasetName").textContent = payload.dataset.name;
  $("#releaseId").textContent = payload.release_id;
  $("#sampleCounts").textContent = `${payload.dataset.metadata_count} / ${payload.dataset.prediction_count}`;
  $("#taskCounts").textContent = `${payload.dataset.class_count} / ${payload.dataset.task_count}`;
  $("#budgetTotal").textContent = payload.budget.total;
  $("#budgetCheck").textContent = payload.budget.total === payload.budget.allocated_sum ? "预算守恒" : "预算异常";
  $("#methods").innerHTML = payload.methods.map((method) => `
    <article class="method-card ${method.name === payload.primary_method ? "primary" : ""}">
      <span>${method.name === payload.primary_method ? "当前展示方法" : "对比方法"}</span>
      <h3>${safe(method.name)}</h3>
      <div><p>最终识别率<b>${pct(method.average_accuracy)}</b></p><p>宏平均识别率<b>${pct(method.macro_accuracy)}</b></p><p>平均遗忘率<b>${pct(method.average_forgetting)}</b></p></div>
    </article>`).join("");
  $("#locations").innerHTML = [...payload.locations].sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1)).map((location) => `
    <tr>
      <td><b>${safe(location.name)}</b><small>${safe(location.location_id)} · ${safe(location.evidence_status)}</small></td>
      <td>${location.sample_count}</td><td>${pct(location.accuracy)}</td><td>${pct(location.forgetting)}</td>
      <td><span class="risk ${riskClass(location.risk)}">${location.risk === null ? "—" : Math.round(location.risk * 100)}</span></td>
      <td>${location.replay_budget ?? "—"}</td><td>${safe(location.recommended_action)}</td>
    </tr>`).join("");
  $("#disclosure").textContent = payload.disclosure;
}

loadPublicResult().then(render).catch((error) => {
  $("#evidence").textContent = "公开结果文件读取失败";
  $("#disclosure").textContent = error.message;
  console.error(error);
});
