const steps = [
  ["创建任务", "登记线路、巡检架次和任务负责人。", "输出：任务编号与线路范围", "待验证"],
  ["导入北斗航迹", "绑定采集时间、经纬度和定位质量。", "输出：可回放的时空航迹", "仿真流程"],
  ["查看巡检影像", "按航迹点查看杆塔、通道和周边环境影像。", "输出：影像证据与来源", "公开图片"],
  ["标记风险点", "将异常目标与位置、时间和区域关联。", "输出：风险点清单", "仿真流程"],
  ["生成复核工单", "按风险等级、位置和业务后果安排人工复核。", "输出：责任人、截止时间", "仿真流程"],
  ["现场复核", "记录确认、驳回或需要补采的处理结果。", "输出：复核结论", "待验证"],
  ["关闭风险", "补充处理说明和复核证据后关闭工单。", "输出：可审计闭环", "待验证"],
  ["导出报告", "汇总航迹、风险、处置和证据状态。", "输出：巡检报告", "公开模板"],
];
const evidence = [
  ["公开结果契约", "prediction_backed", "经审核的公开指标，可用于竞赛验证材料。"],
  ["北斗坐标与航迹", "simulation_only", "用于演示时空关联和任务调度，不代表真实外业精度。"],
  ["巡检影像", "public_reference", "来自公开图片或公开数据集，仅作为场景参考。"],
  ["客户试点数据", "to_be_validated", "待通过真实线路试点和客户确认后补入。"],
];
const $ = (selector) => document.querySelector(selector);
const stepsRoot = $("#steps");
const detail = $("#stepDetail");
let active = 0;
function renderSteps() {
  stepsRoot.innerHTML = steps.map((step, index) => `<li><button class="step ${index === active ? "active" : ""}" data-step="${index}" type="button"><span>${String(index + 1).padStart(2, "0")}</span><b>${step[0]}</b><small>${step[3]}</small></button></li>`).join("");
  detail.innerHTML = `<span class="step-number">步骤 ${String(active + 1).padStart(2, "0")}</span><h3>${steps[active][0]}</h3><p>${steps[active][1]}</p><div class="output"><span>本步骤输出</span><strong>${steps[active][2]}</strong></div><p class="status">证据状态：<b>${steps[active][3]}</b></p>`;
  stepsRoot.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { active = Number(button.dataset.step); renderSteps(); }));
}
function renderEvidence() {
  $("#evidenceGrid").innerHTML = evidence.map(([name, status, description]) => `<article><span class="status-chip ${status}">${status}</span><h3>${name}</h3><p>${description}</p></article>`).join("");
}
$("#resetMission").addEventListener("click", () => { active = 0; renderSteps(); window.location.hash = "workflow"; });
renderSteps();
renderEvidence();
