import { buildRoutePoints, regions, scenarioMeta } from "./scenario.js";
import {
  allocateRiskBudget,
  buildReport,
  computeDiagnostics,
  computeSummary,
  perturbRoutePoints,
} from "./logic.js";
import {
  evidenceLabel,
  loadPublicResult,
  overlayPublicLocations,
} from "./public-result.js";

const routePoints = buildRoutePoints();
const state = { noiseMeters: 12, totalBudget: 240, selectedRegionId: "G02" };
let publicPayload = null;
let publicLoadError = null;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const riskScore = (value) => Math.round(value * 100);
const formalEvidence = () => publicPayload && publicPayload.evidence_status !== "simulation_only";

function riskColor(risk, alpha = 1) {
  if (risk >= 0.55) return `rgba(216, 95, 74, ${alpha})`;
  if (risk >= 0.38) return `rgba(232, 139, 70, ${alpha})`;
  if (risk >= 0.22) return `rgba(232, 184, 66, ${alpha})`;
  return `rgba(72, 158, 125, ${alpha})`;
}

function mapCoordinates(x, y) {
  return [60 + x * 8.8, 70 + y * 5.1];
}

function centerCoordinate(region) {
  const [x1, y1, x2, y2] = region.bounds;
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const latitude = scenarioMeta.baseLatitude + ((50 - centerY) * scenarioMeta.mapHeightMeters / 100) / 111320;
  const longitude = scenarioMeta.baseLongitude + ((centerX - 50) * scenarioMeta.mapWidthMeters / 100)
    / (111320 * Math.cos((scenarioMeta.baseLatitude * Math.PI) / 180));
  return `${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`;
}

function buildState() {
  const effectiveBudget = formalEvidence() ? publicPayload.budget.total : state.totalBudget;
  const positionedPoints = perturbRoutePoints(
    routePoints,
    state.noiseMeters,
    scenarioMeta.mapWidthMeters,
    scenarioMeta.mapHeightMeters,
  );
  const diagnostics = computeDiagnostics(regions, positionedPoints);
  const simulatedAllocation = allocateRiskBudget(diagnostics, effectiveBudget);
  const allocated = overlayPublicLocations(simulatedAllocation, publicPayload);
  const summary = computeSummary(allocated, positionedPoints, effectiveBudget);
  return { positionedPoints, allocated, summary, effectiveBudget };
}

function renderMap(allocated, points) {
  const svg = $("#patrolMap");
  const trueLine = points.map((point) => mapCoordinates(point.x, point.y).join(",")).join(" ");
  const observedLine = points.map((point) => mapCoordinates(point.observedX, point.observedY).join(",")).join(" ");
  const gridLines = Array.from({ length: 11 }, (_, index) => {
    const x = 60 + index * 88;
    const y = 70 + index * 51;
    return `<line x1="${x}" y1="70" x2="${x}" y2="580" /><line x1="60" y1="${y}" x2="940" y2="${y}" />`;
  }).join("");

  const regionMarkup = allocated.map((region) => {
    const [x1, y1, x2, y2] = region.bounds;
    const [left, top] = mapCoordinates(x1, y1);
    const [right, bottom] = mapCoordinates(x2, y2);
    const selected = region.id === state.selectedRegionId ? " selected" : "";
    return `
      <g class="region-group" data-region-id="${region.id}">
        <rect class="map-region${selected}" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"
          rx="7" fill="${riskColor(region.risk, 0.23)}" stroke="${riskColor(region.risk, 0.95)}" stroke-width="2" opacity="0.9" />
        <text x="${left + 13}" y="${top + 24}" fill="#183b42" font-size="12" font-weight="800">${region.id} · ${region.name}</text>
        <text x="${left + 13}" y="${top + 43}" fill="#5e767a" font-size="9">风险 ${riskScore(region.risk)} · 配额 ${region.budget}</text>
      </g>`;
  }).join("");

  const pointMarkup = points.map((point) => {
    const [x, y] = mapCoordinates(point.observedX, point.observedY);
    const mismatch = !point.associationCorrect;
    const shape = point.newClass
      ? `<polygon points="${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}" fill="#e8a32d" stroke="#fff" stroke-width="2" />`
      : `<circle cx="${x}" cy="${y}" r="${mismatch ? 5 : 3.7}" fill="${mismatch ? "#d85f4a" : "#f7fbf8"}" stroke="${mismatch ? "#fff" : "#0b6570"}" stroke-width="2" />`;
    return `<g class="route-point" data-region-id="${point.trueRegionId}"><title>${point.id} ${point.label} · ${point.observedAt}${mismatch ? " · 区域错配" : ""}</title>${shape}</g>`;
  }).join("");

  svg.innerHTML = `
    <defs>
      <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="scan" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 16 0" stroke="#b7c6c0" stroke-opacity=".12" /></pattern>
    </defs>
    <rect x="28" y="35" width="944" height="590" rx="18" fill="#e8ece6" stroke="#cdd7d2" />
    <rect x="60" y="70" width="880" height="510" rx="8" fill="url(#scan)" />
    <g stroke="#cbd5d0" stroke-width="1" opacity=".55">${gridLines}</g>
    ${regionMarkup}
    <polyline points="${trueLine}" fill="none" stroke="#58777c" stroke-width="2" stroke-dasharray="7 7" opacity=".55" />
    <polyline points="${observedLine}" fill="none" stroke="#0a6974" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#routeGlow)" />
    ${pointMarkup}
    <g transform="translate(69 606)"><line x1="0" y1="0" x2="92" y2="0" stroke="#183b42" stroke-width="2" /><line x1="0" y1="-5" x2="0" y2="5" stroke="#183b42" /><line x1="92" y1="-5" x2="92" y2="5" stroke="#183b42" /><text x="0" y="18" fill="#60767b" font-size="9">0</text><text x="73" y="18" fill="#60767b" font-size="9">120 m</text></g>
    <g transform="translate(863 608)"><polygon points="0,13 8,-7 16,13 8,9" fill="#07313a" /><text x="25" y="9" fill="#60767b" font-size="10" font-weight="700">北</text></g>`;

  $$(".region-group, .route-point").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedRegionId = element.dataset.regionId;
      render();
    });
  });
}

