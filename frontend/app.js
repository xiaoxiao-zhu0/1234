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
const state = {
  noiseMeters: 12,
  totalBudget: 240,
  selectedRegionId: "G02",
  selectedPointIndex: 0,
  playing: false,
};
let publicPayload = null;
let publicLoadError = null;
let playbackTimer = null;
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

function pointCoordinate(point) {
  const latitude = scenarioMeta.baseLatitude
    + ((50 - point.observedY) * scenarioMeta.mapHeightMeters / 100) / 111320;
  const longitude = scenarioMeta.baseLongitude
    + ((point.observedX - 50) * scenarioMeta.mapWidthMeters / 100)
    / (111320 * Math.cos((scenarioMeta.baseLatitude * Math.PI) / 180));
  return `${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`;
}

function stopPlayback() {
  state.playing = false;
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
}

function startPlayback() {
  stopPlayback();
  if (state.selectedPointIndex >= routePoints.length - 1) state.selectedPointIndex = 0;
  state.playing = true;
  render();
  playbackTimer = setInterval(() => {
    if (state.selectedPointIndex >= routePoints.length - 1) {
      stopPlayback();
      render();
      return;
    }
    state.selectedPointIndex += 1;
    render();
  }, 850);
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
  const selectedIndex = Math.min(state.selectedPointIndex, points.length - 1);
  const selectedPoint = points[selectedIndex];
  const trueLine = points.map((point) => mapCoordinates(point.x, point.y).join(",")).join(" ");
  const observedLine = points.map((point) => mapCoordinates(point.observedX, point.observedY).join(",")).join(" ");
  const completedLine = points.slice(0, selectedIndex + 1)
    .map((point) => mapCoordinates(point.observedX, point.observedY).join(","))
    .join(" ");
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
        <text x="${left + 13}" y="${top + 43}" fill="#5e767a" font-size="9">风险 ${riskScore(region.risk)} · 建议 ${region.budget}</text>
      </g>`;
  }).join("");

  const pointMarkup = points.map((point, index) => {
    const [x, y] = mapCoordinates(point.observedX, point.observedY);
    const mismatch = !point.associationCorrect;
    const selected = index === selectedIndex;
    const shape = point.newClass
      ? `<polygon points="${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}" fill="#e8a32d" stroke="#fff" stroke-width="2" />`
      : `<circle cx="${x}" cy="${y}" r="${mismatch ? 5 : 3.7}" fill="${mismatch ? "#d85f4a" : "#f7fbf8"}" stroke="${mismatch ? "#fff" : "#0b6570"}" stroke-width="2" />`;
    const focusRing = selected
      ? `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#ffffff" stroke-width="4" />`
      : "";
    return `<g class="route-point${selected ? " selected" : ""}" data-region-id="${point.trueRegionId}" data-point-index="${index}"><title>${point.id} ${point.label} · ${point.observedAt}${mismatch ? " · 区域错配" : ""}</title>${focusRing}${shape}</g>`;
  }).join("");

  const [currentX, currentY] = mapCoordinates(selectedPoint.observedX, selectedPoint.observedY);

  svg.innerHTML = `
    <defs>
      <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="scan" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 16 0" stroke="#b7c6c0" stroke-opacity=".12" /></pattern>
    </defs>
    <rect x="28" y="35" width="944" height="590" rx="18" fill="#dfe7df" stroke="#c7d2cc" />
    <g opacity=".95">
      <path d="M55 478 C190 425 282 520 407 475 S650 390 947 458 L947 580 L55 580Z" fill="#bfd7d3" />
      <path d="M55 494 C190 441 282 536 407 491 S650 406 947 474" fill="none" stroke="#8fbfc2" stroke-width="17" opacity=".8" />
      <path d="M86 129 C260 178 340 150 485 214 S745 260 918 187" fill="none" stroke="#c4b9a4" stroke-width="34" />
      <path d="M86 129 C260 178 340 150 485 214 S745 260 918 187" fill="none" stroke="#f3efe6" stroke-width="24" />
      <path d="M86 129 C260 178 340 150 485 214 S745 260 918 187" fill="none" stroke="#a8a79f" stroke-width="2" stroke-dasharray="10 9" />
      <path d="M92 92 L910 342" fill="none" stroke="#71847d" stroke-width="3" />
      <path d="M92 104 L910 354" fill="none" stroke="#71847d" stroke-width="3" />
      <g fill="#8da790" opacity=".74">
        <circle cx="132" cy="380" r="20"/><circle cx="171" cy="405" r="27"/><circle cx="214" cy="366" r="24"/>
        <circle cx="716" cy="447" r="24"/><circle cx="758" cy="421" r="20"/><circle cx="802" cy="454" r="28"/>
      </g>
      <g fill="#bcc5be" stroke="#9caaa1">
        <rect x="744" y="92" width="54" height="39" rx="3"/><rect x="812" y="107" width="74" height="48" rx="3"/>
        <rect x="118" y="246" width="62" height="44" rx="3"/><rect x="195" y="258" width="48" height="36" rx="3"/>
      </g>
      <g fill="#668277" font-size="10" font-weight="700">
        <text x="82" y="84">输电走廊示意</text><text x="760" y="445">河谷绿带</text><text x="749" y="82">城郊设施</text>
      </g>
    </g>
    <rect x="60" y="70" width="880" height="510" rx="8" fill="url(#scan)" />
    <g stroke="#b6c3bd" stroke-width="1" opacity=".42">${gridLines}</g>
    ${regionMarkup}
    <polyline points="${trueLine}" fill="none" stroke="#405e63" stroke-width="2" stroke-dasharray="7 7" opacity=".48" />
    <polyline points="${observedLine}" fill="none" stroke="#6a8588" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".65" />
    <polyline points="${completedLine}" fill="none" stroke="#006f78" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#routeGlow)" />
    ${pointMarkup}
    <g class="current-aircraft" transform="translate(${currentX} ${currentY})">
      <circle r="14" fill="#073d45" stroke="#ffffff" stroke-width="3" />
      <path d="M-6 2 0-8 6 2 2 1 0 8-2 1Z" fill="#b9ec9f" />
    </g>
    <g transform="translate(69 606)"><line x1="0" y1="0" x2="92" y2="0" stroke="#183b42" stroke-width="2" /><line x1="0" y1="-5" x2="0" y2="5" stroke="#183b42" /><line x1="92" y1="-5" x2="92" y2="5" stroke="#183b42" /><text x="0" y="18" fill="#60767b" font-size="9">0</text><text x="73" y="18" fill="#60767b" font-size="9">120 m</text></g>
    <g transform="translate(863 608)"><polygon points="0,13 8,-7 16,13 8,9" fill="#07313a" /><text x="25" y="9" fill="#60767b" font-size="10" font-weight="700">北</text></g>`;

  $$(".region-group").forEach((element) => {
    element.addEventListener("click", () => {
      stopPlayback();
      state.selectedRegionId = element.dataset.regionId;
      const nextPoint = points.findIndex((point) => point.trueRegionId === element.dataset.regionId);
      if (nextPoint >= 0) state.selectedPointIndex = nextPoint;
      render();
    });
  });
  $$(".route-point").forEach((element) => {
    element.addEventListener("click", () => {
      stopPlayback();
      state.selectedPointIndex = Number(element.dataset.pointIndex);
      state.selectedRegionId = element.dataset.regionId;
      render();
    });
  });
}

