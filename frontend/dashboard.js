import { evidenceLabel, loadPublicResult } from "./public-result.js";

const $ = (selector) => document.querySelector(selector);
const pct = (value) => value === null || value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;
const safe = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
let currentPayload = null;

function riskClass(value) {
  if (value === null || value === undefined) return "unknown";
  if (value >= 0.55) return "critical";
  if (value >= 0.38) return "high";
  if (value >= 0.22) return "watch";
  return "normal";
}

function render(payload) {
  currentPayload = payload;
  $("#evidence").textContent = evidenceLabel(payload);
  $("#evidence").dataset.status = payload.evidence_status;
  $("#evidence").dataset.quality = payload.quality?.status ?? "unrated";
  $("#datasetName").textContent = payload.dataset.name;
  $("#releaseId").textContent = payload.release_id;
  $("#sampleCounts").textContent = `${payload.dataset.metadata_count} / ${payload.dataset.prediction_count}`;
  $("#taskCounts").textContent = `${payload.dataset.class_count} / ${payload.dataset.task_count}`;
  $("#budgetTotal").textContent = payload.budget.total;
  $("#budgetCheck").textContent = payload.budget.total === payload.budget.allocated_sum ? "预算守恒" : "预算异常";
  $("#qualityStatus").textContent = payload.quality?.status === "competition_candidate" ? "可用于BP" : "诊断参考";
  $("#qualityDelta").textContent = payload.quality?.primary_delta_vs_best_comparator === null || payload.quality?.primary_delta_vs_best_comparator === undefined
    ? "无对比提升字段"
    : `较最佳对比 +${(payload.quality.primary_delta_vs_best_comparator * 100).toFixed(2)} 个百分点`;
  $("#methodHint").textContent = payload.quality?.recommended_for_bp
    ? "仓库结果已通过主方法优于对比方法门槛"
    : "空值或诊断状态不可作为BP核心指标";
  $("#methods").innerHTML = payload.methods.map((method) => `
    <article class="method-card ${method.name === payload.primary_method ? "primary" : ""}">
      <span>${method.name === payload.primary_method ? "当前展示方法" : "对比方法"}</span>
      <h3>${safe(method.name)}</h3>
      <div>
        <p>最终识别率<b>${pct(method.average_accuracy)}</b></p>
        <p>宏平均识别率<b>${pct(method.macro_accuracy)}</b></p>
        <p>平均遗忘率<b>${pct(method.average_forgetting)}</b></p>
      </div>
    </article>`).join("");
  $("#locations").innerHTML = [...payload.locations].sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1)).map((location) => `
    <tr>
      <td><b>${safe(location.name)}</b><small>${safe(location.location_id)} · ${safe(location.evidence_status)}</small></td>
      <td>${location.sample_count}</td><td>${pct(location.accuracy)}</td><td>${pct(location.forgetting)}</td>
      <td><span class="risk ${riskClass(location.risk)}">${location.risk === null ? "—" : Math.round(location.risk * 100)}</span></td>
      <td>${location.replay_budget ?? "—"}</td><td>${safe(location.recommended_action)}</td>
    </tr>`).join("");
  $("#disclosure").textContent = payload.disclosure;
  $("#downloadResult").disabled = false;
  $("#refreshResult").disabled = false;
}

function showError(error) {
  $("#evidence").textContent = "公开结果文件读取失败";
  $("#evidence").dataset.status = "error";
  $("#disclosure").textContent = error.message;
  $("#refreshResult").disabled = false;
  $("#downloadResult").disabled = true;
  console.error(error);
}

function refreshResult() {
  $("#refreshResult").disabled = true;
  $("#downloadResult").disabled = true;
  $("#evidence").textContent = "正在重新读取公开结果文件…";
  loadPublicResult().then(render).catch(showError);
}

function downloadCurrentPayload() {
  if (!currentPayload) return;
  const safeRelease = currentPayload.release_id.replace(/[^\w.-]+/g, "_");
  const url = URL.createObjectURL(new Blob([JSON.stringify(currentPayload, null, 2)], {
    type: "application/json",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `beidou-public-result-${safeRelease}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

$("#refreshResult").addEventListener("click", refreshResult);
$("#downloadResult").addEventListener("click", downloadCurrentPayload);

refreshResult();