function renderSelected(allocated) {
  const selected = allocated.find((region) => region.id === state.selectedRegionId) ?? allocated[0];
  state.selectedRegionId = selected.id;
  $("#selectedId").textContent = `${selected.id} · LOCATION CELL`;
  $("#selectedName").textContent = selected.name;
  $("#selectedScene").textContent = selected.scene;
  $("#selectedRisk").textContent = riskScore(selected.risk);
  $("#riskGauge").style.setProperty("--gauge", `${Math.max(4, selected.risk * 360)}deg`);
  $("#riskGauge").style.setProperty("--red", riskColor(selected.risk));
  $("#selectedCoordinate").textContent = centerCoordinate(selected);
  $("#selectedInspection").textContent = `最近观测 ${selected.lastInspection} · ${selected.pointCount} 个航迹点`;

  const factors = [
    ["#forgettingBar", "#selectedForgetting", Math.min(1, selected.forgetting / 0.25), pct(selected.forgetting)],
    ["#uncertaintyBar", "#selectedUncertainty", selected.uncertainty, pct(selected.uncertainty)],
    ["#positionBar", "#selectedPosition", selected.positioningInstability, pct(selected.mismatchRate)],
    ["#consequenceBar", "#selectedConsequence", selected.consequence, pct(selected.consequence, 0)],
  ];
  factors.forEach(([bar, label, value, text]) => {
    $(bar).style.width = `${value * 100}%`;
    $(label).textContent = text;
  });
  $("#selectedAccuracy").textContent = pct(selected.currentAccuracy);
  $("#selectedBudget").textContent = `${selected.budget} slots`;
  $("#selectedAssets").textContent = `${selected.assets} 处`;
  $("#selectedQuality").textContent = pct(selected.coordinateQuality, 0);
  $("#selectedAction").textContent = selected.action;
  $("#selectedClasses").textContent = `关注目标：${selected.classes.join("、")}`;
  $("#selectedActionBox").style.borderLeftColor = riskColor(selected.risk);
}

function renderTable(allocated) {
  const sorted = [...allocated].sort((a, b) => b.risk - a.risk);
  $("#diagnosticRows").innerHTML = sorted.map((region) => `
    <tr data-region-id="${region.id}" class="${region.id === state.selectedRegionId ? "selected" : ""}">
      <td class="region-cell"><strong>${region.name}</strong><small>${region.id} · ${region.scene}</small></td>
      <td>${pct(region.currentAccuracy)}</td><td>${pct(region.forgetting)}</td><td>${pct(region.mismatchRate)}</td>
      <td><span class="risk-pill" style="background:${riskColor(region.risk)}">${riskScore(region.risk)}</span></td>
      <td><b>${region.budget}</b> <small>/ ${region.uniformBudget} 均匀</small></td>
      <td><span class="action-pill ${region.actionCode}">${region.action}</span></td>
    </tr>`).join("");
  $$("#diagnosticRows tr").forEach((row) => row.addEventListener("click", () => {
    state.selectedRegionId = row.dataset.regionId;
    render();
  }));
}

function renderBudget(allocated, summary) {
  const maximum = Math.max(...allocated.map((region) => Math.max(region.budget, region.uniformBudget)));
  $("#budgetBars").innerHTML = [...allocated].sort((a, b) => b.risk - a.risk).map((region) => `
    <div class="budget-row" title="${region.name}：风险配额 ${region.budget}，均匀配额 ${region.uniformBudget}">
      <span>${region.id}</span><div class="budget-track"><i class="budget-fill" style="width:${(region.budget / maximum) * 100}%"></i><i class="uniform-marker" style="left:${(region.uniformBudget / maximum) * 100}%"></i></div><b>${region.budget}</b>
    </div>`).join("");
  $("#budgetTotal").textContent = formalEvidence() ? publicPayload.budget.total : state.totalBudget;
  $("#highRiskShare").textContent = pct(summary.highRiskBudgetShare, 0);
}