function renderObservation(allocated, points) {
  const selectedIndex = Math.min(Math.max(0, state.selectedPointIndex), points.length - 1);
  const point = points[selectedIndex];
  const region = allocated.find((item) => item.id === point.trueRegionId);
  const assignedRegion = allocated.find((item) => item.id === point.assignedRegionId);
  const observation = point.observation;

  $("#observationImage").src = observation.image;
  $("#observationImage").alt = `VisDrone公开航拍样例：${point.label}`;
  $("#observationBoxes").innerHTML = observation.boxes.map((box) => `
    <span class="observation-box" style="left:${box.x}%;top:${box.y}%;width:${box.width}%;height:${box.height}%">
      <b>${box.label}</b>
    </span>`).join("");
  $("#observationPointId").textContent = point.id;
  $("#observationLabel").textContent = `${point.label}${point.newClass ? " · 新增类别" : ""}`;
  $("#observationConfidence").textContent = `仿真置信度 ${pct(point.confidence)}`;
  $("#observationTime").textContent = `${scenarioMeta.date} ${point.observedAt}`;
  $("#observationCoordinate").textContent = pointCoordinate(point);
  $("#observationRegion").textContent = `${region?.id ?? point.trueRegionId} · ${region?.name ?? "区域外"}`;
  $("#observationAssociation").textContent = point.associationCorrect
    ? "坐标关联正常"
    : `定位扰动：落入 ${assignedRegion?.id ?? point.assignedRegionId}`;
  $("#observationAssociation").className = point.associationCorrect ? "association-ok" : "association-alert";
  $("#observationSource").textContent = observation.sourceName;
  $("#observationSource").href = observation.sourceUrl;
  $("#observationLinkKey").textContent = `${point.id} + ${scenarioMeta.date} ${point.observedAt}`;

  $("#playbackRange").max = String(points.length - 1);
  $("#playbackRange").value = String(selectedIndex);
  $("#playbackCounter").textContent = `${point.id} / ${String(points.length).padStart(2, "0")}`;
  $("#mapTimestamp").textContent = `${point.observedAt} · ${point.id} · 仿真坐标`;
  $("#playPatrol").setAttribute("aria-pressed", String(state.playing));
  $("#playPatrolIcon").textContent = state.playing ? "Ⅱ" : "▶";
  $("#playPatrolLabel").textContent = state.playing ? "暂停巡检" : "播放巡检";
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

function renderTable(allocated, points) {
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
    stopPlayback();
    state.selectedRegionId = row.dataset.regionId;
    const nextPoint = points.findIndex((point) => point.trueRegionId === row.dataset.regionId);
    if (nextPoint >= 0) state.selectedPointIndex = nextPoint;
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
      <div class="mission-meta"><span>风险<strong>${riskScore(region.risk)}</strong></span><span>遗忘<strong>${pct(region.forgetting)}</strong></span><span>预算建议<strong>${region.budget}</strong></span></div>
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
  state.selectedPointIndex = Math.min(Math.max(0, state.selectedPointIndex), positionedPoints.length - 1);
  const activePoint = positionedPoints[state.selectedPointIndex];
  if (activePoint?.trueRegionId) state.selectedRegionId = activePoint.trueRegionId;
  $("#noiseValue").textContent = `${state.noiseMeters} m`;
  $("#budgetValue").textContent = `${effectiveBudget} slots`;
  $("#noiseRange").value = state.noiseMeters;
  $("#budgetRange").value = state.totalBudget;
  renderEvidenceState();
  renderMetrics(summary, positionedPoints);
  renderMap(allocated, positionedPoints);
  renderObservation(allocated, positionedPoints);
  renderSelected(allocated);
  renderTable(allocated, positionedPoints);
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

$("#playPatrol").addEventListener("click", () => {
  if (state.playing) {
    stopPlayback();
    render();
  } else {
    startPlayback();
  }
});

$("#playbackRange").addEventListener("input", (event) => {
  stopPlayback();
  state.selectedPointIndex = Number(event.target.value);
  render();
});

$("#focusCritical").addEventListener("click", () => {
  stopPlayback();
  const { positionedPoints, summary } = buildState();
  state.selectedRegionId = summary.topRiskRegion.id;
  const nextPoint = positionedPoints.findIndex((point) => point.trueRegionId === summary.topRiskRegion.id);
  if (nextPoint >= 0) state.selectedPointIndex = nextPoint;
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