function renderMissions(allocated) {
  const missions = [...allocated].sort((a, b) => b.risk - a.risk).filter((region) => region.risk >= 0.22).slice(0, 3);
  $("#missionCount").textContent = missions.length;
  $("#missionGrid").innerHTML = missions.map((region, index) => `
    <article class="mission-card" data-rank="0${index + 1}">
      <span>PRIORITY ${index + 1} · ${region.id}</span><h3>${region.name}</h3><p>${region.scene}｜${region.classes.join(" · ")}</p>
      <div class="mission-meta"><span>风险<strong>${riskScore(region.risk)}</strong></span><span>遗忘<strong>${pct(region.forgetting)}</strong></span><span>回放配额<strong>${region.budget}</strong></span></div>
      <span class="mission-action">${region.action}</span>
    </article>`).join("");
}

function renderMetrics(summary, points) {
  $("#averageAccuracy").textContent = pct(summary.averageAccuracy);
  $("#weightedForgetting").textContent = pct(summary.weightedForgetting);
  $("#associationAccuracy").textContent = pct(summary.associationAccuracy);
  const mismatchCount = points.filter((point) => !point.associationCorrect).length;
  $("#associationHint").textContent = `${mismatchCount} / ${points.length} 个观测发生区域错配`;
  $("#topRiskRegion").textContent = summary.topRiskRegion.name;
  $("#topRiskHint").textContent = `风险 ${riskScore(summary.topRiskRegion.risk)} · ${summary.topRiskRegion.action}`;
}

function renderEvidenceState() {
  const statusText = publicLoadError
    ? `公开结果读取失败：${publicLoadError.message}`
    : evidenceLabel(publicPayload);
  $("#evidenceStatusText").textContent = statusText;
  $("#prototypeRibbon").dataset.status = publicPayload?.evidence_status ?? "simulation_only";
  $("#resultSourceHint").textContent = publicPayload
    ? `当前读取：${publicPayload.release_id} · ${publicPayload.contract_version}`
    : "当前读取：内置仿真参数";
  $("#budgetRange").disabled = formalEvidence();
  $("#budgetControlHint").textContent = formalEvidence()
    ? "正式结果模式下使用公开JSON中的预算总量"
    : "固定总量，仅改变区域间配额";
}

function render() {
  const { positionedPoints, allocated, summary, effectiveBudget } = buildState();
  $("#noiseValue").textContent = `${state.noiseMeters} m`;
  $("#budgetValue").textContent = `${effectiveBudget} slots`;
  $("#noiseRange").value = state.noiseMeters;
  $("#budgetRange").value = state.totalBudget;
  renderEvidenceState();
  renderMetrics(summary, positionedPoints);
  renderMap(allocated, positionedPoints);
  renderSelected(allocated);
  renderTable(allocated);
  renderBudget(allocated, summary);
  renderMissions(allocated);
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function activatePreset(name) {
  const presets = {
    clear: { noiseMeters: 4, totalBudget: 200 },
    mountain: { noiseMeters: 12, totalBudget: 240 },
    degraded: { noiseMeters: 32, totalBudget: 320 },
  };
  Object.assign(state, presets[name]);
  $$('[data-preset]').forEach((button) => button.classList.toggle("active", button.dataset.preset === name));
  render();
}

$("#noiseRange").addEventListener("input", (event) => {
  state.noiseMeters = Number(event.target.value);
  $$('[data-preset]').forEach((button) => button.classList.remove("active"));
  render();
});
$("#budgetRange").addEventListener("input", (event) => {
  state.totalBudget = Number(event.target.value);
  $$('[data-preset]').forEach((button) => button.classList.remove("active"));
  render();
});
$$('[data-preset]').forEach((button) => button.addEventListener("click", () => activatePreset(button.dataset.preset)));

$("#focusCritical").addEventListener("click", () => {
  const { summary } = buildState();
  state.selectedRegionId = summary.topRiskRegion.id;
  render();
  $("#risk-map").scrollIntoView({ behavior: "smooth" });
  showToast(`已定位最高风险区域：${summary.topRiskRegion.name}`);
});

$("#exportReport").addEventListener("click", () => {
  const { positionedPoints, allocated, summary, effectiveBudget } = buildState();
  const report = buildReport(scenarioMeta, allocated, summary, {
    positioningNoiseMeters: state.noiseMeters,
    totalReplayBudget: effectiveBudget,
    observationCount: positionedPoints.length,
    publicReleaseId: publicPayload?.release_id ?? null,
    evidenceStatus: "simulation_only",
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `beidou-inspection-report-${scenarioMeta.date}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("仿真诊断 JSON 已导出，仅用于交互演示，不作为正式实验结论。");
});

loadPublicResult()
  .then((payload) => {
    publicPayload = payload;
    if (formalEvidence()) state.totalBudget = payload.budget.total;
  })
  .catch((error) => {
    publicLoadError = error;
    console.error(error);
  })
  .finally(render);
